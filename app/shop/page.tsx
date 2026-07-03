'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import Header from '../../components/common/Header';
import Footer from '../../components/common/Footer';
import { useRouter } from 'next/navigation';
import { useCart } from '../../contexts/CartContext';
import { getAuthToken } from '@/lib/api/auth';
import { useToast } from '@/components/common/Toast';

// ── Types ────────────────────────────────────────────────────────────────────
interface ApiProduct {
  id: string;
  _id?: string;
  name: string;
  price: number;
  salePrice?: number;
  images: string[];
  vendorName: string;
  rating: number;
  salesCount: number;
  category: string;
}

interface UiProduct {
  id: string;
  name: string;
  price: number;
  oldPrice?: number;
  image: string;
  vendor: string;
  rating: number;
  sales: number;
  category: string;
}

function normalize(p: ApiProduct): UiProduct {
  return {
    id:       p.id ?? p._id ?? '',
    name:     p.name,
    price:    p.salePrice ?? p.price,
    oldPrice: p.salePrice ? p.price : undefined,
    image:    p.images[0] ?? '',
    vendor:   p.vendorName,
    rating:   p.rating,
    sales:    p.salesCount,
    category: p.category,
  };
}

const PRICE_RANGES: Record<string, { minPrice?: number; maxPrice?: number }> = {
  all:        {},
  under200:   { maxPrice: 200 },
  '200-500':  { minPrice: 200, maxPrice: 500 },
  '500-1000': { minPrice: 500, maxPrice: 1000 },
  over1000:   { minPrice: 1000 },
};

const SORT_MAP: Record<string, string> = {
  popular:      'popular',
  rating:       'rating',
  'price-low':  'price-asc',
  'price-high': 'price-high',
};

const CATEGORY_META: Record<string, { name: string; icon: string }> = {
  all:         { name: 'All',          icon: '✦' },
  women:       { name: "Women's",      icon: '👗' },
  men:         { name: "Men's",        icon: '👔' },
  accessories: { name: 'Accessories',  icon: '👜' },
  footwear:    { name: 'Footwear',     icon: '👟' },
  electronics: { name: 'Electronics', icon: '📱' },
  beauty:      { name: 'Beauty',       icon: '💄' },
  home:        { name: 'Home',         icon: '🏠' },
  Dresses:     { name: 'Dresses',      icon: '👗' },
  Tops:        { name: 'Tops',         icon: '👚' },
  Bottoms:     { name: 'Bottoms',      icon: '👖' },
  Outerwear:   { name: 'Outerwear',    icon: '🧥' },
  Shoes:       { name: 'Shoes',        icon: '👠' },
  Bags:        { name: 'Bags',         icon: '👜' },
  Jewelry:     { name: 'Jewelry',      icon: '💍' },
};
const FALLBACK_CAT_IDS = ['all', 'women', 'men', 'accessories', 'footwear'] as const;

// Star rating renderer
function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <svg key={i} className={`w-3 h-3 ${i <= Math.round(rating) ? 'text-gold-500' : 'text-cool-gray-300 dark:text-charcoal-600'}`}
          fill="currentColor" viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
}

export default function ShopPage() {
  const router  = useRouter();
  const { success: toastSuccess, error: toastError, info: toastInfo } = useToast();

  const [selectedCategory, setSelectedCategory] = useState('all');
  const [priceRange,  setPriceRange]  = useState('all');
  const [sortBy,      setSortBy]      = useState('popular');
  const [searchQuery, setSearchQuery] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [products,     setProducts]     = useState<UiProduct[]>([]);
  const [total,        setTotal]        = useState(0);
  const [dbCategories, setDbCategories] = useState<string[]>([]);
  const [isLoading,    setIsLoading]    = useState(true);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [debouncedSearch, setDebouncedSearch] = useState('');
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedSearch(searchQuery), 400);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [searchQuery]);

  const fetchProducts = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ sort: SORT_MAP[sortBy] ?? 'popular', limit: '24' });
      if (selectedCategory !== 'all') params.set('category', selectedCategory);
      if (debouncedSearch)            params.set('search', debouncedSearch);
      const range = PRICE_RANGES[priceRange];
      if (range?.minPrice) params.set('minPrice', String(range.minPrice));
      if (range?.maxPrice) params.set('maxPrice', String(range.maxPrice));

      const res  = await fetch(`/api/products?${params}`);
      const json = await res.json();
      if (json.success) {
        setProducts((json.data.products as ApiProduct[]).map(normalize));
        setTotal(json.data.pagination.total);
        if (json.data.categories?.length) setDbCategories(json.data.categories);
      }
    } catch (err) {
      console.error('[Shop] fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedCategory, priceRange, sortBy, debouncedSearch]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  const categoryIds = dbCategories.length ? ['all', ...dbCategories] : [...FALLBACK_CAT_IDS];
  const categories  = categoryIds.map(id => ({
    id,
    name: CATEGORY_META[id]?.name ?? id.charAt(0).toUpperCase() + id.slice(1),
    icon: CATEGORY_META[id]?.icon ?? '🏷️',
  }));

  const { addItem } = useCart();

  const handleAddToCart = (productId: string) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    addItem({ productId: product.id, name: product.name, price: product.price,
      image: product.image, vendor: product.vendor, size: 'One Size', color: 'Default', quantity: 1 });
    toastSuccess('Added to cart! 🛍️');
  };

  const handleAddToWishlist = async (productId: string) => {
    const token = getAuthToken();
    if (!token) { toastInfo('Please log in to save items.'); router.push('/auth/login'); return; }
    try {
      const res  = await fetch('/api/wishlist', { method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ productId }) });
      const json = await res.json();
      if (res.ok) toastSuccess('Saved to wishlist ❤️');
      else toastError(json.message || 'Could not save.');
    } catch { toastError('Network error.'); }
  };

  const clearFilters = () => {
    setSelectedCategory('all');
    setPriceRange('all');
    setSortBy('popular');
    setSearchQuery('');
  };

  const discount = (p: UiProduct) =>
    p.oldPrice ? Math.round(((p.oldPrice - p.price) / p.oldPrice) * 100) : 0;

  return (
    <div className="min-h-screen bg-cool-gray-50 dark:bg-charcoal-950">
      <Header />

      {/* ── Hero Banner ─────────────────────────────────────────────────── */}
      <div className="relative h-52 sm:h-64 md:h-72 overflow-hidden">
        <Image src="/images/brand/clw-asset.jpg" alt="Shop CLW" fill
          className="object-cover object-center" priority quality={90} />
        <div className="absolute inset-0 bg-linear-to-r from-charcoal-950/80 via-charcoal-950/50 to-charcoal-950/20" />
        <div className="absolute inset-0 bg-linear-to-t from-charcoal-950/60 via-transparent to-transparent" />
        <div className="relative h-full flex flex-col justify-end pb-8 px-6 sm:px-10 md:px-16">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-px bg-gold-500" />
            <span className="text-gold-400 text-xs font-semibold tracking-widest uppercase">Certified Luxury World</span>
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-display font-bold text-white leading-tight">
            Shop Luxury <span className="text-gold-400">Fashion</span>
          </h1>
          <p className="text-white/70 text-sm sm:text-base mt-1 max-w-md">
            Discover exclusive products from certified luxury brands & vendors
          </p>
        </div>
      </div>

      {/* ── Search Bar ─────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-30 bg-white/95 dark:bg-charcoal-900/95 backdrop-blur border-b border-cool-gray-200 dark:border-charcoal-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3">
          <div className="relative flex-1">
            <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-cool-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input type="text" placeholder="Search products, brands, categories…"
              value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-cool-gray-200 dark:border-charcoal-700 bg-cool-gray-50 dark:bg-charcoal-800 text-charcoal-900 dark:text-white placeholder-cool-gray-400 focus:outline-none focus:border-gold-500 dark:focus:border-gold-500 focus:ring-2 focus:ring-gold-500/20 text-sm transition-all" />
          </div>
          {/* Mobile filter toggle */}
          <button onClick={() => setSidebarOpen(s => !s)}
            className="lg:hidden flex items-center gap-2 px-4 py-2.5 bg-charcoal-900 dark:bg-charcoal-700 text-white rounded-xl text-sm font-semibold shrink-0">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z" />
            </svg>
            Filters
          </button>
        </div>
      </div>

      {/* ── Category Pills ─────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 pt-4 pb-2">
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {categories.map(cat => (
            <button key={cat.id} onClick={() => setSelectedCategory(cat.id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full font-semibold whitespace-nowrap text-xs sm:text-sm transition-all duration-200 border shrink-0 ${
                selectedCategory === cat.id
                  ? 'bg-gold-600 border-gold-600 text-white shadow-md shadow-gold-500/20'
                  : 'bg-white dark:bg-charcoal-800 border-cool-gray-200 dark:border-charcoal-700 text-charcoal-600 dark:text-cool-gray-300 hover:border-gold-400 dark:hover:border-gold-600'
              }`}>
              <span>{cat.icon}</span>
              <span>{cat.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Main Layout ────────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 py-6 flex gap-6">

        {/* ── Sidebar ──────────────────────────────────────────────────── */}
        {/* Mobile overlay */}
        {sidebarOpen && (
          <div className="fixed inset-0 z-40 bg-charcoal-950/60 backdrop-blur-sm lg:hidden"
            onClick={() => setSidebarOpen(false)} />
        )}
        <aside className={`
          fixed lg:relative top-0 left-0 h-full lg:h-auto z-50 lg:z-auto
          w-72 lg:w-64 lg:shrink-0
          transform transition-transform duration-300 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0
          overflow-y-auto lg:overflow-visible
        `}>
          <div className="bg-white dark:bg-charcoal-900 lg:sticky lg:top-24 rounded-2xl border border-cool-gray-200 dark:border-charcoal-800 shadow-lg overflow-hidden">
            {/* Sidebar header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-cool-gray-100 dark:border-charcoal-800">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-md bg-gold-600 flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 4h18M7 8h10M11 12h6M15 16h2" />
                  </svg>
                </div>
                <h2 className="font-bold text-charcoal-900 dark:text-white text-sm">Filters</h2>
              </div>
              <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-cool-gray-400 hover:text-charcoal-900 dark:hover:text-white">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-5 space-y-6">
              {/* Price Range */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-widest text-cool-gray-400 dark:text-cool-gray-500 mb-3">Price Range</h3>
                <div className="space-y-1">
                  {[
                    { value: 'all',        label: 'All Prices' },
                    { value: 'under200',   label: 'Under $200' },
                    { value: '200-500',    label: '$200 – $500' },
                    { value: '500-1000',   label: '$500 – $1,000' },
                    { value: 'over1000',   label: 'Over $1,000' },
                  ].map(o => (
                    <label key={o.value} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors text-sm ${
                      priceRange === o.value
                        ? 'bg-gold-50 dark:bg-gold-900/20 text-gold-700 dark:text-gold-400 font-semibold'
                        : 'text-charcoal-700 dark:text-cool-gray-300 hover:bg-cool-gray-50 dark:hover:bg-charcoal-800'
                    }`}>
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                        priceRange === o.value ? 'border-gold-600 bg-gold-600' : 'border-cool-gray-300 dark:border-charcoal-600'
                      }`}>
                        {priceRange === o.value && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </div>
                      <input type="radio" name="priceRange" value={o.value}
                        checked={priceRange === o.value}
                        onChange={(e) => setPriceRange(e.target.value)}
                        className="sr-only" />
                      {o.label}
                    </label>
                  ))}
                </div>
              </div>

              {/* Sort By */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-widest text-cool-gray-400 dark:text-cool-gray-500 mb-3">Sort By</h3>
                <div className="space-y-1">
                  {[
                    { value: 'popular',    label: 'Most Popular' },
                    { value: 'rating',     label: 'Highest Rated' },
                    { value: 'price-low',  label: 'Price: Low → High' },
                    { value: 'price-high', label: 'Price: High → Low' },
                  ].map(o => (
                    <button key={o.value} onClick={() => setSortBy(o.value)}
                      className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors ${
                        sortBy === o.value
                          ? 'bg-gold-50 dark:bg-gold-900/20 text-gold-700 dark:text-gold-400 font-semibold'
                          : 'text-charcoal-700 dark:text-cool-gray-300 hover:bg-cool-gray-50 dark:hover:bg-charcoal-800'
                      }`}>
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Clear */}
              <button onClick={clearFilters}
                className="w-full py-2.5 border border-cool-gray-200 dark:border-charcoal-700 text-charcoal-600 dark:text-cool-gray-300 rounded-xl text-sm font-semibold hover:border-gold-500 hover:text-gold-600 transition-colors">
                Clear All Filters
              </button>
            </div>
          </div>
        </aside>

        {/* ── Products Grid ──────────────────────────────────────────── */}
        <div className="flex-1 min-w-0">
          {/* Results bar */}
          <div className="flex items-center justify-between mb-5">
            <p className="text-sm text-cool-gray-500 dark:text-cool-gray-400">
              <span className="font-bold text-charcoal-900 dark:text-white">{total.toLocaleString()}</span> products
              {selectedCategory !== 'all' && (
                <span className="ml-1">in <span className="text-gold-600 font-semibold capitalize">{selectedCategory}</span></span>
              )}
            </p>
            {(selectedCategory !== 'all' || priceRange !== 'all' || searchQuery) && (
              <button onClick={clearFilters} className="text-xs text-gold-600 hover:text-gold-700 font-semibold flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Clear filters
              </button>
            )}
          </div>

          {/* Skeleton loading */}
          {isLoading && (
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="bg-white dark:bg-charcoal-900 rounded-2xl overflow-hidden animate-pulse border border-cool-gray-100 dark:border-charcoal-800">
                  <div className="aspect-square bg-cool-gray-100 dark:bg-charcoal-800" />
                  <div className="p-4 space-y-2.5">
                    <div className="h-2 bg-cool-gray-100 dark:bg-charcoal-800 rounded-full w-1/3" />
                    <div className="h-3 bg-cool-gray-100 dark:bg-charcoal-800 rounded-full" />
                    <div className="h-3 bg-cool-gray-100 dark:bg-charcoal-800 rounded-full w-2/3" />
                    <div className="h-8 bg-cool-gray-100 dark:bg-charcoal-800 rounded-xl mt-3" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Product cards */}
          {!isLoading && products.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {products.map(product => (
                <div key={product.id} className="group bg-white dark:bg-charcoal-900 rounded-2xl overflow-hidden border border-cool-gray-100 dark:border-charcoal-800 hover:border-gold-400 dark:hover:border-gold-700 hover:shadow-xl hover:shadow-charcoal-900/10 dark:hover:shadow-gold-900/10 transition-all duration-300">
                  {/* Image */}
                  <button onClick={() => router.push(`/product/${product.id}`)}
                    className="relative aspect-square w-full overflow-hidden block">
                    <Image
                      src={product.image || '/images/placeholder-product.jpg'}
                      alt={product.name} fill
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                      onError={(e) => { (e.target as HTMLImageElement).src = '/images/placeholder-product.jpg'; }}
                    />
                    {/* Overlay */}
                    <div className="absolute inset-0 bg-linear-to-t from-charcoal-950/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                    {/* Sale badge */}
                    {product.oldPrice && (
                      <span className="absolute top-2.5 left-2.5 px-2 py-0.5 bg-red-600 text-white text-[10px] font-bold rounded-md tracking-wide uppercase shadow-sm">
                        -{discount(product)}%
                      </span>
                    )}

                    {/* Wishlist */}
                    <button onClick={(e) => { e.stopPropagation(); handleAddToWishlist(product.id); }}
                      className="absolute top-2.5 right-2.5 w-8 h-8 bg-white dark:bg-charcoal-800 rounded-full flex items-center justify-center shadow-md opacity-0 group-hover:opacity-100 hover:bg-red-50 dark:hover:bg-red-900/30 transition-all duration-200 hover:scale-110"
                      aria-label="Save to wishlist">
                      <svg className="w-4 h-4 text-charcoal-600 dark:text-cool-gray-300 hover:text-red-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                      </svg>
                    </button>

                    {/* Quick view on hover */}
                    <div className="absolute bottom-3 inset-x-3 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0">
                      <span className="block w-full text-center py-2 bg-white/90 dark:bg-charcoal-900/90 backdrop-blur text-charcoal-900 dark:text-white text-xs font-semibold rounded-xl border border-gold-200 dark:border-gold-800">
                        View Product
                      </span>
                    </div>
                  </button>

                  {/* Details */}
                  <div className="p-3 sm:p-4">
                    <p className="text-[10px] sm:text-xs text-cool-gray-400 dark:text-cool-gray-500 mb-1 truncate uppercase tracking-wide font-medium">{product.vendor}</p>
                    <h3 className="font-semibold text-xs sm:text-sm text-charcoal-900 dark:text-white mb-2 line-clamp-2 leading-snug group-hover:text-gold-600 dark:group-hover:text-gold-400 transition-colors">
                      {product.name}
                    </h3>

                    <div className="flex items-center gap-1.5 mb-2.5">
                      <Stars rating={product.rating} />
                      <span className="text-[10px] text-cool-gray-400">({product.sales})</span>
                    </div>

                    <div className="flex items-center gap-2 mb-3">
                      <span className="font-bold text-sm sm:text-base text-charcoal-900 dark:text-white">
                        ${product.price.toFixed(2)}
                      </span>
                      {product.oldPrice && (
                        <span className="text-[10px] sm:text-xs text-cool-gray-400 line-through">
                          ${product.oldPrice.toFixed(2)}
                        </span>
                      )}
                    </div>

                    <button onClick={() => handleAddToCart(product.id)}
                      className="w-full py-2 sm:py-2.5 bg-charcoal-900 dark:bg-gold-600 hover:bg-gold-600 dark:hover:bg-gold-500 text-white rounded-xl font-semibold text-[11px] sm:text-xs transition-all duration-200 active:scale-95 border border-transparent hover:border-gold-500">
                      Add to Cart
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Empty state */}
          {!isLoading && products.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-20 h-20 rounded-full bg-cool-gray-100 dark:bg-charcoal-800 flex items-center justify-center mb-5">
                <svg className="w-9 h-9 text-cool-gray-300 dark:text-charcoal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-charcoal-900 dark:text-white mb-2">No products found</h3>
              <p className="text-cool-gray-500 dark:text-cool-gray-400 text-sm mb-6 max-w-xs">
                Try adjusting your search or filters to discover more luxury items.
              </p>
              <button onClick={clearFilters}
                className="px-6 py-3 bg-gold-600 hover:bg-gold-700 text-white rounded-xl font-semibold text-sm transition-colors">
                Clear Filters
              </button>
            </div>
          )}
        </div>
      </div>

      <Footer />
    </div>
  );
}
