import { NextRequest } from 'next/server';
import { connectDB } from '@/backend/config/database';
import { Notification } from '@/backend/models/Notification';
import { verifyToken } from '@/backend/utils/jwt';
import {
  sendSuccess,
  sendNotFound,
  sendUnauthorized,
  sendServerError,
} from '@/backend/utils/responseAppRouter';

function getPayload(req: NextRequest) {
  const auth = req.headers.get('authorization') ?? '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  return token ? verifyToken(token) : null;
}

// PATCH /api/notifications/[id] — mark single notification as read
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const payload = getPayload(req);
    if (!payload) return sendUnauthorized('Authentication required');

    await connectDB();

    const notification = await Notification.findOneAndUpdate(
      { _id: id, recipientId: payload.userId },
      { isRead: true },
      { new: true }
    );

    if (!notification) return sendNotFound('Notification not found');

    return sendSuccess({ id: notification._id, isRead: true });
  } catch (err) {
    return sendServerError(err instanceof Error ? err.message : String(err));
  }
}

// DELETE /api/notifications/[id] — delete a notification
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const payload = getPayload(req);
    if (!payload) return sendUnauthorized('Authentication required');

    await connectDB();

    await Notification.findOneAndDelete({ _id: id, recipientId: payload.userId });

    return sendSuccess({ deleted: true });
  } catch (err) {
    return sendServerError(err instanceof Error ? err.message : String(err));
  }
}
