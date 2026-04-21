import { NextRequest } from 'next/server';
import { sendSuccess, sendError, sendNotFound, sendServerError } from '@/backend/utils/responseAppRouter';
import * as OrderStore from '@/lib/store/orders';
import { verifyAdminAuth } from '@/backend/utils/adminAuth';
import { verifyToken } from '@/backend/utils/jwt';
import { connectDB } from '@/backend/config/database';
import { Order, IOrder } from '@/backend/models/Order';

/**
 * GET /api/orders/[id]
 * Public — anyone with an order ID can track it (no auth required).
 * Checks MongoDB first, falls back to in-memory store.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Require authentication — orders contain PII
    const authHeader = request.headers.get('Authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    const payload = token ? verifyToken(token) : null;
    if (!payload) return sendError('Authentication required', 401);

    // Try MongoDB first
    try {
      await connectDB();
      const dbOrder = await Order.findOne({ orderId: id }).lean() as IOrder | null;
      if (dbOrder) {
        // Ownership check: only the customer who placed the order or an admin may view it
        const isOwner =
          (dbOrder.customerId && dbOrder.customerId.toString() === payload.userId) ||
          dbOrder.customerEmail === payload.email;
        const isAdmin = payload.role === 'admin';
        if (!isOwner && !isAdmin) return sendError('Access denied', 403);
        return sendSuccess({
          order: {
            id:            dbOrder.orderId,
            status:        dbOrder.status,
            orderDate:     dbOrder.createdAt,
            items:         dbOrder.items.map((i, idx) => ({
              id:       String(idx),
              name:     i.name,
              price:    i.price,
              quantity: i.quantity,
              image:    i.image ?? '',
              vendor:   i.vendor ?? '',
            })),
            products:      dbOrder.items.map(i => i.name),
            vendorName:    dbOrder.items[0]?.vendor ?? '',
            total:         dbOrder.total,
            subtotal:      dbOrder.subtotal,
            tax:           dbOrder.tax,
            shippingAddress: `${dbOrder.shippingAddress.addressLine1}, ${dbOrder.shippingAddress.city}, ${dbOrder.shippingAddress.state} ${dbOrder.shippingAddress.zipCode}`,
            courier:       dbOrder.courier,
            trackingNumber:     dbOrder.trackingNumber,
            assignedDriverName: dbOrder.assignedDriverName,
            acceptedAt:    dbOrder.acceptedAt,
            pickedUpAt:    dbOrder.pickedUpAt,
            deliveredAt:   dbOrder.deliveredAt,
          },
        });
      }
    } catch { /* fall through to in-memory */ }

    // Fall back to in-memory store (e.g. recently placed orders before DB write)
    const order = OrderStore.getById(id);
    if (!order) return sendNotFound('Order not found');
    return sendSuccess({ order });
  } catch (err) {
    console.error('[Orders] GET/:id error:', err);
    return sendServerError('Failed to load order');
  }
}

/**
 * PATCH /api/orders/[id]
 * Admin only — update status, tracking number, or payment status.
 * Body: { status?, trackingNumber?, paymentStatus? }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await verifyAdminAuth(request);
  if (error) return sendError(error, 401);

  try {
    const { id } = await params;

    const body = await request.json().catch(() => ({}));
    const { status, trackingNumber, paymentStatus } = body as {
      status?: OrderStore.OrderStatus;
      trackingNumber?: string;
      paymentStatus?: string;
    };

    const mongoUpdates: Record<string, unknown> = {};
    if (status)                        mongoUpdates.status        = status;
    if (trackingNumber !== undefined)  mongoUpdates.trackingNumber = trackingNumber;
    if (paymentStatus)                 mongoUpdates.paymentStatus  = paymentStatus;

    // Persist to MongoDB first (source of truth)
    if (Object.keys(mongoUpdates).length > 0) {
      try {
        await connectDB();
        await Order.findOneAndUpdate(
          { orderId: id },
          { $set: mongoUpdates },
          { new: true }
        );
      } catch (dbErr) {
        console.warn('[Orders] PATCH MongoDB update failed, falling back to memory:', dbErr);
      }
    }

    // Mirror to in-memory store (for logistics driver dashboard fallback)
    const inMemUpdates: Partial<OrderStore.StoredOrder> = {};
    if (status)                        inMemUpdates.status        = status;
    if (trackingNumber !== undefined)  inMemUpdates.trackingNumber = trackingNumber;
    if (paymentStatus)                 inMemUpdates.paymentStatus  = paymentStatus;

    const inMemOrder = OrderStore.getById(id);
    const updated = inMemOrder ? OrderStore.update(id, inMemUpdates) : null;

    return sendSuccess({ order: updated ?? { id, ...mongoUpdates } }, 'Order updated successfully');
  } catch (err) {
    console.error('[Orders] PATCH/:id error:', err);
    return sendServerError('Failed to update order');
  }
}
