import { NextRequest } from 'next/server';
import { connectDB } from '@/backend/config/database';
import { Product } from '@/backend/models/Product';
import { verifyVendorAuth } from '@/backend/utils/vendorAuth';
import {
  sendSuccess,
  sendError,
  sendValidationError,
  sendServerError,
} from '@/backend/utils/responseAppRouter';

/**
 * GET /api/vendor/products
 * Lists the authenticated vendor's own products.
 */
export async function GET(request: NextRequest) {
  const { error, userId } = await verifyVendorAuth(request);
  if (error) return sendError(error, 401);

  try {
    await connectDB();

    const sp     = new URL(request.url).searchParams;
    const page   = Math.max(1,  parseInt(sp.get('page')   || '1'));
    const limit  = Math.min(50, parseInt(sp.get('limit')  || '20'));
    const status = sp.get('status') || 'all';
    const search = sp.get('search') || '';

    const filter: Record<string, unknown> = { vendorId: userId };
    if (status !== 'all') filter.status = status;
    if (search) {
      filter.$or = [
        { name:     { $regex: search, $options: 'i' } },
        { category: { $regex: search, $options: 'i' } },
        { sku:      { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (page - 1) * limit;
    const [products, total] = await Promise.all([
      Product.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Product.countDocuments(filter),
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
    });
  } catch (err) {
    console.error('[Vendor Products] GET error:', err);
    return sendServerError('Failed to load products');
  }
}

/**
 * POST /api/vendor/products
 * Creates a new product in "pending" status (requires admin approval).
 */
export async function POST(request: NextRequest) {
  const { error, userId, user } = await verifyVendorAuth(request);
  if (error) return sendError(error, 401);

  try {
    await connectDB();

    const body = await request.json().catch(() => ({}));
    const {
      name, description, category, price, salePrice,
      costPrice, stock, images, sku, tags, variants, lowStockAlert,
    } = body;

    if (!name?.trim()) {
      return sendValidationError('Validation failed', { name: 'Product name is required' });
    }
    if (!category?.trim()) {
      return sendValidationError('Validation failed', { category: 'Category is required' });
    }
    if (price === undefined || isNaN(Number(price)) || Number(price) < 0) {
      return sendValidationError('Validation failed', { price: 'Valid price is required' });
    }

    const u = user as { firstName?: string; lastName?: string };
    const vendorName = `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim();

    const parseTags = (raw: unknown): string[] => {
      if (Array.isArray(raw)) return raw.map(String).filter(Boolean);
      if (typeof raw === 'string') return raw.split(',').map((t) => t.trim()).filter(Boolean);
      return [];
    };

    const product = new Product({
      name:          name.trim(),
      description:   description?.trim() ?? '',
      vendorId:      userId,
      vendorName,
      category:      category.trim(),
      price:         Number(price),
      salePrice:     salePrice  ? Number(salePrice)  : undefined,
      costPrice:     costPrice  ? Number(costPrice)  : undefined,
      stock:         Number(stock) || 0,
      images:        Array.isArray(images) ? images : [],
      sku:           sku?.trim() || undefined,
      tags:          parseTags(tags),
      variants:      Array.isArray(variants) ? variants : [],
      lowStockAlert: Number(lowStockAlert) || 5,
      status:        'pending',   // always requires admin approval first
    });

    await product.save();

    return sendSuccess(
      { product },
      'Product submitted for review. It will be visible once approved.',
      201
    );
  } catch (err) {
    console.error('[Vendor Products] POST error:', err);
    return sendServerError('Failed to create product');
  }
}
