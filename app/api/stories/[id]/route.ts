import { NextRequest } from 'next/server';
import { connectDB } from '@/backend/config/database';
import { Story } from '@/backend/models/Story';
import { User } from '@/backend/models/User';
import { verifyToken } from '@/backend/utils/jwt';
import {
  sendSuccess,
  sendNotFound,
  sendServerError,
} from '@/backend/utils/responseAppRouter';

// GET /api/stories/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();
    const story = await Story.findById(params.id).lean() as Record<string, unknown> | null;
    if (!story) return sendNotFound('Story not found or has expired');

    const author = await User.findById(story.authorId)
      .select('firstName lastName avatar username')
      .lean() as Record<string, unknown> | null;

    // Mark as viewed if authenticated
    const authHeader = request.headers.get('Authorization');
    if (authHeader?.startsWith('Bearer ')) {
      const payload = verifyToken(authHeader.slice(7));
      if (payload) {
        await Story.updateOne(
          { _id: story._id },
          { $addToSet: { viewedBy: payload.userId } }
        );
      }
    }

    return sendSuccess({
      story: {
        id:           String(story._id),
        mediaUrls:    story.mediaUrls,
        mediaTypes:   story.mediaTypes ?? [],
        filter:       story.filter,
        duration:     story.duration,
        textOverlays: story.textOverlays ?? [],
        viewCount:    story.viewedBy?.length ?? 0,
        expiresAt:    story.expiresAt,
        createdAt:    story.createdAt,
        author: author ? {
          id:       String(author._id),
          username: author.username ?? author.firstName,
          name:     `${author.firstName ?? ''} ${author.lastName ?? ''}`.trim(),
          avatar:   author.avatar ?? null,
        } : null,
      },
    });
  } catch (err) {
    return sendServerError(err instanceof Error ? err.message : String(err));
  }
}
