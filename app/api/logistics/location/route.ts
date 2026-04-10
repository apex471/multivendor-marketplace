import { NextRequest } from 'next/server';
import { verifyToken } from '@/backend/utils/jwt';
import { sendSuccess, sendError } from '@/backend/utils/responseAppRouter';

interface DriverLocationEntry {
  driverId:  string;
  lat:       number;
  lng:       number;
  accuracy:  number;
  area:      string;
  heading:   number | null;
  speed:     number | null;
  updatedAt: string;
}

// In-memory map: driverId → latest location
// Replace with Redis or DB in production
const LOCATIONS = new Map<string, DriverLocationEntry>();

function getDriver(request: NextRequest) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  return verifyToken(authHeader.split(' ')[1]);
}

/**
 * POST /api/logistics/location
 * Body: { lat, lng, accuracy, area, heading?, speed? }
 * Stores the driver's current GPS location.
 */
export async function POST(request: NextRequest) {
  const driver = getDriver(request);
  if (!driver) return sendError('Unauthorized', 401);
  if (driver.role !== 'logistics') return sendError('Access denied', 403);

  const body = await request.json().catch(() => ({}));
  const { lat, lng, accuracy, area, heading, speed } = body as Partial<DriverLocationEntry>;

  if (lat == null || lng == null) return sendError('lat and lng are required', 400);

  const entry: DriverLocationEntry = {
    driverId:  driver.userId,
    lat,
    lng,
    accuracy:  accuracy ?? 0,
    area:      area ?? 'Unknown',
    heading:   heading ?? null,
    speed:     speed ?? null,
    updatedAt: new Date().toISOString(),
  };

  LOCATIONS.set(driver.userId, entry);

  return sendSuccess({ location: entry }, 'Location updated');
}

/**
 * GET /api/logistics/location
 * Returns this driver's last known location.
 */
export async function GET(request: NextRequest) {
  const driver = getDriver(request);
  if (!driver) return sendError('Unauthorized', 401);
  if (driver.role !== 'logistics') return sendError('Access denied', 403);

  const location = LOCATIONS.get(driver.userId) ?? null;
  return sendSuccess({ location });
}
