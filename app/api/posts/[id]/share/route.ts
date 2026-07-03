import { NextRequest } from 'next/server';
import { Post } from '@/backend/models/Post';
import { verifyToken } from '@/backend/utils/jwt';
import {
  sendSuccess,
  sendNotFound,
  sendUnauthorized,
  sendServerError,
} from '@/backend/utils/responseAppRouter';

// POST /api/posts/[id]/share
// ─ Any authenticated user (customer, vendor, brand, admin) can share.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const auth  = req.headers.get('authorization') ?? req.headers.get('Authorization') ?? '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return sendUnauthorized('You must be logged in to share posts');
  const payload = verifyToken(token);
  if (!payload?.userId) return sendUnauthorized('Invalid or expired session — please log in again');

  try {
    const post = await Post.findById(id);
    if (!post) return sendNotFound('Post not found');

    await Post.increment(id, 'shares', 1);
    const shares = (post.shares ?? 0) + 1;

    return sendSuccess({ shares }, 'Post shared');
  } catch (err) {
    console.error('[Share] error:', err);
    return sendServerError(err instanceof Error ? err.message : 'Failed to share post');
  }
}
