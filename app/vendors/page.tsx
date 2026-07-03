'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import Header from '../../components/common/Header';
import Footer from '../../components/common/Footer';
import { useRouter } from 'next/navigation';
import { getAuthToken } from '@/lib/api/auth';

interface Vendor {
  id: string;
  name: string;
  avatar: string | null;
  bio: string;
  products: number;
  joinedAt: string;
}

function VendorCard({ vendor }: { vendor: Vendor }) {
  const router   = useRouter();
  const [starting, setStarting] = useState(false);

  const handleMessage = async () => {
    const token = getAuthToken();
    if (!token) { router.push('/auth/login?redirect=/messages'); return; }
    if (starting) return;
    setStarting(true);
    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipientId: vendor.id, text: '' }),
      });
      const json = await res.json();
      if (json.success && json.data?.conversationId) {
        router.push(`/messages?convo=${json.data.conversationId}`);
      }
    } finally { setStarting(false); }
  };

  return (
    <div className="group bg-white dark:bg-charcoal-800 rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 border border-cool-gray-100 dark:border-charcoal-700">
      {/* Banner */}
      <div className="relative h-28 bg-linear-to-br from-charcoal-800 via-charcoal-900 to-gold-900/40 flex items-center justify-center">
        <div className="absolute inset-0 opacity-20"
          style={{ backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 5px, rgba(191,164,111,0.15) 5px, rgba(191,164,111,0.15) 6px)' }} />
        {vendor.avatar ? (
          <Image src={vendor.avatar} alt={vendor.name} width={80} height={80}
            className="w-20 h-20 rounded-full object-cover border-4 border-white dark:border-charcoal-700 shadow-lg" />
        ) : (
          <div className="w-20 h-20 rounded-full bg-linear-to-br from-gold-600 to-gold-800 flex items-center justify-center text-3xl font-bold text-white border-4 border-white dark:border-charcoal-700 shadow-lg">
            {vendor.name.charAt(0).toUpperCase()}
          </div>
        )}
        {/* Verified badge — on-brand gold */}
        <span className="absolute top-3 right-3 flex items-center gap-1 px-2.5 py-1 bg-gold-600/90 backdrop-blur-sm text-white text-[11px] font-bold rounded-full shadow">
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
          Verified
        </span>
      </div>

      <div className="p-5">
        <h3 className="text-base font-bold text-charcoal-900 dark:text-white mb-1 truncate font-display">
          {vendor.name}
        </h3>
        {vendor.bio && (
          <p className="text-xs text-cool-gray-500 dark:text-cool-gray-400 mb-3 line-clamp-2 leading-relaxed">
            {vendor.bio}
          </p>
        )}
        <div className="flex items-center gap-1.5 mb-4 text-xs text-cool-gray-500 dark:text-cool-gray-400">
          <svg className="w-3.5 h-3.5 text-gold-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
          <span><strong className="text-charcoal-900 dark:text-white">{vendor.products}</strong> products listed</span>
        </div>

        <div className="flex gap-2">
          <Link
            href={`/vendors/${vendor.id}`}
            className="flex-1 py-2.5 text-center bg-gold-600 hover:bg-gold-700 active:scale-95 text-white rounded-xl font-semibold text-xs transition-all shadow-sm shadow-gold-600/20">
            Visit Store
          </Link>
          <button
            onClick={handleMessage}
            disabled={starting}
            title="Send a DM"
            className="px-3 py-2.5 border-2 border-charcoal-200 dark:border-charcoal-600 hover:border-gold-600 dark:hover:border-gold-500 text-charcoal-600 dark:text-cool-gray-300 hover:text-gold-600 dark:hover:text-gold-400 rounded-xl transition-all active:scale-95 disabled:opacity-50">
            {starting ? (
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function VendorsPage() {
  const [searchQuery, setSearchQuery]         = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [sortBy, setSortBy]                   = useState('newest');
  const [vendors, setVendors]                 = useState<Vendor[]>([]);
  const [total, setTotal]                     = useState(0);
  const [loading, setLoading]                 = useState(true);
  const [error, setError]                     = useState('');
  const [page, setPage]                       = useState(1);
  const LIMIT = 24;

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

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div className="min-h-screen bg-cool-gray-50 dark:bg-charcoal-950">
      <Header />

      {/* Hero */}
      <div className="relative h-52 sm:h-60 md:h-72 overflow-hidden">
        <Image src="/images/brand/clw-banner.jpg" alt="Discover Luxury Vendors" fill
          className="object-cover object-center" priority quality={85} />
        <div className="absolute inset-0 bg-charcoal-950/65" />
        <div className="absolute inset-0 bg-linear-to-r from-charcoal-950/60 via-transparent to-gold-950/20" />
        <div className="relative h-full flex flex-col justify-center px-6 sm:px-10 md:px-16">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-5 h-px bg-gold-500" />
            <span className="text-gold-400 text-[11px] font-bold tracking-widest uppercase">Certified Luxury World</span>
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-display font-bold text-white mb-2">
            Discover Luxury Vendors
          </h1>
          <p className="text-sm sm:text-base text-white/70">
            Connect directly with certified brands and boutiques via DM
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 md:py-12">
        {/* Controls */}
        <div className="flex flex-col sm:flex-row gap-3 mb-8">
          <div className="relative flex-1">
            <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-cool-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search vendors..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-3 rounded-xl border border-cool-gray-200 dark:border-charcoal-700 bg-white dark:bg-charcoal-800 text-charcoal-900 dark:text-white placeholder-cool-gray-400 focus:outline-none focus:border-gold-500 focus:ring-2 focus:ring-gold-500/20 text-sm transition-all"
            />
          </div>
          <select
            value={sortBy}
            onChange={(e) => { setSortBy(e.target.value); setPage(1); }}
            className="px-4 py-3 rounded-xl border border-cool-gray-200 dark:border-charcoal-700 bg-white dark:bg-charcoal-800 text-charcoal-900 dark:text-white focus:outline-none focus:border-gold-500 text-sm transition-all"
          >
            <option value="newest">Newest First</option>
            <option value="name">Name A–Z</option>
          </select>
        </div>

        {/* Results count */}
        <p className="text-sm text-cool-gray-500 dark:text-cool-gray-400 mb-6">
          {loading ? 'Loading vendors...' : (
            <><span className="font-semibold text-charcoal-900 dark:text-white">{total}</span> verified {total === 1 ? 'vendor' : 'vendors'} found</>
          )}
        </p>

        {/* Error */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-300 text-sm">
            {error}
          </div>
        )}

        {/* Skeleton */}
        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="bg-white dark:bg-charcoal-800 rounded-2xl overflow-hidden shadow-md animate-pulse border border-cool-gray-100 dark:border-charcoal-700">
                <div className="h-28 bg-cool-gray-200 dark:bg-charcoal-700" />
                <div className="p-5 space-y-3">
                  <div className="h-4 bg-cool-gray-200 dark:bg-charcoal-700 rounded-lg w-2/3" />
                  <div className="h-3 bg-cool-gray-200 dark:bg-charcoal-700 rounded-lg w-full" />
                  <div className="h-3 bg-cool-gray-200 dark:bg-charcoal-700 rounded-lg w-4/5" />
                  <div className="h-9 bg-cool-gray-200 dark:bg-charcoal-700 rounded-xl w-full mt-2" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty */}
        {!loading && vendors.length === 0 && (
          <div className="text-center py-20 bg-white dark:bg-charcoal-800 rounded-2xl border border-cool-gray-100 dark:border-charcoal-700">
            <div className="w-16 h-16 rounded-full bg-cool-gray-100 dark:bg-charcoal-700 flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-cool-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-charcoal-900 dark:text-white mb-2">
              {debouncedSearch ? 'No vendors found' : 'No vendors yet'}
            </h3>
            <p className="text-cool-gray-500 dark:text-cool-gray-400 text-sm mb-5">
              {debouncedSearch ? 'Try a different search term' : 'Vendors will appear here once approved.'}
            </p>
            {debouncedSearch && (
              <button onClick={() => setSearchQuery('')}
                className="px-6 py-2.5 bg-gold-600 hover:bg-gold-700 text-white rounded-xl font-semibold text-sm transition-colors">
                Clear Search
              </button>
            )}
          </div>
        )}

        {/* Grid */}
        {!loading && vendors.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {vendors.map((vendor) => <VendorCard key={vendor.id} vendor={vendor} />)}
          </div>
        )}

        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-center gap-3 mt-10">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-5 py-2.5 rounded-xl border border-cool-gray-200 dark:border-charcoal-700 bg-white dark:bg-charcoal-800 text-charcoal-700 dark:text-cool-gray-300 disabled:opacity-40 hover:border-gold-500 hover:text-gold-600 transition-colors text-sm font-medium">
              ← Previous
            </button>
            <span className="text-sm text-cool-gray-500 dark:text-cool-gray-400 font-medium">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage(p => p + 1)}
              disabled={page >= totalPages}
              className="px-5 py-2.5 rounded-xl border border-cool-gray-200 dark:border-charcoal-700 bg-white dark:bg-charcoal-800 text-charcoal-700 dark:text-cool-gray-300 disabled:opacity-40 hover:border-gold-500 hover:text-gold-600 transition-colors text-sm font-medium">
              Next →
            </button>
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}
