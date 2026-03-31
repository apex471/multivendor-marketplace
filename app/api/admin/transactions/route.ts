import { NextRequest } from 'next/server';
import { connectDB } from '@/backend/config/database';
import { Transaction } from '@/backend/models/Transaction';
import { verifyAdminAuth } from '@/backend/utils/adminAuth';
import { sendSuccess, sendError, sendServerError } from '@/backend/utils/responseAppRouter';

// GET /api/admin/transactions - List all transactions with filters
export async function GET(request: NextRequest) {
  const { error } = await verifyAdminAuth(request);
  if (error) return sendError(error, 401);

  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(100, parseInt(searchParams.get('limit') || '25'));
    const type = searchParams.get('type') || 'all';
    const status = searchParams.get('status') || 'all';
    const dateRange = searchParams.get('dateRange') || '30d'; // 7d | 30d | 90d | all

    const filter: Record<string, any> = {};
    if (type !== 'all') filter.type = type;
    if (status !== 'all') filter.status = status;

    if (dateRange !== 'all') {
      const days = dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 90;
      const fromDate = new Date();
      fromDate.setDate(fromDate.getDate() - days);
      filter.createdAt = { $gte: fromDate };
    }

    const skip = (page - 1) * limit;
    const [transactions, total, summaryAgg] = await Promise.all([
      Transaction.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('fromUser', 'firstName lastName email role')
        .populate('toUser', 'firstName lastName email role')
        .lean(),
      Transaction.countDocuments(filter),
      Transaction.aggregate([
        { $match: { ...filter, status: 'completed' } },
        {
          $group: {
            _id: null,
            totalVolume: { $sum: '$amount' },
            count: { $sum: 1 },
            avgAmount: { $avg: '$amount' },
          },
        },
      ]),
    ]);

    const summary = summaryAgg[0] || { totalVolume: 0, count: 0, avgAmount: 0 };

    return sendSuccess({
      transactions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
      summary: {
        totalVolume: summary.totalVolume,
        completedCount: summary.count,
        avgAmount: Math.round(summary.avgAmount * 100) / 100,
      },
    });
  } catch (error) {
    console.error('Admin transactions GET error:', error);
    return sendServerError('Failed to fetch transactions');
  }
}
