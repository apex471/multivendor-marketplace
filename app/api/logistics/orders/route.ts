import { NextRequest } from 'next/server';
import { verifyToken } from '@/backend/utils/jwt';
import { sendSuccess, sendError } from '@/backend/utils/responseAppRouter';
import * as OrderStore from '@/lib/store/orders';

// ── Map StoredOrder → DeliveryOrder shape expected by the dashboard ───────────
function toDelivery(o: OrderStore.StoredOrder) {
  return {
    id:             `DLV-${o.id.replace('ORD-', '')}`,
    orderId:        o.id,
    customer:       o.customerName,
    customerPhone:  o.customerPhone,
    pickupStore:    o.vendorName,
    pickupAddress:  o.vendorAddress,
    dropoffAddress: o.shippingAddress,
    distance:       o.estimatedDistance,
    estimatedTime:  o.estimatedTime,
    items:          o.products,
    itemCount:      o.products.length,
    orderValue:     o.total,
    deliveryFee:    o.courier.price,
    courierName:    o.courier.name,
    courierIcon:    o.courier.icon,
    status:         o.status,
    acceptedAt:     o.acceptedAt,
    pickedUpAt:     o.pickedUpAt,
    deliveredAt:    o.deliveredAt,
    createdAt:      o.orderDate,
  };
}

// ── Auth helper ───────────────────────────────────────────────────────────────
function getDriver(request: NextRequest) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  return verifyToken(authHeader.split(' ')[1]);
}

/**
 * GET /api/logistics/orders
 * ?type=queue    → unassigned pending orders (the incoming queue)
 * ?type=active   → order currently being delivered by this driver
 * ?type=history  → this driver's delivered/cancelled orders
 */
export async function GET(request: NextRequest) {
  const driver = getDriver(request);
  if (!driver) return sendError('Unauthorized', 401);
  if (driver.role !== 'logistics') return sendError('Access denied', 403);

  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') ?? 'queue';

  if (type === 'queue') {
    const orders = OrderStore.getQueue().map(toDelivery);
    return sendSuccess({ orders, total: orders.length });
  }

  if (type === 'active') {
    const active = OrderStore.getDriverActive(driver.userId);
    return sendSuccess({ order: active ? toDelivery(active) : null });
  }

  if (type === 'history') {
    const orders = OrderStore.getDriverHistory(driver.userId).map(toDelivery);
    return sendSuccess({ orders, total: orders.length });
  }

  return sendError('Invalid type param — use queue | active | history', 400);
}

/**
 * PATCH /api/logistics/orders
 * Body: { orderId, action, driverName? }
 * action: 'accept' | 'decline' | 'pickup' | 'transit' | 'delivered'
 */
export async function PATCH(request: NextRequest) {
  const driver = getDriver(request);
  if (!driver) return sendError('Unauthorized', 401);
  if (driver.role !== 'logistics') return sendError('Access denied', 403);

  const body = await request.json().catch(() => ({}));
  const { orderId, action, driverName } = body as {
    orderId?: string;
    action?: string;
    driverName?: string;
  };

  if (!orderId) return sendError('orderId is required', 400);
  if (!action)  return sendError('action is required', 400);

  const order = OrderStore.getById(orderId);
  if (!order) return sendError('Order not found', 404);

  const now = new Date().toISOString();

  switch (action) {
    case 'accept': {
      if (order.assignedDriverId && order.assignedDriverId !== driver.userId) {
        return sendError('Order already taken by another driver', 409);
      }
      const updated = OrderStore.update(orderId, {
        status:             'processing',
        assignedDriverId:   driver.userId,
        assignedDriverName: driverName ?? driver.email,
        acceptedAt:         now,
      });
      return sendSuccess({ order: updated ? toDelivery(updated) : null });
    }

    case 'decline': {
      // Just remove driver assignment so it goes back to queue
      const updated = OrderStore.update(orderId, {
        assignedDriverId:   undefined,
        assignedDriverName: undefined,
        acceptedAt:         undefined,
      });
      return sendSuccess({ order: updated ? toDelivery(updated) : null });
    }

    case 'pickup': {
      if (order.assignedDriverId !== driver.userId) return sendError('Not your order', 403);
      const updated = OrderStore.update(orderId, { status: 'shipped', pickedUpAt: now });
      return sendSuccess({ order: updated ? toDelivery(updated) : null });
    }

    case 'transit': {
      if (order.assignedDriverId !== driver.userId) return sendError('Not your order', 403);
      // Already shipped — just return current state (transit is a local UI stage)
      return sendSuccess({ order: toDelivery(order) });
    }

    case 'delivered': {
      if (order.assignedDriverId !== driver.userId) return sendError('Not your order', 403);
      const updated = OrderStore.update(orderId, { status: 'delivered', deliveredAt: now });
      return sendSuccess({ order: updated ? toDelivery(updated) : null });
    }

    default:
      return sendError('Invalid action — use accept | decline | pickup | transit | delivered', 400);
  }
}
