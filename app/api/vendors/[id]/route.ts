import { NextRequest } from 'next/server';
import { connectDB } from '@/backend/config/database';
import { User } from '@/backend/models/User';
import { Product } from '@/backend/models/Product';
import {
  sendSuccess,
  sendNotFound,
  sendServerError,
} from '@/backend/utils/responseAppRouter';

// GET /api/vendors/[id] — public vendor profile + products
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    await connectDB();

    const vendor = await User.findOne({
      _id:               id,
      role:              'vendor',
      applicationStatus: 'approved',
      isActive:          true,
    })
      .select('-password -emailVerificationToken -emailVerificationExpires')
      .lean();

    if (!vendor) return sendNotFound('Vendor not found');

    const products = await Product.find({
      vendorId: vendor._id,
      status:   'active',
    })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    return sendSuccess({
      vendor: {
        id:          vendor._id,
        name:        `${vendor.firstName} ${vendor.lastName}`.trim(),
        firstName:   vendor.firstName,
        lastName:    vendor.lastName,
        email:       vendor.email,
        avatar:      vendor.avatar ?? null,
        bio:         vendor.bio ?? '',
        phoneNumber: vendor.phoneNumber ?? '',
        joinedAt:    vendor.createdAt,
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
    return sendServerError(err instanceof Error ? err.message : String(err));
  }
}
