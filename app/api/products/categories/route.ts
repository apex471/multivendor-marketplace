import { NextRequest } from 'next/server';
import { Product } from '@/backend/models/Product';
import { sendSuccess, sendServerError } from '@/backend/utils/responseAppRouter';

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

export async function GET(_request: NextRequest) {
  try {
    const products = await Product.find({ status: 'active' }, { limit: 2000 });

    // Group by category in-memory
    const catMap: Record<string, number> = {};
    products.forEach(p => {
      catMap[p.category] = (catMap[p.category] ?? 0) + 1;
    });

    const categories = Object.entries(catMap)
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({
        id:            name.toLowerCase().replace(/\s+/g, '-'),
        name,
        count,
        icon:          CATEGORY_META[name]?.icon ?? '🛍️',
        subcategories: CATEGORY_META[name]?.subcategories ?? [],
      }));

    return sendSuccess({ categories });
  } catch (err) {
    return sendServerError(err instanceof Error ? err.message : String(err));
  }
}
