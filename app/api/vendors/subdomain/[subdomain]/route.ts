import { NextRequest } from 'next/server';
import { User, UserRole } from '@/backend/models/User';
import { Product } from '@/backend/models/Product';
import {
  sendSuccess,
  sendNotFound,
  sendServerError,
} from '@/backend/utils/responseAppRouter';

// GET /api/vendors/subdomain/[subdomain] — public vendor/brand profile + products
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ subdomain: string }> }
) {
  const { subdomain } = await params;
  try {
    const vendor = await User.findOne({ subdomain });

    if (!vendor || (vendor.role !== UserRole.VENDOR && vendor.role !== UserRole.BRAND) || vendor.applicationStatus !== 'approved' || !vendor.isActive) {
      return sendNotFound('Vendor or brand not found');
    }

    const products = await Product.find({
      vendorId: vendor.id,
      status:   'active',
    }, { orderBy: 'createdAt', orderDir: 'desc', limit: 50 });

    return sendSuccess({
      vendor: {
        id:          vendor.id,
        name:        vendor.storeName || `${vendor.firstName} ${vendor.lastName ?? ''}`.trim(),
        firstName:   vendor.firstName,
        lastName:    vendor.lastName,
        email:       vendor.email,
        avatar:      vendor.avatar ?? null,
        banner:      vendor.banner ?? null,
        bio:         vendor.bio ?? vendor.businessDescription ?? '',
        phoneNumber: vendor.phoneNumber ?? '',
        joinedAt:    vendor.createdAt,
        productCount: products.length,
        subdomain:   vendor.subdomain,
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
