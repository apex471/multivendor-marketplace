'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import Header from '@/components/common/Header';
import Footer from '@/components/common/Footer';

interface Brand {
  id: string;
  name: string;
  avatar: string | null;
  bio: string;
  products: number;
  joinedAt: string;
}

export default function BrandsPage() {
  const [searchQuery, setSearchQuery]       = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [brands, setBrands]                 = useState<Brand[]>([]);
  const [total, setTotal]                   = useState(0);
  const [loading, setLoading]               = useState(true);
  const [error, setError]                   = useState('');
  const [page, setPage]                     = useState(1);
  const LIMIT = 24;

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(searchQuery); setPage(1); }, 400);
    return () => clearTimeout(t);
  }, [searchQuery]);

  const fetchBrands = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({
        page:  String(page),
        limit: String(LIMIT),
        sort:  'name',
        ...(debouncedSearch ? { search: debouncedSearch } : {}),
      });
      const res  = await fetch(`/api/brands?${params}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.message || 'Failed to load brands');
      setBrands(json.data.brands);
      setTotal(json.data.pagination.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load brands');
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch]);

  useEffect(() => { fetchBrands(); }, [fetchBrands]);

  return (
    <div className="min-h-screen bg-white dark:bg-charcoal-900">
      <Header />

      {/* Branded Hero Banner */}
      <div className="relative h-48 sm:h-56 md:h-64 overflow-hidden">
        <Image
          src="/images/brand/clw-asset2.jpg"
          alt="Shop by Brand"
          fill
          className="object-cover object-center"
          priority
          quality={85}
        />
        <div className="absolute inset-0 bg-charcoal-950/65 dark:bg-charcoal-950/75" />
        <div className="absolute inset-0 bg-linear-to-r from-charcoal-950/50 via-transparent to-gold-950/20" />
        <div className="relative h-full flex flex-col justify-center px-6 sm:px-8 md:px-12 lg:px-16">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-display font-bold text-white mb-2">Shop by Brand</h1>
          <p className="text-sm sm:text-base text-white/80">
            Discover products from official brand stores and authorized retailers
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">

        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative max-w-2xl">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search brands..."
              className="w-full px-6 py-4 pl-14 border border-cool-gray-300 dark:border-charcoal-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-gold-600 focus:border-transparent text-charcoal-900 dark:text-white bg-white dark:bg-charcoal-800 shadow-sm"
            />
            <span className="absolute left-5 top-1/2 -translate-y-1/2 text-2xl">🔍</span>
          </div>
        </div>

        {/* Results Count */}
        <div className="mb-6">
          <p className="text-charcoal-600 dark:text-cool-gray-400">
            {loading ? 'Loading...' : <><span className="font-semibold">{total}</span> {total === 1 ? 'brand' : 'brands'} registered</>}
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-700 rounded-xl text-red-700 dark:text-red-300">{error}</div>
        )}

        {/* Loading skeleton */}
        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-white dark:bg-charcoal-800 rounded-xl overflow-hidden shadow-md animate-pulse">
                <div className="h-32 bg-cool-gray-200 dark:bg-charcoal-700" />
                <div className="p-6 space-y-3">
                  <div className="h-5 bg-cool-gray-200 dark:bg-charcoal-700 rounded w-1/2" />
                  <div className="h-4 bg-cool-gray-200 dark:bg-charcoal-700 rounded w-3/4" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Brands Grid */}
        {!loading && brands.length === 0 && (
          <div className="bg-white dark:bg-charcoal-800 rounded-xl shadow-md p-12 text-center">
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-xl font-bold text-charcoal-900 dark:text-white mb-2">
              {debouncedSearch ? 'No brands found' : 'No brands registered yet'}
            </h3>
            <p className="text-charcoal-600 dark:text-cool-gray-400 mb-6">
              {debouncedSearch ? 'Try a different search term' : 'Be the first to register your brand!'}
            </p>
            {debouncedSearch ? (
              <button onClick={() => setSearchQuery('')} className="px-6 py-2 bg-gold-600 text-white rounded-lg font-semibold hover:bg-gold-700 transition-colors">Clear Search</button>
            ) : (
              <Link href="/become-brand" className="px-6 py-2 bg-gold-600 text-white rounded-lg font-semibold hover:bg-gold-700 transition-colors">Register Brand</Link>
            )}
          </div>
        )}

        {!loading && brands.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {brands.map((brand) => (
              <Link
                key={brand.id}
                href={`/brand/${brand.id}`}
                className="group bg-white dark:bg-charcoal-800 rounded-xl overflow-hidden shadow-md hover:shadow-2xl transition-all hover:-translate-y-1"
              >
                {/* Avatar / Banner area */}
                <div className="relative h-40 bg-linear-to-br from-gold-900/30 to-charcoal-800 flex items-center justify-center">
                  <div className="absolute top-3 right-3 z-10 px-2 py-1 bg-blue-600 text-white text-xs font-semibold rounded-full flex items-center gap-1">
                    <span>✓</span><span>Official</span>
                  </div>
                  {brand.avatar ? (
                    <Image src={brand.avatar} alt={brand.name} width={80} height={80} className="w-20 h-20 rounded-xl object-cover border-4 border-white dark:border-charcoal-700 shadow-lg" />
                  ) : (
                    <div className="w-20 h-20 rounded-xl bg-white dark:bg-charcoal-700 flex items-center justify-center text-3xl font-bold text-gold-600 border-4 border-white dark:border-charcoal-700 shadow-lg">
                      {brand.name.charAt(0)}
                    </div>
                  )}
                </div>

                {/* Brand Info */}
                <div className="p-6">
                  <h3 className="font-bold text-xl text-charcoal-900 dark:text-white mb-2 group-hover:text-gold-600 transition-colors">{brand.name}</h3>
                  {brand.bio && <p className="text-sm text-charcoal-600 dark:text-cool-gray-400 mb-4 line-clamp-2">{brand.bio}</p>}
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-3 text-charcoal-600 dark:text-cool-gray-400">
                      <div className="flex items-center gap-1">
                        <span>📦</span>
                        <span className="font-semibold text-charcoal-900 dark:text-white">{brand.products}</span>
                        <span>products</span>
                      </div>
                    </div>
                    <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-semibold rounded">Direct</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Pagination */}
        {!loading && total > LIMIT && (
          <div className="flex justify-center gap-2 mt-8">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-4 py-2 rounded-lg bg-white dark:bg-charcoal-800 border border-cool-gray-300 dark:border-charcoal-600 text-charcoal-700 dark:text-cool-gray-300 disabled:opacity-50 hover:bg-cool-gray-50 dark:hover:bg-charcoal-700 transition-colors">← Prev</button>
            <span className="px-4 py-2 text-charcoal-600 dark:text-cool-gray-400">Page {page} of {Math.ceil(total / LIMIT)}</span>
            <button onClick={() => setPage(p => p + 1)} disabled={page * LIMIT >= total} className="px-4 py-2 rounded-lg bg-white dark:bg-charcoal-800 border border-cool-gray-300 dark:border-charcoal-600 text-charcoal-700 dark:text-cool-gray-300 disabled:opacity-50 hover:bg-cool-gray-50 dark:hover:bg-charcoal-700 transition-colors">Next →</button>
          </div>
        )}

        {/* Info Section */}
        <div className="mt-12 bg-linear-to-r from-gold-600 to-gold-700 rounded-xl p-8 text-white text-center">
          <h2 className="text-2xl font-bold mb-3">Shop with Confidence</h2>
          <p className="mb-6 max-w-2xl mx-auto">
            All brands are verified. Products are available through official brand stores or authorized retailers.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-3xl mx-auto">
            <div>
              <div className="text-4xl mb-2">✓</div>
              <div className="font-semibold mb-1">Authenticity Guaranteed</div>
              <div className="text-sm opacity-90">100% genuine products</div>
            </div>
            <div>
              <div className="text-4xl mb-2">🚚</div>
              <div className="font-semibold mb-1">Fast Shipping</div>
              <div className="text-sm opacity-90">Quick delivery worldwide</div>
            </div>
            <div>
              <div className="text-4xl mb-2">🔒</div>
              <div className="font-semibold mb-1">Secure Payment</div>
              <div className="text-sm opacity-90">Protected transactions</div>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
