import { NextRequest } from 'next/server';
import { User } from '@/backend/models/User';
import { db } from '@/backend/config/firebase';
import { sendSuccess, sendServerError } from '@/backend/utils/responseAppRouter';

/**
 * GET /api/vendors
 * Public endpoint — returns approved, active vendors with product counts.
 *
 * Query params:
 *   page, limit, search, category, sort (popular|newest|rating)
 */
export async function GET(request: NextRequest) {
  try {
    const sp       = new URL(request.url).searchParams;
    const page     = Math.max(1,  parseInt(sp.get('page')   || '1'));
    const limit    = Math.min(48, parseInt(sp.get('limit')  || '24'));
    const search   = sp.get('search')   || '';
    const sortBy   = sp.get('sort')     || 'newest';

    const skip = (page - 1) * limit;

    let allVendors = await User.find({
      role:              'vendor',
      applicationStatus: 'approved',
      isActive:          true,
    });

    if (search) {
      const lower = search.toLowerCase();
      allVendors = allVendors.filter(v =>
        v.firstName.toLowerCase().includes(lower) ||
        (v.lastName && v.lastName.toLowerCase().includes(lower)) ||
        (v.bio && v.bio.toLowerCase().includes(lower))
      );
    }

    if (sortBy === 'oldest') {
      allVendors.sort((a, b) => (a.createdAt ? new Date(a.createdAt).getTime() : 0) - (b.createdAt ? new Date(b.createdAt).getTime() : 0));
    } else if (sortBy === 'name') {
      allVendors.sort((a, b) => a.firstName.localeCompare(b.firstName));
    } else {
      // newest
      allVendors.sort((a, b) => (b.createdAt ? new Date(b.createdAt).getTime() : 0) - (a.createdAt ? new Date(a.createdAt).getTime() : 0));
    }

    const total = allVendors.length;
    const paginated = allVendors.slice(skip, skip + limit);

    // Attach product counts for each vendor
    const vendorIds = paginated.map(v => v.id!).filter(Boolean);
    const countMap = new Map<string, number>();
    
    if (vendorIds.length > 0) {
      const snap = await db.collection('products')
        .where('status', '==', 'active')
        .where('vendorId', 'in', vendorIds)
        .get();
      snap.docs.forEach(d => {
        const vId = d.data().vendorId;
        if (vId) {
          countMap.set(vId, (countMap.get(vId) ?? 0) + 1);
        }
      });
    }

    const enriched = paginated.map((vendor) => {
      const id = vendor.id!;
      return {
        id,
        name:     `${vendor.firstName} ${vendor.lastName ?? ''}`.trim(),
        avatar:   vendor.avatar || null,
        bio:      vendor.bio    || '',
        products: countMap.get(id) || 0,
        joinedAt: vendor.createdAt,
      };
    });

    return sendSuccess({
      vendors: enriched,
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
    console.error('[Public Vendors] GET error:', err);
    return sendServerError('Failed to load vendors');
  }
}
