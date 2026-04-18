'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';

/** Map each role to its home dashboard */
const ROLE_DASHBOARD: Record<string, string> = {
  vendor: '/dashboard/vendor',
  brand: '/dashboard/brand',
  admin: '/admin/dashboard',
  logistics: '/logistics/dashboard',
  customer: '/dashboard/customer',
};

function getDashboard(role?: string) {
  return ROLE_DASHBOARD[role ?? ''] ?? '/dashboard/customer';
}

// ─── Inner form — needs useSearchParams so must be inside <Suspense> ─────────

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') ?? '';
  const { login, isLoading, error, clearError } = useAuth();

  const [formData, setFormData] = useState({ email: '', password: '', rememberMe: false });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setFormData((prev) => ({ ...prev, [e.target.name]: value }));
    // Clear field-level error as user types
    if (fieldErrors[e.target.name]) {
      setFieldErrors((prev) => ({ ...prev, [e.target.name]: '' }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setFieldErrors({});

    // Basic client-side validation before hitting the network
    const errs: Record<string, string> = {};
    if (!formData.email) errs.email = 'Email is required';
    if (!formData.password) errs.password = 'Password is required';
    if (Object.keys(errs).length) {
      setFieldErrors(errs);
      return;
    }

    const success = await login(formData.email, formData.password);

    if (success) {
      // storeUser has already run synchronously inside login()
      const storedUser = JSON.parse(localStorage.getItem('user') ?? '{}');
      router.push(redirect || getDashboard(storedUser.role));
    }
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-cool-gray-50 via-white to-gold-50 dark:from-charcoal-950 dark:via-charcoal-900 dark:to-charcoal-800 flex items-center justify-center px-4 py-12 transition-colors duration-200">
      <div className="max-w-md w-full">

        {/* Heading */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex flex-col items-center gap-2 mb-4">
            <div className="w-12 h-12 rounded-xl overflow-hidden border border-gold-500/30 shadow-md">
              <Image
                src="/images/brand/clw-icon.jpg"
                alt="CLW"
                width={48}
                height={48}
                className="w-full h-full object-cover object-center"
              />
            </div>
            <Image
              src="/images/brand/clw-logo.jpg"
              alt="Certified Luxury World"
              width={130}
              height={36}
              className="hidden dark:inline h-6 w-auto object-contain"
            />
          </Link>
          <h1 className="text-3xl font-display font-bold text-charcoal-900 dark:text-white mb-2">
            Welcome Back
          </h1>
          <p className="text-cool-gray-500 dark:text-cool-gray-400 text-sm">
            Sign in to your account
          </p>
        </div>

        <div className="bg-white dark:bg-charcoal-800 rounded-2xl shadow-xl dark:shadow-charcoal-950/50 p-8">

          {/* Email / Password Form */}
          <form onSubmit={handleSubmit} className="space-y-5" noValidate>

            {/* Global error from AuthContext */}
            {error && (
              <div className="flex items-start gap-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-xl text-sm">
                <span className="shrink-0 mt-0.5">⚠️</span>
                <span>{error}</span>
              </div>
            )}

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-charcoal-700 dark:text-cool-gray-300 mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                autoComplete="email"
                required
                className={`w-full px-4 py-2.5 border rounded-xl bg-white dark:bg-charcoal-900 text-charcoal-900 dark:text-white placeholder-cool-gray-400 dark:placeholder-cool-gray-500 transition-colors focus:outline-none focus:ring-2 focus:ring-gold-500 dark:focus:ring-gold-600 focus:border-transparent ${
                  fieldErrors.email
                    ? 'border-red-400 dark:border-red-600'
                    : 'border-cool-gray-300 dark:border-charcoal-700'
                }`}
                placeholder="you@example.com"
              />
              {fieldErrors.email && (
                <p className="mt-1 text-xs text-red-600 dark:text-red-400">{fieldErrors.email}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="password" className="block text-sm font-medium text-charcoal-700 dark:text-cool-gray-300">
                  Password
                </label>
                <Link
                  href="/auth/forgot-password"
                  className="text-xs text-gold-600 dark:text-gold-400 hover:text-gold-700 dark:hover:text-gold-500 font-medium"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  autoComplete="current-password"
                  required
                  className={`w-full px-4 py-2.5 pr-11 border rounded-xl bg-white dark:bg-charcoal-900 text-charcoal-900 dark:text-white placeholder-cool-gray-400 dark:placeholder-cool-gray-500 transition-colors focus:outline-none focus:ring-2 focus:ring-gold-500 dark:focus:ring-gold-600 focus:border-transparent ${
                    fieldErrors.password
                      ? 'border-red-400 dark:border-red-600'
                      : 'border-cool-gray-300 dark:border-charcoal-700'
                  }`}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-cool-gray-400 hover:text-charcoal-700 dark:hover:text-white transition-colors text-sm font-medium select-none"
                  tabIndex={-1}
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
              {fieldErrors.password && (
                <p className="mt-1 text-xs text-red-600 dark:text-red-400">{fieldErrors.password}</p>
              )}
            </div>

            {/* Remember Me */}
            <div className="flex items-center gap-2">
              <input
                id="rememberMe"
                name="rememberMe"
                type="checkbox"
                checked={formData.rememberMe}
                onChange={handleChange}
                className="h-4 w-4 text-gold-600 focus:ring-gold-500 border-cool-gray-300 dark:border-charcoal-700 rounded bg-white dark:bg-charcoal-900"
              />
              <label htmlFor="rememberMe" className="text-sm text-charcoal-700 dark:text-cool-gray-300">
                Remember me
              </label>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-charcoal-900 dark:bg-gold-600 text-white py-3 rounded-xl font-semibold hover:bg-charcoal-800 dark:hover:bg-gold-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                  Signing in…
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          {/* Sign Up link */}
          <p className="mt-6 text-center text-sm text-cool-gray-600 dark:text-cool-gray-400">
            Don&apos;t have an account?{' '}
            <Link
              href="/auth/signup"
              className="text-gold-600 dark:text-gold-400 hover:text-gold-700 dark:hover:text-gold-500 font-semibold"
            >
              Sign Up
            </Link>
          </p>

          {/* Role sign-up shortcuts */}
          <div className="mt-4 pt-4 border-t border-cool-gray-100 dark:border-charcoal-700 flex flex-col sm:flex-row gap-2 text-xs text-center">
            <Link href="/become-vendor" className="flex-1 py-2 rounded-lg bg-cool-gray-50 dark:bg-charcoal-700 text-charcoal-600 dark:text-cool-gray-400 hover:text-gold-600 dark:hover:text-gold-400 transition-colors font-medium">
              🏪 Become a Vendor
            </Link>
            <Link href="/become-brand" className="flex-1 py-2 rounded-lg bg-cool-gray-50 dark:bg-charcoal-700 text-charcoal-600 dark:text-cool-gray-400 hover:text-gold-600 dark:hover:text-gold-400 transition-colors font-medium">
              👑 Register a Brand
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Page wrapper with Suspense (required for useSearchParams) ────────────────

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-cool-gray-50 dark:bg-charcoal-950">
          <div className="animate-spin w-8 h-8 border-4 border-gold-600 border-t-transparent rounded-full" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}

