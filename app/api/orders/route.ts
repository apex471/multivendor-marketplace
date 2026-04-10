import { NextRequest, NextResponse } from 'next/server';
import * as OrderStore from '@/lib/store/orders';

// POST /api/orders — place an order from checkout
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      shippingInfo, cartItems,
      courierId, courierName, courierIcon, courierPrice, courierEta, courierCarrier, courierTracking,
      subtotal, tax, total,
    } = body;

    if (!shippingInfo || !cartItems?.length) {
      return NextResponse.json({ success: false, message: 'Missing required order data' }, { status: 400 });
    }

    const orderId = `ORD-${Math.floor(Math.random() * 10_000_000)}`;
    const order = {
      id: orderId,
      customerName: shippingInfo.fullName,
      customerEmail: shippingInfo.email,
      vendorName: cartItems.map((i: { vendor: string }) => i.vendor).join(', '),
      products: cartItems.map((i: { name: string }) => i.name),
      total: total ?? 0,
      subtotal: subtotal ?? 0,
      tax: tax ?? 0,
      status: 'pending' as const,
      paymentStatus: 'paid' as const,
      orderDate: new Date().toISOString(),
      shippingAddress: `${shippingInfo.address}, ${shippingInfo.city}, ${shippingInfo.state} ${shippingInfo.zipCode}`,
      courier: {
        id: courierId ?? 'quickbox',
        name: courierName ?? 'QuickBox Express',
        icon: courierIcon ?? '🚀',
        price: courierPrice ?? 0,
        eta: courierEta ?? '—',
        carrier: courierCarrier ?? '—',
        tracking: courierTracking ?? 'standard',
      },
    };

    // Persist to shared store (replace with DB write in production)
    OrderStore.add({
      ...order,
      customerPhone: shippingInfo.phone ?? '',
      vendorAddress: '',
      estimatedDistance: '',
      estimatedTime: '',
    });

    return NextResponse.json({ success: true, data: { orderId, order } }, { status: 201 });
  } catch (err) {
    console.error('POST /api/orders error:', err);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}

// GET /api/orders — list all orders (admin use)
export async function GET() {
  const orders = OrderStore.getAll();
  return NextResponse.json({ success: true, data: { orders, total: orders.length } });
}
