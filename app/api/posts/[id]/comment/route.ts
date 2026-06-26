import { NextRequest } from 'next/server';
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
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const sp    = new URL(req.url).searchParams;
    const page  = Math.max(1, parseInt(sp.get('page') ?? '1'));
    const limit = Math.min(50, parseInt(sp.get('limit') ?? '20'));
    const skip  = (page - 1) * limit;

    const post = await Post.findById(id);
    if (!post) return sendNotFound('Post not found');

    // Fetch all comments for the post and filter top-level ones in-memory
    const allComments = await Comment.find({ postId: id });
    const topLevel = allComments.filter(c => !(c as any).parentId);
    
    // Sort by createdAt desc
    topLevel.sort((a, b) => {
      const ad = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bd = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return bd - ad;
    });

    const total = topLevel.length;
    const paginated = topLevel.slice(skip, skip + limit);

    return sendSuccess({
      comments: paginated.map(c => ({
        id:           String(c.id),
        text:         c.content,
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
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const auth = req.headers.get('authorization') ?? '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
    if (!token) return sendUnauthorized('Authentication required');
    const payload = verifyToken(token);
    if (!payload) return sendUnauthorized('Invalid token');

    const { text, parentId } = await req.json();
    if (!text?.trim()) return sendError('Comment text is required');

    const post = await Post.findById(id);
    if (!post) return sendNotFound('Post not found');

    // Fetch commenter info
    const user = await User.findById(payload.userId);
    const authorName = user
      ? `${user.firstName} ${user.lastName ?? ''}`.trim()
      : 'User';

    // Store the comment in the Comment collection
    const comment = await Comment.create({
      postId:      id,
      authorId:    payload.userId,
      authorName,
      authorAvatar: user?.avatar ?? undefined,
      content:      text.trim(),
      ...(parentId ? { parentId } : {}),
    } as any);

    await Post.increment(id, 'comments', 1);
    post.comments = post.comments + 1;

    // Send notification to post author (non-blocking)
    if (String(post.authorId) !== payload.userId) {
      Notification.create({
        recipientId: post.authorId,
        type:        'comment',
        actorId:     payload.userId,
        actorName:   authorName,
        actorAvatar: user?.avatar ?? undefined,
        text:        `${authorName} commented on your post`,
        link:        `/post/${id}`,
        isRead:      false,
      }).catch(() => {});
    }

    return sendSuccess(
      {
        id:           String(comment.id),
        text:         comment.content,
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
