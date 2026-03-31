import { NextRequest } from 'next/server';
import { connectDB } from '@/backend/config/database';
import { Transaction } from '@/backend/models/Transaction';
import { verifyAdminAuth } from '@/backend/utils/adminAuth';
import { sendSuccess, sendError, sendServerError } from '@/backend/utils/responseAppRouter';

const ESCROW_TYPES = ['order_payment', 'escrow_release', 'refund'];

// GET /api/admin/escrow
export async function GET(request: NextRequest) {
  const { error } = await verifyAdminAuth(request);
  if (error) return sendError(error, 401);

  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'pending';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(50, parseInt(searchParams.get('limit') || '20'));

    const filter: Record<string, any> = { type: { $in: ESCROW_TYPES } };
    if (status !== 'all') filter.status = status;

    const skip = (page - 1) * limit;

    const [transactions, total, pendingCount, completedCount, refundedCount, heldAgg] =
      await Promise.all([
        Transaction.find(filter)
          .populate('fromUser', 'firstName lastName email')
          .populate('toUser', 'firstName lastName email')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        Transaction.countDocuments(filter),
        Transaction.countDocuments({ type: { $in: ESCROW_TYPES }, status: 'pending' }),
        Transaction.countDocuments({ type: { $in: ESCROW_TYPES }, status: 'completed' }),
        Transaction.countDocuments({ type: { $in: ESCROW_TYPES }, status: 'refunded' }),
        Transaction.aggregate([
          { $match: { type: 'order_payment', status: 'pending' } },
          { $group: { _id: null, total: { $sum: '$amount' } } },
        ]),
      ]);

    return sendSuccess({
      transactions,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      counts: { pending: pendingCount, completed: completedCount, refunded: refundedCount },
      totalHeld: heldAgg[0]?.total ?? 0,
    });
  } catch (err) {
    console.error('Admin escrow GET error:', err);
    return sendServerError('Failed to load escrow data');
  }
}

// POST /api/admin/escrow — release or refund a pending transaction
export async function POST(request: NextRequest) {
  const { error: authError } = await verifyAdminAuth(request);
  if (authError) return sendError(authError, 401);

  try {
    await connectDB();
    const body = await request.json().catch(() => ({}));
    const { transactionId, action, reason } = body;

    if (!transactionId) return sendError('transactionId is required', 400);
    if (!['release', 'refund'].includes(action)) {
      return sendError('action must be "release" or "refund"', 400);
    }

    const tx = await Transaction.findById(transactionId);
    if (!tx) return sendError('Transaction not found', 404);
    if (tx.status !== 'pending') return sendError('Only pending transactions can be actioned', 400);

    tx.status = action === 'release' ? 'completed' : 'refunded';
    if (reason) tx.metadata = { ...(tx.metadata || {}), adminNote: reason };
    await tx.save();

    return sendSuccess(
      { transactionId: tx._id, status: tx.status },
      `Escrow ${action === 'release' ? 'released to vendor' : 'refunded to customer'} successfully`
    );
  } catch (err) {
    console.error('Admin escrow POST error:', err);
    return sendServerError('Failed to process escrow action');
  }
}
