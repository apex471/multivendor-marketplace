import { NextRequest } from 'next/server';
import { User } from '@/backend/models/User';
import { Product } from '@/backend/models/Product';
import {
  sendSuccess,
  sendNotFound,
  sendServerError,
} from '@/backend/utils/responseAppRouter';

// GET /api/brands/[id] — public brand profile + products
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const brand = await User.findById(id);

    if (!brand || brand.role !== 'brand' || brand.applicationStatus !== 'approved' || !brand.isActive) {
      return sendNotFound('Brand not found');
    }

    const products = await Product.find({
      vendorId: brand.id,
      status:   'active',
    }, { orderBy: 'createdAt', orderDir: 'desc', limit: 50 });

    return sendSuccess({
      brand: {
        id:          brand.id,
        name:        `${brand.firstName} ${brand.lastName ?? ''}`.trim(),
        firstName:   brand.firstName,
        lastName:    brand.lastName,
        email:       brand.email,
        avatar:      brand.avatar ?? null,
        bio:         brand.bio ?? '',
        joinedAt:    brand.createdAt,
        productCount: products.length,
      },
      products: products.map(p => ({
        id:          p.id,
        name:        p.name,
        price:       p.salePrice && p.salePrice < p.price ? p.salePrice : p.price,
        oldPrice:    p.salePrice && p.salePrice < p.price ? p.price : undefined,
        image:       p.images?.[0] ?? '/images/placeholder.jpg',
        images:      p.images ?? [],
        rating:      p.rating ?? 0,
        reviewCount: p.reviewCount ?? 0,
        salesCount:  p.salesCount ?? 0,
        category:    p.category,
        inStock:     (p.stock ?? 0) > 0,
        featured:    p.featured,
      })),
    });
  } catch (err) {
    return sendServerError(err instanceof Error ? err.message : String(err));
  }
}
