import { NextRequest } from 'next/server';
import { User } from '@/backend/models/User';
import { Transaction } from '@/backend/models/Transaction';
import { Order as OrderModel } from '@/backend/models/Order';
import { verifyAdminAuth } from '@/backend/utils/adminAuth';
import { db, docToObject } from '@/backend/config/firebase';
import { sendSuccess, sendError, sendServerError } from '@/backend/utils/responseAppRouter';

// GET /api/admin/stats
export async function GET(request: NextRequest) {
  const { error } = await verifyAdminAuth(request);
  if (error) return sendError(error, 401);

  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);

    // Fetch all collections in parallel
    const [allUsers, allTxs, allTickets, allOrders, waitlistSnap] = await Promise.all([
      User.find({}),
      Transaction.find({}),
      db.collection('supportTickets').get().then(snap => snap.docs.map(d => docToObject<any>(d)!)),
      OrderModel.find({}),
      db.collection('waitlist').get().then(snap => snap.docs.map(d => docToObject<any>(d)!)),
    ]);

    // Compute User stats
    const totalCustomers = allUsers.filter(u => u.role === 'customer' && u.isActive).length;
    const totalVendors = allUsers.filter(u => u.role === 'vendor' && u.applicationStatus === 'approved' && u.isActive).length;
    const totalBrands = allUsers.filter(u => u.role === 'brand' && u.applicationStatus === 'approved' && u.isActive).length;
    const totalLogistics = allUsers.filter(u => u.role === 'logistics' && u.applicationStatus === 'approved' && u.isActive).length;
    const totalAdmins = allUsers.filter(u => u.role === 'admin').length;
    const pendingApprovals = allUsers.filter(u => ['vendor', 'brand', 'logistics'].includes(u.role) && u.applicationStatus === 'pending').length;
    const suspendedAccounts = allUsers.filter(u => !u.isActive).length;
    const newUsersToday = allUsers.filter(u => u.createdAt && u.createdAt >= today).length;
    const newUsersThisMonth = allUsers.filter(u => u.createdAt && u.createdAt >= thisMonthStart).length;
    const newUsersLastMonth = allUsers.filter(u => u.createdAt && u.createdAt >= lastMonthStart && u.createdAt <= lastMonthEnd).length;
    const totalUsers = allUsers.length;

    // Compute growth
    const userGrowthPct =
      newUsersLastMonth > 0
        ? Math.round(((newUsersThisMonth - newUsersLastMonth) / newUsersLastMonth) * 100)
        : newUsersThisMonth > 0
        ? 100
        : 0;

    // Compute Financial stats
    const completedTxs = allTxs.filter(t => t.status === 'completed');
    const totalRevenue = completedTxs.reduce((sum, t) => sum + t.amount, 0);
    const totalTransactionCount = completedTxs.length;

    const monthTxs = completedTxs.filter(t => t.createdAt && t.createdAt >= thisMonthStart);
    const monthRevenue = monthTxs.reduce((sum, t) => sum + t.amount, 0);
    const monthTransactionCount = monthTxs.length;

    const pendingEscrows = allTxs.filter(t => t.type === 'order_payment' && t.status === 'pending');
    const pendingEscrowAmount = pendingEscrows.reduce((sum, t) => sum + t.amount, 0);
    const pendingEscrowCount = pendingEscrows.length;

    // Support ticket stats
    const openTickets = allTickets.filter(t => ['open', 'in-progress'].includes(t.status)).length;

    // Weekly signups (7 days)
    const weeklySignups: { date: string; count: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const count = allUsers.filter(u => {
        if (!u.createdAt) return false;
        const uDate = new Date(u.createdAt).toISOString().slice(0, 10);
        return uDate === key;
      }).length;
      weeklySignups.push({ date: key, count });
    }

    // Courier breakdown
    const courierMap = new Map<string, { id: string; name: string; icon: string; price: number; count: number }>();
    allOrders.forEach(o => {
      if (o.courier && o.courier.id) {
        const current = courierMap.get(o.courier.id) ?? {
          id:    o.courier.id,
          name:  o.courier.name ?? o.courier.id,
          icon:  o.courier.icon ?? '📦',
          price: o.courier.price ?? 0,
          count: 0,
        };
        current.count += 1;
        courierMap.set(o.courier.id, current);
      }
    });
    const courierBreakdown = Array.from(courierMap.values())
      .sort((a, b) => b.count - a.count);

    // Platform revenue: prefer platform_fee records; fall back to 10% estimate
    const platformFeeRecords = allTxs.filter(t => t.type === 'platform_fee' && t.status === 'completed');
    const totalPlatformGross = platformFeeRecords.length > 0
      ? platformFeeRecords.reduce((sum, t) => sum + t.amount, 0)
      : Math.round(totalRevenue * 0.10 * 100) / 100;

    const stripeFeeRecords = allTxs.filter(t => t.type === 'stripe_fee' && t.status === 'completed');
    const totalStripeFees = stripeFeeRecords.length > 0
      ? stripeFeeRecords.reduce((sum, t) => sum + t.amount, 0)
      : Math.round(totalRevenue * 0.029 * 100) / 100;

    const totalPlatformNet = Math.round((totalPlatformGross - totalStripeFees) * 100) / 100;

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
        waitlist: waitlistSnap.filter(e => e.status === 'pending').length,
      },
      financials: {
        totalRevenue,
        totalTransactions: totalTransactionCount,
        monthRevenue,
        monthTransactions: monthTransactionCount,
        pendingEscrow: pendingEscrowAmount,
        pendingEscrowCount,
        commissionEarned:  totalPlatformGross,   // 10% gross (5% buyer + 5% seller)
        stripeFees:        totalStripeFees,       // 2.9% absorbed by platform
        netRevenue:        totalPlatformNet,      // 7.1% net
      },
      charts: {
        weeklySignups,
        courierBreakdown,
      },
    });
  } catch (error) {
    console.error('Admin stats error:', error);
    return sendServerError('Failed to fetch admin stats');
  }
}
