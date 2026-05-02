'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { setAuthSession } from '@/lib/api/auth';

export default function BrandLoginPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
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
        body: JSON.stringify({ email: formData.email, password: formData.password }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        // Unverified email — redirect to verification page with resend option
        if (data.errors?.requiresEmailVerification === 'true') {
          const email = data.errors?.email || formData.email;
          router.push(`/auth/verify-email/pending?email=${encodeURIComponent(email)}&role=brand`);
          return;
        }
        setError(data.message || 'Invalid email or password.');
        return;
      }

      // Store credentials and redirect
      const u = data.data.user;
      setAuthSession(data.data.token, {
        id: u.id,
        email: u.email,
        username: u.email?.split('@')[0] ?? '',
        role: u.role,
        fullName: `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim(),
        firstName: u.firstName,
        lastName: u.lastName,
        avatar: u.avatar ?? undefined,
        isEmailVerified: u.isEmailVerified,
      });

      router.push('/dashboard/brand');
    } catch {
      setError('Network error. Please check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-charcoal-950 flex flex-col items-center justify-center p-4">
      {/* Subtle gold glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,#b8962e18_0%,transparent_55%)] pointer-events-none" />

      <div className="relative w-full max-w-md">
        {/* Brand logo + wordmark */}
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
              <p className="text-cool-gray-500 text-xs tracking-[0.2em] uppercase">Brand Owner Portal</p>
            </div>
          </Link>
        </div>

        {/* Card */}
        <div className="bg-charcoal-900 border border-charcoal-700 rounded-3xl shadow-2xl overflow-hidden">
          <div className="h-1 w-full bg-linear-to-r from-gold-700 via-gold-500 to-gold-700" />
            <div className="p-8">
          <h1 className="text-2xl font-bold text-white mb-1 text-center">👑 Sign In</h1>
          <p className="text-cool-gray-500 text-sm text-center mb-7">Access your brand management portal</p>
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="bg-red-900/20 border border-red-700/40 rounded-xl p-3">
                <p className="text-sm text-red-400">⚠️ {error}</p>
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold text-cool-gray-300 mb-2">
                Brand Email
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="admin@brandname.com"
                required
                className="w-full px-4 py-3 bg-charcoal-800 border border-charcoal-600 text-white rounded-xl focus:ring-2 focus:ring-gold-500 focus:border-transparent outline-none placeholder:text-cool-gray-600"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-cool-gray-300 mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Enter your password"
                  required
                  className="w-full px-4 py-3 bg-charcoal-800 border border-charcoal-600 text-white rounded-xl focus:ring-2 focus:ring-gold-500 focus:border-transparent outline-none placeholder:text-cool-gray-600 pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-cool-gray-500 hover:text-cool-gray-300"
                >
                  {showPassword ? '👁️' : '👁️‍🗨️'}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <Link href="/auth/brand/forgot-password" className="text-sm text-gold-500 hover:text-gold-400 font-semibold">
                Forgot password?
              </Link>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 bg-linear-to-r from-gold-700 to-gold-500 hover:from-gold-600 hover:to-gold-400 text-charcoal-950 font-bold rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-gold-900/30"
            >
              {isLoading ? '🔄 Signing in...' : 'Sign In to Brand Portal'}
            </button>
          </form>

          <div className="mt-5 border-t border-charcoal-800 pt-5 text-center">
            <p className="text-sm text-cool-gray-500">
              Don&apos;t have a brand account?{' '}
              <Link href="/auth/brand/signup" className="text-gold-500 hover:text-gold-400 font-semibold">
                Apply now
              </Link>
            </p>
          </div>
          </div>{/* /p-8 */}
        </div>{/* /card */}

        <div className="mt-6 text-center space-y-2">
          <p className="text-sm text-cool-gray-600">
            <Link href="/auth/customer/login" className="hover:text-cool-gray-400 transition-colors">
              ← Customer Login
            </Link>
            {' | '}
            <Link href="/auth/vendor/login" className="hover:text-cool-gray-400 transition-colors">
              Vendor Login
            </Link>
          </p>
        </div>

        <p className="mt-6 text-center text-xs text-cool-gray-700">
          © {new Date().getFullYear()} CLW · Certified Luxury World
        </p>
      </div>
    </div>
  );
}
