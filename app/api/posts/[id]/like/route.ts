import { NextRequest } from 'next/server';
import { connectDB } from '@/backend/config/database';
import { Post } from '@/backend/models/Post';
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
  { params }: { params: { id: string } }
) {
  try {
    const auth = req.headers.get('authorization') ?? '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
    if (!token) return sendUnauthorized('Authentication required');
    const payload = verifyToken(token);
    if (!payload) return sendUnauthorized('Invalid token');

    await connectDB();

    const post = await Post.findById(params.id);
    if (!post) return sendNotFound('Post not found');

    const { action } = await req.json().catch(() => ({ action: 'like' }));
    const increment = action === 'unlike' ? -1 : 1;

    post.likes = Math.max(0, post.likes + increment);
    await post.save();

    return sendSuccess({ likes: post.likes, liked: action !== 'unlike' });
  } catch (err) {
    return sendServerError(err instanceof Error ? err.message : String(err));
  }
}
