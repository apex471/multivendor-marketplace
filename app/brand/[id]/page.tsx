'use client';

import { useParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import Header from '@/components/common/Header';
import Footer from '@/components/common/Footer';

interface Product {
  id: string;
  name: string;
  price: number;
  oldPrice?: number;
  image: string;
  rating: number;
  soldBy: 'brand' | 'vendor';
  vendorName?: string;
}

interface BrandData {
  id: string;
  name: string;
  logo: string;
  banner: string;
  category: string;
  description: string;
  founded: string;
  headquarters: string;
  verified: boolean;
  hasDirectStore: boolean;
  stats: { products: number; affiliateVendors: number; followers: number; rating: number };
}

export default function BrandDetailPage() {
  const params = useParams();
  const brandId = params.id as string;
  const [activeTab, setActiveTab] = useState<'all' | 'direct' | 'affiliate'>('all');
  const [isFollowing, setIsFollowing] = useState(false);
  const [brand, setBrand] = useState<BrandData | null>(null);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!brandId) return;
    fetch(`/api/brands/${brandId}`)
      .then(r => r.json())
      .then(json => {
        if (!json.success || !json.data?.brand) return;
        const b = json.data.brand;
        setBrand({
          id:             String(b.id),
          name:           b.name,
          logo:           b.avatar || 'https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?w=300',
          banner:         'https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?w=1200',
          category:       'Brand',
          description:    b.bio || `Welcome to ${b.name}.`,
          founded:        new Date(b.joinedAt).getFullYear().toString(),
          headquarters:   '',
          verified:       true,
          hasDirectStore: true,
          stats: {
            products:         b.productCount,
            affiliateVendors: 0,
            followers:        0,
            rating:           4.5,
          },
        });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setAllProducts((json.data.products ?? []).map((p: any) => ({
          id:         String(p.id),
          name:       p.name,
          price:      p.price,
          oldPrice:   p.oldPrice,
          image:      p.image,
          rating:     p.rating ?? 0,
          soldBy:     'brand' as const,
        })));
      })
      .finally(() => setIsLoading(false));
  }, [brandId]);

  const filteredProducts = allProducts.filter(product => {
    if (activeTab === 'direct') return product.soldBy === 'brand';
    if (activeTab === 'affiliate') return product.soldBy === 'vendor';
    return true;
  });

  const handleFollow = async () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
    if (!token) { alert('Please log in to follow brands'); return; }
    const method = isFollowing ? 'DELETE' : 'POST';
    const url = isFollowing ? `/api/follow?followingId=${brandId}` : '/api/follow';
    const opts: RequestInit = {
      method,
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    };
    if (!isFollowing) opts.body = JSON.stringify({ followingId: brandId });
    await fetch(url, opts);
    setIsFollowing(!isFollowing);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white dark:bg-charcoal-900 flex items-center justify-center">
        <div className="text-center"><div className="text-6xl mb-4">⏳</div><p className="text-charcoal-600 dark:text-cool-gray-400">Loading brand...</p></div>
      </div>
    );
  }

  if (!brand) {
    return (
      <div className="min-h-screen bg-white dark:bg-charcoal-900 flex items-center justify-center">
        <div className="text-center"><div className="text-6xl mb-4">❌</div><p className="text-charcoal-600 dark:text-cool-gray-400">Brand not found</p></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-charcoal-900">
      <Header />

      {/* Banner */}
      <div className="relative h-48 sm:h-64 md:h-80 bg-linear-to-br from-charcoal-800 to-charcoal-900 overflow-hidden">
        <Image
          src={brand.banner}
          alt={brand.name}
          fill
          className="object-cover opacity-60"
          priority
        />
        <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/40 to-transparent"></div>
      </div>

      <div className="container mx-auto px-4 -mt-16 sm:-mt-20 relative z-10">
        {/* Brand Header Card */}
        <div className="bg-white dark:bg-charcoal-800 rounded-2xl shadow-xl p-6 sm:p-8 mb-8">
          <div className="flex flex-col sm:flex-row gap-6">
            {/* Logo */}
            <div className="flex-shrink-0">
              <div className="w-24 h-24 sm:w-32 sm:h-32 bg-white dark:bg-charcoal-700 rounded-2xl shadow-lg border-4 border-cool-gray-100 dark:border-charcoal-600 overflow-hidden mx-auto sm:mx-0">
                <Image
                  src={brand.logo}
                  alt={brand.name}
                  width={128}
                  height={128}
                  className="w-full h-full object-cover"
                />
              </div>
            </div>

            {/* Brand Info */}
            <div className="flex-1">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-4">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h1 className="text-3xl font-bold text-charcoal-900 dark:text-white">{brand.name}</h1>
                    {brand.verified && (
                      <span className="px-3 py-1 bg-blue-600 text-white text-xs font-semibold rounded-full flex items-center gap-1">
                        <span>✓</span>
                        <span>Official</span>
                      </span>
                    )}
                  </div>
                  <p className="text-gold-600 font-semibold mb-2">{brand.category}</p>
                  <p className="text-sm text-charcoal-600 dark:text-cool-gray-400">
                    Founded {brand.founded} • {brand.headquarters}
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2">
                  <button
                    onClick={handleFollow}
                    className={`px-6 py-2 rounded-lg font-semibold transition-colors ${
                      isFollowing
                        ? 'bg-cool-gray-200 dark:bg-charcoal-700 text-charcoal-700 dark:text-cool-gray-300 hover:bg-cool-gray-300 dark:hover:bg-charcoal-600'
                        : 'bg-gold-600 text-white hover:bg-gold-700'
                    }`}
                  >
                    {isFollowing ? 'Following' : 'Follow Brand'}
                  </button>
                  <button className="px-4 py-2 border-2 border-cool-gray-300 dark:border-charcoal-600 text-charcoal-700 dark:text-cool-gray-300 rounded-lg hover:bg-cool-gray-50 dark:hover:bg-charcoal-700 transition-colors">
                    <span className="text-xl">🔔</span>
                  </button>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                <div>
                  <div className="text-2xl font-bold text-charcoal-900 dark:text-white">{brand.stats.products}</div>
                  <div className="text-sm text-charcoal-600 dark:text-cool-gray-400">Products</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-charcoal-900 dark:text-white">{brand.stats.followers}M</div>
                  <div className="text-sm text-charcoal-600 dark:text-cool-gray-400">Followers</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-charcoal-900 dark:text-white">{brand.stats.affiliateVendors}</div>
                  <div className="text-sm text-charcoal-600 dark:text-cool-gray-400">Authorized Sellers</div>
                </div>
                <div>
                  <div className="flex items-center gap-1">
                    <span className="text-2xl font-bold text-charcoal-900 dark:text-white">{brand.stats.rating}</span>
                    <span className="text-yellow-500 text-xl">⭐</span>
                  </div>
                  <div className="text-sm text-charcoal-600 dark:text-cool-gray-400">Average Rating</div>
                </div>
              </div>

              {/* Description */}
              <p className="text-charcoal-700 dark:text-cool-gray-300 leading-relaxed">{brand.description}</p>
            </div>
          </div>

          {/* Special Badges */}
          <div className="mt-6 flex flex-wrap gap-2">
            {brand.hasDirectStore && (
              <span className="px-3 py-1.5 bg-green-100 text-green-700 text-sm font-semibold rounded-lg">
                🏪 Official Brand Store
              </span>
            )}
            <span className="px-3 py-1.5 bg-purple-100 text-purple-700 text-sm font-semibold rounded-lg">
              🌿 Eco-Conscious
            </span>
            <span className="px-3 py-1.5 bg-orange-100 text-orange-700 text-sm font-semibold rounded-lg">
              🚚 Fast Shipping Available
            </span>
          </div>
        </div>

        {/* Product Filters */}
        <div className="bg-white dark:bg-charcoal-800 rounded-xl shadow-md p-4 mb-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex gap-2 overflow-x-auto">
              <button
                onClick={() => setActiveTab('all')}
                className={`px-4 py-2 rounded-lg font-semibold whitespace-nowrap transition-colors ${
                  activeTab === 'all'
                    ? 'bg-gold-600 text-white'
                    : 'bg-cool-gray-100 dark:bg-charcoal-700 text-charcoal-700 dark:text-cool-gray-300 hover:bg-cool-gray-200 dark:hover:bg-charcoal-600'
                }`}
              >
                All Products ({allProducts.length})
              </button>
              <button
                onClick={() => setActiveTab('direct')}
                className={`px-4 py-2 rounded-lg font-semibold whitespace-nowrap transition-colors ${
                  activeTab === 'direct'
                    ? 'bg-gold-600 text-white'
                    : 'bg-cool-gray-100 dark:bg-charcoal-700 text-charcoal-700 dark:text-cool-gray-300 hover:bg-cool-gray-200 dark:hover:bg-charcoal-600'
                }`}
              >
                Official Store ({allProducts.filter(p => p.soldBy === 'brand').length})
              </button>
              <button
                onClick={() => setActiveTab('affiliate')}
                className={`px-4 py-2 rounded-lg font-semibold whitespace-nowrap transition-colors ${
                  activeTab === 'affiliate'
                    ? 'bg-gold-600 text-white'
                    : 'bg-cool-gray-100 dark:bg-charcoal-700 text-charcoal-700 dark:text-cool-gray-300 hover:bg-cool-gray-200 dark:hover:bg-charcoal-600'
                }`}
              >
                From Sellers ({allProducts.filter(p => p.soldBy === 'vendor').length})
              </button>
            </div>
          </div>
        </div>

        {/* Products Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6 mb-12">
          {filteredProducts.map((product) => (
            <Link
              key={product.id}
              href={`/product/${product.id}`}
              className="group bg-white dark:bg-charcoal-800 rounded-xl overflow-hidden shadow-md hover:shadow-xl transition-all hover:-translate-y-1"
            >
              <div className="relative aspect-square bg-cool-gray-100 dark:bg-charcoal-700 overflow-hidden">
                <Image
                  src={product.image}
                  alt={product.name}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform"
                />
                {product.oldPrice && (
                  <div className="absolute top-2 right-2 px-2 py-1 bg-red-600 text-white text-xs font-semibold rounded">
                    SALE
                  </div>
                )}
                {product.soldBy === 'brand' && (
                  <div className="absolute top-2 left-2 px-2 py-1 bg-green-600 text-white text-xs font-semibold rounded">
                    Official
                  </div>
                )}
              </div>
              <div className="p-4">
                <h3 className="font-semibold text-charcoal-900 dark:text-white mb-2 line-clamp-2 group-hover:text-gold-600 transition-colors">
                  {product.name}
                </h3>
                {product.soldBy === 'vendor' && (
                  <p className="text-xs text-charcoal-600 dark:text-cool-gray-400 mb-2">Sold by: {product.vendorName}</p>
                )}
                <div className="flex items-center gap-1 mb-2">
                  <span className="text-yellow-500">⭐</span>
                  <span className="text-sm font-semibold text-charcoal-900 dark:text-white">{product.rating}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold text-charcoal-900 dark:text-white">${product.price}</span>
                  {product.oldPrice && (
                    <span className="text-sm text-cool-gray-500 dark:text-cool-gray-400 line-through">${product.oldPrice}</span>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      <Footer />
    </div>
  );
}
