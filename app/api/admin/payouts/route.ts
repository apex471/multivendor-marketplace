import { NextRequest } from 'next/server';
import { Transaction } from '@/backend/models/Transaction';
import { verifyAdminAuth } from '@/backend/utils/adminAuth';
import { db, FieldPath, docToObject } from '@/backend/config/firebase';
import { sendSuccess, sendError, sendServerError } from '@/backend/utils/responseAppRouter';

// GET /api/admin/payouts - List all payout requests
export async function GET(request: NextRequest) {
  const { error } = await verifyAdminAuth(request);
  if (error) return sendError(error, 401);

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'all';

    // 1. Fetch all withdrawal transactions
    let payouts = await Transaction.find({ type: 'withdrawal' });

    // 2. Filter by status if specified
    if (status !== 'all') {
      payouts = payouts.filter(p => p.status === status);
    }

    // Sort by newest first
    payouts.sort((a, b) => (b.createdAt ? new Date(b.createdAt).getTime() : 0) - (a.createdAt ? new Date(a.createdAt).getTime() : 0));

    // 3. Populate requester profiles
    const userIds = Array.from(new Set(
      payouts.map(p => p.fromUser).filter((id): id is string => !!id)
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

    const populatedPayouts = payouts.map(p => {
      const user = p.fromUser ? userMap.get(p.fromUser) : null;
      return {
        ...p,
        user: user ? {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          role: user.role,
          storeName: user.storeName || null,
          businessCity: user.businessCity || null,
          businessState: user.businessState || null,
        } : null,
      };
    });

    return sendSuccess({ payouts: populatedPayouts });
  } catch (err) {
    console.error('[Admin Payouts GET]', err);
    return sendServerError('Failed to fetch payout requests');
  }
}

// POST /api/admin/payouts - Approve or reject a payout request
export async function POST(request: NextRequest) {
  const { error } = await verifyAdminAuth(request);
  if (error) return sendError(error, 401);

  try {
    const body = await request.json().catch(() => ({}));
    const { payoutId, action, notes } = body;

    if (!payoutId || !action) {
      return sendError('Payout ID and action are required', 400);
    }
    if (action !== 'approve' && action !== 'reject') {
      return sendError('Invalid action. Must be approve or reject', 400);
    }

    // 1. Fetch transaction
    const payouts = await Transaction.find({ type: 'withdrawal' });
    const targetPayout = payouts.find(p => p.id === payoutId);

    if (!targetPayout) {
      return sendError('Payout request not found', 404);
    }

    if (targetPayout.status !== 'pending') {
      return sendError(`Cannot action this payout. Current status is ${targetPayout.status}`, 400);
    }

    // 2. Perform approve or reject
    const now = new Date();
    const updatedMetadata = {
      ...(targetPayout.metadata || {}),
      adminNotes: notes || (action === 'approve' ? 'Approved' : 'Rejected by Admin'),
      processedAt: now.toISOString(),
    };

    if (action === 'approve') {
      await Transaction.updateOne(payoutId, {
        status: 'completed',
        metadata: updatedMetadata,
        updatedAt: now,
      });
      return sendSuccess(null, 'Payout request approved and completed successfully');
    } else {
      await Transaction.updateOne(payoutId, {
        status: 'failed', // Failed status triggers balance refund
        metadata: updatedMetadata,
        updatedAt: now,
      });
      return sendSuccess(null, 'Payout request rejected successfully');
    }
  } catch (err) {
    console.error('[Admin Payouts POST]', err);
    return sendServerError('Failed to process payout request');
  }
}
