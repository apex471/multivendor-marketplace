import { NextRequest } from 'next/server';
import { Transaction } from '@/backend/models/Transaction';
import { verifyAdminAuth } from '@/backend/utils/adminAuth';
import { db, FieldPath, docToObject } from '@/backend/config/firebase';
import { sendSuccess, sendError, sendServerError } from '@/backend/utils/responseAppRouter';

// GET /api/admin/transactions - List all transactions with filters
export async function GET(request: NextRequest) {
  const { error } = await verifyAdminAuth(request);
  if (error) return sendError(error, 401);

  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(100, parseInt(searchParams.get('limit') || '25'));
    const type = searchParams.get('type') || 'all';
    const status = searchParams.get('status') || 'all';
    const dateRange = searchParams.get('dateRange') || '30d'; // 7d | 30d | 90d | all

    const skip = (page - 1) * limit;

    let allTxs = await Transaction.find({});

    if (type !== 'all') {
      allTxs = allTxs.filter(t => t.type === type);
    }
    if (status !== 'all') {
      allTxs = allTxs.filter(t => t.status === status);
    }

    if (dateRange !== 'all') {
      const days = dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 90;
      const fromDate = new Date();
      fromDate.setDate(fromDate.getDate() - days);
      allTxs = allTxs.filter(t => t.createdAt && t.createdAt >= fromDate);
    }

    allTxs.sort((a, b) => (b.createdAt ? new Date(b.createdAt).getTime() : 0) - (a.createdAt ? new Date(a.createdAt).getTime() : 0));

    const total = allTxs.length;
    const paginated = allTxs.slice(skip, skip + limit);

    // Populate user accounts
    const userIds = Array.from(new Set(
      paginated.flatMap(t => [t.fromUser, t.toUser]).filter((id): id is string => !!id)
    ));
    const userMap = new Map<string, any>();
    if (userIds.length > 0) {
      const chunks: string[][] = [];
      for (let i = 0; i < userIds.length; i += 30) {
        chunks.push(userIds.slice(i, i + 30));
      }
      for (const chunk of chunks) {
        const snap = await db.collection('users')
          .where(FieldPath.documentId(), 'in', chunk)
          .get();
        snap.docs.forEach(d => {
          userMap.set(d.id, docToObject<any>(d));
        });
      }
    }

    const populatedTxs = paginated.map(t => {
      const fromU = t.fromUser ? userMap.get(t.fromUser) : null;
      const toU = t.toUser ? userMap.get(t.toUser) : null;
      return {
        ...t,
        fromUser: fromU ? {
          id:        fromU.id,
          firstName: fromU.firstName,
          lastName:  fromU.lastName,
          email:     fromU.email,
          role:      fromU.role,
        } : null,
        toUser: toU ? {
          id:        toU.id,
          firstName: toU.firstName,
          lastName:  toU.lastName,
          email:     toU.email,
          role:      toU.role,
        } : null,
      };
    });

    const completedFiltered = allTxs.filter(t => t.status === 'completed');
    const totalVolume = completedFiltered.reduce((sum, t) => sum + t.amount, 0);
    const completedCount = completedFiltered.length;
    const avgAmount = completedCount > 0 ? totalVolume / completedCount : 0;

    return sendSuccess({
      transactions: populatedTxs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
      summary: {
        totalVolume,
        completedCount,
        avgAmount: Math.round(avgAmount * 100) / 100,
      },
    });
  } catch (error) {
    console.error('Admin transactions GET error:', error);
    return sendServerError('Failed to fetch transactions');
  }
}
