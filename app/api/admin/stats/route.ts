import { NextRequest } from 'next/server';
import { connectDB } from '@/backend/config/database';
import { User } from '@/backend/models/User';
import { Transaction } from '@/backend/models/Transaction';
import { SupportTicket } from '@/backend/models/SupportTicket';
import { verifyAdminAuth } from '@/backend/utils/adminAuth';
import { sendSuccess, sendError, sendServerError } from '@/backend/utils/responseAppRouter';

export async function GET(request: NextRequest) {
  const { error } = await verifyAdminAuth(request);
  if (error) return sendError(error, 401);

  try {
    await connectDB();

    // Run all DB aggregations in parallel for speed
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);

    const [
      totalCustomers,
      totalVendors,
      totalBrands,
      totalLogistics,
      totalAdmins,
      pendingApprovals,
      suspendedAccounts,
      newUsersToday,
      newUsersThisMonth,
      newUsersLastMonth,
      totalUsers,
      transactionStats,
      monthlyTransactions,
      pendingEscrow,
      openTickets,
    ] = await Promise.all([
      User.countDocuments({ role: 'customer', isActive: true }),
      User.countDocuments({ role: 'vendor', applicationStatus: 'approved', isActive: true }),
      User.countDocuments({ role: 'brand', applicationStatus: 'approved', isActive: true }),
      User.countDocuments({ role: 'logistics', applicationStatus: 'approved', isActive: true }),
      User.countDocuments({ role: 'admin' }),
      User.countDocuments({
        role: { $in: ['vendor', 'brand', 'logistics'] },
        applicationStatus: 'pending',
      }),
      User.countDocuments({ isActive: false }),
      User.countDocuments({ createdAt: { $gte: today } }),
      User.countDocuments({ createdAt: { $gte: thisMonthStart } }),
      User.countDocuments({ createdAt: { $gte: lastMonthStart, $lte: lastMonthEnd } }),
      User.countDocuments({}),
      // Transaction aggregation
      Transaction.aggregate([
        { $match: { status: 'completed' } },
        { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
      ]),
      Transaction.aggregate([
        { $match: { status: 'completed', createdAt: { $gte: thisMonthStart } } },
        { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
      ]),
      Transaction.aggregate([
        { $match: { type: 'order_payment', status: 'pending' } },
        { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
      ]),
      SupportTicket.countDocuments({ status: { $in: ['open', 'in-progress'] } }),
    ]);

    // 7-day user signup trend
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    const signupTrend = await User.aggregate([
      { $match: { createdAt: { $gte: sevenDaysAgo } } },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            day: { $dayOfMonth: '$createdAt' },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } },
    ]);

    // Build 7-day array with zeros for missing days
    const trendMap = new Map<string, number>();
    signupTrend.forEach((d) => {
      const key = `${d._id.year}-${String(d._id.month).padStart(2, '0')}-${String(d._id.day).padStart(2, '0')}`;
      trendMap.set(key, d.count);
    });
    const weeklySignups: { date: string; count: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      weeklySignups.push({ date: key, count: trendMap.get(key) || 0 });
    }

    // Compute user growth %
    const userGrowthPct =
      newUsersLastMonth > 0
        ? Math.round(((newUsersThisMonth - newUsersLastMonth) / newUsersLastMonth) * 100)
        : newUsersThisMonth > 0
        ? 100
        : 0;

    const totalRevenue = transactionStats[0]?.total || 0;
    const totalTransactionCount = transactionStats[0]?.count || 0;
    const monthRevenue = monthlyTransactions[0]?.total || 0;
    const monthTransactionCount = monthlyTransactions[0]?.count || 0;
    const pendingEscrowAmount = pendingEscrow[0]?.total || 0;
    const pendingEscrowCount = pendingEscrow[0]?.count || 0;

    return sendSuccess({
      users: {
        customers: totalCustomers,
        vendors: totalVendors,
        brands: totalBrands,
        logistics: totalLogistics,
        admins: totalAdmins,
        total: totalUsers,
        suspended: suspendedAccounts,
        newToday: newUsersToday,
        newThisMonth: newUsersThisMonth,
        growthPercent: userGrowthPct,
      },
      pending: {
        approvals: pendingApprovals,
        tickets: openTickets,
        escrow: pendingEscrowCount,
      },
      financials: {
        totalRevenue,
        totalTransactions: totalTransactionCount,
        monthRevenue,
        monthTransactions: monthTransactionCount,
        pendingEscrow: pendingEscrowAmount,
        pendingEscrowCount,
        // Commission is 10% of total revenue (platform rate)
        commissionEarned: Math.round(totalRevenue * 0.1),
      },
      charts: {
        weeklySignups,
      },
    });
  } catch (error) {
    console.error('Admin stats error:', error);
    return sendServerError('Failed to fetch admin stats');
  }
}
