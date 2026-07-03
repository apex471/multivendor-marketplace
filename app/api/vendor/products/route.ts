import { NextRequest } from 'next/server';
import { Product } from '@/backend/models/Product';
import { User } from '@/backend/models/User';
import { verifyToken } from '@/backend/utils/jwt';
import { sendSuccess, sendError, sendServerError } from '@/backend/utils/responseAppRouter';

const SELLER_ROLES = ['vendor', 'brand'];

async function getSellerInfo(req: NextRequest): Promise<{ userId: string; role: string } | null> {
  const auth = req.headers.get('Authorization') ?? '';
  if (!auth.startsWith('Bearer ')) return null;
  const p = verifyToken(auth.slice(7));
  if (!p?.userId) return null;

  // If the JWT role is already a seller role, trust it (fast path)
  if (SELLER_ROLES.includes(p.role ?? '')) {
    return { userId: p.userId, role: p.role };
  }

  // JWT role mismatch — do a live Firestore lookup to get the real role.
  // This handles old tokens issued before a role update.
  try {
    const user = await User.findById(p.userId);
    if (user && SELLER_ROLES.includes(user.role)) {
      return { userId: p.userId, role: user.role };
    }
  } catch { /* non-fatal */ }

  return null;  // not a seller
}

export async function GET(request: NextRequest) {
  const caller = await getSellerInfo(request);
  if (!caller) return sendError('Access denied: only approved brand owners and vendors can access this page. Please log in with the correct account.', 403);
  const vendorId = caller.userId;

  try {
    const sp = new URL(request.url).searchParams;
    const page   = Math.max(1,  parseInt(sp.get('page')  || '1'));
    const limit  = Math.min(50, parseInt(sp.get('limit') || '20'));
    const status = sp.get('status') || '';
    const search = sp.get('search') || '';

    const filter: Record<string, unknown> = { vendorId };
    if (status && status !== 'all') filter.status = status;

    let products = await Product.find(filter, { orderBy: 'createdAt', orderDir: 'desc', limit: 1000, hideCostPrice: false });

    if (search) {
      const q = search.toLowerCase();
      products = products.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        p.sku?.toLowerCase().includes(q)
      );
    }

    const total = products.length;
    const paged = products.slice((page - 1) * limit, page * limit);

    return sendSuccess({ products: paged, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (err) {
    return sendServerError(err instanceof Error ? err.message : String(err));
  }
}

export async function POST(request: NextRequest) {
  const caller = await getSellerInfo(request);
  if (!caller) return sendError('Access denied: only approved brand owners and vendors can create products. Please log in with a brand or vendor account.', 403);
  const vendorId = caller.userId;

  try {
    const body = await request.json().catch(() => ({}));
    const { name, description, category, price, salePrice, costPrice, stock, sku, tags, variants, images, videos, lowStockAlert } = body;

    if (!name?.trim()) return sendError('Product name is required', 400);
    if (!price || price < 0) return sendError('Valid price is required', 400);

    // Resolve the seller's display name from their profile
    let resolvedVendorName = body.vendorName?.trim() || '';
    if (!resolvedVendorName) {
      try {
        const sellerProfile = await User.findById(vendorId);
        if (sellerProfile) {
          resolvedVendorName = `${sellerProfile.firstName} ${sellerProfile.lastName}`.trim();
        }
      } catch { /* non-fatal */ }
    }
    if (!resolvedVendorName) resolvedVendorName = caller.role === 'brand' ? 'Brand' : 'Vendor';

    const product = await Product.create({
      name: name.trim(),
      description: description?.trim() ?? '',
      vendorId,
      vendorName: resolvedVendorName,
      category: category ?? 'Uncategorized',
      price: Number(price),
      salePrice: salePrice ? Number(salePrice) : undefined,
      costPrice: costPrice ? Number(costPrice) : undefined,
      stock: Number(stock ?? 0),
      sku: sku?.trim(),
      tags: Array.isArray(tags) ? tags : [],
      variants: Array.isArray(variants) ? variants : [],
      images: Array.isArray(images) ? images : [],
      videos: Array.isArray(videos) ? videos : [],
      lowStockAlert: Number(lowStockAlert ?? 5),
      status: 'pending',
      featured: false,
      salesCount: 0,
      rating: 0,
      reviewCount: 0,
    });

    return sendSuccess({ product }, 'Product created successfully', 201);
  } catch (err) {
    return sendServerError(err instanceof Error ? err.message : String(err));
  }
}
