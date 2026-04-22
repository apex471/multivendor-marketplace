import { NextRequest } from 'next/server';
import { connectDB } from '@/backend/config/database';
import { Order, IOrder, IOrderItem } from '@/backend/models/Order';
import { Product } from '@/backend/models/Product';
import { verifyToken } from '@/backend/utils/jwt';
import {
  sendSuccess,
  sendError,
  sendNotFound,
  sendServerError,
} from '@/backend/utils/responseAppRouter';

async function getVendorProductIds(vendorUserId: string): Promise<string[]> {
  const prods = await Product.find({ vendorId: vendorUserId }).select('_id').lean();
  return prods.map(p => String(p._id));
}

/**
 * GET /api/vendor/orders/[id]
 * Returns full order detail for an order that contains at least one of the
 * authenticated vendor's products.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return sendError('Authentication required', 401);
  const payload = verifyToken(authHeader.slice(7));
  if (!payload) return sendError('Invalid or expired token', 401);
  if (payload.role !== 'vendor') return sendError('Vendor access only', 403);

  try {
    const { id } = await params;
    await connectDB();

    const productIds = await getVendorProductIds(payload.userId);

    const order = await Order.findOne({
      orderId: id,
      'items.productId': { $in: productIds },
    }).lean() as IOrder | null;

    if (!order) return sendNotFound('Order not found');

    // Only expose items that belong to this vendor
    const vendorItems: IOrderItem[] = order.items.filter(i => productIds.includes(i.productId ?? ''));

    return sendSuccess({
      order: {
        id:          order.orderId,
        orderNumber: order.orderId,
        customer: {
          name:  order.customerName,
          email: order.customerEmail,
          phone: order.customerPhone ?? '',
        },
        items: vendorItems.map(i => ({
          id:       i.productId ?? '',
          name:     i.name,
          image:    i.image ?? null,
          size:     i.size  ?? '',
          color:    i.color ?? '',
          quantity: i.quantity,
          price:    i.price,
        })),
        subtotal:    vendorItems.reduce((s, i) => s + i.price * i.quantity, 0),
        shippingCost: order.shippingCost,
        tax:         order.tax,
        total:       vendorItems.reduce((s, i) => s + i.price * i.quantity, 0),
        status:      order.status,
        trackingNumber: order.trackingNumber ?? null,
        shippingAddress: order.shippingAddress,
        createdAt:   order.createdAt,
      },
    });
  } catch (err) {
    console.error('[Vendor Orders] GET/:id error:', err);
    return sendServerError('Failed to load order');
  }
}

/**
 * PATCH /api/vendor/orders/[id]
 * Allows the vendor to update status of their own orders.
 * Valid transitions:
 *   pending → processing | cancelled
 *   processing → shipped | cancelled
 *   shipped → delivered
 * Body: { status: string, trackingNumber?: string, cancelReason?: string }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return sendError('Authentication required', 401);
  const payload = verifyToken(authHeader.slice(7));
  if (!payload) return sendError('Invalid or expired token', 401);
  if (payload.role !== 'vendor') return sendError('Vendor access only', 403);

  try {
    const { id } = await params;
    await connectDB();

    const productIds = await getVendorProductIds(payload.userId);

    const order = await Order.findOne({
      orderId: id,
      'items.productId': { $in: productIds },
    });

    if (!order) return sendNotFound('Order not found');

    const body = await request.json().catch(() => ({})) as {
      status?: string;
      trackingNumber?: string;
      cancelReason?: string;
    };

    const { status, trackingNumber, cancelReason } = body;

    // Validate transition
    const VALID_TRANSITIONS: Record<string, string[]> = {
      pending:    ['processing', 'cancelled'],
      processing: ['shipped', 'cancelled'],
      shipped:    ['delivered'],
    };

    const allowed = VALID_TRANSITIONS[order.status] ?? [];
    if (!status || !allowed.includes(status)) {
      return sendError(
        `Cannot transition from "${order.status}" to "${status ?? '—'}"`,
        400
      );
    }

    if (status === 'shipped' && !trackingNumber?.trim()) {
      return sendError('A tracking number is required when marking as shipped', 400);
    }

    // Apply update
    order.status = status as typeof order.status;
    if (status === 'shipped' && trackingNumber) {
      order.trackingNumber = trackingNumber.trim();
    }
    if (status === 'cancelled' && cancelReason) {
      // Store cancel reason as a note (reuse trackingNumber field or add to courier notes)
      // We embed it in the trackingNumber field with a prefix for now
      order.trackingNumber = `CANCELLED: ${cancelReason.trim()}`;
    }

    await order.save();

    return sendSuccess(
      { orderId: order.orderId, status: order.status },
      'Order status updated'
    );
  } catch (err) {
    console.error('[Vendor Orders] PATCH/:id error:', err);
    return sendServerError('Failed to update order');
  }
}
