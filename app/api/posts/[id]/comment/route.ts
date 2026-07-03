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

// GET /api/posts/[id]/comment — list top-level comments (public)
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

    const allComments = await Comment.find({ postId: id });

    // Filter top-level, sort newest first in-memory
    const topLevel = allComments
      .filter(c => !(c as unknown as Record<string, unknown>).parentId)
      .sort((a, b) => {
        const ad = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bd = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return bd - ad;
      });

    const total     = topLevel.length;
    const paginated = topLevel.slice(skip, skip + limit);

    return sendSuccess({
      comments: paginated.map(c => ({
        id:           String(c.id),
        text:         c.content,
        authorId:     String(c.authorId),
        authorName:   c.authorName,
        authorAvatar: c.authorAvatar ?? null,
        likes:        c.likes ?? 0,
        createdAt:    c.createdAt,
      })),
      pagination: { page, limit, total, hasNext: page * limit < total },
    });
  } catch (err) {
    console.error('[Comment GET] error:', err);
    return sendServerError(err instanceof Error ? err.message : 'Failed to load comments');
  }
}

// POST /api/posts/[id]/comment
// ─ Any authenticated user (customer, vendor, brand, admin) can comment.
// ─ Body: { text: string, parentId?: string }
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // ── Auth — no role restriction, any signed-in user may comment ──────────
  const auth  = req.headers.get('authorization') ?? req.headers.get('Authorization') ?? '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return sendUnauthorized('You must be logged in to comment');
  const payload = verifyToken(token);
  if (!payload?.userId) return sendUnauthorized('Invalid or expired session — please log in again');

  try {
    let body: { text?: string; parentId?: string } = {};
    try { body = await req.json(); } catch { /* malformed body */ }

    const text     = (body.text ?? '').trim();
    const parentId = body.parentId ?? undefined;

    if (!text) return sendError('Comment text is required', 400);
    if (text.length > 2000) return sendError('Comment is too long (max 2000 characters)', 400);

    const post = await Post.findById(id);
    if (!post) return sendNotFound('Post not found');

    // Resolve author display name — gracefully handle if profile not found
    let authorName   = 'User';
    let authorAvatar: string | undefined;
    try {
      const user = await User.findById(payload.userId);
      if (user) {
        authorName   = `${user.firstName} ${user.lastName ?? ''}`.trim() || 'User';
        authorAvatar = user.avatar ?? undefined;
      }
    } catch { /* non-fatal — use defaults */ }

    // Persist the comment
    const comment = await Comment.create({
      postId:      id,
      authorId:    payload.userId,
      authorName,
      authorAvatar,
      content:     text,
      likes:       0,
      ...(parentId ? { parentId } : {}),
    } as Parameters<typeof Comment.create>[0]);

    // Increment post comment counter
    await Post.increment(id, 'comments', 1);
    const totalComments = (post.comments ?? 0) + 1;

    // Notify post author (fire-and-forget)
    if (String(post.authorId) !== payload.userId) {
      Notification.create({
        recipientId: post.authorId,
        type:        'comment',
        actorId:     payload.userId,
        actorName:   authorName,
        actorAvatar: authorAvatar,
        text:        `${authorName} commented on your post`,
        link:        `/post/${id}`,
        isRead:      false,
      }).catch(() => {});
    }

    return sendSuccess(
      {
        id:            String(comment.id),
        text:          comment.content,
        authorId:      String(comment.authorId),
        authorName:    comment.authorName,
        authorAvatar:  comment.authorAvatar ?? null,
        likes:         0,
        createdAt:     comment.createdAt,
        totalComments,
      },
      'Comment added',
      201,
    );
  } catch (err) {
    console.error('[Comment POST] error:', err);
    return sendServerError(err instanceof Error ? err.message : 'Failed to post comment');
  }
}
