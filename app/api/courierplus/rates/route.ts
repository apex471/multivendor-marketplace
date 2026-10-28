import { NextRequest } from 'next/server';
import { courierPlusClient } from '@/lib/courierplus';
import { verifyToken } from '@/backend/utils/jwt';
import {
  sendSuccess,
  sendError,
  sendUnauthorized,
  sendServerError,
} from '@/backend/utils/responseAppRouter';

// ─── POST /api/courierplus/rates ──────────────────────────────────────────────
// Accepts { origin, destination, weight, description?, quantity? }
// Returns live shipping rates from CourierPlus.
// Auth: optional Bearer JWT (allows unauthenticated guest rate checks during checkout)
export async function POST(req: NextRequest) {
  // Optional JWT verification — don't block guest shoppers from checking shipping rates
  const authHeader = req.headers.get('Authorization') ?? '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (token) {
    const decoded = verifyToken(token);
    if (!decoded) {
      // Invalid/expired token logged, but still allow checkout rate calculation
      console.warn('[CourierPlus/Rates] Request has invalid/expired token, proceeding as guest');
    }
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { origin, destination, weight, description, quantity } = body as {
      origin?: string;
      destination?: string;
      weight?: number;
      description?: string;
      quantity?: number;
    };

    if (!origin || !destination || weight === undefined || weight === null) {
      return sendError('origin, destination, and weight are required', 400);
    }

    const result = await courierPlusClient.getShippingRates(
      origin,
      destination,
      weight,
      { description, quantity }
    );

    if (!result.success) {
      // Return a graceful fallback rate so checkout never breaks
      const fallback = [
        {
          id: 'courierplus-standard',
          name: 'CourierPlus Standard',
          carrier: 'CourierPlus',
          price: 2500,
          currency: 'NGN',
          estimatedDelivery: '3-5 business days',
          deliveryDays: '3-5 days',
        },
      ];
      return sendSuccess(
        { rates: fallback, fallback: true, apiError: result.error },
        'Rates fetched (fallback)'
      );
    }

    // Normalise — the API may return rates at top level or nested
    const rawData = (result.data ?? {}) as Record<string, unknown>;
    const rates =
      (rawData.rates as unknown[]) ??
      (Array.isArray(rawData) ? rawData : [rawData]);

    return sendSuccess({ rates }, 'Shipping rates fetched');
  } catch (err) {
    console.error('[CourierPlus/Rates] Unexpected error:', err);
    return sendServerError('Failed to fetch shipping rates');
  }
}
