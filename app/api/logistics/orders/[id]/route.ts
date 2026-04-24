import { NextRequest } from 'next/server';
import { verifyToken } from '@/backend/utils/jwt';
import { sendSuccess, sendError, sendNotFound } from '@/backend/utils/responseAppRouter';
import * as OrderStore from '@/lib/store/orders';

function getDriver(request: NextRequest) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  return verifyToken(authHeader.split(' ')[1]);
}

/**
 * GET /api/logistics/orders/[id]
 * Returns a single delivery order by its orderId (e.g. ORD-xxx).
 * The shipment detail page uses this to render real order data.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const driver = getDriver(request);
  if (!driver) return sendError('Unauthorized', 401);
  if (driver.role !== 'logistics') return sendError('Access denied', 403);

  // The shipment page uses the delivery ID (DLV-xxx) or the order ID (ORD-xxx).
  // Try both formats.
  let order = OrderStore.getById(id);
  if (!order) {
    // If prefixed as DLV- strip it and try as ORD-
    const orderId = id.startsWith('DLV-') ? `ORD-${id.slice(4)}` : id;
    order = OrderStore.getById(orderId);
  }
  if (!order) return sendNotFound('Order not found');

  return sendSuccess({
    order: {
      id:             `DLV-${order.id.replace('ORD-', '')}`,
      orderId:        order.id,
      trackingNumber: order.trackingNumber ?? order.id,
      status:         order.status,
      customer: {
        name:    order.customerName,
        phone:   order.customerPhone,
        email:   order.customerEmail,
        address: order.shippingAddress,
      },
      sender: {
        name:    order.vendorName,
        address: order.vendorAddress,
      },
      items:    order.items ?? order.products.map(name => ({ name, quantity: 1 })),
      weight:   null,
      value:    order.total,
      carrier:  order.courier?.carrier ?? order.courier?.name ?? 'Courier',
      courierName:   order.courier?.name,
      courierIcon:   order.courier?.icon,
      deliveryFee:   order.courier?.price ?? 0,
      insurance:     false,
      signatureRequired: false,
      origin:      order.vendorAddress,
      destination: order.shippingAddress,
      distance:    order.estimatedDistance,
      estimatedTime: order.estimatedTime,
      pickupDate:   order.acceptedAt ?? order.orderDate,
      deliveryDate: order.deliveredAt ?? order.courier?.eta ?? null,
      assignedDriverId:   order.assignedDriverId,
      assignedDriverName: order.assignedDriverName,
      acceptedAt:  order.acceptedAt,
      pickedUpAt:  order.pickedUpAt,
      deliveredAt: order.deliveredAt,
      orderDate:   order.orderDate,
      // Build a timeline from status timestamps
      timeline: [
        { status: 'Order Received', time: order.orderDate, description: 'Order placed by customer' },
        ...(order.acceptedAt  ? [{ status: 'Accepted',   time: order.acceptedAt,  description: 'Driver accepted the delivery' }] : []),
        ...(order.pickedUpAt  ? [{ status: 'Picked Up',  time: order.pickedUpAt,  description: 'Package picked up from vendor' }] : []),
        ...(order.deliveredAt ? [{ status: 'Delivered',  time: order.deliveredAt, description: 'Package delivered to customer' }] : []),
      ],
    },
  });
}
