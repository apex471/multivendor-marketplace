import { NextRequest } from 'next/server';
import { Product } from '@/backend/models/Product';
import { sendSuccess, sendServerError } from '@/backend/utils/responseAppRouter';

/**
 * GET /api/products
 * Public storefront listing. Only returns active products.
 * Query params: page, limit, category, search, minPrice, maxPrice,
 *   sort (popular|newest|rating|price-asc|price-high), tag, vendorId, featured
 */
export async function GET(request: NextRequest) {
  try {
    const sp = new URL(request.url).searchParams;
    const page     = Math.max(1,  parseInt(sp.get('page')   || '1'));
    const limit    = Math.min(48, parseInt(sp.get('limit')  || '24'));
    const category = sp.get('category') || '';
    const search   = sp.get('search')   || '';
    const minPrice = parseFloat(sp.get('minPrice') || '0');
    const maxPrice = parseFloat(sp.get('maxPrice') || '0');
    const sortBy   = sp.get('sort')     || 'popular';
    const tag      = sp.get('tag')      || '';
    const vendorId = sp.get('vendorId') || '';
    const featured = sp.get('featured') === 'true';

    // Base filter — only active products
    const filter: Record<string, unknown> = { status: 'active' };
    if (vendorId) filter.vendorId = vendorId;
    if (featured) filter.featured = true;

    // Firestore doesn't support complex $regex / $or queries natively.
    // We fetch active products then filter in-memory for search/category/price/tag.
    const SORT_MAP: Record<string, { field: string; dir: 'asc' | 'desc' }> = {
      popular:      { field: 'salesCount', dir: 'desc' },
      newest:       { field: 'createdAt',  dir: 'desc' },
      rating:       { field: 'rating',     dir: 'desc' },
      'price-asc':  { field: 'price',      dir: 'asc'  },
      'price-high': { field: 'price',      dir: 'desc' },
    };
    const sort = SORT_MAP[sortBy] ?? SORT_MAP.popular;

    // Fetch a larger set then apply in-memory filters
    const allProducts = await Product.find(filter, {
      orderBy: sort.field,
      orderDir: sort.dir,
      limit: 1000, // reasonable cap
    });

    // In-memory filtering for search, category, price, tag
    let filtered = allProducts.filter(p => {
      if (category && category !== 'all') {
        if (p.category.toLowerCase() !== category.toLowerCase()) return false;
      }
      if (tag && !p.tags.includes(tag)) return false;
      if (minPrice > 0 && p.price < minPrice) return false;
      if (maxPrice > 0 && p.price > maxPrice) return false;
      if (search) {
        const q = search.toLowerCase();
        const matches =
          p.name.toLowerCase().includes(q) ||
          p.vendorName.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q);
        if (!matches) return false;
      }
      return true;
    });

    const total = filtered.length;
    const skip = (page - 1) * limit;
    const products = filtered.slice(skip, skip + limit).map(p => {
      const { costPrice: _, ...rest } = p as typeof p & { costPrice?: unknown };
      return rest;
    });

    // Distinct categories from all active products
    const categories = Array.from(new Set(allProducts.map(p => p.category))).sort();

    return sendSuccess({
      products,
      pagination: {
        page, limit, total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
      categories,
    });
  } catch (err) {
    console.error('[Public Products] GET error:', err);
    return sendServerError('Failed to load products');
  }
}
