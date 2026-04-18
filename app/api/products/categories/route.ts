import { NextRequest } from 'next/server';
import { connectDB } from '@/backend/config/database';
import { Product } from '@/backend/models/Product';
import { sendSuccess, sendServerError } from '@/backend/utils/responseAppRouter';

// GET /api/products/categories
// Returns each distinct category with its live product count
export async function GET(_request: NextRequest) {
  try {
    await connectDB();

    const results = await Product.aggregate([
      { $match: { status: 'active' } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort:  { count: -1 } },
    ]);

    const CATEGORY_META: Record<string, { icon: string; subcategories: string[] }> = {
      'Clothing':     { icon: '👔', subcategories: ['Dresses', 'Shirts', 'Pants', 'Jackets', 'Suits'] },
      'Shoes':        { icon: '👟', subcategories: ['Sneakers', 'Heels', 'Boots', 'Loafers', 'Sandals'] },
      'Bags':         { icon: '👜', subcategories: ['Handbags', 'Backpacks', 'Clutches', 'Totes', 'Crossbody'] },
      'Watches':      { icon: '⌚', subcategories: ['Luxury', 'Sport', 'Smart', 'Classic', 'Fashion'] },
      'Jewelry':      { icon: '💎', subcategories: ['Necklaces', 'Rings', 'Earrings', 'Bracelets', 'Watches'] },
      'Accessories':  { icon: '🕶️', subcategories: ['Sunglasses', 'Belts', 'Scarves', 'Hats', 'Gloves'] },
      'Sportswear':   { icon: '⚽', subcategories: ['Athletic', 'Yoga', 'Running', 'Training', 'Outdoor'] },
      'Beauty':       { icon: '💄', subcategories: ['Makeup', 'Skincare', 'Fragrance', 'Haircare', 'Tools'] },
      'Uncategorized':{ icon: '🛍️', subcategories: [] },
    };

    const categories = results.map(r => ({
      id:             (r._id as string).toLowerCase().replace(/\s+/g, '-'),
      name:           r._id as string,
      count:          r.count as number,
      icon:           CATEGORY_META[r._id as string]?.icon ?? '🛍️',
      subcategories:  CATEGORY_META[r._id as string]?.subcategories ?? [],
    }));

    return sendSuccess({ categories });
  } catch (err) {
    return sendServerError(err instanceof Error ? err.message : String(err));
  }
}
