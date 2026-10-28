import { NextRequest } from 'next/server';
import { courierPlusClient } from '@/lib/courierplus';
import { verifyAdminAuth } from '@/backend/utils/adminAuth';
import {
  sendSuccess,
  sendError,
  sendUnauthorized,
  sendForbidden,
  sendServerError,
} from '@/backend/utils/responseAppRouter';

// ─── GET /api/courierplus/wallet ──────────────────────────────────────────────
// Returns the CourierPlus wallet balance. Admin only.
export async function GET(req: NextRequest) {
  const { error } = await verifyAdminAuth(req);
  if (error) {
    return error.includes('Access denied')
      ? sendForbidden(error)
      : sendUnauthorized(error);
  }

  try {
    const result = await courierPlusClient.getWalletBalance();

    if (!result.success) {
      return sendError(result.error || 'Failed to fetch wallet balance', 502);
    }

    return sendSuccess({ wallet: result.data }, 'Wallet balance fetched');
  } catch (err) {
    console.error('[CourierPlus/Wallet GET] Unexpected error:', err);
    return sendServerError('Failed to fetch wallet balance');
  }
}

// ─── POST /api/courierplus/wallet ─────────────────────────────────────────────
// Top up the CourierPlus wallet. Admin only.
// Body: { amount, reference }
export async function POST(req: NextRequest) {
  const { error } = await verifyAdminAuth(req);
  if (error) {
    return error.includes('Access denied')
      ? sendForbidden(error)
      : sendUnauthorized(error);
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { amount, reference } = body as {
      amount?: number;
      reference?: string;
    };

    if (!amount || !reference) {
      return sendError('amount and reference are required', 400);
    }

    if (amount <= 0) {
      return sendError('amount must be a positive number', 400);
    }

    const result = await courierPlusClient.topUpWallet(amount, reference);

    if (!result.success) {
      return sendError(result.error || 'Failed to top up wallet', 502);
    }

    return sendSuccess(
      { topUp: result.data, amount, reference },
      'Wallet topped up successfully'
    );
  } catch (err) {
    console.error('[CourierPlus/Wallet POST] Unexpected error:', err);
    return sendServerError('Failed to top up wallet');
  }
}
