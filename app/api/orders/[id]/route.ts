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
    let rawOrder = await Order.findById(id);
    if (!rawOrder) {
      rawOrder = await Order.findByOrderId(id);
    }
    if (!rawOrder) {
      try {
        const OrderStore = await import('@/lib/store/orders');
        const mem = OrderStore.getById(id);
        if (mem) rawOrder = mem as any;
      } catch {}
    }
    if (!rawOrder) return sendError('Order not found', 404);

    // Normalize shipping address safely (handles both object and string representations)
    let shippingAddressObj: any = {};
    if (typeof rawOrder.shippingAddress === 'string') {
      shippingAddressObj = {
        fullName: rawOrder.customerName || '',
        phone: rawOrder.customerPhone || '',
        addressLine1: rawOrder.shippingAddress,
        city: '',
        state: '',
        zipCode: '',
        country: '',
        formattedAddress: rawOrder.shippingAddress,
      };
    } else if (rawOrder.shippingAddress && typeof rawOrder.shippingAddress === 'object') {
      const sa = rawOrder.shippingAddress as any;
      const parts = [sa.addressLine1, sa.addressLine2, sa.city, sa.state, sa.zipCode, sa.country].filter(Boolean);
      shippingAddressObj = {
        fullName: sa.fullName || rawOrder.customerName || '',
        phone: sa.phone || rawOrder.customerPhone || '',
        addressLine1: sa.addressLine1 || '',
        addressLine2: sa.addressLine2 || '',
        city: sa.city || '',
        state: sa.state || '',
        zipCode: sa.zipCode || '',
        country: sa.country || '',
        formattedAddress: parts.join(', ') || sa.address || '',
      };
    }

    const order = {
      ...rawOrder,
      id: rawOrder.id,
      orderId: rawOrder.orderId || (rawOrder as any).id,
      orderDate: rawOrder.createdAt ? new Date(rawOrder.createdAt).toISOString() : (rawOrder as any).orderDate || new Date().toISOString(),
      createdAt: rawOrder.createdAt ? new Date(rawOrder.createdAt).toISOString() : new Date().toISOString(),
      shippingAddress: shippingAddressObj,
    };

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

    let order = await Order.findById(id);
    if (!order) {
      order = await Order.findByOrderId(id);
    }
    if (!order) return sendError('Order not found', 404);

    const body = await request.json().catch(() => ({}));

    // Authorize customer or admin for 'completed' status transition
    if (body.status === 'completed') {
      const isAdmin = payload.role === 'admin';
      const isCustomer = (order.customerId && payload.userId === order.customerId) ||
        (order.customerEmail && payload.email?.toLowerCase() === order.customerEmail.toLowerCase());
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
      const { initiateEscrow } = await import('@/backend/utils/escrow');
      await initiateEscrow(order.orderId);
      mongoUpdates.paymentStatus = 'paid';
      
      // Sync in-memory store
      try {
        const OrderStore = await import('@/lib/store/orders');
        OrderStore.update(order.orderId, { status: 'completed', paymentStatus: 'paid' });
      } catch {}
    }

    await Order.updateOne(order.id || id, mongoUpdates);

    // Dispatch status update notification to vendors
    if (body.status && body.status !== order.status) {
      try {
        const { notifyVendorsOrderUpdate } = await import('@/backend/utils/vendorNotifications');
        notifyVendorsOrderUpdate(order, body.status, {
          oldStatus: order.status,
          trackingNumber: order.trackingNumber,
        }).catch(err => console.error('[Orders ID] Vendor notification error:', err));
      } catch (notifErr) {
        console.warn('[Orders ID] Could not dispatch vendor notification:', notifErr);
      }
    }

    const updated = (await Order.findById(order.id || id)) || (await Order.findByOrderId(order.orderId || id));
    return sendSuccess({ order: updated ?? { id, ...mongoUpdates } }, 'Order updated successfully');
  } catch (err) {
    return sendServerError(err instanceof Error ? err.message : String(err));
  }
}
