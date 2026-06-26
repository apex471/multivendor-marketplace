import { NextRequest } from 'next/server';
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
    const provider = await User.findById(decoded.userId);
    if (!provider || provider.role !== 'logistics') return sendError('Access denied', 403);

    const completedTxs = await Transaction.find({ toUser: decoded.userId, status: 'completed' });

    const totalRevenue = completedTxs.reduce((sum, tx) => sum + tx.amount, 0);
    const totalDeliveries = completedTxs.length;

    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const monthTxs = completedTxs.filter(tx => tx.createdAt && tx.createdAt >= startOfMonth);
    const monthRevenue = monthTxs.reduce((sum, tx) => sum + tx.amount, 0);
    const monthDeliveries = monthTxs.length;

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayTxs = completedTxs.filter(tx => tx.createdAt && tx.createdAt >= todayStart);
    const todayRevenue = todayTxs.reduce((sum, tx) => sum + tx.amount, 0);
    const todayDeliveries = todayTxs.length;

    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    weekStart.setHours(0, 0, 0, 0);
    const weekTxs = completedTxs.filter(tx => tx.createdAt && tx.createdAt >= weekStart);
    const weekRevenue = weekTxs.reduce((sum, tx) => sum + tx.amount, 0);

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
        totalRevenue,
        totalDeliveries,
        monthRevenue,
        monthDeliveries,
        todayRevenue,
        todayDeliveries,
        weekRevenue,
      },
    });
  } catch (err) {
    console.error('Logistics dashboard GET error:', err);
    return sendServerError('Failed to load logistics dashboard');
  }
}
