import { NextRequest } from 'next/server';
import { connectDB } from '@/backend/config/database';
import { Post } from '@/backend/models/Post';
import { User } from '@/backend/models/User';
import { verifyToken } from '@/backend/utils/jwt';
import {
  sendSuccess,
  sendError,
  sendServerError,
} from '@/backend/utils/responseAppRouter';

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/posts — public, paginated feed (published + public only)
// Query params: page, limit, type=product (only posts with a product attached)
// ─────────────────────────────────────────────────────────────────────────────
export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const sp      = new URL(request.url).searchParams;
    const page    = Math.max(1,  parseInt(sp.get('page')  || '1'));
    const limit   = Math.min(50, parseInt(sp.get('limit') || '20'));
    const type    = sp.get('type'); // 'product' filters only product posts
    const authorId = sp.get('authorId'); // optional: filter by author

    const filter: Record<string, unknown> = {
      status:  'published',
      privacy: 'public',
    };

    if (type === 'product') {
      filter['product'] = { $exists: true, $ne: null };
    }

    if (authorId) {
      filter['authorId'] = authorId;
    }

    const skip = (page - 1) * limit;

    const [posts, total] = await Promise.all([
      Post.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Post.countDocuments(filter),
    ]);

    return sendSuccess({
      posts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
    });
  } catch (err) {
    console.error('[Posts] GET error:', err);
    return sendServerError('Failed to load feed');
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/posts — create a post (vendor or brand JWT required)
// Body: { content, images[], product?, hashtags[], privacy, status }
// ─────────────────────────────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  // Auth
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return sendError('Authentication required', 401);
  }

  const token   = authHeader.split(' ')[1];
  const decoded = verifyToken(token);
  if (!decoded) {
    return sendError('Invalid or expired token', 401);
  }

  // Vendor and brand (and admin) can post
  const ALLOWED_ROLES = new Set(['vendor', 'brand', 'admin']);
  if (!ALLOWED_ROLES.has(decoded.role)) {
    return sendError('Only vendors and brand owners can share products to the feed', 403);
  }

  try {
    await connectDB();

    // Verify user is active + approved
    const user = await User.findById(decoded.userId).lean() as Record<string, unknown>;
    if (!user) return sendError('User not found', 404);
    if (!user.isActive) return sendError('Account is suspended', 403);
    if (user.role !== 'admin' && user.applicationStatus !== 'approved') {
      return sendError('Account not yet approved by admin', 403);
    }

    const body = await request.json();
    const {
      content,
      images    = [],
      product,
      hashtags  = [],
      privacy   = 'public',
      status    = 'published',
    } = body;

    if (!content?.trim()) {
      return sendError('Post content is required', 400);
    }

    // Build the post
    const post = await Post.create({
      authorId:   decoded.userId,
      authorName: `${user.firstName} ${user.lastName}`.trim(),
      authorRole: user.role === 'admin' ? 'vendor' : user.role,
      content:    content.trim(),
      images:     Array.isArray(images) ? images : [],
      product:    product ?? undefined,
      hashtags:   Array.isArray(hashtags) ? hashtags : [],
      privacy,
      status,
    });

    return sendSuccess({ post }, 'Post created', 201);
  } catch (err) {
    console.error('[Posts] POST error:', err);
    return sendServerError('Failed to create post');
  }
}
