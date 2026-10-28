import { NextRequest, NextResponse } from 'next/server';
import { courierPlusClient } from '@/lib/courierplus';
import { sendSuccess, sendServerError } from '@/backend/utils/responseAppRouter';

// Simple in-process cache — locations rarely change
let cachedLocations: unknown = null;
let cacheExpiry = 0;
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

// ─── GET /api/courierplus/locations ──────────────────────────────────────────
// Public — no auth required. Returns cached list of CourierPlus locations.
export async function GET(_req: NextRequest) {
  try {
    const now = Date.now();

    if (cachedLocations && now < cacheExpiry) {
      return sendSuccess(
        { locations: cachedLocations, cached: true },
        'Locations fetched'
      );
    }

    const result = await courierPlusClient.getLocations();

    if (!result.success) {
      // Return empty list gracefully — never break the checkout UI
      return sendSuccess(
        { locations: [], error: result.error },
        'Locations unavailable'
      );
    }

    const rawData = result.data ?? {};
    const locations =
      (rawData.locations as unknown[]) ??
      (rawData.data as unknown[]) ??
      (Array.isArray(rawData) ? rawData : []);

    // Cache the successful result
    cachedLocations = locations;
    cacheExpiry = now + CACHE_TTL_MS;

    // Add cache headers for CDN / browser caching
    const response = sendSuccess({ locations }, 'Locations fetched');
    const headers = new Headers(response.headers);
    headers.set('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=600');

    return new NextResponse(response.body, {
      status: response.status,
      headers,
    });
  } catch (err) {
    console.error('[CourierPlus/Locations] Unexpected error:', err);
    return sendServerError('Failed to fetch locations');
  }
}
