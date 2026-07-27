import { NextRequest } from 'next/server';
import { verifyToken } from '@/backend/utils/jwt';
import { sendSuccess, sendError, sendServerError } from '@/backend/utils/responseAppRouter';

function getDriver(request: NextRequest) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  return verifyToken(authHeader.split(' ')[1]);
}

/**
 * POST /api/logistics/location
 * Body: { lat, lng, accuracy, area, heading?, speed? }
 * Persists the driver's current GPS location to Firestore.
 */
export async function POST(request: NextRequest) {
  const driver = getDriver(request);
  if (!driver) return sendError('Unauthorized', 401);
  if (driver.role !== 'logistics') return sendError('Access denied', 403);

  try {
    const body = await request.json().catch(() => ({}));
    const { lat, lng, accuracy, area, heading, speed } = body as {
      lat?: number; lng?: number; accuracy?: number;
      area?: string; heading?: number | null; speed?: number | null;
    };

    if (lat == null || lng == null) return sendError('lat and lng are required', 400);

    const entry = {
      driverId:  driver.userId,
      lat,
      lng,
      accuracy:  accuracy  ?? 0,
      area:      area      ?? 'Unknown',
      heading:   heading   ?? null,
      speed:     speed     ?? null,
      updatedAt: new Date().toISOString(),
    };

    // Persist to Firestore (primary store)
    const { db } = await import('@/backend/config/firebase');
    await db.collection('driverLocations').doc(driver.userId).set(entry, { merge: false });

    return sendSuccess({ location: entry }, 'Location updated');
  } catch (err) {
    console.error('[Logistics/Location POST]', err);
    return sendServerError('Failed to update location');
  }
}

/**
 * GET /api/logistics/location
 * Returns this driver's last known location from Firestore.
 */
export async function GET(request: NextRequest) {
  const driver = getDriver(request);
  if (!driver) return sendError('Unauthorized', 401);
  if (driver.role !== 'logistics') return sendError('Access denied', 403);

  try {
    const { db } = await import('@/backend/config/firebase');
    const doc = await db.collection('driverLocations').doc(driver.userId).get();
    const location = doc.exists ? doc.data() : null;
    return sendSuccess({ location });
  } catch (err) {
    console.error('[Logistics/Location GET]', err);
    return sendServerError('Failed to fetch location');
  }
}
