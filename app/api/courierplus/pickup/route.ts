import { NextRequest } from 'next/server';
import { courierPlusClient, PickupRequest } from '@/lib/courierplus';
import { verifyVendorAuth } from '@/backend/utils/vendorAuth';
import {
  sendSuccess,
  sendError,
  sendUnauthorized,
  sendForbidden,
  sendServerError,
} from '@/backend/utils/responseAppRouter';

// ─── POST /api/courierplus/pickup ─────────────────────────────────────────────
// Schedules a pickup with CourierPlus.
// Body: { orderId, pickupDate, pickupAddress, contactName, contactPhone }
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
    const { orderId, pickupDate, pickupAddress, contactName, contactPhone } =
      body as {
        orderId?: string;
        pickupDate?: string;
        pickupAddress?: string;
        contactName?: string;
        contactPhone?: string;
      };

    if (!pickupDate || !pickupAddress || !contactName || !contactPhone) {
      return sendError(
        'pickupDate, pickupAddress, contactName, and contactPhone are required',
        400
      );
    }

    const pickupData: PickupRequest = {
      pickupDate,
      pickupAddress,
      contactName,
      contactPhone,
      ...(orderId && { orderId }),
    };

    const result = await courierPlusClient.schedulePickup(pickupData);

    if (!result.success) {
      return sendError(
        result.error || 'Failed to schedule pickup with CourierPlus',
        502
      );
    }

    return sendSuccess(
      { pickup: result.data, orderId },
      'Pickup scheduled successfully',
      201
    );
  } catch (err) {
    console.error('[CourierPlus/Pickup] Unexpected error:', err);
    return sendServerError('Failed to schedule pickup');
  }
}
