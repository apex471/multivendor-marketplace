import { NextRequest } from 'next/server';
import { sendSuccess, sendError } from '@/backend/utils/responseAppRouter';

const MAJOR_NG_BANKS = [
  { code: '044', name: 'Access Bank' },
  { code: '058', name: 'GTBank (Guaranty Trust Bank)' },
  { code: '033', name: 'United Bank for Africa (UBA)' },
  { code: '011', name: 'First Bank of Nigeria' },
  { code: '057', name: 'Zenith Bank' },
  { code: '214', name: 'FCMB (First City Monument Bank)' },
  { code: '070', name: 'Fidelity Bank' },
  { code: '050', name: 'Ecobank Nigeria' },
  { code: '082', name: 'Keystone Bank' },
  { code: '030', name: 'Heritage Bank' },
  { code: '076', name: 'Polaris Bank' },
  { code: '221', name: 'Stanbic IBTC Bank' },
  { code: '068', name: 'Standard Chartered Bank' },
  { code: '232', name: 'Sterling Bank' },
  { code: '100', name: 'SunTrust Bank' },
  { code: '032', name: 'Union Bank of Nigeria' },
  { code: '035', name: 'Wema Bank' },
  { code: '057', name: 'Zenith Bank' },
  { code: '090110', name: 'VFD Microfinance Bank' },
  { code: '090267', name: 'Kuda Bank' },
  { code: '090175', name: 'Rubies MFB' },
  { code: '100004', name: 'Opay' },
  { code: '999992', name: 'OPay Digital Services' },
  { code: '100002', name: 'Paga' },
  { code: '100003', name: 'Palmpay' },
  { code: '50211', name: 'Kuda Microfinance Bank' },
  { code: '090405', name: 'Moniepoint MFB' }
];

export async function GET(request: NextRequest) {
  try {
    const flwSecretKey = process.env.FLUTTERWAVE_SECRET_KEY;
    if (!flwSecretKey) {
      return sendSuccess(MAJOR_NG_BANKS, 'List of banks fetched successfully (Simulated)');
    }

    const res = await fetch('https://api.flutterwave.com/v3/banks/NG', {
      headers: { Authorization: `Bearer ${flwSecretKey}` }
    });
    const data = await res.json();

    if (data.status === 'success' && Array.isArray(data.data)) {
      const banks = data.data.map((b: any) => ({
        code: b.code,
        name: b.name
      }));
      // Sort alphabetically by name
      banks.sort((a: any, b: any) => a.name.localeCompare(b.name));
      return sendSuccess(banks, 'List of banks fetched successfully');
    }

    return sendSuccess(MAJOR_NG_BANKS, 'List of banks fetched successfully (Fallback)');
  } catch (err: any) {
    console.error('[Banks API] Error:', err);
    return sendSuccess(MAJOR_NG_BANKS, 'List of banks fetched successfully (Exception Fallback)');
  }
}
