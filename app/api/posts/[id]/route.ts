import { NextRequest } from 'next/server';
import { Post } from '@/backend/models/Post';
import { PostLike } from '@/backend/models/PostLike';
import { User } from '@/backend/models/User';
import { verifyToken } from '@/backend/utils/jwt';
import {
  sendSuccess,
  sendNotFound,
  sendServerError,
  sendError,
} from '@/backend/utils/responseAppRouter';

// GET /api/posts/[id] — public post detail
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const post = await Post.findById(id);
    if (!post || post.status !== 'published' || post.privacy !== 'public') {
      return sendNotFound('Post not found');
    }

    // Identify current user for liked-state
    const authHeader = req.headers.get('Authorization');
    let liked = false;
    if (authHeader?.startsWith('Bearer ')) {
      const tok = verifyToken(authHeader.slice(7));
      if (tok) {
        const existingLike = await PostLike.findOne({ postId: id, userId: tok.userId });
        liked = !!existingLike;
      }
    }

    // Fetch author info
    const author = await User.findById(post.authorId);

    return sendSuccess({
      post: {
        id:        post.id,
        content:   post.content,
        images:    post.images ?? [],
        videos:    post.videos ?? [],
        product:   post.product ?? null,
        hashtags:  post.hashtags ?? [],
        likes:     post.likes,
        comments:  post.comments,
        shares:    post.shares,
        liked,
        createdAt: post.createdAt,
        author: author
          ? {
              id:       author.id,
              name:     `${author.firstName} ${author.lastName}`.trim(),
              username: `${author.firstName}${author.lastName}`.toLowerCase().replace(/\s/g, ''),
              avatar:   author.avatar ?? null,
              role:     author.role,
              verified: author.applicationStatus === 'approved',
            }
          : {
              id:       post.authorId,
              name:     post.authorName,
              username: post.authorName.toLowerCase().replace(/\s/g, ''),
              avatar:   null,
              role:     post.authorRole,
              verified: false,
            },
      },
    });
  } catch (err) {
    return sendServerError(err instanceof Error ? err.message : String(err));
  }
}

// PATCH /api/posts/[id] — archive/unarchive post or change privacy
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return sendError('Authentication required', 401);
  }

  const token = authHeader.split(' ')[1];
  const decoded = verifyToken(token);
  if (!decoded) return sendError('Invalid or expired token', 401);

  try {
    const post = await Post.findById(id);
    if (!post) return sendNotFound('Post not found');

    if (post.authorId !== decoded.userId && decoded.role !== 'admin') {
      return sendError('Unauthorized', 403);
    }

    const { status, privacy } = await req.json().catch(() => ({}));
    const updates: any = {};
    if (status !== undefined) updates.status = status;
    if (privacy !== undefined) updates.privacy = privacy;

    if (Object.keys(updates).length === 0) {
      return sendError('No valid fields to update', 400);
    }

    await Post.updateOne(id, updates);
    return sendSuccess({ id, ...updates }, 'Post updated successfully');
  } catch (err) {
    return sendServerError(err instanceof Error ? err.message : String(err));
  }
}

// DELETE /api/posts/[id] — delete post
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return sendError('Authentication required', 401);
  }

  const token = authHeader.split(' ')[1];
  const decoded = verifyToken(token);
  if (!decoded) return sendError('Invalid or expired token', 401);

  try {
    const post = await Post.findById(id);
    if (!post) return sendNotFound('Post not found');

    if (post.authorId !== decoded.userId && decoded.role !== 'admin') {
      return sendError('Unauthorized', 403);
    }

    await Post.findByIdAndDelete(id);
    return sendSuccess({ id }, 'Post deleted successfully');
  } catch (err) {
    return sendServerError(err instanceof Error ? err.message : String(err));
  }
}
