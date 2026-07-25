import { NextRequest } from 'next/server';
import { Order, IOrderItem } from '@/backend/models/Order';
import { Product } from '@/backend/models/Product';
import { verifyToken } from '@/backend/utils/jwt';
import { sendSuccess, sendError, sendServerError } from '@/backend/utils/responseAppRouter';

export async function GET(request: NextRequest) {
  const auth = request.headers.get('Authorization');
  if (!auth?.startsWith('Bearer ')) return sendError('Authentication required', 401);
  const payload = verifyToken(auth.slice(7));
  if (!payload) return sendError('Invalid or expired token', 401);
  if (!['vendor', 'brand'].includes(payload.role)) return sendError('Vendor access only', 403);

  try {
    const vendorProducts = await Product.find({ vendorId: payload.userId }, { limit: 1000 });
    if (!vendorProducts.length) {
      return sendSuccess({ orders: [], total: 0, stats: { totalOrders: 0, revenue: 0, monthlyRevenue: 0 } });
    }

    const productIds = new Set(vendorProducts.map(p => p.id));

    const allOrders = await Order.find({}, { orderBy: 'createdAt', orderDir: 'desc', limit: 2000 });

    // Filter orders containing at least one of this vendor's products
    // Guard against orders with missing/null items array (data integrity issue)
    const vendorOrders = allOrders.filter(o =>
      Array.isArray(o.items) && o.items.some((i: IOrderItem) => productIds.has(i.productId ?? ''))
    );

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    let totalRevenue = 0;
    let monthlyRevenue = 0;

    const normalized = vendorOrders.map(o => {
      const vendorItems = (o.items ?? []).filter((i: IOrderItem) => productIds.has(i.productId ?? ''));
      const vendorSubtotal = vendorItems.reduce((s: number, i: IOrderItem) => s + i.price * i.quantity, 0);
      // Only count revenue from paid orders — do not inflate with pending/unpaid
      const isPaid = o.paymentStatus === 'paid';
      if (isPaid) totalRevenue += vendorSubtotal;
      if (isPaid && o.createdAt && new Date(o.createdAt) >= monthStart) monthlyRevenue += vendorSubtotal;

      // Guard against orders with missing/null shippingAddress (crash source)
      const addr = o.shippingAddress;
      const shippingAddress = [
        addr?.addressLine1,
        addr?.city,
        addr?.state,
        addr?.zipCode,
      ].filter(Boolean).join(', ');

      return {
        id: o.orderId, orderNumber: o.orderId,
        customer: { name: o.customerName ?? '', email: o.customerEmail ?? '' },
        items: vendorItems.map((i: IOrderItem) => ({ id: i.productId ?? '', name: i.name, image: i.image ?? null, quantity: i.quantity, price: i.price })),
        total: vendorSubtotal, status: o.status, paymentStatus: o.paymentStatus, createdAt: o.createdAt,
        shippingAddress,
      };
    });

    return sendSuccess({ orders: normalized, total: normalized.length, stats: { totalOrders: normalized.length, revenue: totalRevenue, monthlyRevenue } });
  } catch (err) {
    return sendServerError(err instanceof Error ? err.message : String(err));
  }
}
