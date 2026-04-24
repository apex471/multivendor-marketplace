import { NextRequest } from 'next/server';
import { connectDB } from '@/backend/config/database';
import { Post } from '@/backend/models/Post';
import { PostLike } from '@/backend/models/PostLike';
import { User } from '@/backend/models/User';
import { verifyToken } from '@/backend/utils/jwt';
import {
  sendSuccess,
  sendNotFound,
  sendServerError,
} from '@/backend/utils/responseAppRouter';

// GET /api/posts/[id] — public post detail
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    await connectDB();

    const post = await Post.findById(id).lean();
    if (!post || post.status !== 'published' || post.privacy !== 'public') {
      return sendNotFound('Post not found');
    }

    // Identify current user for liked-state
    const authHeader = req.headers.get('Authorization');
    let liked = false;
    if (authHeader?.startsWith('Bearer ')) {
      const tok = verifyToken(authHeader.slice(7));
      if (tok) {
        const existingLike = await PostLike.findOne({ postId: id, userId: tok.userId }).lean();
        liked = !!existingLike;
      }
    }

    // Fetch author info
    const author = await User.findById(post.authorId)
      .select('firstName lastName avatar role applicationStatus')
      .lean();

    return sendSuccess({
      post: {
        id:        post._id,
        content:   post.content,
        images:    post.images ?? [],
        product:   post.product ?? null,
        hashtags:  post.hashtags ?? [],
        likes:     post.likes,
        comments:  post.comments,
        shares:    post.shares,
        liked,
        createdAt: post.createdAt,
        author: author
          ? {
              id:       author._id,
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
