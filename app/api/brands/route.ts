import { NextRequest } from 'next/server';
import { User } from '@/backend/models/User';
import { db } from '@/backend/config/firebase';
import { sendSuccess, sendServerError } from '@/backend/utils/responseAppRouter';

/**
 * GET /api/brands
 * Public endpoint — returns approved, active brand accounts with product counts.
 *
 * Query params:
 *   page, limit, search, sort (newest|name)
 */
export async function GET(request: NextRequest) {
  try {
    const sp     = new URL(request.url).searchParams;
    const page   = Math.max(1,  parseInt(sp.get('page')  || '1'));
    const limit  = Math.min(48, parseInt(sp.get('limit') || '24'));
    const search = sp.get('search') || '';
    const sortBy = sp.get('sort')   || 'newest';

    const skip = (page - 1) * limit;

    let allBrands = await User.find({
      role:              'brand',
      applicationStatus: 'approved',
      isActive:          true,
    });

    if (search) {
      const lower = search.toLowerCase();
      allBrands = allBrands.filter(b =>
        b.firstName.toLowerCase().includes(lower) ||
        (b.lastName && b.lastName.toLowerCase().includes(lower)) ||
        (b.bio && b.bio.toLowerCase().includes(lower))
      );
    }

    if (sortBy === 'oldest') {
      allBrands.sort((a, b) => (a.createdAt ? new Date(a.createdAt).getTime() : 0) - (b.createdAt ? new Date(b.createdAt).getTime() : 0));
    } else if (sortBy === 'name') {
      allBrands.sort((a, b) => a.firstName.localeCompare(b.firstName));
    } else {
      // newest
      allBrands.sort((a, b) => (b.createdAt ? new Date(b.createdAt).getTime() : 0) - (a.createdAt ? new Date(a.createdAt).getTime() : 0));
    }

    const total = allBrands.length;
    const paginated = allBrands.slice(skip, skip + limit);

    // Attach active product counts for each brand
    const brandIds = paginated.map(b => b.id!).filter(Boolean);
    const countMap = new Map<string, number>();

    if (brandIds.length > 0) {
      const snap = await db.collection('products')
        .where('status', '==', 'active')
        .where('vendorId', 'in', brandIds)
        .get();
      snap.docs.forEach(d => {
        const vId = d.data().vendorId;
        if (vId) {
          countMap.set(vId, (countMap.get(vId) ?? 0) + 1);
        }
      });
    }

    const enriched = paginated.map((brand) => {
      const id = brand.id!;
      return {
        id,
        name:     `${brand.firstName} ${brand.lastName ?? ''}`.trim(),
        avatar:   brand.avatar || null,
        bio:      brand.bio    || '',
        products: countMap.get(id) || 0,
        joinedAt: brand.createdAt,
      };
    });

    return sendSuccess({
      brands: enriched,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext:    page * limit < total,
        hasPrev:    page > 1,
      },
    });
  } catch (err) {
    console.error('[Public Brands] GET error:', err);
    return sendServerError('Failed to load brands');
  }
}
