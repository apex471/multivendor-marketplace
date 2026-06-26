import { NextRequest } from 'next/server';
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
    const { searchParams } = new URL(request.url);
    const range = (searchParams.get('range') || '30days') as Range;
    const since = sinceDate(range);

    // Fetch all users and transactions in parallel to compute in-memory
    const [allUsers, allTxs] = await Promise.all([
      User.find({}),
      Transaction.find({}),
    ]);

    // User calculations
    const nonAdmins = allUsers.filter(u => u.role !== 'admin');
    const totalUsers = nonAdmins.length;
    const newUsers = nonAdmins.filter(u => u.createdAt && u.createdAt >= since).length;
    const totalVendors = allUsers.filter(u => u.role === 'vendor').length;
    const pendingVendors = allUsers.filter(u => u.role === 'vendor' && u.applicationStatus === 'pending').length;
    const totalBrands = allUsers.filter(u => u.role === 'brand').length;
    const pendingBrands = allUsers.filter(u => u.role === 'brand' && u.applicationStatus === 'pending').length;
    const totalCustomers = allUsers.filter(u => u.role === 'customer').length;

    // Revenue calculations
    const completedTxs = allTxs.filter(t => t.status === 'completed');
    const totalRevenue = completedTxs.reduce((sum, t) => sum + t.amount, 0);

    const periodTxs = allTxs.filter(t => t.createdAt && t.createdAt >= since);
    const periodRevenue = periodTxs
      .filter(t => t.status === 'completed')
      .reduce((sum, t) => sum + t.amount, 0);

    // Recent transactions (10 limit)
    const recentTransactions = [...periodTxs]
      .sort((a, b) => (b.createdAt ? new Date(b.createdAt).getTime() : 0) - (a.createdAt ? new Date(a.createdAt).getTime() : 0))
      .slice(0, 10)
      .map(t => ({
        transactionId: t.transactionId,
        type: t.type,
        amount: t.amount,
        status: t.status,
        description: t.description,
        createdAt: t.createdAt,
      }));

    // Daily revenue bar chart data
    const dailyRevMap = new Map<string, { revenue: number; count: number }>();
    completedTxs
      .filter(t => t.createdAt && t.createdAt >= since)
      .forEach(t => {
        const dateStr = new Date(t.createdAt!).toISOString().slice(0, 10);
        const current = dailyRevMap.get(dateStr) ?? { revenue: 0, count: 0 };
        current.revenue += t.amount;
        current.count += 1;
        dailyRevMap.set(dateStr, current);
      });
    const dailyRevenue = Array.from(dailyRevMap.entries())
      .map(([_id, data]) => ({ _id, ...data }))
      .sort((a, b) => a._id.localeCompare(b._id));

    // Daily signups data
    const dailySignupMap = new Map<string, number>();
    allUsers
      .filter(u => u.createdAt && u.createdAt >= since)
      .forEach(u => {
        const dateStr = new Date(u.createdAt!).toISOString().slice(0, 10);
        dailySignupMap.set(dateStr, (dailySignupMap.get(dateStr) ?? 0) + 1);
      });
    const dailySignups = Array.from(dailySignupMap.entries())
      .map(([_id, count]) => ({ _id, count }))
      .sort((a, b) => a._id.localeCompare(b._id));

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
        period: periodRevenue,
        total: totalRevenue,
      },
      charts: { dailyRevenue, dailySignups },
      recentTransactions,
    });
  } catch (err) {
    console.error('Admin reports GET error:', err);
    return sendServerError('Failed to load reports');
  }
}
