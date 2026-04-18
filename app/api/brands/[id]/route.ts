import { NextRequest } from 'next/server';
import { connectDB } from '@/backend/config/database';
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
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();

    const brand = await User.findOne({
      _id:               params.id,
      role:              'brand',
      applicationStatus: 'approved',
      isActive:          true,
    })
      .select('-password -emailVerificationToken -emailVerificationExpires')
      .lean();

    if (!brand) return sendNotFound('Brand not found');

    const products = await Product.find({
      vendorId: brand._id,
      status:   'active',
    })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    return sendSuccess({
      brand: {
        id:          brand._id,
        name:        `${brand.firstName} ${brand.lastName}`.trim(),
        firstName:   brand.firstName,
        lastName:    brand.lastName,
        email:       brand.email,
        avatar:      brand.avatar ?? null,
        bio:         brand.bio ?? '',
        joinedAt:    brand.createdAt,
        productCount: products.length,
      },
      products: products.map(p => ({
        id:          p._id,
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
    return sendServerError(err);
  }
}
