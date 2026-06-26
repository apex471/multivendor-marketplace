import { NextRequest } from 'next/server';
import { Product } from '@/backend/models/Product';
import { verifyVendorAuth } from '@/backend/utils/vendorAuth';
import { sendSuccess, sendError, sendNotFound, sendServerError } from '@/backend/utils/responseAppRouter';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { error, userId } = await verifyVendorAuth(request);
  if (error) return sendError(error, 401);

  try {
    const product = await Product.findById(id, { includesCostPrice: true });
    if (!product || product.vendorId !== userId) return sendNotFound('Product not found');
    return sendSuccess({ product });
  } catch (err) {
    return sendServerError(err instanceof Error ? err.message : String(err));
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { error, userId } = await verifyVendorAuth(request);
  if (error) return sendError(error, 401);

  try {
    const product = await Product.findById(id, { includesCostPrice: true });
    if (!product || product.vendorId !== userId) return sendNotFound('Product not found');

    const body = await request.json().catch(() => ({}));
    const EDITABLE = ['name', 'description', 'category', 'price', 'salePrice', 'costPrice', 'stock', 'images', 'sku', 'tags', 'variants', 'lowStockAlert'] as const;

    const updates: Record<string, unknown> = {};
    for (const field of EDITABLE) {
      if (body[field] !== undefined) updates[field] = body[field];
    }
    // Re-submit for review if previously rejected
    if (product.status === 'rejected') {
      updates.status = 'pending';
      updates.rejectionReason = '';
    }

    await Product.updateOne(id, updates);
    const updated = await Product.findById(id, { includesCostPrice: true });
    return sendSuccess({ product: updated }, 'Product updated successfully');
  } catch (err) {
    return sendServerError(err instanceof Error ? err.message : String(err));
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { error, userId } = await verifyVendorAuth(request);
  if (error) return sendError(error, 401);

  try {
    const product = await Product.findById(id);
    if (!product || product.vendorId !== userId) return sendNotFound('Product not found');
    await Product.findByIdAndDelete(id);
    return sendSuccess(null, 'Product deleted successfully');
  } catch (err) {
    return sendServerError(err instanceof Error ? err.message : String(err));
  }
}
