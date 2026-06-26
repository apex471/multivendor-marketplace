import { NextRequest } from 'next/server';
import { Order } from '@/backend/models/Order';
import { verifyToken } from '@/backend/utils/jwt';
import {
  sendSuccess,
  sendError,
  sendServerError,
} from '@/backend/utils/responseAppRouter';

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return sendError('Authentication required', 401);

  const payload = verifyToken(authHeader.slice(7));
  if (!payload) return sendError('Invalid or expired token', 401);

  try {
    const query = payload.userId
      ? { customerId: payload.userId }
      : { customerEmail: payload.email.toLowerCase() };

    const orders = await Order.find(query, { orderBy: 'createdAt', orderDir: 'desc' });

    const normalized = orders.map(o => ({
      id:        o.orderId,
      date:      o.createdAt,
      status:    o.status,
      total:     o.total,
      itemCount: o.items.length,
      items: o.items.slice(0, 4).map((i, idx) => ({
        id:       i.productId ?? `item-${idx}`,
        name:     i.name,
        image:    i.image || null,
        quantity: i.quantity,
      })),
    }));

    return sendSuccess({ orders: normalized, total: normalized.length });
  } catch (err) {
    console.error('[Customer Orders] GET error:', err);
    return sendServerError('Failed to load orders');
  }
}
