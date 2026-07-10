import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/backend/config/firebase';
import { Transaction } from '@/backend/models/Transaction';
import { Settings } from '@/backend/models/Settings';
import { User } from '@/backend/models/User';
import { verifyToken } from '@/backend/utils/jwt';
import { sendSuccess, sendError, sendServerError } from '@/backend/utils/responseAppRouter';

function getAuth(req: NextRequest) {
  const h = req.headers.get('Authorization') ?? req.headers.get('authorization') ?? '';
  const tok = h.startsWith('Bearer ') ? h.slice(7) : null;
  return tok ? verifyToken(tok) : null;
}

// GET /api/logistics/withdraw — Get driver balance & transaction history
export async function GET(request: NextRequest) {
  const payload = getAuth(request);
  if (!payload) return sendError('Unauthorized', 401);
  if (payload.role !== 'logistics') return sendError('Access denied', 403);

  try {
    // 1. Get incoming earnings: transactions sent to the user (type: escrow_release / logistics_release)
    const allCompletedTxs = await Transaction.find({ toUser: payload.userId, status: 'completed' });
    const totalEarned = allCompletedTxs.reduce((sum, tx) => sum + tx.amount, 0);

    // 2. Get outgoing withdrawals: transactions from the user (type: withdrawal)
    const allWithdrawals = await Transaction.find({ fromUser: payload.userId, type: 'withdrawal' });
    // Count both pending and completed withdrawals to prevent double-spending
    const activeWithdrawals = allWithdrawals.filter(tx => tx.status === 'completed' || tx.status === 'pending');
    const totalWithdrawn = activeWithdrawals.reduce((sum, tx) => sum + tx.amount, 0);

    const balance = Math.max(0, Number((totalEarned - totalWithdrawn).toFixed(2)));

    // 3. Combine and sort history
    const combinedHistory = [...allCompletedTxs, ...allWithdrawals].sort(
      (a, b) => (b.createdAt ? new Date(b.createdAt).getTime() : 0) - (a.createdAt ? new Date(a.createdAt).getTime() : 0)
    );

    return sendSuccess({
      balance,
      totalEarned,
      totalWithdrawn,
      history: combinedHistory,
    });
  } catch (err) {
    console.error('[Logistics/Withdraw GET]', err);
    return sendServerError('Failed to load balance details');
  }
}

// POST /api/logistics/withdraw — Request a withdrawal
export async function POST(request: NextRequest) {
  const payload = getAuth(request);
  if (!payload) return sendError('Unauthorized', 401);
  if (payload.role !== 'logistics') return sendError('Access denied', 403);

  try {
    const body = await request.json().catch(() => ({}));
    const amount = Number(body.amount);
    const bankName = String(body.bankName || '').trim();
    const accountNumber = String(body.accountNumber || '').trim();

    if (!amount || amount <= 0 || isNaN(amount)) {
      return sendError('Please specify a valid withdrawal amount', 400);
    }
    if (!bankName || !accountNumber) {
      return sendError('Bank name and account number are required', 400);
    }

    // 1. Check current settings for minWithdrawal
    const settings = await Settings.findOne();
    const minWithdrawal = settings?.minWithdrawal ?? 50;

    if (amount < minWithdrawal) {
      return sendError(`Minimum withdrawal amount is $${minWithdrawal}`, 400);
    }

    // 2. Calculate current balance
    const allCompletedTxs = await Transaction.find({ toUser: payload.userId, status: 'completed' });
    const totalEarned = allCompletedTxs.reduce((sum, tx) => sum + tx.amount, 0);

    const allWithdrawals = await Transaction.find({ fromUser: payload.userId, type: 'withdrawal' });
    const activeWithdrawals = allWithdrawals.filter(tx => tx.status === 'completed' || tx.status === 'pending');
    const totalWithdrawn = activeWithdrawals.reduce((sum, tx) => sum + tx.amount, 0);

    const balance = Math.max(0, Number((totalEarned - totalWithdrawn).toFixed(2)));

    if (amount > balance) {
      return sendError(`Insufficient balance. Current balance is $${balance.toFixed(2)}`, 400);
    }

    // 3. Create the withdrawal transaction
    const withdrawalTx = await Transaction.create({
      transactionId: `WDL-${Date.now()}`,
      type:          'withdrawal',
      amount,
      currency:      'USD',
      status:        'completed', // auto-completed for mockup verification convenience
      fromUser:      payload.userId,
      description:   `Withdrawal to bank account: ${bankName} (${accountNumber})`,
      metadata: {
        bankName,
        accountNumber,
        processedAt: new Date().toISOString(),
      },
    });

    return sendSuccess({ transaction: withdrawalTx }, 'Withdrawal processed successfully');
  } catch (err) {
    console.error('[Logistics/Withdraw POST]', err);
    return sendServerError('Failed to submit withdrawal request');
  }
}
