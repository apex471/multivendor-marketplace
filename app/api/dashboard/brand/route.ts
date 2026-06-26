import { NextRequest } from 'next/server';
import { Product } from '@/backend/models/Product';
import { Transaction } from '@/backend/models/Transaction';
import { verifyToken } from '@/backend/utils/jwt';
import { User } from '@/backend/models/User';
import { sendSuccess, sendError, sendServerError } from '@/backend/utils/responseAppRouter';

// GET /api/dashboard/brand
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return sendError('Unauthorized', 401);
  const decoded = verifyToken(authHeader.split(' ')[1]);
  if (!decoded) return sendError('Invalid token', 401);

  try {
    const brand = await User.findById(decoded.userId);
    if (!brand || brand.role !== 'brand') return sendError('Access denied', 403);

    const brandId = decoded.userId;

    const [totalProducts, activeProducts, pendingProducts, completedTxs] =
      await Promise.all([
        Product.countDocuments({ vendorId: brandId }),
        Product.countDocuments({ vendorId: brandId, status: 'active' }),
        Product.countDocuments({ vendorId: brandId, status: 'pending' }),
        Transaction.find({ toUser: brandId, status: 'completed' }),
      ]);

    const totalRevenue = completedTxs.reduce((sum, tx) => sum + tx.amount, 0);

    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const monthRevenue = completedTxs
      .filter(tx => tx.createdAt && tx.createdAt >= startOfMonth)
      .reduce((sum, tx) => sum + tx.amount, 0);

    return sendSuccess({
      profile: {
        firstName: brand.firstName,
        lastName: brand.lastName,
        email: brand.email,
        applicationStatus: brand.applicationStatus,
        isActive: brand.isActive,
        createdAt: brand.createdAt,
      },
      stats: {
        totalProducts,
        activeProducts,
        pendingProducts,
        totalRevenue,
        monthRevenue,
        // Affiliate data placeholder — to be wired when affiliate model exists
        totalAffiliates: 0,
        pendingRequests: 0,
        affiliateEarnings: 0,
      },
    });
  } catch (err) {
    console.error('Brand dashboard GET error:', err);
    return sendServerError('Failed to load brand dashboard');
  }
}
