import { NextRequest } from 'next/server';
import { connectDB } from '@/backend/config/database';
import { Transaction } from '@/backend/models/Transaction';
import { verifyToken } from '@/backend/utils/jwt';
import { User } from '@/backend/models/User';
import { sendSuccess, sendError, sendServerError } from '@/backend/utils/responseAppRouter';

// GET /api/dashboard/logistics
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return sendError('Unauthorized', 401);
  const decoded = verifyToken(authHeader.split(' ')[1]);
  if (!decoded) return sendError('Invalid token', 401);

  try {
    await connectDB();
    const provider = await User.findById(decoded.userId).lean();
    if (!provider || (provider as any).role !== 'logistics') return sendError('Access denied', 403);

    const [revenueAgg, monthRevenueAgg] = await Promise.all([
      Transaction.aggregate([
        { $match: { toUser: provider._id, status: 'completed' } },
        { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
      ]),
      Transaction.aggregate([
        {
          $match: {
            toUser: provider._id,
            status: 'completed',
            createdAt: { $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) },
          },
        },
        { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
      ]),
    ]);

    return sendSuccess({
      profile: {
        firstName: (provider as any).firstName,
        lastName: (provider as any).lastName,
        email: (provider as any).email,
        applicationStatus: (provider as any).applicationStatus,
        isActive: (provider as any).isActive,
        createdAt: (provider as any).createdAt,
      },
      stats: {
        totalRevenue: revenueAgg[0]?.total ?? 0,
        totalDeliveries: revenueAgg[0]?.count ?? 0,
        monthRevenue: monthRevenueAgg[0]?.total ?? 0,
        monthDeliveries: monthRevenueAgg[0]?.count ?? 0,
        // Shipment data placeholder — to be wired when Shipment model exists
        activeShipments: 0,
        deliveredToday: 0,
        avgDeliveryTime: 0,
        onTimeRate: 0,
      },
    });
  } catch (err) {
    console.error('Logistics dashboard GET error:', err);
    return sendServerError('Failed to load logistics dashboard');
  }
}
