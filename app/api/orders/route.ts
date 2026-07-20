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
      // IMPORTANT: Never auto-mark as 'paid' without a confirmed gateway response.
      // 'pending_manual' = admin must manually verify payment (e.g. bank transfer screenshot)
      // This prevents orders from being fulfilled without actual payment when gateway is not configured.
      paymentStatus: process.env.FLUTTERWAVE_SECRET_KEY ? 'pending' : 'pending_manual',
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

    // ── Payment Link Initialization (Flutterwave — card or bank transfer) ────────
    let paymentLink: string | undefined;
    const paymentType = paymentMethod?.type ?? 'card';
    const flwSecretKey = process.env.FLUTTERWAVE_SECRET_KEY;
    if (flwSecretKey) {
      try {
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        // Flutterwave bank transfer virtual accounts only work in NGN.
        // If prices are stored in USD, convert at an approximate rate.
        // In production: use a live FX API or store product prices in NGN.
        const NGN_RATE = Number(process.env.USD_TO_NGN_RATE ?? 1600);
        const flwAmount = paymentType === 'bank' ? Math.round(buyerTotal * NGN_RATE) : buyerTotal;
        const flwCurrency = paymentType === 'bank' ? 'NGN' : 'NGN';

        const flwPayload: Record<string, unknown> = {
          tx_ref: orderId,
          amount: flwAmount,
          currency: flwCurrency,
          redirect_url: `${appUrl}/checkout/verify?gateway=flutterwave&order_id=${orderId}`,
          payment_options: paymentType === 'bank' ? 'banktransfer' : 'card',
          customer: {
            email: customerEmail || 'guest@example.com',
            phonenumber: shippingInfo.phone || '08000000000',
            name: shippingInfo.fullName,
          },
          customizations: {
            title: process.env.NEXT_PUBLIC_APP_NAME || 'CLW Marketplace',
            description: `Payment for order ${orderId}`,
            logo: `${appUrl}/images/brand/clw-logo.png`,
          },
          meta: {
            order_id: orderId,
            payment_type: paymentType,
            usd_equivalent: buyerTotal,
          },
        };

        const flwResponse = await fetch('https://api.flutterwave.com/v3/payments', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${flwSecretKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(flwPayload),
        });

        const flwData = await flwResponse.json();
        if (flwResponse.ok && flwData.status === 'success') {
          paymentLink = flwData.data.link;
        } else {
          console.error('[Flutterwave] Init failed — status:', flwData.status, 'message:', flwData.message);
        }
      } catch (err) {
        console.error('[Flutterwave] Network error during payment init:', err);
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
      paymentStatus: (paymentLink ? 'pending' : 'pending_manual') as 'pending' | 'pending_manual',
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
