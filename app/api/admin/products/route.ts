import { NextRequest } from 'next/server';
import { connectDB } from '@/backend/config/database';
import { Product } from '@/backend/models/Product';
import { verifyAdminAuth } from '@/backend/utils/adminAuth';
import { sendSuccess, sendError, sendServerError } from '@/backend/utils/responseAppRouter';

// GET /api/admin/products
export async function GET(request: NextRequest) {
  const { error } = await verifyAdminAuth(request);
  if (error) return sendError(error, 401);

  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'pending';
    const category = searchParams.get('category');
    const search = searchParams.get('search');
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(50, parseInt(searchParams.get('limit') || '20'));

    const filter: Record<string, unknown> = {};
    if (status !== 'all') filter.status = status;
    if (category && category !== 'all') filter.category = category;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { vendorName: { $regex: search, $options: 'i' } },
        { category: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (page - 1) * limit;

    const [products, total, pendingCount, activeCount, rejectedCount, suspendedCount, categories] =
      await Promise.all([
        Product.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
        Product.countDocuments(filter),
        Product.countDocuments({ status: 'pending' }),
        Product.countDocuments({ status: 'active' }),
        Product.countDocuments({ status: 'rejected' }),
        Product.countDocuments({ status: 'suspended' }),
        Product.distinct('category'),
      ]);

    return sendSuccess({
      products,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      counts: { pending: pendingCount, active: activeCount, rejected: rejectedCount, suspended: suspendedCount },
      categories,
    });
  } catch (err) {
    console.error('Admin products GET error:', err);
    return sendServerError('Failed to load products');
  }
}

// PATCH /api/admin/products — update status, featured, rejectionReason
export async function PATCH(request: NextRequest) {
  const { error: authError } = await verifyAdminAuth(request);
  if (authError) return sendError(authError, 401);

  try {
    await connectDB();
    const body = await request.json().catch(() => ({}));
    const { productId, status, featured, rejectionReason } = body;

    if (!productId) return sendError('productId is required', 400);

    const product = await Product.findById(productId);
    if (!product) return sendError('Product not found', 404);

    if (status && ['pending', 'active', 'rejected', 'suspended'].includes(status)) {
      product.status = status;
    }
    if (typeof featured === 'boolean') product.featured = featured;
    if (rejectionReason !== undefined) product.rejectionReason = rejectionReason;

    await product.save();

    return sendSuccess(
      { productId: product._id, status: product.status, featured: product.featured },
      'Product updated successfully'
    );
  } catch (err) {
    console.error('Admin products PATCH error:', err);
    return sendServerError('Failed to update product');
  }
}
