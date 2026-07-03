import { NextRequest } from 'next/server';
import { db, docToObject } from '@/backend/config/firebase';
import { Order, IOrder } from '@/backend/models/Order';
import { User } from '@/backend/models/User';
import { Notification } from '@/backend/models/Notification';
import { verifyToken } from '@/backend/utils/jwt';
import { sendSuccess, sendError, sendServerError } from '@/backend/utils/responseAppRouter';

function getAuth(req: NextRequest) {
  const h = req.headers.get('Authorization') ?? req.headers.get('authorization') ?? '';
  const tok = h.startsWith('Bearer ') ? h.slice(7) : null;
  return tok ? verifyToken(tok) : null;
}

function formatOrder(o: IOrder & { id: string }) {
  const addr = o.shippingAddress;
  const dropoff = addr
    ? `${addr.addressLine1}${addr.addressLine2 ? ' ' + addr.addressLine2 : ''}, ${addr.city}, ${addr.state} ${addr.zipCode}`
    : 'N/A';
  return {
    id:             `DLV-${o.orderId}`,
    orderId:        o.id,
    orderRef:       o.orderId,
    customer:       o.customerName,
    customerPhone:  o.customerPhone ?? '',
    pickupStore:    o.items?.[0]?.vendor ?? 'Vendor',
    pickupAddress:  'Vendor location',
    dropoffAddress: dropoff,
    distance:       '—',
    estimatedTime:  o.courier?.eta ?? '—',
    items:          o.items?.map(i => i.name) ?? [],
    itemCount:      o.items?.length ?? 0,
    orderValue:     o.total,
    deliveryFee:    o.shippingCost,
    courierName:    o.courier?.name ?? '',
    courierIcon:    o.courier?.icon ?? '🚚',
    status:         o.status,
    acceptedAt:     o.acceptedAt ? new Date(o.acceptedAt).toISOString() : undefined,
    pickedUpAt:     o.pickedUpAt ? new Date(o.pickedUpAt).toISOString() : undefined,
    deliveredAt:    o.deliveredAt ? new Date(o.deliveredAt).toISOString() : undefined,
    createdAt:      o.createdAt ? new Date(o.createdAt).toISOString() : new Date().toISOString(),
    trackingNumber: o.trackingNumber,
    assignedDriverId:   o.assignedDriverId,
    assignedDriverName: o.assignedDriverName,
    customerId:         o.customerId,
  };
}

/**
 * GET /api/logistics/orders
 * ?type=queue    → unassigned 'pending' orders
 * ?type=active   → orders assigned to this driver (processing/shipped)
 * ?type=history  → this driver's delivered/cancelled orders
 */
export async function GET(request: NextRequest) {
  const payload = getAuth(request);
  if (!payload) return sendError('Unauthorized', 401);
  if (payload.role !== 'logistics') return sendError('Access denied', 403);

  const type = new URL(request.url).searchParams.get('type') ?? 'queue';

  try {
    if (type === 'queue') {
      // Pending orders with no assigned driver
      const snap = await db.collection('orders')
        .where('status', '==', 'pending')
        .limit(50)
        .get();
      const orders = snap.docs
        .map(d => docToObject<IOrder>(d)!)
        .filter(o => !o.assignedDriverId)
        .map(formatOrder);
      return sendSuccess({ orders, total: orders.length });
    }

    if (type === 'active') {
      const snap = await db.collection('orders')
        .where('assignedDriverId', '==', payload.userId)
        .limit(5)
        .get();
      const active = snap.docs
        .map(d => docToObject<IOrder>(d)!)
        .filter(o => o.status === 'processing' || o.status === 'shipped')
        .map(formatOrder);
      return sendSuccess({ orders: active, order: active[0] ?? null });
    }

    if (type === 'history') {
      const snap = await db.collection('orders')
        .where('assignedDriverId', '==', payload.userId)
        .limit(100)
        .get();
      const history = snap.docs
        .map(d => docToObject<IOrder>(d)!)
        .filter(o => o.status === 'delivered' || o.status === 'cancelled')
        .sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime())
        .map(formatOrder);
      return sendSuccess({ orders: history, total: history.length });
    }

    return sendError('Invalid type param — use queue | active | history', 400);
  } catch (err) {
    console.error('[Logistics/Orders GET]', err);
    return sendServerError(err instanceof Error ? err.message : 'Failed to load orders');
  }
}

/**
 * PATCH /api/logistics/orders
 * Body: { orderId, action, driverName? }
 * action: 'accept' | 'decline' | 'pickup' | 'transit' | 'delivered'
 */
export async function PATCH(request: NextRequest) {
  const payload = getAuth(request);
  if (!payload) return sendError('Unauthorized', 401);
  if (payload.role !== 'logistics') return sendError('Access denied', 403);

  const body = await request.json().catch(() => ({})) as {
    orderId?: string; action?: string; driverName?: string;
  };
  const { orderId, action, driverName } = body;

  if (!orderId) return sendError('orderId is required', 400);
  if (!action)  return sendError('action is required', 400);

  try {
    const order = await Order.findById(orderId);
    if (!order) return sendError('Order not found', 404);

    const now = new Date();

    // Fetch driver info for notifications
    let driverDisplayName = driverName ?? 'Your driver';
    try {
      const u = await User.findById(payload.userId);
      if (u) driverDisplayName = u.storeName ?? `${u.firstName} ${u.lastName ?? ''}`.trim();
    } catch { /* non-fatal */ }

    const notifyCustomer = async (text: string, link: string) => {
      if (!order.customerId) return;
      Notification.create({
        recipientId: order.customerId,
        type:        'order',
        actorId:     payload.userId,
        actorName:   driverDisplayName,
        text,
        link,
        isRead:      false,
      }).catch(() => {});
    };

    switch (action) {
      case 'accept': {
        if (order.assignedDriverId && order.assignedDriverId !== payload.userId) {
          return sendError('Order already taken by another driver', 409);
        }
        await Order.updateById(orderId, {
          status:             'processing',
          assignedDriverId:   payload.userId,
          assignedDriverName: driverDisplayName,
          acceptedAt:         now,
          updatedAt:          now,
        });
        await notifyCustomer(
          `${driverDisplayName} has accepted your order and is heading to pick it up`,
          `/track/${order.orderId}`
        );
        break;
      }

      case 'decline': {
        await Order.updateById(orderId, {
          assignedDriverId:   undefined,
          assignedDriverName: undefined,
          acceptedAt:         undefined,
          status:             'pending',
          updatedAt:          now,
        });
        break;
      }

      case 'pickup': {
        if (order.assignedDriverId !== payload.userId) return sendError('Not your order', 403);
        await Order.updateById(orderId, { status: 'shipped', pickedUpAt: now, updatedAt: now });
        await notifyCustomer(
          `${driverDisplayName} has picked up your order and is on the way! 🚚`,
          `/track/${order.orderId}`
        );
        break;
      }

      case 'transit': {
        if (order.assignedDriverId !== payload.userId) return sendError('Not your order', 403);
        // transit is the same as shipped — UI stage only
        await Order.updateById(orderId, { status: 'shipped', updatedAt: now });
        break;
      }

      case 'delivered': {
        if (order.assignedDriverId !== payload.userId) return sendError('Not your order', 403);
        await Order.updateById(orderId, { status: 'delivered', deliveredAt: now, updatedAt: now });
        await notifyCustomer(
          `Your order has been delivered! 🎉 Please rate your experience`,
          `/orders/${order.orderId}`
        );
        break;
      }

      default:
        return sendError('Invalid action — use accept | decline | pickup | transit | delivered', 400);
    }

    const updated = await Order.findById(orderId);
    return sendSuccess({ order: updated ? formatOrder(updated) : null });
  } catch (err) {
    console.error('[Logistics/Orders PATCH]', err);
    return sendServerError(err instanceof Error ? err.message : 'Failed to update order');
  }
}
