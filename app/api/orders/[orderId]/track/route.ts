import { NextRequest } from 'next/server';
import { db, docToObject } from '@/backend/config/firebase';
import { Order, IOrder } from '@/backend/models/Order';
import { verifyToken } from '@/backend/utils/jwt';
import { sendSuccess, sendError, sendServerError } from '@/backend/utils/responseAppRouter';

function getAuth(req: NextRequest) {
  const h = req.headers.get('Authorization') ?? req.headers.get('authorization') ?? '';
  const tok = h.startsWith('Bearer ') ? h.slice(7) : null;
  return tok ? verifyToken(tok) : null;
}

// GET /api/orders/[orderId]/track
// Returns live delivery status for any order. Auth required.
// Accessible by: the customer who placed it, any vendor whose items are in it, admin, and the assigned driver.
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const { orderId } = await params;

  const payload = getAuth(req);
  if (!payload) return sendError('Authentication required', 401);

  try {
    const order = await Order.findById(orderId);
    if (!order) return sendError('Order not found', 404);

    // Access control: customer, assigned driver, vendor item, or admin
    const isCustomer = order.customerId === payload.userId;
    const isDriver   = order.assignedDriverId === payload.userId;
    const isAdmin    = payload.role === 'admin';
    const isVendor   = payload.role === 'vendor' || payload.role === 'brand';

    if (!isCustomer && !isDriver && !isAdmin && !isVendor) {
      return sendError('Access denied — this is not your order', 403);
    }

    // Fetch driver's live location if they're assigned and online
    let driverLocation: Record<string, unknown> | null = null;
    if (order.assignedDriverId) {
      try {
        const locSnap = await db.collection('driverLocations')
          .doc(order.assignedDriverId)
          .get();
        if (locSnap.exists) {
          const loc = locSnap.data()!;
          // Only share location if it's fresh (< 5 min old)
          const ageMs = Date.now() - new Date(loc.updatedAt).getTime();
          if (ageMs < 5 * 60 * 1000) {
            driverLocation = {
              lat:       loc.lat,
              lng:       loc.lng,
              area:      loc.area,
              heading:   loc.heading,
              speed:     loc.speed,
              updatedAt: loc.updatedAt,
            };
          }
        }
      } catch { /* non-fatal */ }
    }

    // Build timeline
    const timeline: { label: string; time: string | null; done: boolean }[] = [
      { label: 'Order Placed',   time: order.createdAt  ? new Date(order.createdAt).toISOString()  : null, done: true },
      { label: 'Driver Assigned', time: order.acceptedAt  ? new Date(order.acceptedAt).toISOString()  : null, done: !!order.assignedDriverId },
      { label: 'Picked Up',      time: order.pickedUpAt  ? new Date(order.pickedUpAt).toISOString()  : null, done: order.status === 'shipped' || order.status === 'delivered' },
      { label: 'In Transit',     time: order.pickedUpAt  ? new Date(order.pickedUpAt).toISOString()  : null, done: order.status === 'shipped' || order.status === 'delivered' },
      { label: 'Delivered',      time: order.deliveredAt ? new Date(order.deliveredAt).toISOString() : null, done: order.status === 'delivered' },
    ];

    const addr = order.shippingAddress;
    const dropoff = addr
      ? `${addr.addressLine1}${addr.addressLine2 ? ' ' + addr.addressLine2 : ''}, ${addr.city}, ${addr.state} ${addr.zipCode}, ${addr.country}`
      : 'Destination';

    return sendSuccess({
      tracking: {
        orderId:            order.id,
        orderRef:           order.orderId,
        status:             order.status,
        trackingNumber:     order.trackingNumber ?? null,
        customer:           order.customerName,
        dropoffAddress:     dropoff,
        courierName:        order.courier?.name ?? null,
        courierIcon:        order.courier?.icon ?? '🚚',
        estimatedDelivery:  order.courier?.eta ?? null,
        assignedDriverId:   order.assignedDriverId ?? null,
        assignedDriverName: order.assignedDriverName ?? null,
        driverLocation,
        timeline,
        items:              order.items ?? [],
        total:              order.total,
        shippingCost:       order.shippingCost,
      },
    });
  } catch (err) {
    console.error('[Track] error:', err);
    return sendServerError(err instanceof Error ? err.message : 'Failed to load tracking info');
  }
}
