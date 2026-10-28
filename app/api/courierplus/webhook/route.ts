import { NextRequest } from 'next/server';
import { db } from '@/backend/config/firebase';
import { FieldValue } from 'firebase-admin/firestore';
import { sendSuccess, sendError, sendServerError } from '@/backend/utils/responseAppRouter';

const COURIERPLUS_SECRET =
  process.env.COURIERPLUS_SECRET || 'kesJtOVxpqFi2xnqrsgQGj5KTCoGkCY4';

// Status map: CourierPlus statuses → platform order statuses
const STATUS_MAP: Record<string, string> = {
  picked_up: 'picked_up',
  'in-transit': 'in_transit',
  in_transit: 'in_transit',
  'out-for-delivery': 'out_for_delivery',
  out_for_delivery: 'out_for_delivery',
  delivered: 'delivered',
  failed: 'delivery_failed',
  returned: 'returned',
  cancelled: 'cancelled',
};

// ─── POST /api/courierplus/webhook ────────────────────────────────────────────
// CourierPlus delivery status webhook.
// Validates X-Webhook-Secret header then updates the matching Firestore order.
export async function POST(req: NextRequest) {
  try {
    // 1. Authenticate the webhook
    const webhookSecret = req.headers.get('X-Webhook-Secret');
    if (!webhookSecret || webhookSecret !== COURIERPLUS_SECRET) {
      console.warn('[CourierPlus/Webhook] Invalid or missing X-Webhook-Secret');
      return sendError('Unauthorized webhook request', 401);
    }

    // 2. Parse body
    const body = await req.json().catch(() => ({}));
    const { waybillNumber, status, timestamp, description } = body as {
      waybillNumber?: string;
      status?: string;
      timestamp?: string;
      description?: string;
    };

    if (!waybillNumber || !status) {
      return sendError('waybillNumber and status are required', 400);
    }

    console.log(
      `[CourierPlus/Webhook] waybill=${waybillNumber} status=${status} at=${timestamp}`
    );

    // 3. Find the order by courierPlusWaybillNumber
    const ordersSnap = await db
      .collection('orders')
      .where('courierPlusWaybillNumber', '==', waybillNumber)
      .limit(1)
      .get();

    if (ordersSnap.empty) {
      console.warn(
        `[CourierPlus/Webhook] No order found for waybill ${waybillNumber}`
      );
      // Return 200 to prevent CourierPlus from retrying for an unknown waybill
      return sendSuccess(
        { processed: false, reason: 'order_not_found' },
        'Webhook acknowledged'
      );
    }

    const orderDoc = ordersSnap.docs[0];
    const mappedStatus = STATUS_MAP[status.toLowerCase()] ?? status.toLowerCase();

    // 4. Build the tracking event to append
    const trackingEvent = {
      status: mappedStatus,
      description: description || `Shipment status updated to ${status}`,
      timestamp: timestamp || new Date().toISOString(),
      source: 'courierplus',
    };

    // 5. Update the order
    const updatePayload: Record<string, unknown> = {
      courierPlusStatus: status,
      updatedAt: new Date().toISOString(),
    };

    // Only update order-level status for terminal / important events
    if (['delivered', 'in_transit', 'out_for_delivery', 'picked_up'].includes(mappedStatus)) {
      updatePayload.status = mappedStatus;
    }
    if (mappedStatus === 'delivered') {
      updatePayload.deliveredAt = timestamp || new Date().toISOString();
    }

    await orderDoc.ref.update({
      ...updatePayload,
      courierPlusEvents: FieldValue.arrayUnion(trackingEvent),
    });

    return sendSuccess(
      { processed: true, orderId: orderDoc.id, mappedStatus },
      'Webhook processed'
    );
  } catch (err) {
    console.error('[CourierPlus/Webhook] Unexpected error:', err);
    return sendServerError('Webhook processing failed');
  }
}
