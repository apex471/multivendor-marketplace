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

// POST /api/posts/[id]/share — increment share count (requires auth)
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

    post.shares = (post.shares ?? 0) + 1;
    await post.save();

    return sendSuccess({ shares: post.shares }, 'Post shared');
  } catch (err) {
    return sendServerError(err instanceof Error ? err.message : String(err));
  }
}
