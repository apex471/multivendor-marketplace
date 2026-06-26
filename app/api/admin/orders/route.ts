import { NextRequest } from 'next/server';
import { Order } from '@/backend/models/Order';
import { verifyAdminAuth } from '@/backend/utils/adminAuth';
import { sendSuccess, sendError, sendServerError } from '@/backend/utils/responseAppRouter';

export async function GET(request: NextRequest) {
  const { error } = await verifyAdminAuth(request);
  if (error) return sendError(error, 401);

  try {
    const sp     = new URL(request.url).searchParams;
    const page   = Math.max(1,  parseInt(sp.get('page')  || '1'));
    const limit  = Math.min(50, parseInt(sp.get('limit') || '20'));
    const status = sp.get('status') || '';
    const search = sp.get('search') || '';

    const filter: Record<string, unknown> = {};
    if (status && status !== 'all') filter.status = status;

    let orders = await Order.find(filter, { orderBy: 'createdAt', orderDir: 'desc', limit: 2000 });

    if (search) {
      const q = search.toLowerCase();
      orders = orders.filter(o =>
        o.orderId.toLowerCase().includes(q) ||
        o.customerName.toLowerCase().includes(q) ||
        o.customerEmail.toLowerCase().includes(q)
      );
    }

    const total = orders.length;
    const paged = orders.slice((page - 1) * limit, page * limit);

    return sendSuccess({ orders: paged, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (err) {
    return sendServerError(err instanceof Error ? err.message : String(err));
  }
}

export async function PATCH(request: NextRequest) {
  const { error } = await verifyAdminAuth(request);
  if (error) return sendError(error, 401);

  try {
    const { orderId, status, paymentStatus } = await request.json();
    if (!orderId) return sendError('orderId is required', 400);

    const order = await Order.findByOrderId(orderId);
    if (!order) return sendError('Order not found', 404);

    const updates: Record<string, unknown> = {};
    if (status) updates.status = status;
    if (paymentStatus) updates.paymentStatus = paymentStatus;
    await Order.updateOne(order.id!, updates);

    return sendSuccess({ order: { ...order, ...updates } });
  } catch (err) {
    return sendServerError(err instanceof Error ? err.message : String(err));
  }
}
