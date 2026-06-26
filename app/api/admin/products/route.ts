import { NextRequest } from 'next/server';
import { Product } from '@/backend/models/Product';
import { verifyAdminAuth } from '@/backend/utils/adminAuth';
import { sendSuccess, sendError, sendServerError } from '@/backend/utils/responseAppRouter';

export async function GET(request: NextRequest) {
  const { error } = await verifyAdminAuth(request);
  if (error) return sendError(error, 401);

  try {
    const sp       = new URL(request.url).searchParams;
    const status   = sp.get('status')   || 'pending';
    const category = sp.get('category') || '';
    const search   = sp.get('search')   || '';
    const page     = Math.max(1,  parseInt(sp.get('page')  || '1'));
    const limit    = Math.min(50, parseInt(sp.get('limit') || '20'));

    const filter: Record<string, unknown> = {};
    if (status !== 'all') filter.status = status;
    if (category && category !== 'all') filter.category = category;

    let products = await Product.find(filter, { orderBy: 'createdAt', orderDir: 'desc', limit: 2000, hideCostPrice: false });

    if (search) {
      const q = search.toLowerCase();
      products = products.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.vendorName.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q)
      );
    }

    const total = products.length;
    const paged = products.slice((page - 1) * limit, page * limit);

    const [pendingCount, activeCount, rejectedCount, suspendedCount, categories] = await Promise.all([
      Product.countDocuments({ status: 'pending' }),
      Product.countDocuments({ status: 'active' }),
      Product.countDocuments({ status: 'rejected' }),
      Product.countDocuments({ status: 'suspended' }),
      Product.distinct('category'),
    ]);

    return sendSuccess({
      products: paged,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      counts: { pending: pendingCount, active: activeCount, rejected: rejectedCount, suspended: suspendedCount },
      categories,
    });
  } catch (err) {
    return sendServerError(err instanceof Error ? err.message : String(err));
  }
}

export async function PATCH(request: NextRequest) {
  const { error } = await verifyAdminAuth(request);
  if (error) return sendError(error, 401);

  try {
    const { productId, status, featured, rejectionReason } = await request.json().catch(() => ({}));
    if (!productId) return sendError('productId is required', 400);

    const product = await Product.findById(productId);
    if (!product) return sendError('Product not found', 404);

    const updates: Record<string, unknown> = {};
    if (status && ['pending', 'active', 'rejected', 'suspended'].includes(status)) updates.status = status;
    if (typeof featured === 'boolean') updates.featured = featured;
    if (rejectionReason !== undefined) updates.rejectionReason = rejectionReason;

    await Product.updateOne(productId, updates);
    return sendSuccess({ productId, ...updates }, 'Product updated successfully');
  } catch (err) {
    return sendServerError(err instanceof Error ? err.message : String(err));
  }
}
