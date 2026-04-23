import { NextRequest } from 'next/server';
import { connectDB } from '@/backend/config/database';
import { Post } from '@/backend/models/Post';
import { sendSuccess, sendServerError } from '@/backend/utils/responseAppRouter';
import type { PipelineStage } from 'mongoose';

// GET /api/posts/trending-tags
// Returns the top N hashtags by post count over the last 7 days (falls back to all-time)
// Query: ?limit=20&days=7
export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const sp    = new URL(request.url).searchParams;
    const limit = Math.min(50, parseInt(sp.get('limit') || '20'));
    const days  = parseInt(sp.get('days') || '7');

    // Date boundary — look back N days; if too few results, expand to all-time
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const buildPipeline = (dateFilter: Record<string, unknown>): PipelineStage[] => [
      {
        $match: {
          status:   'published',
          privacy:  'public',
          hashtags: { $exists: true, $not: { $size: 0 } },
          ...dateFilter,
        },
      },
      { $unwind: '$hashtags' },
      {
        $group: {
          _id:   '$hashtags',
          count: { $sum: 1 },
          likes: { $sum: '$likes' },
        },
      },
      // Score: post count * 1 + likes * 0.1
      {
        $addFields: {
          score: { $add: ['$count', { $multiply: ['$likes', 0.1] }] },
        },
      },
      { $sort: { score: -1 } },
      { $limit: limit },
      {
        $project: {
          _id:   0,
          name:  '$_id',
          count: 1,
          likes: 1,
        },
      },
    ];

    let tags = await Post.aggregate(buildPipeline({ createdAt: { $gte: since } }));

    // Fall back to all-time if we got fewer than 5 recent tags
    if (tags.length < 5) {
      tags = await Post.aggregate(buildPipeline({}));
    }

    return sendSuccess({ tags, period: tags.length > 0 ? `${days}d` : 'all-time' });
  } catch (err) {
    return sendServerError(err instanceof Error ? err.message : String(err));
  }
}
