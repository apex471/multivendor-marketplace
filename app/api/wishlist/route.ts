import { NextRequest } from 'next/server';
import { connectDB } from '@/backend/config/database';
import { Wishlist } from '@/backend/models/Wishlist';
import { Product } from '@/backend/models/Product';
import { verifyToken } from '@/backend/utils/jwt';
import {
  sendSuccess,
  sendError,
  sendUnauthorized,
  sendServerError,
} from '@/backend/utils/responseAppRouter';

function getToken(req: NextRequest) {
  const auth = req.headers.get('authorization') ?? '';
  return auth.startsWith('Bearer ') ? auth.slice(7) : null;
}

// GET /api/wishlist — get current user's wishlist
export async function GET(req: NextRequest) {
  try {
    const token = getToken(req);
    if (!token) return sendUnauthorized('Authentication required');
    const payload = verifyToken(token);
    if (!payload) return sendUnauthorized('Invalid token');

    await connectDB();

    const items = await Wishlist.find({ userId: payload.userId })
      .sort({ createdAt: -1 })
      .populate({
        path: 'productId',
        model: Product,
        select: 'name price salePrice images rating reviewCount vendorName stock',
      })
      .lean();

    const wishlist = items
      .filter(item => item.productId) // skip deleted products
      .map(item => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const p = item.productId as Record<string, any>;
        const price = p.salePrice && p.salePrice < p.price ? p.salePrice : p.price;
        return {
          wishlistId: item._id,
          productId:  String(p._id),
          name:       p.name,
          price,
          oldPrice:   p.salePrice && p.salePrice < p.price ? p.price : undefined,
          image:      p.images?.[0] ?? '/images/placeholder.jpg',
          vendor:     p.vendorName ?? 'Vendor',
          rating:     p.rating ?? 0,
          inStock:    (p.stock ?? 0) > 0,
          addedAt:    item.createdAt,
        };
      });

    return sendSuccess({ wishlist });
  } catch (err) {
    return sendServerError(err);
  }
}

// POST /api/wishlist — add product to wishlist
export async function POST(req: NextRequest) {
  try {
    const token = getToken(req);
    if (!token) return sendUnauthorized('Authentication required');
    const payload = verifyToken(token);
    if (!payload) return sendUnauthorized('Invalid token');

    const { productId } = await req.json();
    if (!productId) return sendError('productId is required');

    await connectDB();

    const product = await Product.findById(productId).lean();
    if (!product) return sendError('Product not found', 404);

    await Wishlist.findOneAndUpdate(
      { userId: payload.userId, productId },
      { userId: payload.userId, productId },
      { upsert: true, new: true }
    );

    return sendSuccess({ added: true }, 'Added to wishlist', 201);
  } catch (err) {
    return sendServerError(err);
  }
}

// DELETE /api/wishlist — remove product from wishlist
export async function DELETE(req: NextRequest) {
  try {
    const token = getToken(req);
    if (!token) return sendUnauthorized('Authentication required');
    const payload = verifyToken(token);
    if (!payload) return sendUnauthorized('Invalid token');

    const { searchParams } = new URL(req.url);
    const productId = searchParams.get('productId');
    const all = searchParams.get('all');

    await connectDB();

    if (all === 'true') {
      await Wishlist.deleteMany({ userId: payload.userId });
      return sendSuccess({ removed: true }, 'Wishlist cleared');
    }

    if (!productId) return sendError('productId is required');
    await Wishlist.findOneAndDelete({ userId: payload.userId, productId });
    return sendSuccess({ removed: true }, 'Removed from wishlist');
  } catch (err) {
    return sendServerError(err);
  }
}
