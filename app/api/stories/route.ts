import { NextRequest } from 'next/server';
import { connectDB } from '@/backend/config/database';
import { Story } from '@/backend/models/Story';
import { verifyToken } from '@/backend/utils/jwt';
import {
  sendSuccess,
  sendError,
  sendServerError,
} from '@/backend/utils/responseAppRouter';

// POST /api/stories — create a story (auth required)
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return sendError('Unauthorized', 401);
  const payload = verifyToken(authHeader.slice(7));
  if (!payload) return sendError('Invalid token', 401);

  try {
    const body = await request.json();
    const { mediaUrls, mediaTypes, filter, duration, textOverlays } = body;

    if (!mediaUrls?.length) return sendError('At least one media URL is required', 400);

    await connectDB();

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    const story = await Story.create({
      authorId:     payload.userId,
      mediaUrls:    mediaUrls,
      mediaTypes:   mediaTypes ?? [],
      filter:       filter ?? 'none',
      duration:     duration ?? 5,
      textOverlays: textOverlays ?? [],
      viewedBy:     [],
      expiresAt,
    });

    return sendSuccess({ story: { id: String(story._id), expiresAt } }, 'Story published', 201);
  } catch (err) {
    return sendServerError(err instanceof Error ? err.message : String(err));
  }
}

// GET /api/stories — list active stories from followed users (+ own)
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('Authorization');
  const payload = authHeader?.startsWith('Bearer ') ? verifyToken(authHeader.slice(7)) : null;

  try {
    await connectDB();
    const sp    = new URL(request.url).searchParams;
    const limit = Math.min(50, parseInt(sp.get('limit') ?? '20'));

    const stories = await Story.find({ expiresAt: { $gt: new Date() } })
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('authorId', 'firstName lastName avatar username')
      .lean() as Record<string, unknown>[];

    return sendSuccess({
      stories: stories.map(s => ({
        id:         String(s._id),
        mediaUrls:  s.mediaUrls,
        filter:     s.filter,
        duration:   s.duration,
        viewCount:  (s.viewedBy as unknown[])?.length ?? 0,
        viewed:     payload ? (s.viewedBy as unknown[])?.some((v) => String(v) === payload.userId) : false,
        expiresAt:  s.expiresAt,
        createdAt:  s.createdAt,
        author: {
          id:       String((s.authorId as any)?._id ?? ''),
          username: (s.authorId as any)?.username ?? (s.authorId as any)?.firstName ?? '',
          name:     `${(s.authorId as any)?.firstName ?? ''} ${(s.authorId as any)?.lastName ?? ''}`.trim(),
          avatar:   (s.authorId as any)?.avatar ?? null,
        },
      })),
    });
  } catch (err) {
    return sendServerError(err instanceof Error ? err.message : String(err));
  }
}
