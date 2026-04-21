'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import Header from '../../../components/common/Header';
import Footer from '../../../components/common/Footer';

interface Product {
  id: string;
  name: string;
  price: number;
  oldPrice?: number;
  image: string;
  rating: number;
  reviewCount: number;
}

interface BrandData {
  id: string;
  name: string;
  bio: string;
  avatar: string | null;
  joinedAt: string;
  productCount: number;
}

export default function BrandPage() {
  const params = useParams();
  const brandId = params?.id as string;
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('featured');

  const [brand, setBrand] = useState<BrandData | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!brandId) return;
    fetch(`/api/brands/${brandId}`)
      .then(r => r.json())
      .then(json => {
        if (!json.success || !json.data?.brand) { setNotFound(true); return; }
        setBrand(json.data.brand);
        setProducts(json.data.products ?? []);
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [brandId]);

  const _activeCategory = activeCategory;

  const sortedProducts = [...products].sort((a, b) => {
    if (sortBy === 'price-low') return a.price - b.price;
    if (sortBy === 'price-high') return b.price - a.price;
    if (sortBy === 'rating') return b.rating - a.rating;
    return 0;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-white dark:bg-charcoal-900">
        <Header />
        <div className="container mx-auto px-4 py-24 text-center">
          <div className="text-5xl mb-4 animate-pulse">🏷️</div>
          <p className="text-charcoal-600 dark:text-cool-gray-400">Loading brand…</p>
        </div>
        <Footer />
      </div>
    );
  }

  if (notFound || !brand) {
    return (
      <div className="min-h-screen bg-white dark:bg-charcoal-900">
        <Header />
        <div className="container mx-auto px-4 py-24 text-center">
          <div className="text-6xl mb-4">🔍</div>
          <h2 className="text-2xl font-bold text-charcoal-900 dark:text-white mb-2">Brand not found</h2>
          <Link href="/brands" className="px-6 py-3 bg-gold-600 text-white rounded-xl font-semibold hover:bg-gold-700 transition-colors">
            Browse Brands
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-charcoal-900">
      <Header />

      {/* Brand Hero Section */}
      <div className="relative h-48 md:h-64 bg-charcoal-800">
        <div className="absolute inset-0 bg-linear-to-t from-black/60 to-transparent flex items-end">
          <div className="container mx-auto px-4 pb-8">
            <div className="flex items-end gap-6">
              <div className="relative w-20 h-20 md:w-28 md:h-28 rounded-full overflow-hidden border-4 border-white dark:border-charcoal-900 bg-charcoal-200 shrink-0">
                {brand.avatar ? (
                  <Image src={brand.avatar} alt={brand.name} fill className="object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-3xl bg-gold-100">🏷️</div>
                )}
              </div>
              <div className="mb-2">
                <h1 className="text-3xl md:text-4xl font-bold text-white mb-1">{brand.name}</h1>
                <p className="text-sm text-white/80">
                  Member since {new Date(brand.joinedAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Brand Stats */}
        <div className="bg-white dark:bg-charcoal-800 rounded-lg border border-cool-gray-300 dark:border-charcoal-700 p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="text-center">
              <p className="text-2xl font-bold text-charcoal-900 dark:text-white mb-1">{brand.productCount}</p>
              <p className="text-sm text-charcoal-600 dark:text-cool-gray-400">Products</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-charcoal-900 dark:text-white mb-1">
                {new Date(brand.joinedAt).getFullYear()}
              </p>
              <p className="text-sm text-charcoal-600 dark:text-cool-gray-400">Member Since</p>
            </div>
          </div>

          {brand.bio && (
            <p className="mt-4 text-charcoal-700 dark:text-cool-gray-300 text-center leading-relaxed">{brand.bio}</p>
          )}

          <div className="flex flex-wrap gap-3 mt-6 justify-center">
            <button className="px-6 py-2 bg-gold-600 text-white rounded-lg hover:bg-gold-700 transition-colors font-semibold">
              ➕ Follow Brand
            </button>
          </div>
        </div>

        {/* Products Section */}
        <div>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
            <h2 className="text-2xl font-bold text-charcoal-900 dark:text-white mb-4 md:mb-0">All Products</h2>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-4 py-2 border border-cool-gray-300 dark:border-charcoal-700 rounded-lg bg-white dark:bg-charcoal-800 focus:outline-none focus:ring-2 focus:ring-gold-600"
            >
              <option value="featured">Featured</option>
              <option value="price-low">Price: Low to High</option>
              <option value="price-high">Price: High to Low</option>
              <option value="rating">Highest Rated</option>
            </select>
          </div>

          {/* Category Filter */}
          <div className="flex gap-3 mb-6 overflow-x-auto pb-2">
            {['all', 'clothing', 'accessories', 'footwear', 'jewelry'].map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-4 py-2 rounded-lg font-semibold whitespace-nowrap transition-colors ${
                  activeCategory === cat
                    ? 'bg-gold-600 text-white'
                    : 'bg-white dark:bg-charcoal-800 border border-cool-gray-300 dark:border-charcoal-700 hover:bg-cool-gray-50 dark:hover:bg-charcoal-700'
                }`}
              >
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </button>
            ))}
          </div>

          {sortedProducts.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-6xl mb-4">📦</div>
              <h3 className="text-xl font-bold text-charcoal-900 dark:text-white mb-2">No products yet</h3>
              <p className="text-charcoal-600 dark:text-cool-gray-400">This brand hasn&apos;t listed any products yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
              {sortedProducts.map((product) => (
                <Link
                  key={product.id}
                  href={`/product/${product.id}`}
                  className="group bg-white dark:bg-charcoal-800 rounded-lg overflow-hidden border border-cool-gray-300 dark:border-charcoal-700 hover:shadow-lg transition-all"
                >
                  <div className="relative aspect-square overflow-hidden">
                    <Image src={product.image} alt={product.name} fill className="object-cover group-hover:scale-105 transition-transform duration-300" />
                    {product.oldPrice && (
                      <div className="absolute top-2 right-2 bg-red-600 text-white px-2 py-1 rounded text-xs font-bold">SALE</div>
                    )}
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold text-charcoal-900 dark:text-white mb-2 line-clamp-2">{product.name}</h3>
                    <div className="flex items-center gap-1 mb-2">
                      <span className="text-gold-600">⭐</span>
                      <span className="text-sm font-semibold">{product.rating.toFixed(1)}</span>
                      <span className="text-xs text-charcoal-600 dark:text-cool-gray-400">({product.reviewCount})</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <p className="text-lg font-bold text-gold-600">${product.price.toFixed(2)}</p>
                      {product.oldPrice && (
                        <p className="text-sm text-charcoal-600 dark:text-cool-gray-400 line-through">${product.oldPrice.toFixed(2)}</p>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      <Footer />
    </div>
  );
}
