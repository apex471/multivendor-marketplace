import { NextRequest } from 'next/server';
import { connectDB } from '@/backend/config/database';
import { Post } from '@/backend/models/Post';
import { Comment } from '@/backend/models/Comment';
import { User } from '@/backend/models/User';
import { Notification } from '@/backend/models/Notification';
import { verifyToken } from '@/backend/utils/jwt';
import {
  sendSuccess,
  sendError,
  sendNotFound,
  sendUnauthorized,
  sendServerError,
} from '@/backend/utils/responseAppRouter';

// GET /api/posts/[id]/comment — list persisted comments (public)
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();

    const sp    = new URL(req.url).searchParams;
    const page  = Math.max(1, parseInt(sp.get('page') ?? '1'));
    const limit = Math.min(50, parseInt(sp.get('limit') ?? '20'));
    const skip  = (page - 1) * limit;

    const post = await Post.findById(params.id).select('_id').lean();
    if (!post) return sendNotFound('Post not found');

    const [comments, total] = await Promise.all([
      Comment.find({ postId: params.id, parentId: { $exists: false } })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Comment.countDocuments({ postId: params.id, parentId: { $exists: false } }),
    ]);

    return sendSuccess({
      comments: comments.map(c => ({
        id:           String(c._id),
        text:         c.text,
        authorId:     String(c.authorId),
        authorName:   c.authorName,
        authorAvatar: c.authorAvatar ?? null,
        likes:        c.likes,
        createdAt:    c.createdAt,
      })),
      pagination: { page, limit, total, hasNext: page * limit < total },
    });
  } catch (err) {
    return sendServerError(err instanceof Error ? err.message : String(err));
  }
}

// POST /api/posts/[id]/comment — add a comment (requires auth)
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

    const { text, parentId } = await req.json();
    if (!text?.trim()) return sendError('Comment text is required');

    await connectDB();

    const post = await Post.findById(params.id);
    if (!post) return sendNotFound('Post not found');

    // Fetch commenter info
    const user = await User.findById(payload.userId).select('firstName lastName avatar').lean();
    const authorName = user
      ? `${user.firstName} ${user.lastName ?? ''}`.trim()
      : 'User';

    // Store the comment in the Comment collection
    const comment = await Comment.create({
      postId:      params.id,
      authorId:    payload.userId,
      authorName,
      authorAvatar: user?.avatar ?? undefined,
      text:         text.trim(),
      ...(parentId ? { parentId } : {}),
    });

    post.comments = post.comments + 1;
    await post.save();

    // Send notification to post author (non-blocking)
    if (String(post.authorId) !== payload.userId) {
      Notification.create({
        recipientId: post.authorId,
        type:        'comment',
        actorId:     payload.userId,
        actorName:   authorName,
        actorAvatar: user?.avatar ?? undefined,
        text:        `${authorName} commented on your post`,
        link:        `/post/${params.id}`,
      }).catch(() => {});
    }

    return sendSuccess(
      {
        id:           String(comment._id),
        text:         comment.text,
        authorId:     String(comment.authorId),
        authorName:   comment.authorName,
        authorAvatar: comment.authorAvatar ?? null,
        likes:        0,
        createdAt:    comment.createdAt,
        totalComments: post.comments,
      },
      'Comment added',
      201
    );
  } catch (err) {
    return sendServerError(err instanceof Error ? err.message : String(err));
  }
}

