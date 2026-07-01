'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { setAuthSession } from '@/lib/api/auth';

export default function LogisticsLoginPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email.trim().toLowerCase(),
          password: formData.password,
        }),
      });

      const contentType = res.headers.get('content-type') ?? '';
      if (!contentType.includes('application/json')) {
        setError(`Server error (${res.status}). Please try again.`);
        return;
      }

      const data = await res.json();

      if (!res.ok || !data.success) {
        // Email not yet verified — guard anyway
        if (data.errors?.requiresEmailVerification === 'true') {
          setError('Your email is not yet verified. Please contact support.');
          return;
        }
        setError(data.message || 'Invalid email or password.');
        return;
      }

      const u = data.data.user;

      // Guard: only logistics role may enter this portal
      if (u.role !== 'logistics') {
        setError(
          'This portal is for logistics providers only. Please use the correct login page for your role.'
        );
        return;
      }

      // Store session and redirect
      setAuthSession(data.data.token, {
        id:              u.id,
        email:           u.email,
        username:        u.email?.split('@')[0] ?? '',
        role:            u.role,
        fullName:        `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim(),
        firstName:       u.firstName,
        lastName:        u.lastName,
        avatar:          u.avatar ?? undefined,
        isEmailVerified: u.isEmailVerified,
      });

      router.push('/logistics/dashboard');
    } catch {
      setError('Network error. Please check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-charcoal-950 via-charcoal-900 to-charcoal-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-gold-500 to-gold-700 rounded-2xl mb-4 shadow-lg shadow-gold-900/40">
            <span className="text-3xl">🚚</span>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Dispatch Portal</h1>
          <p className="text-cool-gray-400 text-sm">Sign in to your logistics provider account</p>
        </div>

        {/* Card */}
        <div className="bg-charcoal-800 border border-charcoal-700 rounded-2xl shadow-2xl p-8">
          <form onSubmit={handleSubmit} className="space-y-5" noValidate>

            {/* Error banner */}
            {error && (
              <div className="flex items-start gap-3 bg-red-900/30 border border-red-700 rounded-xl px-4 py-3 text-sm text-red-300">
                <span className="shrink-0 mt-0.5">⚠️</span>
                <span>{error}</span>
              </div>
            )}

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-cool-gray-300 mb-1.5">
                Business Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="ops@yourcompany.com"
                className="w-full px-4 py-2.5 bg-charcoal-700 border border-charcoal-600 text-white placeholder-cool-gray-500 rounded-xl focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-transparent transition-colors"
              />
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-cool-gray-300 mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="••••••••"
                  className="w-full px-4 py-2.5 pr-16 bg-charcoal-700 border border-charcoal-600 text-white placeholder-cool-gray-500 rounded-xl focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-transparent transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-cool-gray-400 hover:text-white transition-colors font-medium select-none"
                  tabIndex={-1}
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gold-600 hover:bg-gold-700 active:scale-[.98] text-white py-3 rounded-xl font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                  Signing in…
                </>
              ) : (
                'Sign In to Dispatch Portal'
              )}
            </button>
          </form>

          {/* Info box for pending accounts */}
          <div className="mt-6 bg-charcoal-700/50 border border-charcoal-600 rounded-xl p-4 text-sm text-cool-gray-400">
            <p className="font-semibold text-cool-gray-300 mb-1">⏳ Account under review?</p>
            <p>
              Newly registered logistics providers can sign in while awaiting admin approval.
              You will be notified once approved and can start accepting deliveries.
            </p>
          </div>
        </div>

        {/* Footer links */}
        <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3 text-sm">
          <Link href="/" className="text-cool-gray-400 hover:text-white transition-colors">
            ← Back to Home
          </Link>
          <span className="text-charcoal-600 hidden sm:block">|</span>
          <p className="text-cool-gray-500">
            Not registered?{' '}
            <span className="text-cool-gray-400">
              Request an invitation from a verified vendor or brand owner.
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
