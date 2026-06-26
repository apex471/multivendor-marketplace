import { NextRequest } from 'next/server';
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

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const sp    = new URL(req.url).searchParams;
    const page  = Math.max(1,  parseInt(sp.get('page')  || '1'));
    const limit = Math.min(20, parseInt(sp.get('limit') || '10'));

    const [reviews, total] = await Promise.all([
      Review.find({ productId: id }, { orderBy: 'createdAt', orderDir: 'desc', limit: page * limit }),
      Review.countDocuments({ productId: id }),
    ]);

    const paged = reviews.slice((page - 1) * limit);

    // Compute distribution in-memory
    const allReviews = await Review.find({ productId: id });
    const dist = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    let ratingSum = 0;
    allReviews.forEach(r => {
      dist[r.rating as keyof typeof dist]++;
      ratingSum += r.rating;
    });
    const avgRating = allReviews.length ? Math.round((ratingSum / allReviews.length) * 10) / 10 : 0;

    return sendSuccess({
      reviews: paged.map(r => ({
        id:        r.id,
        rating:    r.rating,
        title:     r.title ?? '',
        comment:   r.content,
        helpful:   r.helpful,
        verified:  r.verified,
        createdAt: r.createdAt,
        user: { id: r.authorId, name: r.authorName, avatar: r.authorAvatar ?? null },
      })),
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      stats: { avgRating, distribution: dist },
    });
  } catch (err) {
    return sendServerError(err instanceof Error ? err.message : String(err));
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const auth = req.headers.get('authorization') ?? '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
    if (!token) return sendUnauthorized('Authentication required');
    const payload = verifyToken(token);
    if (!payload) return sendUnauthorized('Invalid token');

    const product = await Product.findById(id);
    if (!product) return sendNotFound('Product not found');

    const { rating, title, comment } = await req.json();
    if (!rating || rating < 1 || rating > 5) return sendError('Rating must be between 1 and 5');
    if (!comment?.trim()) return sendError('Review comment is required');

    const user = await User.findById(payload.userId);
    if (!user) return sendUnauthorized('User not found');

    // Check if review exists already (one per user per product)
    const existing = await Review.findOne({ productId: id, authorId: payload.userId });
    let review;
    if (existing) {
      await Review.increment(existing.id!, 'rating', 0); // no-op just to refresh
      // Update by creating new (since we don't have findOneAndUpdate in Firestore layer)
      // For simplicity, delete and recreate
      const { db } = await import('@/backend/config/firebase');
      await db.collection('reviews').doc(existing.id!).update({
        rating, title: title?.trim(), content: comment.trim(), updatedAt: new Date(),
      });
      review = { ...existing, rating, title, content: comment.trim() };
    } else {
      review = await Review.create({
        productId: id,
        authorId: payload.userId,
        authorName: `${user.firstName} ${user.lastName}`.trim(),
        authorAvatar: user.avatar,
        rating,
        title: title?.trim(),
        content: comment.trim(),
        helpful: 0,
        verified: false,
      });
    }

    // Update product aggregate rating
    const avgRating = await Review.averageRating(id);
    const reviewCount = await Review.countDocuments({ productId: id });
    await Product.updateOne(id, { rating: avgRating, reviewCount });

    return sendSuccess({ id: review.id, rating, title, comment, createdAt: review.createdAt }, 'Review submitted', 201);
  } catch (err) {
    return sendServerError(err instanceof Error ? err.message : String(err));
  }
}
