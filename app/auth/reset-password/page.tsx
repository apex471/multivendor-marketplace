'use client';

import { useState, Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import Header from '@/components/common/Header';
import Footer from '@/components/common/Footer';

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';
  const email = searchParams.get('email') || '';
  const role = searchParams.get('role') || '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const loginLink = role ? `/auth/${role}/login` : '/auth/login';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!token) {
      setErrorMessage('Missing password reset token. Please request a new link.');
      return;
    }

    if (password.length < 8) {
      setErrorMessage('Password must be at least 8 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, email, password }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMessage(data.message || 'Failed to reset password. The link may have expired.');
      } else {
        setSuccess(true);
      }
    } catch {
      setErrorMessage('A network error occurred. Please check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto p-6 sm:p-8 bg-white dark:bg-charcoal-800 rounded-2xl shadow-xl border border-cool-gray-200 dark:border-charcoal-700">
      <div className="text-center mb-8">
        <Link href="/" className="inline-block mb-4">
          <div className="relative w-16 h-16 mx-auto">
            <Image
              src="/icon.png"
              alt="Certified Luxury World"
              fill
              className="object-contain"
              priority
            />
          </div>
        </Link>
        <h1 className="text-2xl font-bold text-charcoal-900 dark:text-white">
          {success ? 'Password Reset Complete' : 'Set New Password'}
        </h1>
        <p className="text-sm text-cool-gray-500 dark:text-cool-gray-400 mt-2">
          {success
            ? 'Your password has been securely updated. You can now log in.'
            : 'Enter and confirm your new secure password below.'}
        </p>
      </div>

      {success ? (
        <div className="space-y-6">
          <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl text-center">
            <span className="text-4xl block mb-2">🎉</span>
            <p className="text-sm text-green-900 dark:text-green-200 font-semibold">
              Success! Your password has been changed.
            </p>
          </div>

          <Link
            href={loginLink}
            className="block w-full py-3.5 px-4 bg-gold-600 hover:bg-gold-700 text-white text-center rounded-xl text-sm font-semibold transition-colors shadow-lg shadow-gold-600/20"
          >
            Sign In with New Password &rarr;
          </Link>
        </div>
      ) : !token ? (
        <div className="space-y-6 text-center">
          <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
            <p className="text-sm text-amber-800 dark:text-amber-200 font-medium">
              Invalid or missing reset link. Please submit a new password reset request.
            </p>
          </div>
          <Link
            href="/auth/forgot-password"
            className="block w-full py-3.5 px-4 bg-gold-600 hover:bg-gold-700 text-white rounded-xl text-sm font-semibold transition-colors shadow-md shadow-gold-600/20"
          >
            Request New Reset Link
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          {errorMessage && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400 text-xs">
              {errorMessage}
            </div>
          )}

          <div>
            <label
              htmlFor="password"
              className="block text-xs font-bold uppercase tracking-wider text-charcoal-700 dark:text-cool-gray-300 mb-1.5"
            >
              New Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                className="w-full px-4 py-3 bg-cool-gray-50 dark:bg-charcoal-900 border border-cool-gray-300 dark:border-charcoal-700 rounded-xl text-sm text-charcoal-900 dark:text-white placeholder-cool-gray-400 focus:outline-none focus:ring-2 focus:ring-gold-500 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-cool-gray-400 hover:text-charcoal-600 dark:hover:text-cool-gray-200 text-xs"
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>

          <div>
            <label
              htmlFor="confirmPassword"
              className="block text-xs font-bold uppercase tracking-wider text-charcoal-700 dark:text-cool-gray-300 mb-1.5"
            >
              Confirm New Password
            </label>
            <input
              id="confirmPassword"
              type={showPassword ? 'text' : 'password'}
              required
              minLength={8}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter your new password"
              className="w-full px-4 py-3 bg-cool-gray-50 dark:bg-charcoal-900 border border-cool-gray-300 dark:border-charcoal-700 rounded-xl text-sm text-charcoal-900 dark:text-white placeholder-cool-gray-400 focus:outline-none focus:ring-2 focus:ring-gold-500"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 px-4 bg-gold-600 hover:bg-gold-700 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition-colors shadow-lg shadow-gold-600/20 flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Resetting Password...</span>
              </>
            ) : (
              'Reset Password & Continue'
            )}
          </button>

          <div className="text-center pt-2">
            <Link
              href={loginLink}
              className="text-xs font-semibold text-gold-600 dark:text-gold-400 hover:underline"
            >
              &larr; Cancel and return to Sign In
            </Link>
          </div>
        </form>
      )}
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen bg-cool-gray-50 dark:bg-charcoal-900 flex flex-col justify-between">
      <Header />
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <Suspense
          fallback={
            <div className="flex justify-center items-center py-20">
              <div className="w-8 h-8 border-4 border-gold-600 border-t-transparent rounded-full animate-spin" />
            </div>
          }
        >
          <ResetPasswordContent />
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}

