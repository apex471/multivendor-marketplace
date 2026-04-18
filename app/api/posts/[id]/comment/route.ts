import { NextRequest } from 'next/server';
import { connectDB } from '@/backend/config/database';
import { Post } from '@/backend/models/Post';
import { User } from '@/backend/models/User';
import { verifyToken } from '@/backend/utils/jwt';
import {
  sendSuccess,
  sendError,
  sendNotFound,
  sendUnauthorized,
  sendServerError,
} from '@/backend/utils/responseAppRouter';

// POST /api/posts/[id]/comment — add a comment (requires auth)
// For simplicity, comments are stored as a count only on the Post model.
// In a full implementation, you'd have a Comment model.
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

    const { text } = await req.json();
    if (!text?.trim()) return sendError('Comment text is required');

    await connectDB();

    const post = await Post.findById(params.id);
    if (!post) return sendNotFound('Post not found');

    // Fetch commenter info
    const user = await User.findById(payload.userId).select('firstName lastName avatar').lean();
    const commentorName = user
      ? `${user.firstName} ${user.lastName}`.trim()
      : 'User';

    post.comments = post.comments + 1;
    await post.save();

    // Return the new comment object (ephemeral — no Comment model yet)
    return sendSuccess(
      {
        id:        `${Date.now()}`,
        text:      text.trim(),
        user: {
          id:       payload.userId,
          username: commentorName.toLowerCase().replace(/\s/g, ''),
          name:     commentorName,
          avatar:   user?.avatar ?? null,
          verified: false,
        },
        likes:     0,
        timestamp: new Date().toISOString(),
        totalComments: post.comments,
      },
      'Comment added',
      201
    );
  } catch (err) {
    return sendServerError(err instanceof Error ? err.message : String(err));
  }
}
