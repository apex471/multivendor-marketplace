import { NextRequest } from 'next/server';
import { Notification } from '@/backend/models/Notification';
import { verifyToken } from '@/backend/utils/jwt';
import { db } from '@/backend/config/firebase';
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

    const docRef = db.collection('notifications').doc(id);
    const snap = await docRef.get();
    if (!snap.exists || snap.data()?.recipientId !== payload.userId) {
      return sendNotFound('Notification not found');
    }

    await Notification.updateOne(id, { isRead: true });

    return sendSuccess({ id, isRead: true });
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

    const docRef = db.collection('notifications').doc(id);
    const snap = await docRef.get();
    if (snap.exists && snap.data()?.recipientId === payload.userId) {
      await docRef.delete();
    }

    return sendSuccess({ deleted: true });
  } catch (err) {
    return sendServerError(err instanceof Error ? err.message : String(err));
  }
}
