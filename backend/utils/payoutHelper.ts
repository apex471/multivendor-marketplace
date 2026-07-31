export async function getBankCode(bankName: string, flwSecretKey: string): Promise<string | null> {
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
