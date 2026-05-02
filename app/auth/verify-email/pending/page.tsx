'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState, useRef, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { setAuthSession } from '@/lib/api/auth';

function normalizeUser(u: Record<string, unknown>) {
  return {
    id: u.id,
    email: u.email,
    username: (u.email as string | undefined)?.split('@')[0] ?? '',
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
  const emailWarning = searchParams.get('emailWarning') === '1';

  const [codes, setCodes] = useState(['', '', '', '', '', '']);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const [verifyStatus, setVerifyStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [verifyError, setVerifyError] = useState('');

  const [resendStatus, setResendStatus] = useState<'idle' | 'loading' | 'sent' | 'error'>('idle');
  const [resendError, setResendError] = useState('');

  /* ── OTP input handlers ─────────────────────────────────────────────────── */
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

  /* ── Submit OTP ─────────────────────────────────────────────────────────── */
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
          userRole === 'customer'  ? '/dashboard/customer'  :
          userRole === 'brand'     ? '/dashboard/brand'     :
          userRole === 'logistics' ? '/logistics/dashboard'  :
          '/dashboard/vendor';
        setTimeout(() => router.push(dashPath), 1800);
      } else {
        setVerifyStatus('error');
        setVerifyError(data.message || 'Invalid code. Please try again.');
        setCodes(['', '', '', '', '', '']);
        setTimeout(() => inputRefs.current[0]?.focus(), 50);
      }
    } catch {
      setVerifyStatus('error');
      setVerifyError('Network error. Please check your connection.');
    }
  }, [codes, email, role, router]);

  /* ── Resend code ────────────────────────────────────────────────────────── */
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
    role === 'brand'     ? '/auth/brand/login'     :
    role === 'customer'  ? '/auth/customer/login'   :
    role === 'logistics' ? '/auth/logistics'         :
    '/auth/vendor/login';

  const codeComplete = codes.every((c) => c !== '');

  /* ── Success screen ─────────────────────────────────────────────────────── */
  if (verifyStatus === 'success') {
    return (
      <div className="min-h-screen bg-charcoal-950 flex items-center justify-center p-4">
        {/* Gold shimmer background */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,#b8962e22_0%,transparent_60%)]" />
        <div className="relative w-full max-w-md text-center">
          <div className="bg-charcoal-900 border border-gold-600/40 rounded-3xl shadow-2xl p-10">
            <div className="w-20 h-20 bg-gold-600/10 border-2 border-gold-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-4xl">✅</span>
            </div>
            <h1 className="text-2xl font-bold text-white mb-3">Email Verified!</h1>
            <p className="text-cool-gray-400 mb-2">Welcome to <span className="text-gold-500 font-semibold">CLW Marketplace</span></p>
            <p className="text-cool-gray-500 text-sm">Taking you to your dashboard…</p>
            <div className="mt-6 flex justify-center gap-1">
              {[0,1,2].map(i => (
                <div key={i} className="w-2 h-2 bg-gold-500 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ── Main OTP screen ────────────────────────────────────────────────────── */
  return (
    <div className="min-h-screen bg-charcoal-950 flex flex-col items-center justify-center p-4">
      {/* Subtle gold radial glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,#b8962e18_0%,transparent_55%)] pointer-events-none" />

      <div className="relative w-full max-w-md">

        {/* ── Brand logo & wordmark ── */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex flex-col items-center gap-3 group">
            <div className="relative w-16 h-16">
              <Image
                src="/images/brand/clw-logo.png"
                alt="CLW Marketplace"
                fill
                className="object-contain drop-shadow-lg group-hover:scale-105 transition-transform duration-200"
                priority
              />
            </div>
            <div>
              <p className="text-gold-500 font-bold text-xl tracking-widest uppercase">CLW</p>
              <p className="text-cool-gray-500 text-xs tracking-[0.2em] uppercase">Certified Luxury World</p>
            </div>
          </Link>
        </div>

        {/* ── Card ── */}
        <div className="bg-charcoal-900 border border-charcoal-700 rounded-3xl shadow-2xl overflow-hidden">

          {/* Card header strip */}
          <div className="h-1 w-full bg-linear-to-r from-gold-700 via-gold-500 to-gold-700" />

          <div className="p-8 text-center">

            {/* Icon */}
            <div className="w-16 h-16 bg-gold-600/10 border border-gold-600/30 rounded-2xl flex items-center justify-center mx-auto mb-5">
              <span className="text-3xl">📨</span>
            </div>

            <h1 className="text-2xl font-bold text-white mb-2">
              Verify Your Email
            </h1>
            <p className="text-cool-gray-400 text-sm mb-1">
              We sent a 6-digit code to:
            </p>
            {email && (
              <p className="text-gold-400 font-semibold text-sm mb-6 break-all">{email}</p>
            )}

            {/* ── Email delivery warning ── */}
            {emailWarning && (
              <div className="mb-5 bg-amber-900/20 border border-amber-600/40 text-amber-300 rounded-xl px-4 py-3 text-sm text-left">
                <p className="font-semibold mb-1">⚠️ Email may not have been delivered</p>
                <p className="text-amber-400/80">Use the <strong className="text-amber-300">Resend Code</strong> button below, or contact support.</p>
              </div>
            )}

            {/* ── 6-digit OTP inputs ── */}
            <div className="flex gap-2.5 justify-center mb-5" onPaste={handlePaste}>
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
                  className={`w-11 h-14 text-center text-2xl font-bold border-2 rounded-xl outline-none transition-all duration-150
                    ${digit
                      ? 'border-gold-500 bg-gold-900/20 text-gold-300'
                      : 'border-charcoal-600 bg-charcoal-800 text-white'}
                    focus:border-gold-400 focus:ring-2 focus:ring-gold-500/30 focus:bg-gold-900/10`}
                />
              ))}
            </div>

            {/* Error */}
            {verifyStatus === 'error' && (
              <div className="mb-4 bg-red-900/20 border border-red-700/40 rounded-lg px-4 py-2.5">
                <p className="text-red-400 text-sm font-medium">{verifyError}</p>
              </div>
            )}

            {/* Verify button */}
            <button
              onClick={handleVerify}
              disabled={!codeComplete || verifyStatus === 'loading'}
              className="w-full py-3.5 px-6 bg-linear-to-r from-gold-700 to-gold-500 hover:from-gold-600 hover:to-gold-400 disabled:opacity-40 disabled:cursor-not-allowed text-charcoal-950 font-bold rounded-xl transition-all duration-200 shadow-lg shadow-gold-900/30 mb-2 text-sm tracking-wide uppercase"
            >
              {verifyStatus === 'loading' ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-charcoal-800/40 border-t-charcoal-900 rounded-full animate-spin" />
                  Verifying…
                </span>
              ) : 'Verify Account'}
            </button>

            <p className="text-xs text-cool-gray-600 mb-6">
              Code expires in <strong className="text-cool-gray-500">10 minutes</strong>
            </p>

            {/* Resend section */}
            <div className="border-t border-charcoal-700 pt-5">
              <p className="text-sm text-cool-gray-500 mb-3">
                Didn&apos;t receive it? Check your spam folder, or:
              </p>

              {resendStatus === 'sent' ? (
                <div className="bg-green-900/20 border border-green-700/40 rounded-xl px-4 py-3">
                  <p className="text-green-400 font-semibold text-sm">✅ New code sent — check your inbox.</p>
                </div>
              ) : (
                <>
                  <button
                    onClick={handleResend}
                    disabled={resendStatus === 'loading' || !email}
                    className="w-full py-2.5 px-6 border border-gold-600/50 hover:border-gold-500 hover:bg-gold-900/10 disabled:opacity-40 text-gold-400 hover:text-gold-300 font-semibold rounded-xl transition-all duration-200 text-sm"
                  >
                    {resendStatus === 'loading' ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="w-3.5 h-3.5 border-2 border-gold-600/40 border-t-gold-400 rounded-full animate-spin" />
                        Sending…
                      </span>
                    ) : '↺ Resend Code'}
                  </button>
                  {resendStatus === 'error' && (
                    <p className="mt-2 text-sm text-red-400">{resendError}</p>
                  )}
                </>
              )}
            </div>

            {/* Footer links */}
            <div className="mt-5 flex items-center justify-center gap-4 text-xs">
              <Link href={loginPath} className="text-cool-gray-600 hover:text-gold-400 transition-colors">
                ← Back to Login
              </Link>
              <span className="text-charcoal-700">|</span>
              <Link href="/" className="text-cool-gray-600 hover:text-gold-400 transition-colors">
                Go to Home
              </Link>
            </div>
          </div>
        </div>

        {/* Dev hint */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-4 p-3.5 bg-amber-900/20 rounded-xl border border-amber-700/30">
            <p className="text-amber-400/80 text-xs text-center">
              🛠️ <strong className="text-amber-300">Dev mode</strong> — check the <strong className="text-amber-300">server console</strong> for your 6-digit code.
            </p>
          </div>
        )}

        {/* Footer brand line */}
        <p className="mt-6 text-center text-xs text-cool-gray-700">
          © {new Date().getFullYear()} CLW · Certified Luxury World · All rights reserved
        </p>
      </div>
    </div>
  );
}

export default function VerifyEmailPendingPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-charcoal-950 flex items-center justify-center">
          <div className="text-center">
            <div className="w-12 h-12 border-2 border-charcoal-700 border-t-gold-500 rounded-full animate-spin mx-auto mb-4" />
            <p className="text-cool-gray-500 text-sm">Loading…</p>
          </div>
        </div>
      }
    >
      <VerifyEmailPendingContent />
    </Suspense>
  );
}
