import { NextRequest } from 'next/server';
import { connectDB } from '@/backend/config/database';
import { Product } from '@/backend/models/Product';
import {
  sendSuccess,
  sendNotFound,
  sendServerError,
} from '@/backend/utils/responseAppRouter';

/**
 * GET /api/products/[id]
 * Returns a single active product plus up-to-4 related products (same category).
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    await connectDB();

    const product = await Product.findOne({
      _id: id,
      status: 'active',
    })
      .select('-costPrice')
      .lean();

    if (!product) return sendNotFound('Product not found or unavailable');

    const related = await Product.find({
      category: (product as Record<string, unknown>).category,
      status: 'active',
      _id: { $ne: id },
    })
      .select('name price salePrice images rating salesCount vendorName category')
      .sort({ salesCount: -1 })
      .limit(4)
      .lean();

    return sendSuccess({ product, related });
  } catch (err) {
    console.error('[Public Products] GET/:id error:', err);
    return sendServerError('Failed to load product');
  }
}
