import { NextRequest } from 'next/server';
import { connectDB } from '@/backend/config/database';
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

    await connectDB();

    const post = await Post.findById(id);
    if (!post) return sendNotFound('Post not found');

    const { action } = await req.json().catch(() => ({ action: 'like' }));

    if (action === 'unlike') {
      await PostLike.findOneAndDelete({ postId: id, userId: payload.userId });
      post.likes = Math.max(0, post.likes - 1);
    } else {
      // upsert prevents duplicate likes
      const result = await PostLike.findOneAndUpdate(
        { postId: id, userId: payload.userId },
        { postId: id, userId: payload.userId },
        { upsert: true, new: true }
      );

      // Only increment counter if this is a new like (not a duplicate)
      if (result) {
        post.likes = post.likes + 1;

        // Send notification to post author (non-blocking)
        if (String(post.authorId) !== payload.userId) {
          Notification.create({
            recipientId: post.authorId,
            type:        'like',
            actorId:     payload.userId,
            text:        'Someone liked your post',
            link:        `/post/${id}`,
          }).catch(() => {});
        }
      }
    }

    await post.save();

    return sendSuccess({ likes: post.likes, liked: action !== 'unlike' });
  } catch (err) {
    // E11000 duplicate key — already liked, just return current state
    if (err instanceof Error && err.message.includes('E11000')) {
      const post = await Post.findById(id).lean();
      return sendSuccess({ likes: post?.likes ?? 0, liked: true });
    }
    return sendServerError(err instanceof Error ? err.message : String(err));
  }
}
