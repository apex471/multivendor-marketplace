import { NextRequest } from 'next/server';
import { Order, IOrder } from '@/backend/models/Order';
import { verifyAdminAuth } from '@/backend/utils/adminAuth';
import { sendSuccess, sendError, sendServerError } from '@/backend/utils/responseAppRouter';

/** Normalize a Firestore IOrder into the flat shape the admin Orders UI expects */
function normalize(o: IOrder & { id: string }) {
  const addr = o.shippingAddress;
  const shippingAddress = addr
    ? `${addr.addressLine1}${addr.addressLine2 ? `, ${addr.addressLine2}` : ''}, ${addr.city}, ${addr.state} ${addr.zipCode}, ${addr.country}`
    : '';

  return {
    id:             o.orderId,          // UI uses `id` to identify orders
    firestoreId:    o.id,              // underlying Firestore doc ID
    customerName:   o.customerName,
    customerEmail:  o.customerEmail,
    vendorName:     [...new Set((o.items ?? []).map(i => i.vendor ?? 'Vendor').filter(Boolean))].join(', ') || 'N/A',
    products:       (o.items ?? []).map(i => `${i.name} ×${i.quantity}`),
    total:          o.total,
    status:         o.status,
    paymentStatus:  o.paymentStatus,
    orderDate:      o.createdAt ? new Date(o.createdAt).toISOString() : new Date().toISOString(),
    trackingNumber: o.trackingNumber,
    shippingAddress,
    courier: {
      id:       o.courier?.id      ?? 'unknown',
      name:     o.courier?.name    ?? 'Unknown',
      icon:     o.courier?.icon    ?? '📦',
      price:    o.courier?.price   ?? 0,
      eta:      o.courier?.eta     ?? '—',
      carrier:  o.courier?.carrier ?? '—',
      tracking: o.courier?.tracking ?? '—',
    },
    assignedDriverName: o.assignedDriverName,
    acceptedAt:  o.acceptedAt  ? new Date(o.acceptedAt).toISOString()  : undefined,
    pickedUpAt:  o.pickedUpAt  ? new Date(o.pickedUpAt).toISOString()  : undefined,
    deliveredAt: o.deliveredAt ? new Date(o.deliveredAt).toISOString() : undefined,
  };
}

export async function GET(request: NextRequest) {
  const { error } = await verifyAdminAuth(request);
  if (error) return sendError(error, 401);

  try {
    const sp     = new URL(request.url).searchParams;
    const page   = Math.max(1,  parseInt(sp.get('page')  || '1'));
    const limit  = Math.min(100, parseInt(sp.get('limit') || '50'));
    const status = sp.get('status') || '';
    const search = sp.get('search') || '';
    const courier = sp.get('courier') || '';

    const filter: Record<string, unknown> = {};
    if (status && status !== 'all') filter.status = status;

    let orders = await Order.find(filter, { orderBy: 'createdAt', orderDir: 'desc', limit: 2000 });

    if (search) {
      const q = search.toLowerCase();
      orders = orders.filter(o =>
        (o.orderId || '').toLowerCase().includes(q) ||
        (o.customerName || '').toLowerCase().includes(q) ||
        (o.customerEmail || '').toLowerCase().includes(q)
      );
    }

    if (courier && courier !== 'all') {
      orders = orders.filter(o => o.courier?.id === courier);
    }

    const total  = orders.length;
    const paged  = orders.slice((page - 1) * limit, page * limit);
    const mapped = paged.map(normalize);

    return sendSuccess({ orders: mapped, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (err) {
    console.error('[Admin Orders GET]', err);
    return sendServerError(err instanceof Error ? err.message : String(err));
  }
}

export async function PATCH(request: NextRequest) {
  const { error } = await verifyAdminAuth(request);
  if (error) return sendError(error, 401);

  try {
    const body = await request.json();
    const { orderId, status, paymentStatus, trackingNumber } = body;
    if (!orderId) return sendError('orderId is required', 400);

    // Try to find by orderId field (ORD-xxx) or Firestore doc ID
    let order = await Order.findByOrderId(orderId);
    if (!order) order = await Order.findById(orderId);
    if (!order) return sendError(`Order not found: ${orderId}`, 404);

    const updates: Record<string, unknown> = {};
    if (status)          updates.status         = status;
    if (paymentStatus)   updates.paymentStatus  = paymentStatus;
    if (trackingNumber !== undefined) updates.trackingNumber = trackingNumber;

    // Auto-set timestamps
    if (status === 'delivered' && !order.deliveredAt) updates.deliveredAt = new Date();

    await Order.updateOne(order.id!, updates);

    return sendSuccess({ order: normalize({ ...order, ...updates as Partial<IOrder> } as IOrder & { id: string }) },
      'Order updated successfully');
  } catch (err) {
    console.error('[Admin Orders PATCH]', err);
    return sendServerError(err instanceof Error ? err.message : String(err));
  }
}
