'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || 'Invalid email or password');
        return;
      }

      const user = data.data?.user;
      const token = data.data?.token;

      if (!user || user.role !== 'admin') {
        setError('Access denied. Admin accounts only.');
        return;
      }

      if (user.isActive === false) {
        setError('This admin account has been suspended.');
        return;
      }

      localStorage.setItem('adminToken', token);
      router.push('/admin/dashboard');
    } catch {
      setError('Connection error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-charcoal-950 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Branded background image */}
      <div className="absolute inset-0">
        <Image
          src="/images/brand/clw-banner.jpg"
          alt="CLW Admin"
          fill
          className="object-cover object-center opacity-20"
          priority
        />
        <div className="absolute inset-0 bg-charcoal-950/80" />
      </div>
      {/* Grid background decoration */}
      <div className="absolute inset-0 opacity-5"
        style={{ backgroundImage: 'linear-gradient(#d4af37 1px, transparent 1px), linear-gradient(90deg, #d4af37 1px, transparent 1px)', backgroundSize: '40px 40px' }}
      />
      <div className="w-full max-w-md relative z-10">
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-16 h-16 rounded-2xl overflow-hidden shadow-lg shadow-gold-600/20 border-2 border-gold-500/40">
              <Image
                src="/images/brand/clw-icon.jpg"
                alt="CLW"
                width={64}
                height={64}
                className="w-full h-full object-cover object-center"
              />
            </div>
          </div>
          <div className="flex justify-center mb-2">
            <Image
              src="/images/brand/clw-logo.jpg"
              alt="Certified Luxury World"
              width={160}
              height={48}
              className="h-8 w-auto object-contain"
            />
          </div>
          <p className="text-cool-gray-400 text-sm">Admin Portal — Secure Access</p>
        </div>

        {/* Login Form */}
        <div className="bg-charcoal-800 rounded-2xl shadow-2xl p-8 border border-charcoal-700">
          <form onSubmit={handleLogin} className="space-y-5">
            {/* Error Message */}
            {error && (
              <div className="bg-red-900/20 border border-red-700 rounded-lg p-4 flex items-start gap-3">
                <span className="text-red-400 text-lg mt-0.5">⚠</span>
                <p className="text-sm text-red-300 font-medium">{error}</p>
              </div>
            )}

            {/* Email Field */}
            <div>
              <label className="block text-sm font-semibold text-cool-gray-300 mb-2">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@clw.com"
                required
                autoComplete="email"
                className="w-full px-4 py-3 bg-charcoal-700 border border-charcoal-600 text-white placeholder-cool-gray-500 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-transparent transition-all outline-none"
              />
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-sm font-semibold text-cool-gray-300 mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  autoComplete="current-password"
                  className="w-full px-4 py-3 bg-charcoal-700 border border-charcoal-600 text-white placeholder-cool-gray-500 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-transparent transition-all outline-none pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-cool-gray-400 hover:text-white transition-colors text-sm"
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-gold-600 hover:bg-gold-500 text-white font-bold rounded-lg focus:ring-4 focus:ring-gold-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-2 shadow-lg shadow-gold-600/20"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  Signing in...
                </span>
              ) : (
                'Sign In to Dashboard'
              )}
            </button>
          </form>

          {/* Footer */}
          <div className="mt-6 text-center">
            <Link href="/" className="text-sm text-cool-gray-500 hover:text-gold-500 transition-colors">
              ← Back to main site
            </Link>
          </div>
        </div>

        {/* Security Notice */}
        <div className="mt-5 text-center">
          <p className="text-xs text-cool-gray-600">
            🔒 Secure admin area · All access attempts are logged
          </p>
        </div>
      </div>
    </div>
  );
}
