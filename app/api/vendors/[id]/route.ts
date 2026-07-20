import { NextRequest } from 'next/server';
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
    const vendor = await User.findById(id);

    if (!vendor || !['vendor', 'brand'].includes(vendor.role) || vendor.applicationStatus !== 'approved' || !vendor.isActive) {
      return sendNotFound('Vendor not found');
    }

    const products = await Product.find({
      vendorId: vendor.id,
      status:   'active',
    }, { orderBy: 'createdAt', orderDir: 'desc', limit: 50 });

    return sendSuccess({
      vendor: {
        id:           vendor.id,
        name:         `${vendor.firstName} ${vendor.lastName ?? ''}`.trim(),
        storeName:    vendor.storeName || `${vendor.firstName} ${vendor.lastName ?? ''}`.trim(),
        firstName:    vendor.firstName,
        lastName:     vendor.lastName,
        email:        vendor.email,
        avatar:       vendor.avatar ?? null,
        banner:       vendor.banner ?? null,
        bio:          vendor.bio ?? '',
        phoneNumber:  vendor.phoneNumber ?? '',
        businessCity: vendor.businessCity ?? '',
        businessState:vendor.businessState ?? '',
        role:         vendor.role,
        joinedAt:     vendor.createdAt,
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
