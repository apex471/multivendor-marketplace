'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import Header from '../../components/common/Header';
import Footer from '../../components/common/Footer';
import { useRouter } from 'next/navigation';

interface Vendor {
  id: string;
  name: string;
  avatar: string | null;
  bio: string;
  products: number;
  joinedAt: string;
}

export default function VendorsPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery]         = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [sortBy, setSortBy]                   = useState('newest');
  const [vendors, setVendors]                 = useState<Vendor[]>([]);
  const [total, setTotal]                     = useState(0);
  const [loading, setLoading]                 = useState(true);
  const [error, setError]                     = useState('');
  const [page, setPage]                       = useState(1);
  const LIMIT = 24;

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(searchQuery); setPage(1); }, 400);
    return () => clearTimeout(t);
  }, [searchQuery]);

  const fetchVendors = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({
        page:  String(page),
        limit: String(LIMIT),
        sort:  sortBy,
        ...(debouncedSearch ? { search: debouncedSearch } : {}),
      });
      const res  = await fetch(`/api/vendors?${params}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.message || 'Failed to load vendors');
      setVendors(json.data.vendors);
      setTotal(json.data.pagination.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load vendors');
    } finally {
      setLoading(false);
    }
  }, [page, sortBy, debouncedSearch]);

  useEffect(() => { fetchVendors(); }, [fetchVendors]);

  return (
    <div className="min-h-screen bg-white dark:bg-charcoal-900">
      <Header />

      {/* Hero Banner */}
      <div className="relative h-48 sm:h-56 md:h-64 overflow-hidden">
        <Image src="/images/brand/clw-banner.jpg" alt="Discover Luxury Vendors" fill className="object-cover object-center" priority quality={85} />
        <div className="absolute inset-0 bg-charcoal-950/60 dark:bg-charcoal-950/70" />
        <div className="absolute inset-0 bg-linear-to-r from-charcoal-950/50 via-transparent to-gold-950/20" />
        <div className="relative h-full flex flex-col justify-center px-6 sm:px-8 md:px-12 lg:px-16">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-display font-bold text-white mb-2">Discover Luxury Vendors</h1>
          <p className="text-sm sm:text-base text-white/80">Connect with certified luxury brands and boutiques</p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 sm:py-8 md:py-12">

        {/* Controls */}
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-6 sm:mb-8">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Search vendors..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 sm:px-6 py-3 sm:py-4 pr-12 rounded-lg border border-cool-gray-300 dark:border-charcoal-700 bg-white dark:bg-charcoal-800 text-charcoal-900 dark:text-white focus:outline-none focus:border-gold-600 text-sm sm:text-base"
            />
            <span className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 text-gold-600 text-lg sm:text-xl">🔍</span>
          </div>
          <select
            value={sortBy}
            onChange={(e) => { setSortBy(e.target.value); setPage(1); }}
            className="px-4 py-3 rounded-lg border border-cool-gray-300 dark:border-charcoal-700 bg-white dark:bg-charcoal-800 text-charcoal-900 dark:text-white focus:outline-none focus:border-gold-600 text-sm sm:text-base"
          >
            <option value="newest">Newest</option>
            <option value="name">Name A-Z</option>
          </select>
        </div>

        {/* Results info */}
        <div className="mb-6">
          <p className="text-sm sm:text-base text-charcoal-600 dark:text-cool-gray-400">
            {loading ? 'Loading...' : <><span className="font-semibold text-charcoal-900 dark:text-white">{total}</span> vendors found</>}
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-700 rounded-xl text-red-700 dark:text-red-300">{error}</div>
        )}

        {/* Loading skeleton */}
        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
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

        {/* Vendors Grid */}
        {!loading && vendors.length === 0 && (
          <div className="text-center py-16 bg-white dark:bg-charcoal-800 rounded-xl">
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-2xl font-display font-bold text-charcoal-900 dark:text-white mb-2">
              {debouncedSearch ? 'No vendors found' : 'No vendors registered yet'}
            </h3>
            <p className="text-charcoal-600 dark:text-cool-gray-400 mb-6">
              {debouncedSearch ? 'Try a different search term' : 'Vendors will appear here once approved.'}
            </p>
            {debouncedSearch && (
              <button onClick={() => setSearchQuery('')} className="px-6 py-3 bg-gold-600 text-white rounded-lg font-semibold hover:bg-gold-700 transition-colors">Clear Search</button>
            )}
          </div>
        )}

        {!loading && vendors.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {vendors.map((vendor) => (
              <div key={vendor.id} className="group bg-white dark:bg-charcoal-800 rounded-xl overflow-hidden shadow-md hover:shadow-xl transition-all">
                {/* Avatar header */}
                <div className="relative h-32 bg-linear-to-br from-gold-900/30 to-charcoal-800 flex items-center justify-center">
                  {vendor.avatar ? (
                    <Image src={vendor.avatar} alt={vendor.name} width={80} height={80} className="w-20 h-20 rounded-full object-cover border-4 border-white dark:border-charcoal-700 shadow-lg" />
                  ) : (
                    <div className="w-20 h-20 rounded-full bg-white dark:bg-charcoal-700 flex items-center justify-center text-3xl font-bold text-gold-600 border-4 border-white dark:border-charcoal-700 shadow-lg">
                      {vendor.name.charAt(0)}
                    </div>
                  )}
                  <span className="absolute top-3 right-3 px-2 py-1 bg-blue-600 text-white text-xs font-semibold rounded-full">✓ Verified</span>
                </div>

                <div className="p-4 sm:p-6">
                  <h3 className="text-base sm:text-lg font-display font-bold text-charcoal-900 dark:text-white mb-1 truncate">{vendor.name}</h3>
                  {vendor.bio && <p className="text-xs sm:text-sm text-charcoal-600 dark:text-cool-gray-400 mb-4 line-clamp-2">{vendor.bio}</p>}
                  <p className="text-xs sm:text-sm text-charcoal-600 dark:text-cool-gray-400 mb-4">
                    📦 <span className="font-semibold text-charcoal-900 dark:text-white">{vendor.products}</span> products
                  </p>
                  <div className="flex gap-2 sm:gap-3">
                    <button
                      onClick={() => router.push(`/vendor/${vendor.id}`)}
                      className="flex-1 py-2 sm:py-3 min-h-10 bg-gold-600 text-white rounded-lg font-semibold hover:bg-gold-700 active:scale-95 transition-all text-xs sm:text-sm"
                    >
                      Visit Store
                    </button>
                    <Link
                      href={`/vendor/${vendor.id}`}
                      className="px-4 sm:px-6 py-2 sm:py-3 min-h-10 border-2 border-gold-600 text-gold-600 rounded-lg font-semibold hover:bg-gold-50 dark:hover:bg-charcoal-700 active:scale-95 transition-all text-xs sm:text-sm flex items-center"
                    >
                      View
                    </Link>
                  </div>
                </div>
              </div>
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

      </div>

      <Footer />
    </div>
  );
}

