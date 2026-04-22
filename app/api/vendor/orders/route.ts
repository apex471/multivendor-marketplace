import { NextRequest } from 'next/server';
import { connectDB } from '@/backend/config/database';
import { Order, IOrderItem } from '@/backend/models/Order';
import { Product } from '@/backend/models/Product';
import { verifyToken } from '@/backend/utils/jwt';
import {
  sendSuccess,
  sendError,
  sendServerError,
} from '@/backend/utils/responseAppRouter';

/**
 * GET /api/vendor/orders
 * Authenticated (vendor) — returns all orders that contain at least one product
 * belonging to the authenticated vendor, along with aggregate stats.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return sendError('Authentication required', 401);
  }

  const payload = verifyToken(authHeader.slice(7));
  if (!payload) return sendError('Invalid or expired token', 401);
  if (!['vendor', 'brand'].includes(payload.role)) return sendError('Vendor access only', 403);

  try {
    await connectDB();

    // Collect all product IDs belonging to this vendor
    const vendorProducts = await Product.find({ vendorId: payload.userId })
      .select('_id')
      .lean();

    if (vendorProducts.length === 0) {
      return sendSuccess({
        orders: [],
        total: 0,
        stats: { totalOrders: 0, revenue: 0, monthlyRevenue: 0 },
      });
    }

    const productIds = vendorProducts.map(p => String(p._id));

    // Find all orders containing at least one of this vendor's products
    const orders = await Order.find({
      'items.productId': { $in: productIds },
    })
      .sort({ createdAt: -1 })
      .lean();

    // Compute stats
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    let totalRevenue = 0;
    let monthlyRevenue = 0;

    const normalized = orders.map(o => {
      // Only count items that belong to this vendor
      const allItems = o.items as IOrderItem[];
      const vendorItems = allItems.filter(i => productIds.includes(i.productId ?? ''));
      const vendorSubtotal = vendorItems.reduce((sum, i) => sum + i.price * i.quantity, 0);

      totalRevenue += vendorSubtotal;
      if (new Date(o.createdAt) >= monthStart) {
        monthlyRevenue += vendorSubtotal;
      }

      return {
        id:          o.orderId,
        orderNumber: o.orderId,
        customer: {
          name:  o.customerName,
          email: o.customerEmail,
        },
        items: vendorItems.map(i => ({
          id:       i.productId ?? '',
          name:     i.name,
          image:    i.image ?? null,
          quantity: i.quantity,
          price:    i.price,
        })),
        total:         vendorSubtotal,
        status:        o.status,
        paymentStatus: o.paymentStatus,
        createdAt:     o.createdAt,
        shippingAddress: [
          o.shippingAddress.addressLine1,
          o.shippingAddress.city,
          o.shippingAddress.state,
          o.shippingAddress.zipCode,
        ].filter(Boolean).join(', '),
      };
    });

    return sendSuccess({
      orders: normalized,
      total:  normalized.length,
      stats: {
        totalOrders:   normalized.length,
        revenue:       totalRevenue,
        monthlyRevenue,
      },
    });
  } catch (err) {
    console.error('[Vendor Orders] GET error:', err);
    return sendServerError('Failed to load vendor orders');
  }
}
