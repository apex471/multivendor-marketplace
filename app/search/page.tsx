'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import Header from '@/components/common/Header';
import Footer from '@/components/common/Footer';

function SearchContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get('q') || '';

  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [activeTab, setActiveTab] = useState<'all' | 'products' | 'vendors' | 'posts'>('all');
  const [sortBy, setSortBy] = useState('relevance');

  // ── Real search results ───────────────────────────────────────────────
  type ProductResult = { id: string; name: string; price: number; image: string; rating: number };
  type VendorResult = { id: string; name: string; logo: string; products: number; rating: number };
  type PostResult = { id: string; author: string; content: string; image: string };
  const [searchProducts, setSearchProducts] = useState<ProductResult[]>([]);
  const [searchVendors, setSearchVendors] = useState<VendorResult[]>([]);
  const [searchPosts, setSearchPosts] = useState<PostResult[]>([]);
  const [currentQuery, setCurrentQuery] = useState(initialQuery);

  useEffect(() => {
    setCurrentQuery(initialQuery);
    setSearchQuery(initialQuery);
  }, [initialQuery]);

  useEffect(() => {
    if (!currentQuery.trim()) return;
    const apiSort: Record<string, string> = {
      relevance: 'popular', price_low: 'price-asc',
      price_high: 'price-high', rating: 'rating', newest: 'newest',
    };
    const params = new URLSearchParams({
      search: currentQuery,
      sort:   apiSort[sortBy] ?? 'popular',
      limit:  '24',
    });
    const controller = new AbortController();
    fetch(`/api/products?${params}`, { signal: controller.signal })
      .then(r => r.json())
      .then(json => {
        if (json.success) {
          setSearchProducts(
            (json.data.products ?? []).map((p: {
              _id: string; name: string; price: number; images?: string[]; rating?: number;
            }) => ({
              id:     p._id,
              name:   p.name,
              price:  p.price,
              image:  p.images?.[0] ?? '/images/placeholder.jpg',
              rating: p.rating ?? 0,
            }))
          );
        }
      })
      .catch(err => { if (err.name !== 'AbortError') console.error(err); });

    // Fetch vendors
    fetch(`/api/vendors?search=${encodeURIComponent(currentQuery)}&limit=12`, { signal: controller.signal })
      .then(r => r.json())
      .then(json => {
        if (json.success) {
          setSearchVendors(
            (json.data.vendors ?? []).map((v: {
              _id: string; firstName: string; lastName: string; avatar?: string;
              productCount?: number; rating?: number;
            }) => ({
              id:       String(v._id),
              name:     `${v.firstName} ${v.lastName}`.trim(),
              logo:     v.avatar ?? '/images/placeholder.jpg',
              products: v.productCount ?? 0,
              rating:   v.rating ?? 0,
            }))
          );
        }
      })
      .catch(err => { if (err.name !== 'AbortError') console.error(err); });

    return () => controller.abort();
  }, [currentQuery, sortBy]);

  // Fetch posts separately (no abort needed, low-frequency)
  useEffect(() => {
    if (!currentQuery.trim()) { setSearchPosts([]); return; }
    fetch(`/api/posts?search=${encodeURIComponent(currentQuery)}&limit=12`)
      .then(r => r.json())
      .then(json => {
        if (json.success) {
          setSearchPosts(
            (json.data.posts ?? []).map((p: { _id: string; author?: { fullName?: string }; content?: string; images?: string[] }) => ({
              id:      String(p._id),
              author:  p.author?.fullName ?? 'Unknown',
              content: p.content ?? '',
              image:   p.images?.[0] ?? '',
            }))
          );
        }
      })
      .catch(() => {});
  }, [currentQuery]);

  const results = {
    products: currentQuery.trim() ? searchProducts : [],
    vendors:  currentQuery.trim() ? searchVendors  : [],
    posts:    searchPosts,
  };

  const totalResults = results.products.length + results.vendors.length;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-charcoal-900">
      <Header />

      <div className="container mx-auto px-4 py-8">
        {/* Search Bar */}
        <form onSubmit={handleSearch} className="mb-8">
          <div className="relative max-w-3xl mx-auto">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search products, vendors, posts..."
              className="w-full px-6 py-4 pl-14 border border-cool-gray-300 dark:border-charcoal-700 bg-white dark:bg-charcoal-800 text-charcoal-900 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-gold-600 shadow-md"
            />
            <span className="absolute left-5 top-1/2 -translate-y-1/2 text-2xl">🔍</span>
          </div>
        </form>

        {/* Results Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-charcoal-900 dark:text-white mb-2">
            Search Results {currentQuery && `for "${currentQuery}"`}
          </h1>
          <p className="text-charcoal-600 dark:text-cool-gray-400">
            {currentQuery ? `${totalResults} result${totalResults !== 1 ? 's' : ''} found` : 'Enter a search term above'}
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {[
            { id: 'all', label: 'All', count: totalResults },
            { id: 'products', label: 'Products', count: results.products.length },
            { id: 'vendors', label: 'Vendors', count: results.vendors.length },
            { id: 'posts', label: 'Posts', count: results.posts.length },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`px-6 py-3 rounded-lg font-semibold whitespace-nowrap transition-colors ${
                activeTab === tab.id
                  ? 'bg-gold-600 text-white'
                  : 'bg-white dark:bg-charcoal-800 text-charcoal-700 dark:text-cool-gray-300 hover:bg-cool-gray-100 dark:hover:bg-charcoal-700'
              }`}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </div>

        <div className="grid lg:grid-cols-4 gap-8">
          {/* Filters */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-charcoal-800 rounded-xl shadow-md p-6 sticky top-4">
              <h2 className="text-lg font-bold text-charcoal-900 dark:text-white mb-4">Filters</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-charcoal-700 dark:text-cool-gray-300 font-semibold mb-2">
                    Sort By
                  </label>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="w-full px-3 py-2 border border-cool-gray-300 dark:border-charcoal-600 bg-white dark:bg-charcoal-700 text-charcoal-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-600"
                  >
                    <option value="relevance">Relevance</option>
                    <option value="price_low">Price: Low to High</option>
                    <option value="price_high">Price: High to Low</option>
                    <option value="rating">Highest Rated</option>
                    <option value="newest">Newest</option>
                  </select>
                </div>

                <div>
                  <label className="block text-charcoal-700 dark:text-cool-gray-300 font-semibold mb-2">
                    Price Range
                  </label>
                  <div className="space-y-2">
                    <input type="range" min="0" max="5000" className="w-full" />
                    <div className="flex justify-between text-sm text-charcoal-600 dark:text-cool-gray-400">
                      <span>$0</span>
                      <span>$5000+</span>
                    </div>
                  </div>
                </div>

                <button className="w-full px-4 py-2 bg-gold-600 text-white rounded-lg font-semibold hover:bg-gold-700 transition-colors">
                  Apply Filters
                </button>
              </div>
            </div>
          </div>

          {/* Results */}
          <div className="lg:col-span-3">
            {(activeTab === 'all' || activeTab === 'products') && results.products.length > 0 && (
              <div className="mb-8">
                <h2 className="text-xl font-bold text-charcoal-900 dark:text-white mb-4">Products</h2>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {results.products.map((product) => (
                    <Link
                      key={product.id}
                      href={`/product/${product.id}`}
                      className="bg-white dark:bg-charcoal-800 rounded-xl overflow-hidden shadow-md hover:shadow-xl transition-all"
                    >
                      <div className="relative h-48 bg-cool-gray-100 dark:bg-charcoal-700">
                        <Image src={product.image} alt={product.name} fill className="object-cover" />
                      </div>
                      <div className="p-4">
                        <h3 className="font-semibold text-charcoal-900 dark:text-white mb-2">{product.name}</h3>
                        <div className="flex items-center justify-between">
                          <span className="text-xl font-bold text-gold-600">${product.price}</span>
                          <div className="flex items-center gap-1">
                            <span className="text-yellow-500">⭐</span>
                            <span className="text-sm font-semibold text-charcoal-900 dark:text-white">{product.rating}</span>
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {(activeTab === 'all' || activeTab === 'vendors') && results.vendors.length > 0 && (
              <div className="mb-8">
                <h2 className="text-xl font-bold text-charcoal-900 dark:text-white mb-4">Vendors</h2>
                <div className="space-y-4">
                  {results.vendors.map((vendor) => (
                    <Link
                      key={vendor.id}
                      href={`/vendor/${vendor.id}`}
                      className="block bg-white dark:bg-charcoal-800 rounded-xl shadow-md p-6 hover:shadow-xl transition-all"
                    >
                      <div className="flex items-center gap-4">
                        <div className="relative w-16 h-16 bg-cool-gray-100 dark:bg-charcoal-700 rounded-full overflow-hidden shrink-0">
                          <Image src={vendor.logo} alt={vendor.name} fill className="object-cover" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-bold text-lg text-charcoal-900 dark:text-white mb-1">{vendor.name}</h3>
                          <div className="flex items-center gap-4 text-sm text-charcoal-600 dark:text-cool-gray-400">
                            <span>{vendor.products} Products</span>
                            <div className="flex items-center gap-1">
                              <span className="text-yellow-500">⭐</span>
                              <span>{vendor.rating}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {totalResults === 0 && (
              <div className="bg-white dark:bg-charcoal-800 rounded-xl shadow-md p-12 text-center">
                <div className="text-6xl mb-4">🔍</div>
                <h3 className="text-xl font-bold text-charcoal-900 dark:text-white mb-2">
                  {currentQuery ? 'No results found' : 'Start searching'}
                </h3>
                <p className="text-charcoal-600 dark:text-cool-gray-400 mb-6">
                  {currentQuery ? 'Try adjusting your search or filters' : 'Enter a search term to find products'}
                </p>
                <Link
                  href="/shop"
                  className="inline-block px-6 py-3 bg-gold-600 text-white rounded-lg font-semibold hover:bg-gold-700 transition-colors"
                >
                  Browse All Products
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-white dark:bg-charcoal-900">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <div className="text-4xl mb-4">🔍</div>
              <p className="text-charcoal-600 dark:text-cool-gray-400">Loading search...</p>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    }>
      <SearchContent />
    </Suspense>
  );
}
