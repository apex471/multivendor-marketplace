'use client';

import { useState, Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import Header from '@/components/common/Header';
import Footer from '@/components/common/Footer';

function ForgotPasswordContent() {
  const searchParams = useSearchParams();
  const roleParam = searchParams.get('role') || '';

  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const loginLink = roleParam
    ? `/auth/${roleParam}/login`
    : '/auth/login';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes('@')) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, role: roleParam || undefined }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMessage(data.message || 'Unable to send reset instructions. Please try again.');
      } else {
        setSubmitted(true);
      }
    } catch {
      setErrorMessage('A network error occurred. Please check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto p-6 sm:p-8 bg-white dark:bg-charcoal-800 rounded-2xl shadow-xl border border-cool-gray-200 dark:border-charcoal-700">
      {/* Brand Logo & Title */}
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
          {submitted ? 'Check Your Inbox' : 'Reset Your Password'}
        </h1>
        <p className="text-sm text-cool-gray-500 dark:text-cool-gray-400 mt-2">
          {submitted
            ? `We sent reset instructions to ${email}`
            : 'Enter the email linked to your account and we will send you a secure link to reset your password.'}
        </p>
      </div>

      {submitted ? (
        <div className="space-y-6">
          <div className="p-4 bg-gold-50 dark:bg-gold-900/20 border border-gold-200 dark:border-gold-800 rounded-xl text-center">
            <span className="text-3xl block mb-2">✉️</span>
            <p className="text-sm text-gold-900 dark:text-gold-200 font-medium">
              A password reset link is on its way. The link is valid for <strong>1 hour</strong>.
            </p>
            <p className="text-xs text-cool-gray-500 dark:text-cool-gray-400 mt-2">
              Don’t see it? Please check your spam or promotions folder.
            </p>
          </div>

          <div className="space-y-3">
            <button
              onClick={() => {
                setSubmitted(false);
                setEmail('');
              }}
              className="w-full py-3 px-4 border border-cool-gray-300 dark:border-charcoal-600 rounded-xl text-sm font-semibold text-charcoal-700 dark:text-cool-gray-200 hover:bg-cool-gray-50 dark:hover:bg-charcoal-700 transition-colors"
            >
              Try another email
            </button>

            <Link
              href={loginLink}
              className="block w-full py-3 px-4 bg-gold-600 hover:bg-gold-700 text-white text-center rounded-xl text-sm font-semibold transition-colors shadow-md shadow-gold-600/20"
            >
              Back to Sign In
            </Link>
          </div>
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
              htmlFor="email"
              className="block text-xs font-bold uppercase tracking-wider text-charcoal-700 dark:text-cool-gray-300 mb-1.5"
            >
              Email Address
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
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
                <span>Sending Reset Link...</span>
              </>
            ) : (
              'Send Password Reset Link'
            )}
          </button>

          <div className="text-center pt-2">
            <Link
              href={loginLink}
              className="text-xs font-semibold text-gold-600 dark:text-gold-400 hover:underline"
            >
              &larr; Remember your password? Sign In
            </Link>
          </div>
        </form>
      )}
    </div>
  );
}

export default function ForgotPasswordPage() {
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
          <ForgotPasswordContent />
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}
