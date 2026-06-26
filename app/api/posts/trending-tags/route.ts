import { NextRequest } from 'next/server';
import { Post } from '@/backend/models/Post';
import { sendSuccess, sendServerError } from '@/backend/utils/responseAppRouter';

// GET /api/posts/trending-tags
// Returns the top N hashtags by post count over the last 7 days (falls back to all-time)
// Query: ?limit=20&days=7
export async function GET(request: NextRequest) {
  try {
    const sp    = new URL(request.url).searchParams;
    const limit = Math.min(50, parseInt(sp.get('limit') || '20'));
    const days  = parseInt(sp.get('days') || '7');

    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    // Fetch published & public posts
    const posts = await Post.find({ status: 'published', privacy: 'public' });
    
    // Filter by date
    const recentPosts = posts.filter(p => p.createdAt && p.createdAt >= since);
    
    // Count tags
    const getTrending = (postList: typeof posts) => {
      const tagMap: Record<string, { name: string; count: number; likes: number }> = {};
      for (const p of postList) {
        const hashtags = p.hashtags || [];
        for (const tag of hashtags) {
          if (!tag) continue;
          if (!tagMap[tag]) {
            tagMap[tag] = { name: tag, count: 0, likes: 0 };
          }
          tagMap[tag].count += 1;
          tagMap[tag].likes += p.likes || 0;
        }
      }
      return Object.values(tagMap)
        .map(t => ({
          ...t,
          score: t.count + t.likes * 0.1
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, limit)
        .map(({ name, count, likes }) => ({ name, count, likes }));
    };

    let tags = getTrending(recentPosts);
    let period = `${days}d`;
    
    // Fall back to all-time if we got fewer than 5 tags
    if (tags.length < 5) {
      tags = getTrending(posts);
      period = 'all-time';
    }

    return sendSuccess({ tags, period });
  } catch (err) {
    return sendServerError(err instanceof Error ? err.message : String(err));
  }
}
