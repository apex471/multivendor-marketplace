import { NextRequest, NextResponse } from 'next/server';
import * as OrderStore from '@/lib/store/orders';
import { Order } from '@/backend/models/Order';
import { Transaction } from '@/backend/models/Transaction';
import { verifyToken } from '@/backend/utils/jwt';
import { calculateFees } from '@/lib/fees';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      shippingInfo, cartItems,
      courierId, courierName, courierIcon, courierPrice, courierEta, courierCarrier, courierTracking,
      subtotal: rawSubtotal, shippingCost: rawShipping, discount, couponCode, paymentMethod,
    } = body;

    if (!shippingInfo || !cartItems?.length) {
      return NextResponse.json({ success: false, message: 'Missing required order data' }, { status: 400 });
    }

    let customerId: string | undefined;
    let customerEmail = shippingInfo.email ?? '';
    const authHeader = request.headers.get('Authorization');
    if (authHeader?.startsWith('Bearer ')) {
      const payload = verifyToken(authHeader.slice(7));
      if (payload) { customerId = payload.userId; if (!customerEmail) customerEmail = payload.email; }
    }

    // ── Fee calculation ─────────────────────────────────────────────────────────
    const subtotal = rawSubtotal ?? cartItems.reduce((s: number, i: { price?: number; quantity?: number }) => s + (i.price ?? 0) * (i.quantity ?? 1), 0);
    const shipping = rawShipping ?? courierPrice ?? 0;
    const fees = calculateFees(subtotal, shipping);
    // Apply discount to grand total if coupon provided
    const discountAmount = discount ?? 0;
    const buyerTotal = Math.max(0, fees.buyerTotal - discountAmount);

    const { randomBytes } = await import('crypto');
    const orderId = `ORD-${Date.now()}-${randomBytes(4).toString('hex').toUpperCase()}`;

    // ── Persist order in Firestore ──────────────────────────────────────────────
    await Order.create({
      orderId,
      ...(customerId ? { customerId } : {}),
      customerName:  shippingInfo.fullName,
      customerEmail: customerEmail || 'guest@example.com',
      customerPhone: shippingInfo.phone ?? '',
      items: cartItems.map((i: { id?: string; productId?: string; name: string; price: number; quantity: number; image?: string; vendor?: string; size?: string; color?: string }) => ({
        productId: i.productId ?? i.id ?? '',
        name: i.name, price: i.price, quantity: i.quantity,
        image: i.image ?? '', vendor: i.vendor ?? '', size: i.size, color: i.color,
      })),
      shippingAddress: {
        fullName: shippingInfo.fullName, phone: shippingInfo.phone ?? '',
        addressLine1: shippingInfo.addressLine1 ?? shippingInfo.address ?? '',
        addressLine2: shippingInfo.addressLine2,
        city: shippingInfo.city, state: shippingInfo.state,
        zipCode: shippingInfo.zipCode, country: shippingInfo.country ?? 'United States',
      },
      paymentMethod: { type: paymentMethod?.type ?? 'card', cardLast4: paymentMethod?.cardNumber?.slice(-4), cardHolder: paymentMethod?.cardHolder },
      courier: { id: courierId ?? 'quickbox', name: courierName ?? 'QuickBox Express', icon: courierIcon ?? '🚀', price: fees.shipping, eta: courierEta ?? '—', carrier: courierCarrier ?? '—', tracking: courierTracking ?? 'standard' },
      subtotal:     fees.subtotal,
      shippingCost: fees.shipping,
      tax:          fees.tax,
      discount:     discountAmount,
      total:        buyerTotal,
      couponCode:   couponCode || undefined,
      status:       'pending',
      paymentStatus: process.env.FLUTTERWAVE_SECRET_KEY ? 'pending' : 'paid',
    });

    // ── Record escrow transaction (buyer charge) ─────────────────────────────────
    // This record sits in escrow until admin releases it to the vendor.
    await Transaction.create({
      transactionId: `TXN-${orderId}`,
      type:          'order_payment',
      amount:        buyerTotal,
      currency:      'USD',
      status:        'pending',           // escrow-held; becomes 'completed' on release
      ...(customerId ? { fromUser: customerId } : {}),
      orderId,
      description:   `Buyer payment for order ${orderId} (incl. 10% service fee, shipping & tax)`,
      feeBreakdown: {
        subtotal:        fees.subtotal,
        buyerServiceFee: fees.buyerServiceFee,
        sellerFee:       fees.sellerFee,
        shipping:        fees.shipping,
        tax:             fees.tax,
        stripeFee:       fees.stripeFee,
        vendorPayout:    fees.vendorPayout,
        platformGross:   fees.platformGross,
        platformNet:     fees.platformNet,
      },
    });

    // ── Flutterwave Payment Link Initialization ──────────────────────────────────
    let paymentLink: string | undefined;
    const flwSecretKey = process.env.FLUTTERWAVE_SECRET_KEY;
    if (flwSecretKey) {
      try {
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        const flwResponse = await fetch('https://api.flutterwave.com/v3/payments', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${flwSecretKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            tx_ref: orderId,
            amount: buyerTotal,
            currency: 'USD',
            redirect_url: `${appUrl}/checkout/verify`,
            customer: {
              email: customerEmail || 'guest@example.com',
              phonenumber: shippingInfo.phone || '0000000000',
              name: shippingInfo.fullName,
            },
            customizations: {
              title: process.env.NEXT_PUBLIC_APP_NAME || 'CLW Marketplace',
              description: `Payment for order ${orderId}`,
              logo: `${appUrl}/images/brand/clw-logo.png`,
            },
          }),
        });

        const flwData = await flwResponse.json();
        if (flwResponse.ok && flwData.status === 'success') {
          paymentLink = flwData.data.link;
        } else {
          console.error('[Flutterwave] Init failed:', flwData);
        }
      } catch (err) {
        console.error('[Flutterwave] Init error:', err);
      }
    }

    // ── Sync to in-memory store for live logistics monitor ───────────────────────
    const inMemoryOrder = {
      id: orderId,
      customerName: shippingInfo.fullName, customerEmail: customerEmail || 'guest@example.com',
      customerPhone: shippingInfo.phone ?? '',
      vendorName: cartItems.map((i: { vendor?: string }) => i.vendor ?? 'Unknown').join(', '),
      vendorAddress: '',
      products: cartItems.map((i: { name: string }) => i.name),
      items: cartItems.map((i: { name: string; price?: number; quantity?: number; image?: string; vendor?: string }, idx: number) => ({
        id: String(idx), name: i.name, price: i.price ?? 0, quantity: i.quantity ?? 1, image: i.image ?? '', vendor: i.vendor ?? '',
      })),
      total:         buyerTotal,
      subtotal:      fees.subtotal,
      tax:           fees.tax,
      status:        'pending' as const,
      paymentStatus: (flwSecretKey ? 'pending' : 'paid') as 'pending' | 'paid',
      orderDate:     new Date().toISOString(),
      shippingAddress: `${shippingInfo.addressLine1 ?? shippingInfo.address ?? ''}, ${shippingInfo.city}, ${shippingInfo.state} ${shippingInfo.zipCode}`,
      estimatedDistance: '', estimatedTime: '',
      courier: { id: courierId ?? 'quickbox', name: courierName ?? 'QuickBox Express', icon: courierIcon ?? '🚀', price: fees.shipping, eta: courierEta ?? '—', carrier: courierCarrier ?? '—', tracking: courierTracking ?? 'standard' },
    };
    OrderStore.add(inMemoryOrder);

    return NextResponse.json({
      success: true,
      paymentLink,
      data: {
        orderId,
        order: inMemoryOrder,
        fees: {
          buyerServiceFee: fees.buyerServiceFee,
          sellerFee:       fees.sellerFee,
          stripeFee:       fees.stripeFee,
          vendorPayout:    fees.vendorPayout,
          platformGross:   fees.platformGross,
          platformNet:     fees.platformNet,
          total:           buyerTotal,
        },
      },
    }, { status: 201 });
  } catch (err) {
    console.error('POST /api/orders error:', err);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}

export async function GET() {
  try {
    const orders = await Order.find({}, { orderBy: 'createdAt', orderDir: 'desc' });
    return NextResponse.json({ success: true, data: { orders, total: orders.length } });
  } catch {
    const orders = OrderStore.getAll();
    return NextResponse.json({ success: true, data: { orders, total: orders.length } });
  }
}
