import { NextRequest } from 'next/server';
import { courierPlusClient, WaybillRequest } from '@/lib/courierplus';
import { verifyVendorAuth } from '@/backend/utils/vendorAuth';
import { db } from '@/backend/config/firebase';
import {
  sendSuccess,
  sendError,
  sendUnauthorized,
  sendForbidden,
  sendNotFound,
  sendServerError,
} from '@/backend/utils/responseAppRouter';

// ─── POST /api/courierplus/waybill ────────────────────────────────────────────
// Creates a CourierPlus waybill for an order.
// Body: { orderId, senderName, senderPhone, senderAddress,
//         recipientName, recipientPhone, recipientAddress,
//         description, weight, quantity, value? }
// Auth: vendor, brand, or admin role.
export async function POST(req: NextRequest) {
  const auth = await verifyVendorAuth(req);
  if (auth.error) {
    return auth.error.includes('Access denied')
      ? sendForbidden(auth.error)
      : sendUnauthorized(auth.error);
  }

  try {
    const body = await req.json().catch(() => ({}));
    const {
      orderId,
      senderName,
      senderPhone,
      senderAddress,
      recipientName,
      recipientPhone,
      recipientAddress,
      description,
      weight,
      quantity,
      value,
    } = body as {
      orderId?: string;
      senderName?: string;
      senderPhone?: string;
      senderAddress?: string;
      recipientName?: string;
      recipientPhone?: string;
      recipientAddress?: string;
      description?: string;
      weight?: number;
      quantity?: number;
      value?: number;
    };

    if (
      !orderId ||
      !senderName ||
      !senderPhone ||
      !senderAddress ||
      !recipientName ||
      !recipientPhone ||
      !recipientAddress ||
      !description ||
      weight === undefined
    ) {
      return sendError(
        'orderId, senderName, senderPhone, senderAddress, recipientName, recipientPhone, recipientAddress, description, and weight are required',
        400
      );
    }

    // Verify order exists in Firestore
    const orderSnap = await db.collection('orders').doc(orderId).get();
    if (!orderSnap.exists) {
      return sendNotFound('Order not found');
    }

    const waybillData: WaybillRequest = {
      senderName,
      senderPhone,
      senderAddress,
      recipientName,
      recipientPhone,
      recipientAddress,
      description,
      weight,
      quantity: quantity ?? 1,
      ...(value !== undefined && { value }),
    };

    const result = await courierPlusClient.createWaybill(waybillData);

    if (!result.success) {
      return sendError(
        result.error || 'Failed to create waybill with CourierPlus',
        502
      );
    }

    const waybill = result.data ?? {};
    const waybillNumber =
      (waybill.waybillNumber as string) ||
      (waybill.waybill as string) ||
      (waybill.reference as string) ||
      '';
    const trackingId =
      (waybill.trackingId as string) ||
      (waybill.trackingNumber as string) ||
      waybillNumber;

    // Persist tracking info back to the order
    await db.collection('orders').doc(orderId).update({
      courierPlusWaybillNumber: waybillNumber,
      courierPlusTrackingId: trackingId,
      trackingNumber: trackingId,
      courierName: 'CourierPlus',
      courierIcon: '🚚',
      updatedAt: new Date().toISOString(),
    });

    return sendSuccess(
      {
        waybillNumber,
        trackingId,
        trackingNumber: trackingId,
        raw: waybill,
      },
      'Waybill created successfully',
      201
    );
  } catch (err) {
    console.error('[CourierPlus/Waybill] Unexpected error:', err);
    return sendServerError('Failed to create waybill');
  }
}
