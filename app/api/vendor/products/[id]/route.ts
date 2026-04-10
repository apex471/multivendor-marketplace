import { NextRequest } from 'next/server';
import { connectDB } from '@/backend/config/database';
import { Product } from '@/backend/models/Product';
import { verifyVendorAuth } from '@/backend/utils/vendorAuth';
import {
  sendSuccess,
  sendError,
  sendNotFound,
  sendServerError,
} from '@/backend/utils/responseAppRouter';

// ── GET /api/vendor/products/[id] ─────────────────────────────────────────────
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { error, userId } = await verifyVendorAuth(request);
  if (error) return sendError(error, 401);

  try {
    await connectDB();
    const product = await Product.findOne({ _id: params.id, vendorId: userId }).lean();
    if (!product) return sendNotFound('Product not found');
    return sendSuccess({ product });
  } catch (err) {
    console.error('[Vendor Products] GET/:id error:', err);
    return sendServerError('Failed to load product');
  }
}

// ── PATCH /api/vendor/products/[id] ──────────────────────────────────────────
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { error, userId } = await verifyVendorAuth(request);
  if (error) return sendError(error, 401);

  try {
    await connectDB();
    const product = await Product.findOne({ _id: params.id, vendorId: userId });
    if (!product) return sendNotFound('Product not found');

    const body = await request.json().catch(() => ({}));

    const EDITABLE = [
      'name', 'description', 'category', 'price', 'salePrice',
      'costPrice', 'stock', 'images', 'sku', 'tags', 'variants', 'lowStockAlert',
    ] as const;

    for (const field of EDITABLE) {
      if (body[field] !== undefined) product.set(field, body[field]);
    }

    // If previously rejected, automatically re-submit for review
    if (product.status === 'rejected') {
      product.status = 'pending';
      product.rejectionReason = undefined;
    }

    await product.save();
    return sendSuccess({ product }, 'Product updated successfully');
  } catch (err) {
    console.error('[Vendor Products] PATCH/:id error:', err);
    return sendServerError('Failed to update product');
  }
}

// ── DELETE /api/vendor/products/[id] ─────────────────────────────────────────
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { error, userId } = await verifyVendorAuth(request);
  if (error) return sendError(error, 401);

  try {
    await connectDB();
    const product = await Product.findOneAndDelete({ _id: params.id, vendorId: userId });
    if (!product) return sendNotFound('Product not found');
    return sendSuccess(null, 'Product deleted successfully');
  } catch (err) {
    console.error('[Vendor Products] DELETE/:id error:', err);
    return sendServerError('Failed to delete product');
  }
}
