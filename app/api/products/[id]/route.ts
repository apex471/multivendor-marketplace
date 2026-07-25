import { NextRequest } from 'next/server';
import { Product } from '@/backend/models/Product';
import { sendSuccess, sendNotFound, sendServerError } from '@/backend/utils/responseAppRouter';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const product = await Product.findById(id);
    if (!product || product.status !== 'active') return sendNotFound('Product not found or unavailable');

    // Look up vendor to fetch their role for correct link generation
    let vendorRole = 'vendor';
    try {
      const { User } = await import('@/backend/models/User');
      const vendorUser = await User.findById(product.vendorId);
      if (vendorUser) {
        vendorRole = vendorUser.role || 'vendor';
      }
    } catch {}

    const related = await Product.find({ status: 'active', category: product.category }, {
      orderBy: 'salesCount', orderDir: 'desc', limit: 5,
    });
    const relatedFiltered = related
      .filter(p => p.id !== id)
      .slice(0, 4)
      .map(({ costPrice: _, ...r }) => r);

    const { costPrice: __, ...productData } = product as typeof product & { costPrice?: unknown };
    return sendSuccess({ product: { ...productData, vendorRole }, related: relatedFiltered });
  } catch (err) {
    console.error('[Public Products] GET/:id error:', err);
    return sendServerError('Failed to load product');
  }
}
