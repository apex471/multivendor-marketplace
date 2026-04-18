import { NextRequest } from 'next/server';
import { connectDB } from '@/backend/config/database';
import { Post } from '@/backend/models/Post';
import { User } from '@/backend/models/User';
import {
  sendSuccess,
  sendNotFound,
  sendServerError,
} from '@/backend/utils/responseAppRouter';

// GET /api/posts/[id] — public post detail
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();

    const post = await Post.findById(params.id).lean();
    if (!post || post.status !== 'published' || post.privacy !== 'public') {
      return sendNotFound('Post not found');
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
    return sendServerError(err);
  }
}
