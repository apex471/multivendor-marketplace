import { NextRequest } from 'next/server';
import { connectDB } from '@/backend/config/database';
import { User } from '@/backend/models/User';
import { Transaction } from '@/backend/models/Transaction';
import { verifyAdminAuth } from '@/backend/utils/adminAuth';
import { sendSuccess, sendError, sendServerError } from '@/backend/utils/responseAppRouter';

type Range = '7days' | '30days' | '90days' | 'year';

function sinceDate(range: Range): Date {
  const ms: Record<Range, number> = {
    '7days': 7 * 86_400_000,
    '30days': 30 * 86_400_000,
    '90days': 90 * 86_400_000,
    year: 365 * 86_400_000,
  };
  return new Date(Date.now() - ms[range]);
}

// GET /api/admin/reports?range=7days|30days|90days|year
export async function GET(request: NextRequest) {
  const { error } = await verifyAdminAuth(request);
  if (error) return sendError(error, 401);

  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const range = (searchParams.get('range') || '30days') as Range;
    const since = sinceDate(range);

    const [
      totalUsers, newUsers,
      totalVendors, pendingVendors,
      totalBrands, pendingBrands,
      totalCustomers,
      totalRevenueAgg, periodRevenueAgg,
      recentTransactions,
      dailyRevenue,
      dailySignups,
    ] = await Promise.all([
      User.countDocuments({ role: { $ne: 'admin' } }),
      User.countDocuments({ role: { $ne: 'admin' }, createdAt: { $gte: since } }),
      User.countDocuments({ role: 'vendor' }),
      User.countDocuments({ role: 'vendor', applicationStatus: 'pending' }),
      User.countDocuments({ role: 'brand' }),
      User.countDocuments({ role: 'brand', applicationStatus: 'pending' }),
      User.countDocuments({ role: 'customer' }),

      // All-time completed revenue
      Transaction.aggregate([
        { $match: { status: 'completed' } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      // Period completed revenue
      Transaction.aggregate([
        { $match: { status: 'completed', createdAt: { $gte: since } } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      // Recent 10 transactions
      Transaction.find({ createdAt: { $gte: since } })
        .select('transactionId type amount status description createdAt')
        .sort({ createdAt: -1 })
        .limit(10)
        .lean(),
      // Daily revenue bar chart
      Transaction.aggregate([
        { $match: { status: 'completed', createdAt: { $gte: since } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            revenue: { $sum: '$amount' },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      // Daily signups
      User.aggregate([
        { $match: { createdAt: { $gte: since } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
    ]);

    return sendSuccess({
      range,
      users: {
        total: totalUsers,
        new: newUsers,
        vendors: totalVendors,
        pendingVendors,
        brands: totalBrands,
        pendingBrands,
        customers: totalCustomers,
      },
      // Orders not yet implemented — returns zeros
      orders: { total: 0, new: 0, pending: 0, processing: 0, shipped: 0, delivered: 0 },
      revenue: {
        period: periodRevenueAgg[0]?.total ?? 0,
        total: totalRevenueAgg[0]?.total ?? 0,
      },
      charts: { dailyRevenue, dailySignups },
      recentTransactions,
    });
  } catch (err) {
    console.error('Admin reports GET error:', err);
    return sendServerError('Failed to load reports');
  }
}
