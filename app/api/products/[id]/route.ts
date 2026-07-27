import { NextRequest } from 'next/server';
import { Product } from '@/backend/models/Product';
import { verifyToken } from '@/backend/utils/jwt';
import { sendSuccess, sendNotFound, sendServerError } from '@/backend/utils/responseAppRouter';

/**
 * GET /api/products/[id]
 *
 * - Public access: returns active products.
 * - Authenticated owner (vendor/brand): can also preview their own pending/rejected products.
 * - Admin: can view any product.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const product = await Product.findById(id);
    if (!product) return sendNotFound('Product not found');

    // Determine caller identity (optional auth — public endpoints don't require it)
    let callerId: string | null = null;
    let callerRole: string | null = null;
    const authHeader = request.headers.get('Authorization') ?? request.headers.get('authorization') ?? '';
    if (authHeader.startsWith('Bearer ')) {
      try {
        const payload = verifyToken(authHeader.slice(7));
        if (payload) {
          callerId  = payload.userId;
          callerRole = payload.role;
        }
      } catch { /* bad token — treat as anonymous */ }
    }

    const isOwner  = callerId != null && product.vendorId === callerId;
    const isAdmin  = callerRole === 'admin';
    const isActive = product.status === 'active';

    // Block access to non-active products unless the caller owns it or is admin
    if (!isActive && !isOwner && !isAdmin) {
      return sendNotFound('Product not found or unavailable');
    }

    // Resolve vendor role for correct link generation
    let vendorRole = 'vendor';
    try {
      const { User } = await import('@/backend/models/User');
      const vendorUser = await User.findById(product.vendorId);
      if (vendorUser) vendorRole = vendorUser.role || 'vendor';
    } catch { /* non-fatal */ }

    // Related products (only active, same category)
    const related = await Product.find({ status: 'active', category: product.category }, {
      orderBy: 'salesCount', orderDir: 'desc', limit: 5,
    });
    const relatedFiltered = related
      .filter(p => p.id !== id)
      .slice(0, 4)
      .map(({ costPrice: _, ...r }) => ({
        ...r,
        // Ensure consistent field naming for the frontend
        _id: r.id,
        averageRating: r.rating ?? 0,
      }));

    const { costPrice: __, ...productData } = product as typeof product & { costPrice?: unknown };

    // Return with normalised field names the frontend expects:
    // _id (for backwards compat), averageRating, reviewCount are all explicit
    return sendSuccess({
      product: {
        ...productData,
        _id:           product.id,           // frontend reads p._id
        averageRating: product.rating ?? 0,  // frontend reads p.averageRating
        reviewCount:   product.reviewCount ?? 0,
        vendorRole,
        // Owner/admin preview metadata
        isPreview: !isActive,
      },
      related: relatedFiltered,
    });
  } catch (err) {
    console.error('[Public Products] GET/:id error:', err);
    return sendServerError('Failed to load product');
  }
}
