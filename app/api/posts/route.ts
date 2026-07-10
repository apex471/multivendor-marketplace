import { NextRequest } from 'next/server';
import { Post } from '@/backend/models/Post';
import { PostLike } from '@/backend/models/PostLike';
import { User } from '@/backend/models/User';
import { verifyToken } from '@/backend/utils/jwt';
import { db, FieldPath } from '@/backend/config/firebase';
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
    const sp      = new URL(request.url).searchParams;
    const page    = Math.max(1,  parseInt(sp.get('page')  || '1'));
    const limit   = Math.min(50, parseInt(sp.get('limit') || '20'));
    const type    = sp.get('type'); // 'product' filters only product posts
    const authorId = sp.get('authorId'); // optional: filter by author

    const filter: Record<string, unknown> = {
      status:  'published',
      privacy: 'public',
    };

    if (authorId) {
      filter['authorId'] = authorId;
    }

    const skip = (page - 1) * limit;

    // Identify current user for liked-state
    const authHeader = request.headers.get('Authorization');
    let currentUserId: string | null = null;
    if (authHeader?.startsWith('Bearer ')) {
      const tok = verifyToken(authHeader.slice(7));
      if (tok) currentUserId = tok.userId;
    }

    // Fetch all matching posts first to do sorting/filtering
    const posts = await Post.find(filter, { orderBy: 'createdAt', orderDir: 'desc' });

    // Filter in-memory for product type
    let results = posts;
    if (type === 'product') {
      results = results.filter(p => p.product !== undefined && p.product !== null);
    }

    const total = results.length;
    const paginated = results.slice(skip, skip + limit);

    // Fetch liked state for current user
    let likedSet = new Set<string>();
    if (currentUserId && paginated.length > 0) {
      const postIds = paginated.map(p => p.id).filter((id): id is string => !!id);
      likedSet = await PostLike.getLikedPostIds(currentUserId, postIds);
    }

    // Bulk-fill missing authorAvatars from User collection
    const missingAvatarIds = paginated
      .filter(p => !p.authorAvatar)
      .map(p => p.authorId);
    const avatarMap = new Map<string, string>();
    if (missingAvatarIds.length > 0) {
      const uniqueIds = Array.from(new Set(missingAvatarIds));
      const chunks: string[][] = [];
      for (let i = 0; i < uniqueIds.length; i += 30) {
        chunks.push(uniqueIds.slice(i, i + 30));
      }
      for (const chunk of chunks) {
        const snap = await db.collection('users')
          .where(FieldPath.documentId(), 'in', chunk)
          .get();
        snap.docs.forEach(d => {
          const data = d.data();
          if (data?.avatar) {
            avatarMap.set(d.id, data.avatar);
          }
        });
      }
    }

    return sendSuccess({
      posts: paginated.map(p => ({
        ...p,
        authorId:     String(p.authorId),
        authorAvatar: p.authorAvatar || avatarMap.get(String(p.authorId)) || null,
        liked:        likedSet.has(String(p.id)),
      })),
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
    // Verify user is active + approved
    const user = await User.findById(decoded.userId);
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

    if (!Array.isArray(hashtags) || hashtags.map((t: any) => String(t || '').trim()).filter(Boolean).length === 0) {
      return sendError('Please add at least one tag to your post.', 400);
    }

    // Build the post
    const post = await Post.create({
      authorId:     decoded.userId,
      authorName:   `${user.firstName} ${user.lastName}`.trim(),
      authorAvatar: user.avatar ?? undefined,
      authorRole:   user.role === 'admin' ? 'vendor' : user.role as any,
      content:    content.trim(),
      images:     Array.isArray(images) ? images : [],
      product:    product ?? undefined,
      hashtags:   Array.isArray(hashtags) ? hashtags : [],
      privacy,
      status,
      likes:    0,
      comments: 0,
      shares:   0,
    });

    return sendSuccess({ post }, 'Post created', 201);
  } catch (err) {
    console.error('[Posts] POST error:', err);
    return sendServerError('Failed to create post');
  }
}
