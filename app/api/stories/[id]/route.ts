import { NextRequest } from 'next/server';
import { Story } from '@/backend/models/Story';
import { User } from '@/backend/models/User';
import { verifyToken } from '@/backend/utils/jwt';
import {
  sendSuccess,
  sendNotFound,
  sendServerError,
  sendError,
} from '@/backend/utils/responseAppRouter';

// GET /api/stories/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const story = await Story.findById(id);
    if (!story) return sendNotFound('Story not found or has expired');

    const author = await User.findById(story.authorId);

    // Mark as viewed if authenticated
    const authHeader = request.headers.get('Authorization');
    if (authHeader?.startsWith('Bearer ')) {
      const payload = verifyToken(authHeader.slice(7));
      if (payload) {
        await Story.addViewer(id, payload.userId);
      }
    }

    return sendSuccess({
      story: {
        id:           story.id,
        mediaUrls:    story.mediaUrls,
        mediaTypes:   story.mediaTypes ?? [],
        filter:       story.filter,
        duration:     story.duration,
        textOverlays: story.textOverlays ?? [],
        viewCount:    story.viewedBy?.length ?? 0,
        expiresAt:    story.expiresAt,
        createdAt:    story.createdAt,
        author: author ? {
          id:       author.id,
          username: author.storeName || author.firstName,
          name:     `${author.firstName ?? ''} ${author.lastName ?? ''}`.trim(),
          avatar:   author.avatar ?? null,
        } : null,
      },
    });
  } catch (err) {
    return sendServerError(err instanceof Error ? err.message : String(err));
  }
}

// DELETE /api/stories/[id] — delete story
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return sendError('Authentication required', 401);
  }

  const token = authHeader.split(' ')[1];
  const payload = verifyToken(token);
  if (!payload) return sendError('Invalid or expired token', 401);

  try {
    const story = await Story.findById(id);
    if (!story) return sendNotFound('Story not found');

    if (story.authorId !== payload.userId && payload.role !== 'admin') {
      return sendError('Unauthorized', 403);
    }

    await Story.deleteOne(id);
    return sendSuccess({ id }, 'Story deleted successfully');
  } catch (err) {
    return sendServerError(err instanceof Error ? err.message : String(err));
  }
}
