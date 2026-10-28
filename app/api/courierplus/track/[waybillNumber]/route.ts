import { NextRequest } from 'next/server';
import { courierPlusClient } from '@/lib/courierplus';
import { sendSuccess, sendError, sendServerError } from '@/backend/utils/responseAppRouter';

// ─── GET /api/courierplus/track/[waybillNumber] ───────────────────────────────
// Public — no auth required.
// Fetches live tracking status from CourierPlus for the given waybill number.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ waybillNumber: string }> }
) {
  try {
    const { waybillNumber } = await params;

    if (!waybillNumber) {
      return sendError('Waybill number is required', 400);
    }

    const result = await courierPlusClient.trackShipment(waybillNumber);

    if (!result.success) {
      return sendError(
        result.error || 'Unable to fetch tracking information',
        502
      );
    }

    return sendSuccess(
      { tracking: result.data, waybillNumber },
      'Tracking information fetched'
    );
  } catch (err) {
    console.error('[CourierPlus/Track] Unexpected error:', err);
    return sendServerError('Failed to fetch tracking information');
  }
}
