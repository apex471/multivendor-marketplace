'use client';

import Link from 'next/link';
import { useState, useRef, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { setAuthSession } from '@/lib/api/auth';

function normalizeUser(u: any) {
  return {
    id: u.id,
    email: u.email,
    username: u.email?.split('@')[0] ?? '',
    role: u.role,
    fullName: `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim(),
    firstName: u.firstName,
    lastName: u.lastName,
    avatar: u.avatar ?? undefined,
    isEmailVerified: true,
  };
}

// useSearchParams() must be in a child component wrapped by <Suspense>
function VerifyEmailPendingContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const email = searchParams.get('email') || '';
  const role = searchParams.get('role') || 'vendor';

  const [codes, setCodes] = useState(['', '', '', '', '', '']);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const [verifyStatus, setVerifyStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [verifyError, setVerifyError] = useState('');

  const [resendStatus, setResendStatus] = useState<'idle' | 'loading' | 'sent' | 'error'>('idle');
  const [resendError, setResendError] = useState('');

  /* ── OTP input handlers ───────────────────────────────────── */
  const handleCodeChange = (index: number, value: string) => {
    const digit = value.replace(/\D/g, '').slice(-1);
    const newCodes = [...codes];
    newCodes[index] = digit;
    setCodes(newCodes);
    if (digit && index < 5) inputRefs.current[index + 1]?.focus();
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !codes[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length > 0) {
      const newCodes = ['', '', '', '', '', ''];
      pasted.split('').forEach((char, i) => { if (i < 6) newCodes[i] = char; });
      setCodes(newCodes);
      inputRefs.current[Math.min(pasted.length, 5)]?.focus();
    }
    e.preventDefault();
  };

  /* ── Submit OTP ───────────────────────────────────────────── */
  const handleVerify = useCallback(async () => {
    const code = codes.join('');
    if (code.length !== 6) return;

    setVerifyStatus('loading');
    setVerifyError('');

    try {
      const res = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setAuthSession(data.data.token, normalizeUser(data.data.user));
        setVerifyStatus('success');
        const userRole = data.data.user.role || role;
        const dashPath =
          userRole === 'customer'  ? '/dashboard/customer' :
          userRole === 'brand'     ? '/dashboard/brand'    :
          userRole === 'logistics' ? '/logistics/dashboard' :
          '/dashboard/vendor';
        setTimeout(() => router.push(dashPath), 1500);
      } else {
        setVerifyStatus('error');
        setVerifyError(data.message || 'Invalid code. Please try again.');
        // Clear inputs so user can retype
        setCodes(['', '', '', '', '', '']);
        setTimeout(() => inputRefs.current[0]?.focus(), 50);
      }
    } catch {
      setVerifyStatus('error');
      setVerifyError('Network error. Please check your connection.');
    }
  }, [codes, email, role, router]);

  /* ── Resend code ──────────────────────────────────────────── */
  const handleResend = async () => {
    if (!email) return;
    setResendStatus('loading');
    setResendError('');
    setCodes(['', '', '', '', '', '']);
    setVerifyStatus('idle');
    setVerifyError('');

    try {
      const res = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setResendError(data.message || 'Failed to resend. Please try again.');
        setResendStatus('error');
      } else {
        setResendStatus('sent');
        setTimeout(() => inputRefs.current[0]?.focus(), 100);
      }
    } catch {
      setResendError('Network error. Please check your connection.');
      setResendStatus('error');
    }
  };

  const loginPath =
    role === 'brand'     ? '/auth/brand/login'    :
    role === 'customer'  ? '/auth/customer/login'  :
    role === 'logistics' ? '/auth/logistics'        :
    '/auth/vendor/login';
  const codeComplete = codes.every((c) => c !== '');

  return (
    <div className="min-h-screen bg-linear-to-br from-purple-900 via-purple-800 to-purple-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">

        {/* Card */}
        <div className="bg-white dark:bg-charcoal-800 rounded-2xl shadow-2xl p-8 text-center">

          {/* ── Success state ── */}
          {verifyStatus === 'success' ? (
            <>
              <div className="text-7xl mb-6">✅</div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                Email Verified!
              </h1>
              <p className="text-gray-600 dark:text-cool-gray-400">
                Taking you to your dashboard…
              </p>
            </>
          ) : (
            <>
              <div className="text-6xl mb-5">📨</div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Enter verification code
              </h1>
              <p className="text-gray-500 dark:text-cool-gray-400 text-sm mb-1">
                We sent a 6-digit code to:
              </p>
              {email && (
                <p className="font-semibold text-purple-600 text-base mb-6 break-all">{email}</p>
              )}

              {/* ── 6-digit OTP inputs ── */}
              <div className="flex gap-2 justify-center mb-5" onPaste={handlePaste}>
                {codes.map((digit, i) => (
                  <input
                    key={i}
                    ref={(el) => { inputRefs.current[i] = el; }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleCodeChange(i, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(i, e)}
                    className={`w-11 h-14 text-center text-2xl font-bold border-2 rounded-xl outline-none transition-all
                      ${digit
                        ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300'
                        : 'border-gray-300 dark:border-charcoal-600 bg-white dark:bg-charcoal-700 text-gray-900 dark:text-white'}
                      focus:border-purple-500 focus:ring-2 focus:ring-purple-200 dark:focus:ring-purple-800`}
                  />
                ))}
              </div>

              {/* Error */}
              {verifyStatus === 'error' && (
                <p className="text-red-600 text-sm mb-3 font-medium">{verifyError}</p>
              )}

              {/* Verify button */}
              <button
                onClick={handleVerify}
                disabled={!codeComplete || verifyStatus === 'loading'}
                className="w-full py-3 px-6 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-lg transition-colors mb-2"
              >
                {verifyStatus === 'loading' ? '🔄 Verifying…' : '✅ Verify Account'}
              </button>

              {/* Expiry */}
              <p className="text-xs text-gray-400 dark:text-cool-gray-500 mb-6">
                Code expires in <strong>10 minutes</strong>
              </p>

              {/* Resend section */}
              <div className="border-t border-gray-200 dark:border-charcoal-700 pt-5">
                <p className="text-sm text-gray-500 dark:text-cool-gray-400 mb-3">
                  Didn&apos;t receive it? Check your spam folder, or:
                </p>

                {resendStatus === 'sent' ? (
                  <p className="text-green-600 font-semibold text-sm">
                    ✅ New code sent! Check your inbox.
                  </p>
                ) : (
                  <>
                    <button
                      onClick={handleResend}
                      disabled={resendStatus === 'loading' || !email}
                      className="w-full py-2.5 px-6 border border-purple-300 dark:border-purple-700 hover:bg-purple-50 dark:hover:bg-purple-900/20 disabled:opacity-50 text-purple-700 dark:text-purple-300 font-semibold rounded-lg transition-colors text-sm"
                    >
                      {resendStatus === 'loading' ? '🔄 Sending…' : '🔁 Resend Code'}
                    </button>
                    {resendStatus === 'error' && (
                      <p className="mt-2 text-sm text-red-600">{resendError}</p>
                    )}
                  </>
                )}
              </div>

              {/* Footer links */}
              <div className="mt-5 flex items-center justify-center gap-4 text-sm">
                <Link href={loginPath} className="text-gray-500 hover:text-purple-600 transition-colors">
                  ← Back to Login
                </Link>
                <span className="text-gray-300">|</span>
                <Link href="/" className="text-gray-500 hover:text-purple-600 transition-colors">
                  Go to Home
                </Link>
              </div>
            </>
          )}
        </div>

        {/* Dev hint */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-4 p-4 bg-yellow-900/50 rounded-xl border border-yellow-600/40">
            <p className="text-yellow-300 text-xs text-center">
              🛠️ <strong>Dev mode:</strong> No SMTP configured — check the <strong>server console</strong> for your 6-digit code.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function VerifyEmailPendingPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-linear-to-br from-purple-900 via-purple-800 to-purple-900 flex items-center justify-center">
          <div className="text-white text-center">
            <div className="text-4xl mb-3 animate-pulse">🔄</div>
            <p className="text-purple-200">Loading…</p>
          </div>
        </div>
      }
    >
      <VerifyEmailPendingContent />
    </Suspense>
  );
}

