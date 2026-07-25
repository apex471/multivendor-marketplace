import { NextRequest } from 'next/server';
import { Transaction } from '@/backend/models/Transaction';
import { User } from '@/backend/models/User';
import { verifyToken } from '@/backend/utils/jwt';
import { sendSuccess, sendError, sendServerError } from '@/backend/utils/responseAppRouter';

function getAuth(req: NextRequest) {
  const h = req.headers.get('Authorization') ?? req.headers.get('authorization') ?? '';
  const tok = h.startsWith('Bearer ') ? h.slice(7) : null;
  return tok ? verifyToken(tok) : null;
}

// GET /api/withdraw - Get provider balance & payout history
export async function GET(request: NextRequest) {
  const payload = getAuth(request);
  if (!payload) return sendError('Unauthorized', 401);

  const allowedRoles = ['vendor', 'brand', 'logistics'];
  if (!allowedRoles.includes(payload.role)) {
    return sendError('Access denied', 403);
  }

  try {
    // 1. Get incoming earnings: transactions sent to this user
    // Vendors/brands receive 'escrow_release'; logistics drivers receive 'logistics_release'
    const earningTypes = payload.role === 'logistics' ? ['logistics_release'] : ['escrow_release'];
    
    let allEarnings = await Transaction.find({ toUser: payload.userId, status: 'completed' });
    allEarnings = allEarnings.filter(tx => earningTypes.includes(tx.type));
    const totalEarned = allEarnings.reduce((sum, tx) => sum + tx.amount, 0);

    // 2. Get outgoing withdrawals: transactions from this user
    const allWithdrawals = await Transaction.find({ fromUser: payload.userId, type: 'withdrawal' });
    
    // Count both completed and pending withdrawals to lock the balance in escrow
    const activeWithdrawals = allWithdrawals.filter(
      tx => tx.status === 'completed' || tx.status === 'pending'
    );
    const totalWithdrawn = activeWithdrawals.reduce((sum, tx) => sum + tx.amount, 0);

    const balance = Math.max(0, Number((totalEarned - totalWithdrawn).toFixed(2)));

    // 3. Combine and sort history
    const combinedHistory = [...allEarnings, ...allWithdrawals].sort(
      (a, b) => (b.createdAt ? new Date(b.createdAt).getTime() : 0) - (a.createdAt ? new Date(a.createdAt).getTime() : 0)
    );

    // 4. Fetch saved payout account from user profile
    const savedUser = await User.findById(payload.userId);

    return sendSuccess({
      balance,
      totalEarned,
      totalWithdrawn,
      history: combinedHistory,
      // Return saved payout account so frontend can pre-populate the withdrawal form
      savedPayoutAccount: {
        hasAccount: !!(savedUser?.bankName && savedUser?.accountNumber && savedUser?.accountName),
        bankName:      savedUser?.bankName      ?? null,
        accountNumber: savedUser?.accountNumber ?? null,
        accountName:   savedUser?.accountName   ?? null,
        bankCode:      savedUser?.bankCode       ?? null,
      },
    });
  } catch (err) {
    console.error('[Withdraw API GET]', err);
    return sendServerError('Failed to fetch wallet information');
  }
}

// POST /api/withdraw - Submit a payout withdrawal request
export async function POST(request: NextRequest) {
  const payload = getAuth(request);
  if (!payload) return sendError('Unauthorized', 401);

  const allowedRoles = ['vendor', 'brand', 'logistics'];
  if (!allowedRoles.includes(payload.role)) {
    return sendError('Access denied', 403);
  }

  try {
    const body = await request.json().catch(() => ({}));
    const amount = Number(body.amount);

    // Fetch saved payout account — use as fallback if body doesn't supply bank details
    const vendor = await User.findById(payload.userId);
    const bankName          = String(body.bankName          ?? vendor?.bankName      ?? '').trim();
    const accountNumber     = String(body.accountNumber     ?? vendor?.accountNumber ?? '').trim();
    const accountHolderName = String(body.accountHolderName ?? vendor?.accountName   ?? '').trim();
    const routingNumber     = String(body.routingNumber     ?? '').trim();

    if (!amount || amount <= 0 || isNaN(amount)) {
      return sendError('Please specify a valid withdrawal amount', 400);
    }
    if (!bankName || !accountNumber || !accountHolderName) {
      return sendError(
        'No payout account found. Please set up your bank account in the Payouts tab before requesting a withdrawal.',
        400
      );
    }

    // Fetch current balance
    const earningTypes = payload.role === 'logistics' ? ['logistics_release'] : ['escrow_release'];
    let allEarnings = await Transaction.find({ toUser: payload.userId, status: 'completed' });
    allEarnings = allEarnings.filter(tx => earningTypes.includes(tx.type));
    const totalEarned = allEarnings.reduce((sum, tx) => sum + tx.amount, 0);

    const allWithdrawals = await Transaction.find({ fromUser: payload.userId, type: 'withdrawal' });
    const activeWithdrawals = allWithdrawals.filter(
      tx => tx.status === 'completed' || tx.status === 'pending'
    );
    const totalWithdrawn = activeWithdrawals.reduce((sum, tx) => sum + tx.amount, 0);
    const balance = Math.max(0, Number((totalEarned - totalWithdrawn).toFixed(2)));

    if (amount > balance) {
      return sendError(`Insufficient balance. Available: $${balance.toFixed(2)}`, 400);
    }

    // 3. Create a pending withdrawal transaction
    const lastDigits = accountNumber.slice(-4);
    const withdrawalTx = await Transaction.create({
      transactionId: `WDL-${Date.now()}`,
      type:          'withdrawal',
      amount,
      currency:      'USD',
      status:        'pending', // Stays pending until Admin approves it
      fromUser:      payload.userId,
      description:   `Withdrawal to bank account: ${bankName} (*${lastDigits})`,
      metadata: {
        bankName,
        accountNumber,
        accountHolderName,
        routingNumber: routingNumber || undefined,
        role: payload.role,
        submittedAt: new Date().toISOString(),
      },
    });

    return sendSuccess({ transaction: withdrawalTx }, 'Withdrawal request submitted successfully');
  } catch (err) {
    console.error('[Withdraw API POST]', err);
    return sendServerError('Failed to submit withdrawal request');
  }
}
