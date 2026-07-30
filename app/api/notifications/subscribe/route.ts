import { NextRequest } from 'next/server';
import { User } from '@/backend/models/User';
import { verifyToken } from '@/backend/utils/jwt';
import { publicKey } from '@/backend/utils/webPush';
import {
  sendSuccess,
  sendUnauthorized,
  sendServerError,
  sendError,
} from '@/backend/utils/responseAppRouter';

function getPayload(req: NextRequest) {
  const auth = req.headers.get('authorization') ?? '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  return token ? verifyToken(token) : null;
}

// GET /api/notifications/subscribe — retrieve VAPID public key
export async function GET() {
  return sendSuccess({ publicKey });
}

// POST /api/notifications/subscribe — register subscription
export async function POST(req: NextRequest) {
  try {
    const payload = getPayload(req);
    if (!payload) return sendUnauthorized('Authentication required');

    const body = await req.json();
    const { subscription } = body;
    if (!subscription || !subscription.endpoint) {
      return sendError('Invalid subscription data', 400);
    }

    const user = await User.findById(payload.userId);
    if (!user) {
      return sendUnauthorized('User not found');
    }

    const subs = user.pushSubscriptions || [];
    // Check if subscription already exists
    const exists = subs.some((s: any) => s.endpoint === subscription.endpoint);
    if (!exists) {
      subs.push(subscription);
      await User.updateOne(payload.userId, { pushSubscriptions: subs });
    }

    return sendSuccess({ subscribed: true }, 'Successfully subscribed to push notifications');
  } catch (err) {
    return sendServerError(err instanceof Error ? err.message : String(err));
  }
}
