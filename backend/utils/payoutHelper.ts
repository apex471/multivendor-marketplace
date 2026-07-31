export async function getBankCode(bankName: string, flwSecretKey: string): Promise<string | null> {
  try {
    const res = await fetch('https://api.flutterwave.com/v3/banks/NG', {
      headers: { Authorization: `Bearer ${flwSecretKey}` }
    });
    const data = await res.json();
    if (data.status === 'success' && Array.isArray(data.data)) {
      const nameLower = bankName.toLowerCase();
      // Try exact match first
      let match = data.data.find((b: any) => b.name.toLowerCase() === nameLower);
      if (!match) {
        // Try substring match
        match = data.data.find((b: any) => b.name.toLowerCase().includes(nameLower) || nameLower.includes(b.name.toLowerCase()));
      }
      return match ? match.code : null;
    }
  } catch (err) {
    console.error('Failed to fetch bank list from Flutterwave:', err);
  }
  return null;
}

export async function processFlutterwavePayout(params: {
  amount: number;
  bankName: string;
  accountNumber: string;
  reference: string;
}) {
  const flwSecretKey = process.env.FLUTTERWAVE_SECRET_KEY;
  if (!flwSecretKey) {
    return {
      status: 'pending' as const,
      metadata: {
        payoutMethod: 'manual_approval',
        notes: 'Flutterwave key not configured; requires manual approval.'
      }
    };
  }

  const bankCode = await getBankCode(params.bankName, flwSecretKey);
  if (!bankCode) {
    return {
      status: 'failed' as const,
      metadata: {
        error: `Could not resolve bank code for: "${params.bankName}"`,
        notes: 'Payout failed during auto-payout bank name resolution.'
      }
    };
  }

  const NGN_RATE = Number(process.env.USD_TO_NGN_RATE ?? 1600);
  const payoutAmountNGN = Math.round(params.amount * NGN_RATE);

  try {
    const transferRes = await fetch('https://api.flutterwave.com/v3/transfers', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${flwSecretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        account_bank: bankCode,
        account_number: params.accountNumber,
        amount: payoutAmountNGN,
        currency: 'NGN',
        narration: `Payout for ${params.reference} - Multivendor Marketplace`,
        reference: params.reference,
        debit_currency: process.env.FLUTTERWAVE_DEBIT_CURRENCY || 'NGN',
      }),
    });

    const transferData = await transferRes.json();
    if (transferData.status !== 'success') {
      console.error('[Flutterwave Auto-Payout Error]', transferData);
      return {
        status: 'failed' as const,
        metadata: {
          error: transferData.message || 'Transfer initiation failed',
          rawResponse: transferData
        }
      };
    }

    return {
      status: 'completed' as const,
      metadata: {
        payoutMethod: 'flutterwave_automatic',
        flutterwaveTransfer: {
          transferId: transferData.data?.id || null,
          status: transferData.data?.status || 'unknown',
          fee: transferData.data?.fee || 0,
          rawResponse: transferData
        }
      }
    };
  } catch (err: any) {
    console.error('[Flutterwave Auto-Payout Exception]', err);
    return {
      status: 'failed' as const,
      metadata: {
        error: err.message || 'Connection failed',
        notes: 'Payout connection exception.'
      }
    };
  }
}
