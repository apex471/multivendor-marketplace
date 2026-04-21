import { NextRequest, NextResponse } from 'next/server';
import * as OrderStore from '@/lib/store/orders';
import { connectDB } from '@/backend/config/database';
import { Order } from '@/backend/models/Order';
import { verifyToken } from '@/backend/utils/jwt';

// POST /api/orders — place an order from checkout
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      shippingInfo, cartItems,
      courierId, courierName, courierIcon, courierPrice, courierEta, courierCarrier, courierTracking,
      subtotal, tax, total, shippingCost, discount, couponCode, paymentMethod,
    } = body;

    if (!shippingInfo || !cartItems?.length) {
      return NextResponse.json({ success: false, message: 'Missing required order data' }, { status: 400 });
    }

    // Extract customer identity from JWT if present
    let customerId: string | undefined;
    let customerEmail = shippingInfo.email ?? '';
    const authHeader = request.headers.get('Authorization');
    if (authHeader?.startsWith('Bearer ')) {
      const payload = verifyToken(authHeader.slice(7));
      if (payload) {
        customerId = payload.userId;
        if (!customerEmail) customerEmail = payload.email;
      }
    }

    const { randomBytes } = await import('crypto');
    const orderId = `ORD-${Date.now()}-${randomBytes(4).toString('hex').toUpperCase()}`;

    await connectDB();

    // Persist to MongoDB
    await new Order({
      orderId,
      ...(customerId ? { customerId } : {}),
      customerName:  shippingInfo.fullName,
      customerEmail: customerEmail || 'guest@example.com',
      customerPhone: shippingInfo.phone ?? '',
      items: cartItems.map((i: { id?: string; productId?: string; name: string; price: number; quantity: number; image?: string; vendor?: string; size?: string; color?: string }) => ({
        productId: i.productId ?? i.id ?? '',
        name:      i.name,
        price:     i.price,
        quantity:  i.quantity,
        image:     i.image ?? '',
        vendor:    i.vendor ?? '',
        size:      i.size,
        color:     i.color,
      })),
      shippingAddress: {
        fullName:     shippingInfo.fullName,
        phone:        shippingInfo.phone ?? '',
        addressLine1: shippingInfo.addressLine1 ?? shippingInfo.address ?? '',
        addressLine2: shippingInfo.addressLine2,
        city:         shippingInfo.city,
        state:        shippingInfo.state,
        zipCode:      shippingInfo.zipCode,
        country:      shippingInfo.country ?? 'United States',
      },
      paymentMethod: {
        type:      paymentMethod?.type ?? 'mock',
        cardLast4: paymentMethod?.cardNumber?.slice(-4),
        cardHolder: paymentMethod?.cardHolder,
      },
      courier: {
        id:       courierId    ?? 'quickbox',
        name:     courierName  ?? 'QuickBox Express',
        icon:     courierIcon  ?? '🚀',
        price:    courierPrice ?? 0,
        eta:      courierEta   ?? '—',
        carrier:  courierCarrier  ?? '—',
        tracking: courierTracking ?? 'standard',
      },
      subtotal:     subtotal     ?? 0,
      shippingCost: shippingCost ?? 0,
      tax:          tax          ?? 0,
      discount:     discount     ?? 0,
      total:        total        ?? 0,
      couponCode:   couponCode   || undefined,
      status:        'pending',
      paymentStatus: 'paid',
    }).save();

    // Also keep in-memory store so the logistics driver dashboard still works
    const inMemoryOrder = {
      id:            orderId,
      customerName:  shippingInfo.fullName,
      customerEmail: customerEmail || 'guest@example.com',
      customerPhone: shippingInfo.phone ?? '',
      vendorName:    cartItems.map((i: { vendor?: string }) => i.vendor ?? 'Unknown').join(', '),
      vendorAddress: '',
      products:      cartItems.map((i: { name: string }) => i.name),
      items:         cartItems.map((i: { name: string; price?: number; quantity?: number; image?: string; vendor?: string }, idx: number) => ({
        id:       String(idx),
        name:     i.name,
        price:    i.price    ?? 0,
        quantity: i.quantity ?? 1,
        image:    i.image    ?? '',
        vendor:   i.vendor   ?? '',
      })),
      total:         total        ?? 0,
      subtotal:      subtotal     ?? 0,
      tax:           tax          ?? 0,
      status:        'pending' as const,
      paymentStatus: 'paid' as const,
      orderDate:     new Date().toISOString(),
      shippingAddress: `${shippingInfo.addressLine1 ?? shippingInfo.address ?? ''}, ${shippingInfo.city}, ${shippingInfo.state} ${shippingInfo.zipCode}`,
      estimatedDistance: '',
      estimatedTime:     '',
      courier: {
        id:       courierId    ?? 'quickbox',
        name:     courierName  ?? 'QuickBox Express',
        icon:     courierIcon  ?? '🚀',
        price:    courierPrice ?? 0,
        eta:      courierEta   ?? '—',
        carrier:  courierCarrier  ?? '—',
        tracking: courierTracking ?? 'standard',
      },
    };
    OrderStore.add(inMemoryOrder);

    return NextResponse.json({ success: true, data: { orderId, order: inMemoryOrder } }, { status: 201 });
  } catch (err) {
    console.error('POST /api/orders error:', err);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}

// GET /api/orders — list all orders (admin use, reads from MongoDB)
export async function GET() {
  try {
    await connectDB();
    const orders = await Order.find().sort({ createdAt: -1 }).lean();
    return NextResponse.json({ success: true, data: { orders, total: orders.length } });
  } catch {
    // Fallback to in-memory store if DB unavailable
    const orders = OrderStore.getAll();
    return NextResponse.json({ success: true, data: { orders, total: orders.length } });
  }
}
