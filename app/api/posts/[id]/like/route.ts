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

// POST /api/posts/[id]/like — toggle like on a post (requires auth)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const auth = req.headers.get('authorization') ?? '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
    if (!token) return sendUnauthorized('Authentication required');
    const payload = verifyToken(token);
    if (!payload) return sendUnauthorized('Invalid token');

    const post = await Post.findById(id);
    if (!post) return sendNotFound('Post not found');

    const { action } = await req.json().catch(() => ({ action: 'like' }));

    let liked = false;
    if (action === 'unlike') {
      const deleted = await PostLike.findOneAndDelete({ postId: id, userId: payload.userId });
      if (deleted) {
        await Post.increment(id, 'likes', -1);
        post.likes = Math.max(0, post.likes - 1);
      }
      liked = false;
    } else {
      // Find or create
      const existing = await PostLike.findOne({ postId: id, userId: payload.userId });
      if (!existing) {
        await PostLike.create({ postId: id, userId: payload.userId });
        await Post.increment(id, 'likes', 1);
        post.likes = post.likes + 1;

        // Send notification to post author (non-blocking)
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

    return sendSuccess({ likes: post.likes, liked });
  } catch (err) {
    return sendServerError(err instanceof Error ? err.message : String(err));
  }
}
