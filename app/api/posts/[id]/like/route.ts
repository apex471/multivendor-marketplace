import { NextRequest } from 'next/server';
import { Post } from '@/backend/models/Post';
import { PostLike } from '@/backend/models/PostLike';
import { Notification } from '@/backend/models/Notification';
import { verifyToken } from '@/backend/utils/jwt';
import {
  sendSuccess,
  sendNotFound,
  sendUnauthorized,
  sendServerError,
} from '@/backend/utils/responseAppRouter';

// POST /api/posts/[id]/like
// ─ Any authenticated user (customer, vendor, brand, admin) can like/unlike any post.
// ─ Body: { action: 'like' | 'unlike' }   (defaults to 'like' if absent)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // ── Auth — no role restriction, any signed-in user may engage ───────────
  const auth  = req.headers.get('authorization') ?? req.headers.get('Authorization') ?? '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return sendUnauthorized('You must be logged in to like posts');
  const payload = verifyToken(token);
  if (!payload?.userId) return sendUnauthorized('Invalid or expired session — please log in again');

  try {
    const post = await Post.findById(id);
    if (!post) return sendNotFound('Post not found');

    // Read body; default to 'like' if body is missing or malformed
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
      // ── Unlike ─────────────────────────────────────────────────────────
      const deleted = await PostLike.findOneAndDelete({ postId: id, userId: payload.userId });
      if (deleted) {
        await Post.increment(id, 'likes', -1);
        newCount = Math.max(0, newCount - 1);
      }
      liked = false;
    } else {
      // ── Like (idempotent) ───────────────────────────────────────────────
      const existing = await PostLike.findOne({ postId: id, userId: payload.userId });
      if (existing) {
        // Already liked — just confirm the current state (idempotent)
        liked    = true;
        newCount = newCount; // unchanged
      } else {
        await PostLike.create({ postId: id, userId: payload.userId });
        await Post.increment(id, 'likes', 1);
        newCount = newCount + 1;

        // Notify author (fire-and-forget, never blocks the response)
        if (String(post.authorId) !== payload.userId) {
          Notification.create({
            recipientId: post.authorId,
            type:        'like',
            actorId:     payload.userId,
            text:        'Someone liked your post',
            link:        `/post/${id}`,
            isRead:      false,
          }).catch(() => {});
        }
      }
      liked = true;
    }

    return sendSuccess({ likes: newCount, liked });
  } catch (err) {
    console.error('[Like] error:', err);
    return sendServerError(err instanceof Error ? err.message : 'Failed to update like');
  }
}
