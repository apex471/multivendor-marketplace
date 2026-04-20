'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Header from '@/components/common/Header';
import Footer from '@/components/common/Footer';
import { useAuth } from '@/contexts/AuthContext';
import { useLogistics } from '@/contexts/LogisticsContext';
import { buildLogisticsReferralUrl } from '@/lib/utils/referral';

// ─── Access Control ───────────────────────────────────────────────────────────

function AccessDeniedPanel() {
  return (
    <div className="min-h-screen bg-cool-gray-50 dark:bg-charcoal-950 flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-red-100 dark:bg-red-900/30 border-2 border-red-300 dark:border-red-700 mb-6">
          <span className="text-4xl">🚫</span>
        </div>
        <h1 className="text-2xl font-bold text-charcoal-900 dark:text-white mb-3">
          Access Restricted
        </h1>
        <p className="text-charcoal-600 dark:text-cool-gray-400 mb-6 leading-relaxed">
          The logistics providers directory is only available to{' '}
          <span className="font-semibold text-charcoal-800 dark:text-cool-gray-200">
            verified vendors and brand owners
          </span>
          . Customers do not have access to this page.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/"
            className="px-6 py-3 bg-charcoal-900 dark:bg-charcoal-700 text-white rounded-xl font-semibold hover:bg-charcoal-800 transition-colors"
          >
            ← Back to Home
          </Link>
          <Link
            href="/shop"
            className="px-6 py-3 bg-gold-600 text-white rounded-xl font-semibold hover:bg-gold-700 transition-colors"
          >
            Browse Shop
          </Link>
        </div>
      </div>
    </div>
  );
}

// ─── Referral Modal ───────────────────────────────────────────────────────────

interface ReferralModalProps {
  referralUrl: string;
  onClose: () => void;
}

function ReferralModal({ referralUrl, onClose }: ReferralModalProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(referralUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // fallback for older browsers
      const ta = document.createElement('textarea');
      ta.value = referralUrl;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-charcoal-800 rounded-2xl shadow-2xl border border-cool-gray-200 dark:border-charcoal-700 w-full max-w-lg p-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gold-600 rounded-xl flex items-center justify-center">
              <span className="text-xl">🔗</span>
            </div>
            <div>
              <h2 className="font-bold text-charcoal-900 dark:text-white">Invite Logistics Provider</h2>
              <p className="text-xs text-charcoal-500 dark:text-cool-gray-400">Link expires in 7 days</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-charcoal-500 hover:text-charcoal-700 dark:text-cool-gray-400 dark:hover:text-white rounded-lg hover:bg-cool-gray-100 dark:hover:bg-charcoal-700 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Info Banner */}
        <div className="bg-gold-50 dark:bg-gold-900/20 border border-gold-200 dark:border-gold-700/50 rounded-xl p-4 mb-5 text-sm text-charcoal-700 dark:text-cool-gray-300">
          <p className="font-semibold text-charcoal-900 dark:text-white mb-1">📋 How it works</p>
          <ul className="space-y-1 text-xs">
            <li>• Share this unique link with a logistics company you trust.</li>
            <li>• They use it to register as a logistics provider on CLW.</li>
            <li>• Once approved, they appear in this directory for all vendors and brands.</li>
            <li>• This link is tied to your account and cannot be used by customers.</li>
          </ul>
        </div>

        {/* URL Box */}
        <div className="bg-cool-gray-50 dark:bg-charcoal-700 border border-cool-gray-200 dark:border-charcoal-600 rounded-xl p-3 mb-4">
          <p className="text-xs text-charcoal-500 dark:text-cool-gray-400 mb-1.5 font-medium">Referral Link</p>
          <p className="text-xs text-charcoal-700 dark:text-cool-gray-300 break-all font-mono leading-relaxed">
            {referralUrl}
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleCopy}
            className={`flex-1 py-3 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 ${
              copied
                ? 'bg-green-600 text-white'
                : 'bg-charcoal-900 dark:bg-gold-600 text-white hover:bg-charcoal-800 dark:hover:bg-gold-700'
            }`}
          >
            {copied ? (
              <><span>✓</span> Copied!</>
            ) : (
              <><span>📋</span> Copy Link</>
            )}
          </button>
          <button
            onClick={() => {
              const subject = encodeURIComponent('Invitation to join CLW as a Logistics Provider');
              const body = encodeURIComponent(
                `Hi,\n\nI would like to invite you to register as a certified logistics provider on CLW (Certified Luxury World).\n\nUse the link below to complete your registration (valid for 7 days):\n\n${referralUrl}\n\nBest regards`
              );
              window.open(`mailto:?subject=${subject}&body=${body}`);
            }}
            className="px-5 py-3 border-2 border-charcoal-300 dark:border-charcoal-600 text-charcoal-700 dark:text-cool-gray-300 rounded-xl font-semibold hover:bg-cool-gray-50 dark:hover:bg-charcoal-700 transition-colors"
          >
            📧 Email
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Provider Card ────────────────────────────────────────────────────────────

interface ProviderCardProps {
  provider: ReturnType<typeof useLogistics>['logisticProviders'][number];
  onSelect: () => void;
  isSelected: boolean;
}

function ProviderCard({ provider, onSelect, isSelected }: ProviderCardProps) {
  return (
    <div
      className={`bg-white dark:bg-charcoal-800 rounded-2xl border-2 transition-all hover:shadow-lg ${
        isSelected
          ? 'border-gold-500 shadow-gold-500/20 shadow-lg'
          : 'border-cool-gray-200 dark:border-charcoal-700 hover:border-cool-gray-300 dark:hover:border-charcoal-600'
      }`}
    >
      <div className="p-5">
        {/* Logo + Name */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-charcoal-100 dark:bg-charcoal-700 rounded-xl flex items-center justify-center text-2xl shrink-0">
              {provider.logo}
            </div>
            <div>
              <h3 className="font-bold text-charcoal-900 dark:text-white leading-tight">{provider.name}</h3>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-gold-500 text-sm">★</span>
                <span className="text-sm font-semibold text-charcoal-700 dark:text-cool-gray-300">
                  {provider.rating}
                </span>
                <span className="text-xs text-cool-gray-500 dark:text-cool-gray-500">
                  ({provider.totalReviews.toLocaleString()} reviews)
                </span>
              </div>
            </div>
          </div>
          {provider.isActive ? (
            <span className="shrink-0 px-2.5 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-semibold rounded-full">
              ● Active
            </span>
          ) : (
            <span className="shrink-0 px-2.5 py-1 bg-cool-gray-100 dark:bg-charcoal-700 text-cool-gray-500 text-xs font-semibold rounded-full">
              ○ Inactive
            </span>
          )}
        </div>

        {/* Description */}
        <p className="text-sm text-charcoal-600 dark:text-cool-gray-400 mb-4 leading-relaxed">
          {provider.description}
        </p>

        {/* Coverage */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          {provider.coverageArea.slice(0, 3).map((area) => (
            <span
              key={area}
              className="px-2.5 py-1 bg-cool-gray-100 dark:bg-charcoal-700 text-charcoal-600 dark:text-cool-gray-400 text-xs rounded-lg font-medium"
            >
              📍 {area}
            </span>
          ))}
          {provider.coverageArea.length > 3 && (
            <span className="px-2.5 py-1 bg-cool-gray-100 dark:bg-charcoal-700 text-cool-gray-500 text-xs rounded-lg font-medium">
              +{provider.coverageArea.length - 3} more
            </span>
          )}
        </div>

        {/* Key Features */}
        <div className="flex flex-wrap gap-1.5 mb-5">
          {provider.features.slice(0, 3).map((feat) => (
            <span
              key={feat}
              className="px-2.5 py-1 bg-gold-50 dark:bg-gold-900/20 text-gold-700 dark:text-gold-400 text-xs rounded-lg font-medium border border-gold-200 dark:border-gold-800"
            >
              ✓ {feat}
            </span>
          ))}
          {provider.features.length > 3 && (
            <span className="px-2.5 py-1 bg-cool-gray-100 dark:bg-charcoal-700 text-cool-gray-500 text-xs rounded-lg font-medium">
              +{provider.features.length - 3}
            </span>
          )}
        </div>

        {/* Pricing Row */}
        <div className="flex items-center justify-between py-3 border-t border-cool-gray-100 dark:border-charcoal-700 mb-4">
          <div className="text-center">
            <p className="text-xs text-cool-gray-500 dark:text-cool-gray-500 mb-0.5">Base Fee</p>
            <p className="font-bold text-charcoal-900 dark:text-white">${provider.baseFee.toFixed(2)}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-cool-gray-500 dark:text-cool-gray-500 mb-0.5">Per KG</p>
            <p className="font-bold text-charcoal-900 dark:text-white">${provider.pricePerKg.toFixed(2)}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-cool-gray-500 dark:text-cool-gray-500 mb-0.5">Est. Delivery</p>
            <p className="font-bold text-charcoal-900 dark:text-white text-sm">{provider.estimatedDelivery}</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={onSelect}
            className={`flex-1 py-2.5 rounded-xl font-semibold text-sm transition-all ${
              isSelected
                ? 'bg-green-600 text-white'
                : 'bg-charcoal-900 dark:bg-gold-600 text-white hover:bg-charcoal-800 dark:hover:bg-gold-700'
            }`}
          >
            {isSelected ? '✓ Selected' : 'Select Provider'}
          </button>
          <a
            href={`mailto:${provider.contactEmail}`}
            className="px-4 py-2.5 border-2 border-cool-gray-200 dark:border-charcoal-600 text-charcoal-600 dark:text-cool-gray-400 rounded-xl font-semibold text-sm hover:bg-cool-gray-50 dark:hover:bg-charcoal-700 transition-colors"
            title="Contact provider"
          >
            📧
          </a>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function LogisticsProvidersPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const { logisticProviders, getAvailableProviders: _getAvailableProviders, selectLogistics, selectedLogistics } =
    useLogistics();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterCoverage, setFilterCoverage] = useState('all');
  const [sortBy, setSortBy] = useState<'rating' | 'price-low' | 'price-high' | 'reviews'>('rating');
  const [showReferralModal, setShowReferralModal] = useState(false);
  const [referralUrl, setReferralUrl] = useState('');
  const [selectedId, setSelectedId] = useState<string>(selectedLogistics?.providerId || '');
  const [selectSuccessMsg, setSelectSuccessMsg] = useState('');

  // Redirect unauthenticated users to login
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login?redirect=/logistics/providers');
    }
  }, [authLoading, user, router]);

  const handleOpenReferralModal = () => {
    if (!user) return;
    // Use real user.id and role once auth is wired; fall back to mock for now
    const url = buildLogisticsReferralUrl(
      user.id || 'mock-id',
      user.role as 'vendor' | 'brand',
      user.username || 'A CLW Member'
    );
    setReferralUrl(url);
    setShowReferralModal(true);
  };

  const handleSelectProvider = async (provider: typeof logisticProviders[number]) => {
    await selectLogistics(provider);
    setSelectedId(provider.id);
    setSelectSuccessMsg(`${provider.name} is now your preferred logistics partner.`);
    setTimeout(() => setSelectSuccessMsg(''), 4000);
  };

  // ── Loading state ──
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cool-gray-50 dark:bg-charcoal-950">
        <div className="text-center">
          <div className="animate-spin w-10 h-10 border-4 border-gold-600 border-t-transparent rounded-full mx-auto mb-3" />
          <p className="text-charcoal-600 dark:text-cool-gray-400 text-sm">Loading…</p>
        </div>
      </div>
    );
  }

  // ── Role gate: customers blocked ──
  if (!user || (user.role !== 'vendor' && user.role !== 'brand' && user.role !== 'admin')) {
    return (
      <>
        <Header />
        <AccessDeniedPanel />
        <Footer />
      </>
    );
  }

  // ── Filter + Sort ──
  const allCoverages = Array.from(
    new Set(logisticProviders.flatMap((p) => p.coverageArea))
  ).sort();

  const filtered = logisticProviders
    .filter((p) => {
      const matchesSearch =
        !searchQuery ||
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.coverageArea.some((c) => c.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesCoverage =
        filterCoverage === 'all' || p.coverageArea.includes(filterCoverage);
      return matchesSearch && matchesCoverage;
    })
    .sort((a, b) => {
      if (sortBy === 'rating') return b.rating - a.rating;
      if (sortBy === 'reviews') return b.totalReviews - a.totalReviews;
      if (sortBy === 'price-low') return (a.baseFee + a.pricePerKg) - (b.baseFee + b.pricePerKg);
      if (sortBy === 'price-high') return (b.baseFee + b.pricePerKg) - (a.baseFee + a.pricePerKg);
      return 0;
    });

  return (
    <>
      <Header />

      <main className="min-h-screen bg-cool-gray-50 dark:bg-charcoal-950">
        {/* Page Header */}
        <div className="bg-linear-to-br from-charcoal-900 via-charcoal-800 to-charcoal-700 dark:from-charcoal-950 dark:via-charcoal-900 dark:to-charcoal-800 text-white">
          <div className="container mx-auto px-4 py-10 sm:py-14">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-3 py-1 bg-gold-500/20 text-gold-300 text-xs font-semibold rounded-full">
                    {user.role === 'brand' ? '👑 Brand Owner' : '🏪 Vendor'} Access
                  </span>
                </div>
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-display font-bold mb-2">
                  Logistics Providers
                </h1>
                <p className="text-white/80 text-sm sm:text-base max-w-xl">
                  Browse and select trusted delivery partners for your orders. Only available to verified vendors and brand owners.
                </p>
              </div>

              {/* Invite Button */}
              <div className="shrink-0">
                <button
                  onClick={handleOpenReferralModal}
                  className="flex items-center gap-2 px-5 py-3 bg-gold-600 hover:bg-gold-700 text-white rounded-xl font-semibold transition-all shadow-lg hover:shadow-gold-600/30 active:scale-95"
                >
                  <span>🔗</span>
                  <span>Invite Logistics Provider</span>
                </button>
                <p className="text-white/50 text-xs mt-1.5 text-center">
                  Share a referral link
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 py-8">

          {/* Success Toast */}
          {selectSuccessMsg && (
            <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 rounded-xl flex items-center gap-3 text-green-800 dark:text-green-300 text-sm font-medium">
              <span className="text-lg">✅</span>
              {selectSuccessMsg}
            </div>
          )}

          {/* Currently Selected */}
          {selectedLogistics && (
            <div className="mb-6 p-4 bg-gold-50 dark:bg-gold-900/20 border-2 border-gold-200 dark:border-gold-700/50 rounded-xl flex items-center gap-3">
              <span className="text-2xl shrink-0">🚚</span>
              <div>
                <p className="text-xs font-semibold text-gold-700 dark:text-gold-400 uppercase tracking-wide mb-0.5">
                  Current Preferred Partner
                </p>
                <p className="font-bold text-charcoal-900 dark:text-white">{selectedLogistics.providerName}</p>
              </div>
              <span className="ml-auto px-3 py-1 bg-gold-600 text-white text-xs font-semibold rounded-full">
                ✓ Active
              </span>
            </div>
          )}

          {/* Filters Row */}
          <div className="bg-white dark:bg-charcoal-800 border border-cool-gray-200 dark:border-charcoal-700 rounded-2xl p-4 mb-6 flex flex-col sm:flex-row gap-3">
            {/* Search */}
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-cool-gray-400">🔍</span>
              <input
                type="text"
                placeholder="Search providers, coverage areas…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-cool-gray-50 dark:bg-charcoal-700 border border-cool-gray-200 dark:border-charcoal-600 text-charcoal-900 dark:text-white placeholder-cool-gray-400 rounded-xl text-sm focus:ring-2 focus:ring-gold-500 focus:border-transparent transition-colors"
              />
            </div>

            {/* Coverage Filter */}
            <select
              value={filterCoverage}
              onChange={(e) => setFilterCoverage(e.target.value)}
              className="px-4 py-2.5 bg-cool-gray-50 dark:bg-charcoal-700 border border-cool-gray-200 dark:border-charcoal-600 text-charcoal-900 dark:text-white rounded-xl text-sm focus:ring-2 focus:ring-gold-500 focus:border-transparent transition-colors sm:w-48"
            >
              <option value="all">All Coverage Areas</option>
              {allCoverages.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            {/* Sort */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="px-4 py-2.5 bg-cool-gray-50 dark:bg-charcoal-700 border border-cool-gray-200 dark:border-charcoal-600 text-charcoal-900 dark:text-white rounded-xl text-sm focus:ring-2 focus:ring-gold-500 focus:border-transparent transition-colors sm:w-44"
            >
              <option value="rating">Sort: Highest Rated</option>
              <option value="reviews">Sort: Most Reviews</option>
              <option value="price-low">Sort: Price Low → High</option>
              <option value="price-high">Sort: Price High → Low</option>
            </select>
          </div>

          {/* Results Count */}
          <p className="text-sm text-charcoal-500 dark:text-cool-gray-500 mb-4">
            Showing <span className="font-semibold text-charcoal-900 dark:text-white">{filtered.length}</span> of{' '}
            {logisticProviders.length} providers
            {searchQuery && (
              <span>
                {' '}for{' '}
                <span className="text-gold-600 dark:text-gold-400 font-medium">&ldquo;{searchQuery}&rdquo;</span>
              </span>
            )}
          </p>

          {/* Provider Grid */}
          {filtered.length > 0 ? (
            <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5">
              {filtered.map((provider) => (
                <ProviderCard
                  key={provider.id}
                  provider={provider}
                  isSelected={selectedId === provider.id}
                  onSelect={() => handleSelectProvider(provider)}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-20">
              <span className="text-6xl block mb-4">🔍</span>
              <h3 className="text-xl font-bold text-charcoal-900 dark:text-white mb-2">No providers found</h3>
              <p className="text-charcoal-500 dark:text-cool-gray-400 mb-6">
                Try a different search term or coverage area filter.
              </p>
              <button
                onClick={() => { setSearchQuery(''); setFilterCoverage('all'); }}
                className="px-6 py-2.5 bg-gold-600 text-white rounded-xl font-semibold hover:bg-gold-700 transition-colors"
              >
                Clear Filters
              </button>
            </div>
          )}

          {/* Invite CTA Banner */}
          <div className="mt-10 bg-linear-to-br from-charcoal-900 to-charcoal-800 dark:from-charcoal-800 dark:to-charcoal-700 rounded-2xl p-6 sm:p-8 flex flex-col sm:flex-row items-center gap-5">
            <div className="shrink-0 w-14 h-14 bg-gold-600/20 border border-gold-600/40 rounded-2xl flex items-center justify-center text-3xl">
              🔗
            </div>
            <div className="text-center sm:text-left">
              <h3 className="text-white font-bold text-lg mb-1">Know a great logistics company?</h3>
              <p className="text-cool-gray-400 text-sm">
                Invite them to join CLW&apos;s network. Your referral link is valid for 7 days and grants them access to the registration form.
              </p>
            </div>
            <button
              onClick={handleOpenReferralModal}
              className="shrink-0 px-6 py-3 bg-gold-600 hover:bg-gold-700 text-white rounded-xl font-semibold transition-all active:scale-95"
            >
              Generate Invite Link
            </button>
          </div>
        </div>
      </main>

      <Footer />

      {/* Referral Modal */}
      {showReferralModal && (
        <ReferralModal
          referralUrl={referralUrl}
          onClose={() => setShowReferralModal(false)}
        />
      )}
    </>
  );
}
