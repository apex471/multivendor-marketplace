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
    const provider = await User.findById(decoded.userId).lean() as import('@/backend/models/User').IUser | null;
    if (!provider || provider.role !== 'logistics') return sendError('Access denied', 403);

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    weekStart.setHours(0, 0, 0, 0);

    const [revenueAgg, monthRevenueAgg, todayRevenueAgg, weekRevenueAgg] = await Promise.all([
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
      Transaction.aggregate([
        {
          $match: {
            toUser: provider._id,
            status: 'completed',
            createdAt: { $gte: todayStart },
          },
        },
        { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
      ]),
      Transaction.aggregate([
        {
          $match: {
            toUser: provider._id,
            status: 'completed',
            createdAt: { $gte: weekStart },
          },
        },
        { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
      ]),
    ]);

    return sendSuccess({
      profile: {
        firstName:         provider.firstName,
        lastName:          provider.lastName,
        email:             provider.email,
        applicationStatus: provider.applicationStatus,
        isActive:          provider.isActive,
        createdAt:         provider.createdAt,
      },
      stats: {
        totalRevenue:    revenueAgg[0]?.total        ?? 0,
        totalDeliveries: revenueAgg[0]?.count        ?? 0,
        monthRevenue:    monthRevenueAgg[0]?.total   ?? 0,
        monthDeliveries: monthRevenueAgg[0]?.count   ?? 0,
        todayRevenue:    todayRevenueAgg[0]?.total   ?? 0,
        todayDeliveries: todayRevenueAgg[0]?.count   ?? 0,
        weekRevenue:     weekRevenueAgg[0]?.total    ?? 0,
      },
    });
  } catch (err) {
    console.error('Logistics dashboard GET error:', err);
    return sendServerError('Failed to load logistics dashboard');
  }
}
