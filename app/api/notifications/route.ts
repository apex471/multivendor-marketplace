import { NextRequest } from 'next/server';
import { connectDB } from '@/backend/config/database';
import { Notification } from '@/backend/models/Notification';
import { verifyToken } from '@/backend/utils/jwt';
import {
  sendSuccess,
  sendUnauthorized,
  sendServerError,
} from '@/backend/utils/responseAppRouter';

function getPayload(req: NextRequest) {
  const auth = req.headers.get('authorization') ?? '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  return token ? verifyToken(token) : null;
}

// GET /api/notifications — list notifications for current user
export async function GET(req: NextRequest) {
  try {
    const payload = getPayload(req);
    if (!payload) return sendUnauthorized('Authentication required');

    await connectDB();

    const sp     = new URL(req.url).searchParams;
    const page   = Math.max(1,  parseInt(sp.get('page')  || '1'));
    const limit  = Math.min(50, parseInt(sp.get('limit') || '20'));
    const unread = sp.get('unread') === 'true';

    const filter: Record<string, unknown> = { recipientId: payload.userId };
    if (unread) filter.isRead = false;

    const skip = (page - 1) * limit;

    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Notification.countDocuments(filter),
      Notification.countDocuments({ recipientId: payload.userId, isRead: false }),
    ]);

    return sendSuccess({
      notifications: notifications.map(n => ({
        id:          n._id,
        type:        n.type,
        text:        n.text,
        link:        n.link ?? null,
        image:       n.image ?? null,
        isRead:      n.isRead,
        createdAt:   n.createdAt,
        actor: n.actorId ? {
          id:     n.actorId,
          name:   n.actorName,
          avatar: n.actorAvatar ?? null,
        } : null,
      })),
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      unreadCount,
    });
  } catch (err) {
    return sendServerError(err);
  }
}

// PATCH /api/notifications — mark all as read
export async function PATCH(req: NextRequest) {
  try {
    const payload = getPayload(req);
    if (!payload) return sendUnauthorized('Authentication required');

    await connectDB();

    await Notification.updateMany(
      { recipientId: payload.userId, isRead: false },
      { isRead: true }
    );

    return sendSuccess({ updated: true }, 'All notifications marked as read');
  } catch (err) {
    return sendServerError(err);
  }
}
