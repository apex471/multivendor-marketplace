import { NextRequest } from 'next/server';
import { Wishlist } from '@/backend/models/Wishlist';
import { Product } from '@/backend/models/Product';
import { verifyToken } from '@/backend/utils/jwt';
import { db, FieldPath, docToObject } from '@/backend/config/firebase';
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

    const items = await Wishlist.find({ userId: payload.userId }, { orderBy: 'createdAt', orderDir: 'desc' });

    const productIds = items.map(item => item.productId).filter(Boolean);
    const productMap = new Map<string, any>();
    
    if (productIds.length > 0) {
      const uniqueIds = Array.from(new Set(productIds));
      const chunks: string[][] = [];
      for (let i = 0; i < uniqueIds.length; i += 30) {
        chunks.push(uniqueIds.slice(i, i + 30));
      }
      for (const chunk of chunks) {
        const snap = await db.collection('products')
          .where(FieldPath.documentId(), 'in', chunk)
          .get();
        snap.docs.forEach(d => {
          productMap.set(d.id, docToObject<any>(d));
        });
      }
    }

    const wishlist = items
      .map(item => {
        const p = productMap.get(item.productId);
        if (!p) return null; // skip deleted products
        const price = p.salePrice && p.salePrice < p.price ? p.salePrice : p.price;
        return {
          wishlistId: item.id,
          productId:  p.id,
          name:       p.name,
          price,
          oldPrice:   p.salePrice && p.salePrice < p.price ? p.price : undefined,
          image:      p.images?.[0] ?? '/images/placeholder.jpg',
          vendor:     p.vendorName ?? 'Vendor',
          rating:     p.rating ?? 0,
          inStock:    (p.stock ?? 0) > 0,
          addedAt:    item.createdAt,
        };
      })
      .filter(Boolean);

    return sendSuccess({ wishlist });
  } catch (err) {
    return sendServerError(err instanceof Error ? err.message : String(err));
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

    const product = await Product.findById(productId);
    if (!product) return sendError('Product not found', 404);

    await Wishlist.upsert(payload.userId, productId);

    return sendSuccess({ added: true }, 'Added to wishlist', 201);
  } catch (err) {
    return sendServerError(err instanceof Error ? err.message : String(err));
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

    if (all === 'true') {
      await Wishlist.deleteMany({ userId: payload.userId });
      return sendSuccess({ removed: true }, 'Wishlist cleared');
    }

    if (!productId) return sendError('productId is required');
    await Wishlist.findOneAndDelete({ userId: payload.userId, productId });
    return sendSuccess({ removed: true }, 'Removed from wishlist');
  } catch (err) {
    return sendServerError(err instanceof Error ? err.message : String(err));
  }
}
