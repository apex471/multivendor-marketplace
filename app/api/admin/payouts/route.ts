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

    const flwSecretKey = process.env.FLUTTERWAVE_SECRET_KEY;
    return sendSuccess({ 
      payouts: populatedPayouts,
      flutterwaveKeyConfigured: !!flwSecretKey
    });
  } catch (err) {
    console.error('[Admin Payouts GET]', err);
    return sendServerError('Failed to fetch payout requests');
  }
}

async function getBankCode(bankName: string, flwSecretKey: string): Promise<string | null> {
  try {
    const res = await fetch('https://api.flutterwave.com/v3/banks/NG', {
      headers: { Authorization: `Bearer ${flwSecretKey}` }
    });
    const data = await res.json();
    if (data.status === 'success' && Array.isArray(data.data)) {
      const nameClean = bankName.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
      
      // 1. Try exact match
      let match = data.data.find((b: any) => b.name.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim() === nameClean);
      
      // 2. Try substring match
      if (!match) {
        match = data.data.find((b: any) => {
          const bName = b.name.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
          return bName.includes(nameClean) || nameClean.includes(bName);
        });
      }
      
      // 3. Try token-based keyword match for variation handling
      if (!match) {
        const stopWords = new Set(['bank', 'plc', 'ltd', 'limited', 'microfinance', 'mfb', 'mobile', 'money']);
        const tokens = nameClean.split(/\s+/).filter(token => token.length > 2 && !stopWords.has(token));
        
        if (tokens.length > 0) {
          match = data.data.find((b: any) => {
            const bName = b.name.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
            return tokens.some(token => bName.includes(token));
          });
        }
      }
      
      return match ? match.code : null;
    }
  } catch (err) {
    console.error('Failed to fetch bank list from Flutterwave:', err);
  }
  return null;
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
    if (!['approve', 'manual_approve', 'reject'].includes(action)) {
      return sendError('Invalid action. Must be approve, manual_approve, or reject', 400);
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

    // 2. Perform approve, manual_approve, or reject
    const now = new Date();
    const updatedMetadata: any = {
      ...(targetPayout.metadata || {}),
      adminNotes: notes || (action === 'approve' ? 'Approved via Flutterwave' : action === 'manual_approve' ? 'Manually approved' : 'Rejected by Admin'),
      processedAt: now.toISOString(),
    };

    // ── Manual Approval (bypasses Flutterwave entirely) ────────────────────
    if (action === 'manual_approve') {
      const { bankReference, confirmationNote } = body;
      updatedMetadata.manualPayment = {
        bankReference:    bankReference?.trim() || null,
        confirmationNote: confirmationNote?.trim() || null,
        processedBy:      'admin_manual',
        processedAt:      now.toISOString(),
      };
      updatedMetadata.payoutMethod = 'manual_bank_transfer';

      await Transaction.updateOne(payoutId, {
        status:    'completed',
        metadata:  updatedMetadata,
        updatedAt: now,
      });
      return sendSuccess(
        { payoutId, status: 'completed', method: 'manual' },
        'Payout marked as manually processed. Vendor balance updated.'
      );
    }

    if (action === 'approve') {
      // Initiate payout via Flutterwave if secret key is present
      const flwSecretKey = process.env.FLUTTERWAVE_SECRET_KEY;
      if (!flwSecretKey) {
        return sendError('Flutterwave secret key is not configured. Cannot process payout.', 500);
      }

      const meta = targetPayout.metadata || {};
      const bankName = String(meta.bankName || '').trim();
      const accountNumber = String(meta.accountNumber || '').trim();

      if (!bankName || !accountNumber) {
        return sendError('Payout request is missing bank name or account number.', 400);
      }

      // 1. Resolve Bank Name to Bank Code
      const bankCode = await getBankCode(bankName, flwSecretKey);
      if (!bankCode) {
        return sendError(`Could not resolve bank code for bank name: "${bankName}". Please reject or edit details.`, 400);
      }

      // 2. Convert USD amount to NGN
      const NGN_RATE = Number(process.env.USD_TO_NGN_RATE ?? 1600);
      const payoutAmountNGN = Math.round(targetPayout.amount * NGN_RATE);

      // 3. Call Flutterwave Transfer API
      try {
        const transferRes = await fetch('https://api.flutterwave.com/v3/transfers', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${flwSecretKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            account_bank: bankCode,
            account_number: accountNumber,
            amount: payoutAmountNGN,
            currency: 'NGN',
            narration: `Payout for ${targetPayout.transactionId || payoutId} - Multivendor Marketplace`,
            reference: targetPayout.transactionId || `WDL-${Date.now()}`,
            debit_currency: process.env.FLUTTERWAVE_DEBIT_CURRENCY || 'NGN',
          }),
        });

        const text = await transferRes.text();
        let transferData;
        try {
          transferData = JSON.parse(text);
        } catch (parseErr) {
          console.error('[Flutterwave HTML or Non-JSON Response]', text);
          return sendError(`Flutterwave returned invalid response format: ${text.substring(0, 150)}`, 400);
        }

        if (transferData.status !== 'success') {
          console.error('[Flutterwave Transfer API Error]', transferData);
          return sendError(
            `Flutterwave transfer failed: ${transferData.message || 'Unknown error'}`,
            400
          );
        }

        // Add Flutterwave response to transaction metadata
        updatedMetadata.flutterwaveTransfer = {
          transferId: transferData.data?.id || null,
          status: transferData.data?.status || 'unknown',
          fee: transferData.data?.fee || 0,
          rawResponse: transferData,
        };
      } catch (err: any) {
        console.error('[Flutterwave Transfer Exception]', err);
        return sendError(`Failed to connect to Flutterwave: ${err.message}`, 500);
      }

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
