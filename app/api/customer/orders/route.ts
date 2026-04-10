import { NextRequest } from 'next/server';
import {
  sendSuccess,
  sendError,
  sendServerError,
} from '@/backend/utils/responseAppRouter';
import { connectDB } from '@/backend/config/database';
import { Order } from '@/backend/models/Order';
import { verifyToken } from '@/backend/utils/jwt';

/**
 * GET /api/customer/orders
 * Authenticated — returns the logged-in customer's order history.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return sendError('Authentication required', 401);
  }

  const payload = verifyToken(authHeader.slice(7));
  if (!payload) return sendError('Invalid or expired token', 401);

  try {
    await connectDB();

    // Query by customerId (ObjectId) if present, else fall back to email
    const query = payload.userId
      ? { customerId: payload.userId }
      : { customerEmail: payload.email.toLowerCase() };

    const orders = await Order.find(query)
      .sort({ createdAt: -1 })
      .lean();

    const normalized = orders.map(o => ({
      id:        o.orderId,
      date:      o.createdAt,
      status:    o.status,
      total:     o.total,
      itemCount: o.items.length,
      items: o.items.slice(0, 4).map((i: { productId?: string; name: string; image?: string; quantity: number }) => ({
        id:       i.productId ?? String(Math.random()),
        name:     i.name,
        image:    i.image || 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400',
        quantity: i.quantity,
      })),
    }));

    return sendSuccess({ orders: normalized, total: normalized.length });
  } catch (err) {
    console.error('[Customer Orders] GET error:', err);
    return sendServerError('Failed to load orders');
  }
}
