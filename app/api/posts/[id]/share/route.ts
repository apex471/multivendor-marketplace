import { NextRequest } from 'next/server';
import { Post } from '@/backend/models/Post';
import { User } from '@/backend/models/User';
import { Notification } from '@/backend/models/Notification';
import { verifyToken } from '@/backend/utils/jwt';
import {
  sendSuccess,
  sendNotFound,
  sendUnauthorized,
  sendServerError,
} from '@/backend/utils/responseAppRouter';

// POST /api/posts/[id]/share
// ─ Any authenticated user can share. Increments share count + notifies author.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const auth  = req.headers.get('authorization') ?? req.headers.get('Authorization') ?? '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return sendUnauthorized('You must be logged in to share posts');
  const payload = verifyToken(token);
  if (!payload?.userId) return sendUnauthorized('Invalid or expired session');

  try {
    const post = await Post.findById(id);
    if (!post) return sendNotFound('Post not found');

    await Post.increment(id, 'shares', 1);
    const shares = (post.shares ?? 0) + 1;

    // ── Notify post author (fire-and-forget) ──────────────────────────────
    if (String(post.authorId) !== payload.userId) {
      let actorName   = 'Someone';
      let actorAvatar: string | undefined;
      try {
        const actor = await User.findById(payload.userId);
        if (actor) {
          actorName   = `${actor.firstName} ${actor.lastName ?? ''}`.trim() || 'Someone';
          actorAvatar = actor.avatar ?? undefined;
        }
      } catch { /* non-fatal */ }

      Notification.create({
        recipientId: String(post.authorId),
        type:        'share',
        actorId:     payload.userId,
        actorName,
        actorAvatar,
        text:        `${actorName} shared your post`,
        link:        `/post/${id}`,
        isRead:      false,
      }).catch(() => {});
    }

    return sendSuccess({ shares }, 'Post shared');
  } catch (err) {
    console.error('[Share] error:', err);
    return sendServerError(err instanceof Error ? err.message : 'Failed to share post');
  }
}
