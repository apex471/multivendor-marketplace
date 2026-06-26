import { NextRequest } from 'next/server';
import { Story } from '@/backend/models/Story';
import { verifyToken } from '@/backend/utils/jwt';
import { db, FieldPath, docToObject } from '@/backend/config/firebase';
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

    return sendSuccess({ story: { id: story.id, expiresAt } }, 'Story published', 201);
  } catch (err) {
    return sendServerError(err instanceof Error ? err.message : String(err));
  }
}

// GET /api/stories — list active stories from followed users (+ own)
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('Authorization');
  const payload = authHeader?.startsWith('Bearer ') ? verifyToken(authHeader.slice(7)) : null;

  try {
    const sp    = new URL(request.url).searchParams;
    const limit = Math.min(50, parseInt(sp.get('limit') ?? '20'));

    const stories = await Story.findActive(limit);
    const authorIds = Array.from(new Set(stories.map(s => s.authorId)));

    const authorMap = new Map<string, any>();
    if (authorIds.length > 0) {
      const chunks: string[][] = [];
      for (let i = 0; i < authorIds.length; i += 30) {
        chunks.push(authorIds.slice(i, i + 30));
      }
      for (const chunk of chunks) {
        const snap = await db.collection('users')
          .where(FieldPath.documentId(), 'in', chunk)
          .get();
        snap.docs.forEach(d => {
          authorMap.set(d.id, docToObject<any>(d));
        });
      }
    }

    return sendSuccess({
      stories: stories.map(s => {
        const author = authorMap.get(s.authorId);
        return {
          id:         s.id,
          mediaUrls:  s.mediaUrls,
          filter:     s.filter,
          duration:   s.duration,
          viewCount:  s.viewedBy?.length ?? 0,
          viewed:     payload ? s.viewedBy?.includes(payload.userId) : false,
          expiresAt:  s.expiresAt,
          createdAt:  s.createdAt,
          author: {
            id:       s.authorId,
            username: author?.storeName || author?.firstName || '',
            name:     author ? `${author.firstName} ${author.lastName ?? ''}`.trim() : 'User',
            avatar:   author?.avatar ?? null,
          },
        };
      }),
    });
  } catch (err) {
    return sendServerError(err instanceof Error ? err.message : String(err));
  }
}
