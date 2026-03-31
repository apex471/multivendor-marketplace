'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';

export default function CustomerLoginPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const { login, isLoading, error: authError, clearError } = useAuth();
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    clearError();

    if (!formData.email || !formData.password) {
      setError('Please enter your email and password');
      return;
    }

    const success = await login(formData.email, formData.password);
    if (success) {
      router.push('/dashboard/customer');
    }
    // authError is set inside AuthContext and rendered via {error || authError} below
  };

  return (
    <div className="min-h-screen bg-white dark:bg-charcoal-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-block">
            <div className="text-4xl font-bold text-gold-600 mb-2">Fashion Marketplace</div>
          </Link>
          <h1 className="text-2xl font-bold text-charcoal-900 dark:text-white mb-2">Welcome Back!</h1>
          <p className="text-charcoal-600 dark:text-cool-gray-400">Sign in to continue shopping</p>
        </div>

        {/* Login Form */}
        <div className="bg-white dark:bg-charcoal-800 border border-cool-gray-300 dark:border-charcoal-700 rounded-2xl shadow-xl p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {(error || authError) && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                <p className="text-sm text-red-800 dark:text-red-400">&#9888;&#65039; {error || authError}</p>
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold text-charcoal-900 dark:text-white mb-2">
                Email Address
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="you@example.com"
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
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 text-gold-600 rounded"
                />
                <span className="text-sm text-charcoal-700 dark:text-cool-gray-300">Remember me</span>
              </label>
              <Link href="/auth/customer/forgot-password" className="text-sm text-gold-600 hover:text-gold-700 font-semibold">
                Forgot password?
              </Link>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-gold-600 text-white font-bold rounded-lg hover:bg-gold-700 transition-colors disabled:opacity-50"
            >
              {isLoading ? '🔄 Signing in...' : 'Sign In'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-charcoal-600 dark:text-cool-gray-400">
              Don't have an account?{' '}
              <Link href="/auth/customer/signup" className="text-gold-600 hover:text-gold-700 font-semibold">
                Sign up
              </Link>
            </p>
          </div>


        </div>

        <div className="mt-6 text-center space-y-2">
          <p className="text-sm text-charcoal-600 dark:text-cool-gray-400">
            Are you a seller?{' '}
            <Link href="/auth/vendor/login" className="text-gold-600 hover:text-gold-700 font-semibold">
              Vendor Login
            </Link>
            {' | '}
            <Link href="/auth/brand/login" className="text-gold-600 hover:text-gold-700 font-semibold">
              Brand Login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
