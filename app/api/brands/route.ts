import { NextRequest } from 'next/server';
import { connectDB } from '@/backend/config/database';
import { User } from '@/backend/models/User';
import { Product } from '@/backend/models/Product';
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
    await connectDB();

    const sp     = new URL(request.url).searchParams;
    const page   = Math.max(1,  parseInt(sp.get('page')  || '1'));
    const limit  = Math.min(48, parseInt(sp.get('limit') || '24'));
    const search = sp.get('search') || '';
    const sortBy = sp.get('sort')   || 'newest';

    const filter: Record<string, unknown> = {
      role:              'brand',
      applicationStatus: 'approved',
      isActive:          true,
    };

    if (search) {
      filter.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName:  { $regex: search, $options: 'i' } },
        { bio:       { $regex: search, $options: 'i' } },
      ];
    }

    const SORT_MAP: Record<string, Record<string, 1 | -1>> = {
      newest: { createdAt: -1 },
      name:   { firstName:  1 },
    };
    const sort = SORT_MAP[sortBy] ?? SORT_MAP.newest;

    const skip = (page - 1) * limit;

    const [brands, total] = await Promise.all([
      User.find(filter)
        .select('firstName lastName avatar bio createdAt _id')
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      User.countDocuments(filter),
    ]);

    // Attach active product counts for each brand
    const brandIds = brands.map((b) => String((b as { _id: unknown })._id));
    const productCounts = await Product.aggregate<{ _id: string; count: number }>([
      { $match: { vendorId: { $in: brandIds }, status: 'active' } },
      { $group: { _id: '$vendorId', count: { $sum: 1 } } },
    ]);
    const countMap = new Map(productCounts.map((p) => [p._id, p.count]));

    const enriched = brands.map((b) => {
      const brand = b as {
        _id: unknown;
        firstName: string;
        lastName: string;
        avatar?: string;
        bio?: string;
        createdAt: Date;
      };
      const id = String(brand._id);
      return {
        id,
        name:     `${brand.firstName} ${brand.lastName}`,
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
