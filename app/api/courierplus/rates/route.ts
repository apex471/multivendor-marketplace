import { NextRequest } from 'next/server';
import { courierPlusClient } from '@/lib/courierplus';
import { verifyToken } from '@/backend/utils/jwt';
import {
  sendSuccess,
  sendError,
  sendServerError,
} from '@/backend/utils/responseAppRouter';

// ─── POST /api/courierplus/rates ──────────────────────────────────────────────
// Accepts:
//   destination?: string
//   state?: string
//   city?: string
//   address?: string
//   country?: string
//   weight?: number
//   origin?: string
//   description?: string
//   quantity?: number
//
// Calculates live dynamic shipping rates directly from CourierPlus Tariff Engine.
// Auth: optional Bearer JWT (allows unauthenticated guest rate checks during checkout)
export async function POST(req: NextRequest) {
  // Optional JWT verification — don't block guest shoppers from checking shipping rates
  const authHeader = req.headers.get('Authorization') ?? '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (token) {
    const decoded = verifyToken(token);
    if (!decoded) {
      console.warn('[CourierPlus/Rates] Request has invalid/expired token, proceeding as guest');
    }
  }

  try {
    const body = await req.json().catch(() => ({}));
    const {
      origin = 'Lagos',
      destination,
      state,
      city,
      address,
      country = 'Nigeria',
      weight = 1,
      description = 'Marketplace Luxury Order',
      quantity = 1,
      declaredValue,
    } = body as {
      origin?: string;
      destination?: string;
      state?: string;
      city?: string;
      address?: string;
      country?: string;
      weight?: number;
      description?: string;
      quantity?: number;
      declaredValue?: number;
    };

    const targetDestination = (destination || state || city || address || 'Lagos').trim();

    if (!targetDestination) {
      return sendError('A destination state, city, or address is required to calculate shipping rates', 400);
    }

    const result = await courierPlusClient.getShippingRates(
      origin,
      targetDestination,
      Number(weight) || 1,
      {
        city: city || targetDestination,
        state: state || targetDestination,
        address,
        country,
        description,
        quantity,
        declaredValue,
      }
    );

    if (!result.success || !result.data) {
      return sendError(result.error || 'Failed to fetch CourierPlus shipping rates', 500);
    }

    return sendSuccess(
      {
        rates: result.data.rates,
        destinationState: result.data.destinationState,
        destinationTown: result.data.destinationTown,
        isLive: result.data.isLive,
      },
      result.data.isLive
        ? 'Live CourierPlus shipping rates calculated'
        : 'CourierPlus standard regional tariff rates applied'
    );
  } catch (err) {
    console.error('[CourierPlus/Rates] Unexpected error:', err);
    return sendServerError('Failed to fetch shipping rates');
  }
}
