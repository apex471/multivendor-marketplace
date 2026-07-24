import { NextRequest } from 'next/server';
import { verifyToken } from '@/backend/utils/jwt';
import { sendError, sendSuccess } from '@/backend/utils/responseAppRouter';

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return sendError('Authentication required', 401);
  }
  const decoded = verifyToken(authHeader.split(' ')[1]);
  if (!decoded) return sendError('Invalid or expired token', 401);

  try {
    const { accountNumber, bankCode } = await request.json();

    if (!accountNumber || !bankCode) {
      return sendError('accountNumber and bankCode are required', 400);
    }

    const flwSecretKey = process.env.FLUTTERWAVE_SECRET_KEY;
    if (!flwSecretKey) {
      // Mock for development if key is missing
      return sendSuccess({
        accountName: 'TEST ACCOUNT (DEVELOPMENT)',
      }, 'Account resolved (Simulated)');
    }

    const flwRes = await fetch('https://api.flutterwave.com/v3/accounts/resolve', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${flwSecretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        account_number: accountNumber,
        account_bank: bankCode,
      }),
    });

    const flwData = await flwRes.json();
    if (!flwRes.ok || flwData.status !== 'success') {
      return sendError(flwData.message || 'Failed to resolve bank account details. Please check the account number and bank.', 400);
    }

    return sendSuccess({
      accountName: flwData.data.account_name,
    }, 'Account resolved successfully');

  } catch (err: any) {
    console.error('[VerifyBank] Error:', err);
    return sendError(err.message || 'An error occurred during account verification', 500);
  }
}
