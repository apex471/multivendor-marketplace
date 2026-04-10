import { NextRequest } from 'next/server';
import { connectDB } from '@/backend/config/database';
import { Product } from '@/backend/models/Product';
import { sendSuccess, sendServerError } from '@/backend/utils/responseAppRouter';

/**
 * GET /api/products
 * Public storefront listing. Only returns active products.
 *
 * Query params:
 *   page, limit, category, search, minPrice, maxPrice,
 *   sort (popular|newest|rating|price-asc|price-high),
 *   tag, vendorId, featured
 */
export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const sp = new URL(request.url).searchParams;

    const page      = Math.max(1,  parseInt(sp.get('page')   || '1'));
    const limit     = Math.min(48, parseInt(sp.get('limit')  || '24'));
    const category  = sp.get('category')  || '';
    const search    = sp.get('search')    || '';
    const minPrice  = parseFloat(sp.get('minPrice') || '0');
    const maxPrice  = parseFloat(sp.get('maxPrice') || '0');
    const sortBy    = sp.get('sort')      || 'popular';
    const tag       = sp.get('tag')       || '';
    const vendorId  = sp.get('vendorId')  || '';
    const featured  = sp.get('featured') === 'true';

    // Only expose active products
    const filter: Record<string, unknown> = { status: 'active' };

    if (category && category !== 'all') {
      filter.category = { $regex: `^${category}$`, $options: 'i' };
    }
    if (vendorId) filter.vendorId = vendorId;
    if (featured)  filter.featured = true;
    if (tag)       filter.tags = tag;

    if (minPrice > 0 || maxPrice > 0) {
      filter.price = {
        ...(minPrice > 0 ? { $gte: minPrice } : {}),
        ...(maxPrice > 0 ? { $lte: maxPrice } : {}),
      };
    }

    if (search) {
      filter.$or = [
        { name:        { $regex: search, $options: 'i' } },
        { vendorName:  { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { category:    { $regex: search, $options: 'i' } },
      ];
    }

    const SORT_MAP: Record<string, { [key: string]: 1 | -1 }> = {
      popular:      { salesCount: -1 },
      newest:       { createdAt:  -1 },
      rating:       { rating:     -1 },
      'price-asc':  { price:       1 },
      'price-high': { price:      -1 },
    };
    const sort: { [key: string]: 1 | -1 } = SORT_MAP[sortBy] ?? SORT_MAP.popular;

    const skip = (page - 1) * limit;

    const [products, total, categories] = await Promise.all([
      Product.find(filter)
        .select('-costPrice')      // never expose cost price to public
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      Product.countDocuments(filter),
      Product.distinct('category', { status: 'active' }),
    ]);

    return sendSuccess({
      products,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
      categories: (categories as string[]).sort(),
    });
  } catch (err) {
    console.error('[Public Products] GET error:', err);
    return sendServerError('Failed to load products');
  }
}
