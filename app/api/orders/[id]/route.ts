import { NextRequest } from 'next/server';
import { sendSuccess, sendError, sendNotFound, sendServerError } from '@/backend/utils/responseAppRouter';
import * as OrderStore from '@/lib/store/orders';
import { verifyAdminAuth } from '@/backend/utils/adminAuth';
import { connectDB } from '@/backend/config/database';
import { Order } from '@/backend/models/Order';

/**
 * GET /api/orders/[id]
 * Public — anyone with an order ID can track it (no auth required).
 * Checks MongoDB first, falls back to in-memory store.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Try MongoDB first
    try {
      await connectDB();
      const dbOrder = await Order.findOne({ orderId: id }).lean();
      if (dbOrder) {
        return sendSuccess({
          order: {
            id:            dbOrder.orderId,
            status:        dbOrder.status,
            orderDate:     dbOrder.createdAt,
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
    if (!OrderStore.getById(id)) return sendNotFound('Order not found');

    const body = await request.json().catch(() => ({}));
    const { status, trackingNumber, paymentStatus } = body as {
      status?: OrderStore.OrderStatus;
      trackingNumber?: string;
      paymentStatus?: string;
    };

    const updates: Partial<OrderStore.StoredOrder> = {};
    if (status) updates.status = status;
    if (trackingNumber !== undefined) updates.trackingNumber = trackingNumber;
    if (paymentStatus) updates.paymentStatus = paymentStatus;

    const updated = OrderStore.update(id, updates);
    return sendSuccess({ order: updated }, 'Order updated successfully');
  } catch (err) {
    console.error('[Orders] PATCH/:id error:', err);
    return sendServerError('Failed to update order');
  }
}
