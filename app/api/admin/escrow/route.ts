import { NextRequest } from 'next/server';
import { Transaction } from '@/backend/models/Transaction';
import { verifyAdminAuth } from '@/backend/utils/adminAuth';
import { db, FieldPath, docToObject } from '@/backend/config/firebase';
import { sendSuccess, sendError, sendServerError } from '@/backend/utils/responseAppRouter';

const ESCROW_TYPES = ['order_payment', 'escrow_release', 'refund'];

// GET /api/admin/escrow
export async function GET(request: NextRequest) {
  const { error } = await verifyAdminAuth(request);
  if (error) return sendError(error, 401);

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'pending';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(50, parseInt(searchParams.get('limit') || '20'));
    const skip = (page - 1) * limit;

    let allTxs = await Transaction.find({});
    allTxs = allTxs.filter(t => ESCROW_TYPES.includes(t.type));

    if (status !== 'all') {
      allTxs = allTxs.filter(t => t.status === status);
    }

    allTxs.sort((a, b) => (b.createdAt ? new Date(b.createdAt).getTime() : 0) - (a.createdAt ? new Date(a.createdAt).getTime() : 0));

    const total = allTxs.length;
    const paginated = allTxs.slice(skip, skip + limit);

    // Populate fromUser and toUser in-memory
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
        } : null,
        toUser: toU ? {
          id:        toU.id,
          firstName: toU.firstName,
          lastName:  toU.lastName,
          email:     toU.email,
        } : null,
      };
    });

    const allEscrowTxs = (await Transaction.find({})).filter(t => ESCROW_TYPES.includes(t.type));
    const pendingCount = allEscrowTxs.filter(t => t.status === 'pending').length;
    const completedCount = allEscrowTxs.filter(t => t.status === 'completed').length;
    const refundedCount = allEscrowTxs.filter(t => t.status === 'refunded').length;

    const totalHeld = allEscrowTxs
      .filter(t => t.type === 'order_payment' && t.status === 'pending')
      .reduce((sum, t) => sum + t.amount, 0);

    return sendSuccess({
      transactions: populatedTxs,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      counts: { pending: pendingCount, completed: completedCount, refunded: refundedCount },
      totalHeld,
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
    const body = await request.json().catch(() => ({}));
    const { transactionId, action, reason } = body;

    if (!transactionId) return sendError('transactionId is required', 400);
    if (!['release', 'refund'].includes(action)) {
      return sendError('action must be "release" or "refund"', 400);
    }

    const docRef = db.collection('transactions').doc(transactionId);
    const snap = await docRef.get();
    if (!snap.exists) return sendError('Transaction not found', 404);
    const data = snap.data()!;
    if (data.status !== 'pending') return sendError('Only pending transactions can be actioned', 400);

    const targetStatus = action === 'release' ? 'completed' : 'refunded';
    const updates: Partial<any> = {
      status: targetStatus,
      updatedAt: new Date(),
    };
    if (reason) {
      updates.metadata = { ...(data.metadata || {}), adminNote: reason };
    }
    await docRef.update(updates);

    return sendSuccess(
      { transactionId, status: targetStatus },
      `Escrow ${action === 'release' ? 'released to vendor' : 'refunded to customer'} successfully`
    );
  } catch (err) {
    console.error('Admin escrow POST error:', err);
    return sendServerError('Failed to process escrow action');
  }
}
