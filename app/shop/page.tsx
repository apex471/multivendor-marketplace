'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import Header from '../../components/common/Header';
import Footer from '../../components/common/Footer';
import { useRouter } from 'next/navigation';

// ── Types ────────────────────────────────────────────────────────────────────
interface ApiProduct {
  _id: string;
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
    id:       p._id,
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
// ─────────────────────────────────────────────────────────────────────────────
const CATEGORY_META: Record<string, { name: string; icon: string }> = {
  all:         { name: 'All Products',    icon: '🛍️' },
  women:       { name: "Women's Fashion", icon: '👗' },
  men:         { name: "Men's Fashion",   icon: '👔' },
  accessories: { name: 'Accessories',     icon: '👜' },
  footwear:    { name: 'Footwear',        icon: '👟' },
  electronics: { name: 'Electronics',     icon: '📱' },
  beauty:      { name: 'Beauty',          icon: '💄' },
  home:        { name: 'Home & Living',   icon: '🏠' },
};
const FALLBACK_CAT_IDS = ['all', 'women', 'men', 'accessories', 'footwear'] as const;
// ─────────────────────────────────────────────────────────────────────────────

export default function ShopPage() {
  const router = useRouter();

  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [priceRange,  setPriceRange]  = useState<string>('all');
  const [sortBy,      setSortBy]      = useState<string>('popular');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const [products,     setProducts]     = useState<UiProduct[]>([]);
  const [total,        setTotal]        = useState(0);
  const [dbCategories, setDbCategories] = useState<string[]>([]);
  const [isLoading,    setIsLoading]    = useState(true);

  // Debounce search — avoid API calls on every keystroke
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
      const params = new URLSearchParams({
        sort:  SORT_MAP[sortBy] ?? 'popular',
        limit: '24',
      });
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

  // Build category list from DB; fall back to hardcoded set until first API response
  const categoryIds = dbCategories.length ? ['all', ...dbCategories] : [...FALLBACK_CAT_IDS];
  const categories = categoryIds.map(id => ({
    id,
    name: CATEGORY_META[id]?.name ?? id.charAt(0).toUpperCase() + id.slice(1),
    icon: CATEGORY_META[id]?.icon ?? '🏷️',
  }));

  const handleAddToCart = (productId: string) => {
    console.log('Adding to cart:', productId);
    alert('Product added to cart!');
  };

  const handleAddToWishlist = (productId: string) => {
    console.log('Adding to wishlist:', productId);
    alert('Product added to wishlist!');
  };

  return (
    <div className="min-h-screen bg-white dark:bg-charcoal-900">
      <Header />

      <div className="container mx-auto px-4 py-6 sm:py-8 md:py-12">
        {/* Page Header */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-display font-bold text-charcoal-900 dark:text-white mb-2">Shop Luxury Fashion</h1>
          <p className="text-sm sm:text-base text-charcoal-600 dark:text-cool-gray-400">Discover exclusive products from certified luxury vendors</p>
        </div>

        {/* Search Bar */}
        <div className="mb-6 sm:mb-8">
          <div className="relative">
            <input
              type="text"
              placeholder="Search products, brands..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 sm:px-6 py-3 sm:py-4 pr-12 rounded-lg border border-cool-gray-300 dark:border-charcoal-700 bg-white dark:bg-charcoal-800 text-charcoal-900 dark:text-white focus:outline-none focus:border-gold-600 text-sm sm:text-base"
            />
            <button className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 text-primary-600 text-lg sm:text-xl">
              🔍
            </button>
          </div>
        </div>

        {/* Categories */}
        <div className="mb-6 sm:mb-8">
          <div className="flex gap-2 sm:gap-3 overflow-x-auto pb-2 scrollbar-hide">
            {categories.map(category => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`flex items-center gap-1.5 sm:gap-2 px-4 sm:px-6 py-2 sm:py-3 rounded-lg font-semibold whitespace-nowrap transition-all text-xs sm:text-sm touch-manipulation min-h-9 ${
                  selectedCategory === category.id
                    ? 'bg-gold-600 text-white'
                    : 'bg-white dark:bg-charcoal-800 text-charcoal-700 dark:text-cool-gray-300 hover:bg-cool-gray-100 dark:hover:bg-charcoal-700'
                }`}
              >
                <span className="text-base sm:text-lg">{category.icon}</span>
                <span>{category.name}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="grid lg:grid-cols-4 gap-6 sm:gap-8">
          {/* Filters Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg sm:rounded-xl p-4 sm:p-6 sticky top-4">
              <h2 className="text-lg sm:text-xl font-display font-bold text-gray-900 mb-4 sm:mb-6">Filters</h2>

              {/* Price Range */}
              <div className="mb-6">
                <h3 className="font-semibold text-gray-900 mb-3 text-sm sm:text-base">Price Range</h3>
                <div className="space-y-2">
                  {[
                    { value: 'all', label: 'All Prices' },
                    { value: 'under200', label: 'Under $200' },
                    { value: '200-500', label: '$200 - $500' },
                    { value: '500-1000', label: '$500 - $1,000' },
                    { value: 'over1000', label: 'Over $1,000' },
                  ].map(option => (
                    <label key={option.value} className="flex items-center gap-2 cursor-pointer text-sm sm:text-base touch-manipulation">
                      <input
                        type="radio"
                        name="priceRange"
                        value={option.value}
                        checked={priceRange === option.value}
                        onChange={(e) => setPriceRange(e.target.value)}
                        className="w-4 h-4 text-primary-600"
                      />
                      <span className="text-gray-700">{option.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Sort By */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-3 text-sm sm:text-base">Sort By</h3>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-full px-3 sm:px-4 py-2 sm:py-3 rounded-lg border border-gray-300 focus:outline-none focus:border-primary-600 text-sm sm:text-base"
                >
                  <option value="popular">Most Popular</option>
                  <option value="rating">Highest Rated</option>
                  <option value="price-low">Price: Low to High</option>
                  <option value="price-high">Price: High to Low</option>
                </select>
              </div>

              {/* Clear Filters */}
              <button
                onClick={() => {
                  setSelectedCategory('all');
                  setPriceRange('all');
                  setSortBy('popular');
                  setSearchQuery('');
                }}
                className="w-full mt-6 px-4 py-2 sm:py-3 border-2 border-primary-700 text-primary-700 rounded-lg font-semibold hover:bg-primary-50 transition-colors text-sm sm:text-base touch-manipulation min-h-10"
              >
                Clear All Filters
              </button>
            </div>
          </div>

          {/* Products Grid */}
          <div className="lg:col-span-3">
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <p className="text-sm sm:text-base text-gray-600">
                <span className="font-semibold text-gray-900">{total}</span> products found
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
              {isLoading && Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="bg-white rounded-xl overflow-hidden shadow-md animate-pulse">
                  <div className="aspect-square bg-cool-gray-200 dark:bg-charcoal-700" />
                  <div className="p-3 space-y-2">
                    <div className="h-3 bg-cool-gray-200 dark:bg-charcoal-700 rounded w-2/3" />
                    <div className="h-4 bg-cool-gray-200 dark:bg-charcoal-700 rounded" />
                    <div className="h-3 bg-cool-gray-200 dark:bg-charcoal-700 rounded w-1/2" />
                    <div className="h-8 bg-cool-gray-200 dark:bg-charcoal-700 rounded mt-2" />
                  </div>
                </div>
              ))}
              {!isLoading && products.map(product => (
                <div key={product.id} className="group relative">
                  <div className="bg-white rounded-lg sm:rounded-xl overflow-hidden shadow-md hover:shadow-xl transition-all">
                    <button
                      onClick={() => router.push(`/product/${product.id}`)}
                      className="relative aspect-square overflow-hidden w-full touch-manipulation"
                    >
                      <Image
                        src={product.image}
                        alt={product.name}
                        fill
                        className="object-cover group-hover:scale-110 transition-transform duration-300"
                      />
                      {product.oldPrice && (
                        <span className="absolute top-1.5 left-1.5 sm:top-2 sm:left-2 px-1.5 py-0.5 sm:px-2 sm:py-1 bg-red-600 text-white text-[10px] sm:text-xs font-bold rounded">
                          SALE
                        </span>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAddToWishlist(product.id);
                        }}
                        className="absolute top-1.5 right-1.5 sm:top-2 sm:right-2 w-7 h-7 sm:w-8 sm:h-8 bg-white/90 sm:bg-white rounded-full flex items-center justify-center shadow-md hover:bg-red-50 transition-colors touch-manipulation text-xs sm:text-sm"
                        aria-label="Add to wishlist"
                      >
                        ❤️
                      </button>
                    </button>
                    <div className="p-2 sm:p-3">
                      <p className="text-[10px] sm:text-xs text-gray-500 mb-0.5 sm:mb-1 truncate">{product.vendor}</p>
                      <h3 className="font-semibold text-xs sm:text-sm text-gray-900 mb-1 sm:mb-2 line-clamp-2 leading-tight">
                        {product.name}
                      </h3>
                      <div className="flex items-center gap-0.5 sm:gap-1 mb-1 sm:mb-2">
                        <span className="text-yellow-500 text-[10px] sm:text-xs">⭐</span>
                        <span className="text-[10px] sm:text-xs font-medium text-gray-700">{product.rating}</span>
                        <span className="text-[10px] sm:text-xs text-gray-500">({product.sales})</span>
                      </div>
                      <div className="flex items-center gap-1 sm:gap-2 mb-1.5 sm:mb-2">
                        <span className="font-bold text-sm sm:text-base text-gray-900">${product.price}</span>
                        {product.oldPrice && (
                          <span className="text-[10px] sm:text-xs text-gray-500 line-through">${product.oldPrice}</span>
                        )}
                      </div>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          handleAddToCart(product.id);
                        }}
                        className="w-full py-1.5 sm:py-2 min-h-9 bg-primary-700 text-white rounded-lg hover:bg-primary-800 active:scale-95 transition-all font-semibold text-[11px] sm:text-xs touch-manipulation"
                      >
                        Add to Cart
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Empty State */}
            {!isLoading && products.length === 0 && (
              <div className="text-center py-12 sm:py-16">
                <div className="text-5xl sm:text-6xl mb-4">🔍</div>
                <h3 className="text-xl sm:text-2xl font-display font-bold text-gray-900 mb-2">No products found</h3>
                <p className="text-sm sm:text-base text-gray-600 mb-6">Try adjusting your filters or search terms</p>
                <button
                  onClick={() => {
                    setSelectedCategory('all');
                    setPriceRange('all');
                    setSearchQuery('');
                  }}
                  className="px-6 py-3 bg-primary-700 text-white rounded-lg font-semibold hover:bg-primary-800 transition-colors text-sm sm:text-base touch-manipulation min-h-11"
                >
                  Clear Filters
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
