import { NextRequest } from 'next/server';
import { Post } from '@/backend/models/Post';
import { PostLike } from '@/backend/models/PostLike';
import { User } from '@/backend/models/User';
import { Notification } from '@/backend/models/Notification';
import { verifyToken } from '@/backend/utils/jwt';
import {
  sendSuccess,
  sendNotFound,
  sendUnauthorized,
  sendServerError,
} from '@/backend/utils/responseAppRouter';

// POST /api/posts/[id]/like
// ─ Any authenticated user (customer, vendor, brand, admin) can like/unlike.
// ─ Body: { action: 'like' | 'unlike' }   (defaults to 'like' if absent)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const auth  = req.headers.get('authorization') ?? req.headers.get('Authorization') ?? '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return sendUnauthorized('You must be logged in to like posts');
  const payload = verifyToken(token);
  if (!payload?.userId) return sendUnauthorized('Invalid or expired session');

  try {
    const post = await Post.findById(id);
    if (!post) return sendNotFound('Post not found');

    let action: string;
    try {
      const body = await req.json();
      action = body?.action === 'unlike' ? 'unlike' : 'like';
    } catch {
      action = 'like';
    }

    let liked    = false;
    let newCount = post.likes ?? 0;

    if (action === 'unlike') {
      const deleted = await PostLike.findOneAndDelete({ postId: id, userId: payload.userId });
      if (deleted) {
        await Post.increment(id, 'likes', -1);
        newCount = Math.max(0, newCount - 1);
      }
      liked = false;
    } else {
      const existing = await PostLike.findOne({ postId: id, userId: payload.userId });
      if (existing) {
        liked    = true;
        // Already liked — idempotent, return current state
      } else {
        await PostLike.create({ postId: id, userId: payload.userId });
        await Post.increment(id, 'likes', 1);
        newCount = newCount + 1;
        liked    = true;

        // ── Notify post author (fire-and-forget) ──────────────────────────
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
            type:        'like',
            actorId:     payload.userId,
            actorName,
            actorAvatar,
            text:        `${actorName} liked your post`,
            link:        `/post/${id}`,
            isRead:      false,
          }).catch(() => {});
        }
      }
    }

    return sendSuccess({ likes: newCount, liked });
  } catch (err) {
    console.error('[Like] error:', err);
    return sendServerError(err instanceof Error ? err.message : 'Failed to update like');
  }
}
