import { NextRequest } from 'next/server';
import { verifyToken } from '@/backend/utils/jwt';
import { sendSuccess, sendError, sendNotFound, sendServerError } from '@/backend/utils/responseAppRouter';
import { Order, IOrder } from '@/backend/models/Order';

function getDriver(request: NextRequest) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  return verifyToken(authHeader.split(' ')[1]);
}

function buildTimeline(order: IOrder) {
  const events: { status: string; time: string; description: string }[] = [];
  if (order.createdAt) {
    events.push({ status: 'Order Received',  time: new Date(order.createdAt).toISOString(),  description: 'Order placed by customer' });
  }
  if (order.acceptedAt) {
    events.push({ status: 'Accepted',        time: new Date(order.acceptedAt).toISOString(),  description: 'Driver accepted the delivery' });
  }
  if (order.pickedUpAt) {
    events.push({ status: 'Picked Up',       time: new Date(order.pickedUpAt).toISOString(),  description: 'Package picked up from vendor' });
  }
  if (order.deliveredAt) {
    events.push({ status: 'Delivered',       time: new Date(order.deliveredAt).toISOString(), description: 'Package delivered to customer' });
  }
  return events;
}

function formatAddress(addr?: IOrder['shippingAddress']) {
  if (!addr) return 'N/A';
  return [addr.addressLine1, addr.addressLine2, addr.city, addr.state, addr.zipCode]
    .filter(Boolean).join(', ');
}

/**
 * GET /api/logistics/orders/[id]
 * Returns a single delivery order by its Firestore doc id or orderId (ORD-xxx / DLV-xxx).
 * Reads from Firestore — no in-memory store.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const driver = getDriver(request);
  if (!driver) return sendError('Unauthorized', 401);
  if (driver.role !== 'logistics') return sendError('Access denied', 403);

  try {
    // Normalise id — strip DLV- prefix if present
    const cleanId = id.startsWith('DLV-') ? id.slice(4) : id;

    // Try by Firestore doc ID first, then by orderId field
    let order = await Order.findById(cleanId);
    if (!order) {
      // findById by orderId field (ORD-xxx)
      const candidates = await Order.find({ orderId: cleanId });
      order = candidates[0] ?? null;
    }
    if (!order) {
      // Also try original id without stripping (might be a raw doc id)
      order = await Order.findById(id);
    }
    if (!order) return sendNotFound('Order not found');

    // Security: logistics drivers can only see orders assigned to them or unassigned pending ones
    const isAssigned = order.assignedDriverId === driver.userId;
    const isPending   = order.status === 'pending' && !order.assignedDriverId;
    if (!isAssigned && !isPending) {
      return sendError('Access denied — not your order', 403);
    }

    const addr    = formatAddress(order.shippingAddress);
    const vendorName  = order.items?.[0]?.vendor ?? 'Vendor';
    const trackingNum = order.trackingNumber ?? order.orderId ?? order.id;

    return sendSuccess({
      order: {
        id:             `DLV-${order.orderId ?? order.id}`,
        orderId:        order.id,
        trackingNumber: trackingNum,
        status:         order.status,
        customer: {
          name:    order.customerName  ?? 'Customer',
          phone:   order.customerPhone ?? '',
          email:   order.customerEmail ?? '',
          address: addr,
        },
        sender: {
          name:    vendorName,
          address: 'Vendor location',
        },
        items:           order.items?.map(i => ({ id: i.productId ?? '', name: i.name, quantity: i.quantity })) ?? [],
        value:           order.total ?? 0,
        carrier:         order.courier?.name ?? 'Courier',
        courierName:     order.courier?.name ?? null,
        courierIcon:     order.courier?.icon ?? '🚚',
        deliveryFee:     order.shippingCost ?? 0,
        origin:          'Vendor location',
        destination:     addr,
        distance:        '—',
        estimatedTime:   order.courier?.eta ?? '—',
        pickupDate:      order.acceptedAt  ? new Date(order.acceptedAt).toISOString()  : (order.createdAt ? new Date(order.createdAt).toISOString() : null),
        deliveryDate:    order.deliveredAt ? new Date(order.deliveredAt).toISOString() : null,
        assignedDriverId:   order.assignedDriverId   ?? null,
        assignedDriverName: order.assignedDriverName ?? null,
        acceptedAt:  order.acceptedAt  ? new Date(order.acceptedAt).toISOString()  : null,
        pickedUpAt:  order.pickedUpAt  ? new Date(order.pickedUpAt).toISOString()  : null,
        deliveredAt: order.deliveredAt ? new Date(order.deliveredAt).toISOString() : null,
        timeline:    buildTimeline(order),
      },
    });
  } catch (err) {
    console.error('[Logistics/Orders/[id] GET]', err);
    return sendServerError(err instanceof Error ? err.message : 'Failed to load order');
  }
}
