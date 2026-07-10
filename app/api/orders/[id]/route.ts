import { NextRequest } from 'next/server';
import { Order } from '@/backend/models/Order';
import { verifyToken } from '@/backend/utils/jwt';
import { sendSuccess, sendError, sendServerError } from '@/backend/utils/responseAppRouter';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const order = await Order.findById(id);
    if (!order) return sendError('Order not found', 404);
    return sendSuccess({ order });
  } catch (err) {
    return sendServerError(err instanceof Error ? err.message : String(err));
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const auth = request.headers.get('Authorization');
    if (!auth?.startsWith('Bearer ')) return sendError('Unauthorized', 401);
    const payload = verifyToken(auth.slice(7));
    if (!payload) return sendError('Invalid token', 401);

    const order = await Order.findById(id);
    if (!order) return sendError('Order not found', 404);

    const body = await request.json().catch(() => ({}));

    // Authorize customer or admin for 'completed' status transition
    if (body.status === 'completed') {
      const isAdmin = payload.role === 'admin';
      const isCustomer = payload.userId === order.customerId;
      if (!isAdmin && !isCustomer) {
        return sendError('Access denied: Only the customer who placed this order or an admin can mark it as completed', 403);
      }
    }

    const mongoUpdates: Record<string, unknown> = {};
    if (body.status) mongoUpdates.status = body.status;
    if (body.paymentStatus) mongoUpdates.paymentStatus = body.paymentStatus;
    if (body.trackingNumber) mongoUpdates.trackingNumber = body.trackingNumber;
    if (body.assignedDriverId) mongoUpdates.assignedDriverId = body.assignedDriverId;
    if (body.assignedDriverName) mongoUpdates.assignedDriverName = body.assignedDriverName;
    if (body.acceptedAt) mongoUpdates.acceptedAt = new Date(body.acceptedAt);
    if (body.pickedUpAt) mongoUpdates.pickedUpAt = new Date(body.pickedUpAt);
    if (body.deliveredAt) mongoUpdates.deliveredAt = new Date(body.deliveredAt);

    // Trigger escrow release if transition to completed
    if (body.status === 'completed' && order.status !== 'completed') {
      const { releaseEscrow } = await import('@/backend/utils/escrow');
      await releaseEscrow(order.orderId);
      mongoUpdates.paymentStatus = 'paid';
      
      // Sync in-memory store
      try {
        const OrderStore = await import('@/lib/store/orders');
        OrderStore.update(order.orderId, { status: 'completed', paymentStatus: 'paid' });
      } catch {}
    }

    await Order.updateOne(id, mongoUpdates);
    const updated = await Order.findById(id);
    return sendSuccess({ order: updated ?? { id, ...mongoUpdates } }, 'Order updated successfully');
  } catch (err) {
    return sendServerError(err instanceof Error ? err.message : String(err));
  }
}
