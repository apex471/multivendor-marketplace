import { NextRequest } from 'next/server';
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

    await Post.increment(id, 'shares', 1);
    const updatedPostShares = (post.shares ?? 0) + 1;

    return sendSuccess({ shares: updatedPostShares }, 'Post shared');
  } catch (err) {
    return sendServerError(err instanceof Error ? err.message : String(err));
  }
}
