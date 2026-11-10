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
      currency,
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
    const rawShip = rawShipping ?? courierPrice ?? 0;
    // Safeguard: If shipping was sent in raw NGN (> 100), convert to base USD to avoid 1500x double conversion
    const shipping = rawShip > 100 ? Math.round((rawShip / 1500) * 100) / 100 : rawShip;
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
      items: cartItems.map((i: { id?: string; productId?: string; name: string; price: number; quantity: number; image?: string; vendor?: string; vendorId?: string; vendorRole?: string; size?: string; color?: string }) => ({
        productId: i.productId ?? i.id ?? '',
        name: i.name, price: i.price, quantity: i.quantity,
        image: i.image ?? '', vendor: i.vendor ?? '',
        vendorId: i.vendorId ?? '',
        vendorRole: i.vendorRole ?? 'vendor',
        size: i.size, color: i.color,
      })),
      shippingAddress: {
        fullName: shippingInfo.fullName, phone: shippingInfo.phone ?? '',
        addressLine1: shippingInfo.addressLine1 ?? shippingInfo.address ?? '',
        addressLine2: shippingInfo.addressLine2,
        city: shippingInfo.city, state: shippingInfo.state,
        zipCode: shippingInfo.zipCode, country: shippingInfo.country ?? 'United States',
      },
      paymentMethod: { type: paymentMethod?.type ?? 'card', cardLast4: paymentMethod?.cardNumber?.slice(-4), cardHolder: paymentMethod?.cardHolder },
      courier: { id: courierId ?? 'courierplus-standard', name: courierName ?? 'CourierPlus Standard Delivery', icon: courierIcon ?? '🚚', price: fees.shipping, eta: courierEta ?? '2–4 business days', carrier: courierCarrier ?? 'CourierPlus Nigeria', tracking: courierTracking ?? 'realtime' },
      subtotal:     fees.subtotal,
      shippingCost: fees.shipping,
      tax:          fees.tax,
      discount:     discountAmount,
      total:        buyerTotal,
      couponCode:   couponCode || undefined,
      status:       'pending',
      // IMPORTANT: Never auto-mark as 'paid' without a confirmed gateway response.
      // Order starts as 'pending' and is transitioned to 'paid' upon Flutterwave callback verification.
      paymentStatus: 'pending',
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
        affiliateFee:    fees.affiliateFee,
        adminNet:        fees.adminNet,
        platformNet:     fees.platformNet,
      },
    });

    // ── Payment Link Initialization (Flutterwave — card or bank transfer) ────────
    let paymentLink: string | undefined;
    let flwAmount = buyerTotal;
    let flwCurrency = (currency || 'USD').toUpperCase();
    const paymentType = paymentMethod?.type ?? 'card';
    const flwSecretKey = (
      process.env.FLUTTERWAVE_SECRET_KEY ||
      process.env.FLW_SECRET_KEY ||
      process.env.FLUTTERWAVE_SECRET ||
      process.env.FLW_SEC_KEY ||
      process.env.FLW_SECRET ||
      process.env.RAVE_SECRET_KEY ||
      process.env.FLUTTERWAVE_KEY ||
      ''
    ).trim().replace(/^["']|["']$/g, '');
    const isRealKey = flwSecretKey.length > 8 && !flwSecretKey.includes('xxxx');
    const flwPublicKey = (
      process.env.NEXT_PUBLIC_FLUTTERWAVE_PUBLIC_KEY ||
      process.env.FLUTTERWAVE_PUBLIC_KEY ||
      process.env.FLW_PUBLIC_KEY ||
      process.env.NEXT_PUBLIC_FLW_PUBLIC_KEY ||
      process.env.RAVE_PUBLIC_KEY ||
      ''
    ).trim().replace(/^["']|["']$/g, '');

    if (!isRealKey) {
      console.error('[Orders API] Payment init blocked: FLUTTERWAVE_SECRET_KEY is missing or invalid on the server.');
      return NextResponse.json({
        success: false,
        message: 'Payment gateway configuration required: FLUTTERWAVE_SECRET_KEY is not configured on the production server. Please add your Flutterwave Secret Key to Netlify Site Settings > Environment Variables.'
      }, { status: 503 });
    }

    try {
      const forwardedProto = request.headers.get('x-forwarded-proto') || 'https';
      const forwardedHost = request.headers.get('x-forwarded-host') || request.headers.get('host') || '';
      const fallbackOrigin = forwardedHost ? `${forwardedProto}://${forwardedHost}` : request.nextUrl.origin;
      const appUrl = (process.env.NEXT_PUBLIC_APP_URL || fallbackOrigin || 'https://cluxuryworld.com').replace(/\/$/, '');
      const orderCurrency = (currency || 'USD').toUpperCase();
      const NGN_RATE = Number(process.env.USD_TO_NGN_RATE ?? 1600);
      
      flwCurrency = (paymentType === 'bank' || orderCurrency === 'NGN') ? 'NGN' : 'USD';
      flwAmount = flwCurrency === 'NGN' ? Math.round(buyerTotal * NGN_RATE) : buyerTotal;

      const safeEmail = (customerEmail || shippingInfo.email || `${(shippingInfo.fullName || 'client').replace(/[^a-zA-Z0-9]/g, '').toLowerCase() || 'client'}@cluxuryworld.com`).trim();
      const safePhone = (shippingInfo.phone || '08000000000').trim();

      const flwPayload: Record<string, unknown> = {
        tx_ref: orderId,
        amount: flwAmount,
        currency: flwCurrency,
        redirect_url: `${appUrl}/checkout/verify?gateway=flutterwave&order_id=${orderId}`,
        payment_options: paymentType === 'bank' ? 'banktransfer,card,account,ussd' : 'card,banktransfer,ussd,account,qr',
        customer: {
          email: safeEmail,
          phonenumber: safePhone,
          name: shippingInfo.fullName || 'Valued Client',
        },
        customizations: {
          title: process.env.NEXT_PUBLIC_APP_NAME || 'Certified Luxury World',
          description: `Escrow Payment for Order ${orderId}`,
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
        return NextResponse.json({
          success: false,
          message: `Flutterwave error: ${flwData.message || 'Payment link generation rejected'}`
        }, { status: 400 });
      }
    } catch (err: any) {
      console.error('[Flutterwave] Network error during payment init:', err);
      return NextResponse.json({
        success: false,
        message: `Could not connect to Flutterwave payment gateway: ${err.message}`
      }, { status: 500 });
    }

    // ── Sync to in-memory store for live logistics monitor ───────────────────────
    const inMemoryOrder = {
      id: orderId,
      customerName: shippingInfo.fullName, customerEmail: customerEmail || 'guest@example.com',
      customerPhone: shippingInfo.phone ?? '',
      vendorName: cartItems.map((i: { vendor?: string }) => i.vendor ?? 'Unknown').join(', '),
      vendorAddress: '',
      products: cartItems.map((i: { name: string }) => i.name),
      items: cartItems.map((i: { name: string; price?: number; quantity?: number; image?: string; vendor?: string; vendorId?: string; vendorRole?: string }, idx: number) => ({
        id: String(idx), name: i.name, price: i.price ?? 0, quantity: i.quantity ?? 1, image: i.image ?? '', vendor: i.vendor ?? '',
        vendorId: i.vendorId ?? '',
        vendorRole: i.vendorRole ?? 'vendor',
      })),
      total:         buyerTotal,
      subtotal:      fees.subtotal,
      tax:           fees.tax,
      status:        'pending' as const,
      paymentStatus: 'pending' as const,
      orderDate:     new Date().toISOString(),
      shippingAddress: `${shippingInfo.addressLine1 ?? shippingInfo.address ?? ''}, ${shippingInfo.city}, ${shippingInfo.state} ${shippingInfo.zipCode}`,
      estimatedDistance: '', estimatedTime: '',
      courier: { id: courierId ?? 'courierplus-standard', name: courierName ?? 'CourierPlus Standard Delivery', icon: courierIcon ?? '🚚', price: fees.shipping, eta: courierEta ?? '2–4 business days', carrier: courierCarrier ?? 'CourierPlus Nigeria', tracking: courierTracking ?? 'realtime' },
    };
    OrderStore.add(inMemoryOrder);

    // ── Dispatch Vendor Email & In-App Notifications (non-blocking) ────────────
    try {
      const { notifyVendorsNewOrder } = await import('@/backend/utils/vendorNotifications');
      notifyVendorsNewOrder(orderId).catch(notifErr => {
        console.error('[Orders API] Vendor new order notification failed:', notifErr);
      });
    } catch (importErr) {
      console.warn('[Orders API] Could not load vendor notification module:', importErr);
    }

    return NextResponse.json({
      success: true,
      paymentLink,
      flwPublicKey,
      flwAmount,
      flwCurrency,
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
