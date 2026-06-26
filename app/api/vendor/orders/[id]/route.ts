import { NextRequest } from 'next/server';
import { Order } from '@/backend/models/Order';
import { Product } from '@/backend/models/Product';
import { verifyToken } from '@/backend/utils/jwt';
import { sendSuccess, sendError, sendNotFound, sendServerError } from '@/backend/utils/responseAppRouter';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const auth = request.headers.get('Authorization');
  if (!auth?.startsWith('Bearer ')) return sendError('Authentication required', 401);
  const payload = verifyToken(auth.slice(7));
  if (!payload) return sendError('Invalid or expired token', 401);
  if (payload.role !== 'vendor') return sendError('Vendor access only', 403);

  try {
    const vendorProducts = await Product.find({ vendorId: payload.userId }, { limit: 1000 });
    const productIds = new Set(vendorProducts.map(p => p.id));

    const order = await Order.findByOrderId(id);
    if (!order) return sendNotFound('Order not found');

    const vendorItems = order.items.filter(i => productIds.has(i.productId ?? ''));
    if (!vendorItems.length) return sendNotFound('Order not found');

    return sendSuccess({
      order: {
        id: order.orderId, orderNumber: order.orderId,
        customer: { name: order.customerName, email: order.customerEmail, phone: order.customerPhone ?? '' },
        items: vendorItems.map(i => ({ id: i.productId ?? '', name: i.name, image: i.image ?? null, size: i.size ?? '', color: i.color ?? '', quantity: i.quantity, price: i.price })),
        subtotal: vendorItems.reduce((s, i) => s + i.price * i.quantity, 0),
        shippingCost: order.shippingCost, tax: order.tax,
        total: vendorItems.reduce((s, i) => s + i.price * i.quantity, 0),
        status: order.status, trackingNumber: order.trackingNumber ?? null,
        shippingAddress: order.shippingAddress, createdAt: order.createdAt,
      },
    });
  } catch (err) {
    return sendServerError(err instanceof Error ? err.message : String(err));
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const auth = request.headers.get('Authorization');
  if (!auth?.startsWith('Bearer ')) return sendError('Authentication required', 401);
  const payload = verifyToken(auth.slice(7));
  if (!payload) return sendError('Invalid or expired token', 401);
  if (payload.role !== 'vendor') return sendError('Vendor access only', 403);

  try {
    const vendorProducts = await Product.find({ vendorId: payload.userId }, { limit: 1000 });
    const productIds = new Set(vendorProducts.map(p => p.id));

    const order = await Order.findByOrderId(id);
    if (!order) return sendNotFound('Order not found');
    if (!order.items.some(i => productIds.has(i.productId ?? ''))) return sendNotFound('Order not found');

    const body = await request.json().catch(() => ({})) as { status?: string; trackingNumber?: string; cancelReason?: string };
    const { status, trackingNumber, cancelReason } = body;

    const VALID: Record<string, string[]> = { pending: ['processing', 'cancelled'], processing: ['shipped', 'cancelled'], shipped: ['delivered'] };
    if (!status || !(VALID[order.status] ?? []).includes(status)) {
      return sendError(`Cannot transition from "${order.status}" to "${status ?? '—'}"`, 400);
    }
    if (status === 'shipped' && !trackingNumber?.trim()) {
      return sendError('A tracking number is required when marking as shipped', 400);
    }

    const updates: Record<string, unknown> = { status };
    if (status === 'shipped' && trackingNumber) updates.trackingNumber = trackingNumber.trim();
    if (status === 'cancelled' && cancelReason) updates.trackingNumber = `CANCELLED: ${cancelReason.trim()}`;

    await Order.updateOne(order.id!, updates);
    return sendSuccess({ orderId: id, status }, 'Order status updated');
  } catch (err) {
    return sendServerError(err instanceof Error ? err.message : String(err));
  }
}
