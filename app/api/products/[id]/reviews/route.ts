import { NextRequest } from 'next/server';
import { connectDB } from '@/backend/config/database';
import { Review } from '@/backend/models/Review';
import { Product } from '@/backend/models/Product';
import { User } from '@/backend/models/User';
import { verifyToken } from '@/backend/utils/jwt';
import {
  sendSuccess,
  sendError,
  sendUnauthorized,
  sendNotFound,
  sendServerError,
} from '@/backend/utils/responseAppRouter';

// GET /api/products/[id]/reviews — public product reviews
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();

    const sp    = new URL(req.url).searchParams;
    const page  = Math.max(1,  parseInt(sp.get('page')  || '1'));
    const limit = Math.min(20, parseInt(sp.get('limit') || '10'));
    const skip  = (page - 1) * limit;

    const [reviews, total] = await Promise.all([
      Review.find({ productId: params.id })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Review.countDocuments({ productId: params.id }),
    ]);

    // Compute aggregate stats
    const stats = await Review.aggregate([
      { $match: { productId: { $in: [params.id] } } },
      {
        $group: {
          _id: null,
          avgRating: { $avg: '$rating' },
          count5: { $sum: { $cond: [{ $eq: ['$rating', 5] }, 1, 0] } },
          count4: { $sum: { $cond: [{ $eq: ['$rating', 4] }, 1, 0] } },
          count3: { $sum: { $cond: [{ $eq: ['$rating', 3] }, 1, 0] } },
          count2: { $sum: { $cond: [{ $eq: ['$rating', 2] }, 1, 0] } },
          count1: { $sum: { $cond: [{ $eq: ['$rating', 1] }, 1, 0] } },
        },
      },
    ]);

    return sendSuccess({
      reviews: reviews.map(r => ({
        id:        r._id,
        rating:    r.rating,
        title:     r.title ?? '',
        comment:   r.comment,
        helpful:   r.helpful,
        verified:  r.verified,
        createdAt: r.createdAt,
        user: {
          id:     r.userId,
          name:   r.userName,
          avatar: r.userAvatar ?? null,
        },
      })),
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      stats: stats[0]
        ? {
            avgRating: Math.round(stats[0].avgRating * 10) / 10,
            distribution: {
              5: stats[0].count5,
              4: stats[0].count4,
              3: stats[0].count3,
              2: stats[0].count2,
              1: stats[0].count1,
            },
          }
        : { avgRating: 0, distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 } },
    });
  } catch (err) {
    return sendServerError(err);
  }
}

// POST /api/products/[id]/reviews — submit a review (requires auth)
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = req.headers.get('authorization') ?? '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
    if (!token) return sendUnauthorized('Authentication required');
    const payload = verifyToken(token);
    if (!payload) return sendUnauthorized('Invalid token');

    await connectDB();

    const product = await Product.findById(params.id).lean();
    if (!product) return sendNotFound('Product not found');

    const { rating, title, comment } = await req.json();
    if (!rating || rating < 1 || rating > 5) return sendError('Rating must be between 1 and 5');
    if (!comment?.trim()) return sendError('Review comment is required');

    const user = await User.findById(payload.userId).select('firstName lastName avatar').lean();
    if (!user) return sendUnauthorized('User not found');

    const review = await Review.findOneAndUpdate(
      { productId: params.id, userId: payload.userId },
      {
        productId:  params.id,
        userId:     payload.userId,
        userName:   `${user.firstName} ${user.lastName}`.trim(),
        userAvatar: user.avatar,
        rating,
        title:      title?.trim(),
        comment:    comment.trim(),
      },
      { upsert: true, new: true }
    );

    // Update product aggregate rating
    const agg = await Review.aggregate([
      { $match: { productId: { $in: [params.id] } } },
      { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } },
    ]);
    if (agg[0]) {
      await Product.findByIdAndUpdate(params.id, {
        rating:      Math.round(agg[0].avg * 10) / 10,
        reviewCount: agg[0].count,
      });
    }

    return sendSuccess({
      id:       review._id,
      rating:   review.rating,
      title:    review.title,
      comment:  review.comment,
      createdAt: review.createdAt,
    }, 'Review submitted', 201);
  } catch (err) {
    return sendServerError(err);
  }
}
