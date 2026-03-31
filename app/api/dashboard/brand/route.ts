import { NextRequest } from 'next/server';
import { connectDB } from '@/backend/config/database';
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
    await connectDB();
    const brand = await User.findById(decoded.userId).lean();
    if (!brand || (brand as any).role !== 'brand') return sendError('Access denied', 403);

    const brandId = decoded.userId;

    const [totalProducts, activeProducts, pendingProducts, revenueAgg, monthRevenueAgg] =
      await Promise.all([
        Product.countDocuments({ vendorId: brandId }),
        Product.countDocuments({ vendorId: brandId, status: 'active' }),
        Product.countDocuments({ vendorId: brandId, status: 'pending' }),
        Transaction.aggregate([
          { $match: { toUser: brand._id, status: 'completed' } },
          { $group: { _id: null, total: { $sum: '$amount' } } },
        ]),
        Transaction.aggregate([
          {
            $match: {
              toUser: brand._id,
              status: 'completed',
              createdAt: { $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) },
            },
          },
          { $group: { _id: null, total: { $sum: '$amount' } } },
        ]),
      ]);

    return sendSuccess({
      profile: {
        firstName: (brand as any).firstName,
        lastName: (brand as any).lastName,
        email: (brand as any).email,
        applicationStatus: (brand as any).applicationStatus,
        isActive: (brand as any).isActive,
        createdAt: (brand as any).createdAt,
      },
      stats: {
        totalProducts,
        activeProducts,
        pendingProducts,
        totalRevenue: revenueAgg[0]?.total ?? 0,
        monthRevenue: monthRevenueAgg[0]?.total ?? 0,
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
