'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

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

    setTimeout(() => {
      if (formData.email && formData.password) {
        localStorage.setItem('brandAuth', 'true');
        localStorage.setItem('userType', 'brand');
        router.push('/brand/dashboard');
      } else {
        setError('Please fill in all fields');
        setIsLoading(false);
      }
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gold-900 via-gold-800 to-gold-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-block p-4 bg-gold-600 rounded-2xl mb-4">
            <span className="text-4xl">👑</span>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Brand Portal</h1>
          <p className="text-gold-200">Premium brand management platform</p>
        </div>

        <div className="bg-white dark:bg-charcoal-800 rounded-2xl shadow-2xl p-8 border border-gold-500">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                <p className="text-sm text-red-800 dark:text-red-400">⚠️ {error}</p>
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold text-charcoal-900 dark:text-white mb-2">
                Brand Email
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="admin@brandname.com"
                required
                className="w-full px-4 py-3 bg-white dark:bg-charcoal-700 border border-cool-gray-300 dark:border-charcoal-600 text-charcoal-900 dark:text-white rounded-lg focus:ring-2 focus:ring-gold-500"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-charcoal-900 dark:text-white mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Enter your password"
                  required
                  className="w-full px-4 py-3 bg-white dark:bg-charcoal-700 border border-cool-gray-300 dark:border-charcoal-600 text-charcoal-900 dark:text-white rounded-lg focus:ring-2 focus:ring-gold-500 pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-charcoal-600 dark:text-cool-gray-400"
                >
                  {showPassword ? '👁️' : '👁️‍🗨️'}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <Link href="/auth/brand/forgot-password" className="text-sm text-gold-600 hover:text-gold-700 font-semibold">
                Forgot password?
              </Link>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-gold-600 text-white font-bold rounded-lg hover:bg-gold-700 transition-colors disabled:opacity-50"
            >
              {isLoading ? '🔄 Signing in...' : 'Sign In to Brand Portal'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-charcoal-600 dark:text-cool-gray-400">
              Don't have a brand account?{' '}
              <Link href="/auth/brand/signup" className="text-gold-600 hover:text-gold-700 font-semibold">
                Apply now
              </Link>
            </p>
          </div>
        </div>

        <div className="mt-6 text-center space-y-2">
          <p className="text-sm text-gold-200">
            <Link href="/auth/customer/login" className="hover:text-white font-semibold">
              ← Customer Login
            </Link>
            {' | '}
            <Link href="/auth/vendor/login" className="hover:text-white font-semibold">
              Vendor Login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
