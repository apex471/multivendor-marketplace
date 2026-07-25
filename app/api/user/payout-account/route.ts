import { NextRequest } from 'next/server';
import { verifyToken } from '@/backend/utils/jwt';
import { User } from '@/backend/models/User';
import { sendSuccess, sendError, sendServerError } from '@/backend/utils/responseAppRouter';

function getAuth(req: NextRequest) {
  const h = req.headers.get('Authorization') ?? '';
  const tok = h.startsWith('Bearer ') ? h.slice(7) : null;
  return tok ? verifyToken(tok) : null;
}

const ALLOWED_ROLES = ['vendor', 'brand', 'logistics'];

// GET /api/user/payout-account — fetch saved payout account
export async function GET(request: NextRequest) {
  const payload = getAuth(request);
  if (!payload) return sendError('Unauthorized', 401);
  if (!ALLOWED_ROLES.includes(payload.role)) return sendError('Access denied', 403);

  try {
    const user = await User.findById(payload.userId);
    if (!user) return sendError('User not found', 404);

    return sendSuccess({
      hasPayoutAccount: !!(user.bankName && user.accountNumber && user.accountName),
      bankName:      user.bankName      ?? null,
      accountNumber: user.accountNumber ?? null,
      accountName:   user.accountName   ?? null,
      bankCode:      user.bankCode      ?? null,
    });
  } catch (err) {
    console.error('[payout-account GET]', err);
    return sendServerError('Failed to fetch payout account');
  }
}

// PUT /api/user/payout-account — save payout account (creates or replaces)
export async function PUT(request: NextRequest) {
  const payload = getAuth(request);
  if (!payload) return sendError('Unauthorized', 401);
  if (!ALLOWED_ROLES.includes(payload.role)) return sendError('Access denied', 403);

  try {
    const body = await request.json().catch(() => ({}));
    const bankName      = String(body.bankName      ?? '').trim();
    const accountNumber = String(body.accountNumber ?? '').trim();
    const accountName   = String(body.accountName   ?? '').trim();
    const bankCode      = String(body.bankCode      ?? '').trim();

    if (!bankName)      return sendError('Bank name is required', 400);
    if (!accountNumber) return sendError('Account number is required', 400);
    if (!accountName)   return sendError('Account holder name is required', 400);

    // Basic Nigerian account number validation (10 digits)
    if (!/^\d{10}$/.test(accountNumber)) {
      return sendError('Account number must be exactly 10 digits', 400);
    }

    await User.updateOne(payload.userId, {
      bankName,
      accountNumber,
      accountName,
      bankCode: bankCode || undefined,
    });

    return sendSuccess(
      { bankName, accountNumber, accountName, bankCode: bankCode || null },
      'Payout account saved successfully'
    );
  } catch (err) {
    console.error('[payout-account PUT]', err);
    return sendServerError('Failed to save payout account');
  }
}

// DELETE /api/user/payout-account — remove saved payout account
export async function DELETE(request: NextRequest) {
  const payload = getAuth(request);
  if (!payload) return sendError('Unauthorized', 401);
  if (!ALLOWED_ROLES.includes(payload.role)) return sendError('Access denied', 403);

  try {
    await User.updateOne(payload.userId, {
      bankName:      undefined,
      accountNumber: undefined,
      accountName:   undefined,
      bankCode:      undefined,
    } as any);
    return sendSuccess({}, 'Payout account removed');
  } catch (err) {
    console.error('[payout-account DELETE]', err);
    return sendServerError('Failed to remove payout account');
  }
}
