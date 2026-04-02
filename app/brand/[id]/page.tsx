'use client';

import { useParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
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

export default function BrandDetailPage() {
  const params = useParams();
  const brandId = params.id as string;
  const [activeTab, setActiveTab] = useState<'all' | 'direct' | 'affiliate'>('all');
  const [isFollowing, setIsFollowing] = useState(false);

  // Mock brand data
  const brand = {
    id: brandId,
    name: 'Gucci',
    logo: 'https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?w=300',
    banner: 'https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?w=1200',
    category: 'Luxury Fashion',
    description: 'Founded in Florence in 1921, Gucci is one of the world\'s leading luxury fashion brands. Known for innovative design, modern Italian craftsmanship and eco-conscious practices.',
    founded: '1921',
    headquarters: 'Florence, Italy',
    verified: true,
    hasDirectStore: true,
    stats: {
      products: 342,
      affiliateVendors: 12,
      followers: 2.4,
      rating: 4.9,
    },
  };

  // Mock products
  const allProducts: Product[] = [
    { id: '1', name: 'Gucci Marmont Bag', price: 2200, image: 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=400', rating: 4.9, soldBy: 'brand' },
    { id: '2', name: 'Gucci Ace Sneakers', price: 650, oldPrice: 750, image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400', rating: 4.8, soldBy: 'brand' },
    { id: '3', name: 'Gucci Belt', price: 420, image: 'https://images.unsplash.com/photo-1624222247344-550fb60583fd?w=400', rating: 4.7, soldBy: 'vendor', vendorName: 'Luxury Fashion Co.' },
    { id: '4', name: 'Gucci Sunglasses', price: 380, image: 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=400', rating: 4.8, soldBy: 'vendor', vendorName: 'Elite Wear' },
    { id: '5', name: 'Gucci Dionysus Bag', price: 2800, oldPrice: 3200, image: 'https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=400', rating: 5.0, soldBy: 'brand' },
    { id: '6', name: 'Gucci Loafers', price: 730, image: 'https://images.unsplash.com/photo-1533867617858-e7b97e060509?w=400', rating: 4.6, soldBy: 'vendor', vendorName: 'Footwear Elite' },
  ];

  const filteredProducts = allProducts.filter(product => {
    if (activeTab === 'direct') return product.soldBy === 'brand';
    if (activeTab === 'affiliate') return product.soldBy === 'vendor';
    return true;
  });

  const handleFollow = () => {
    setIsFollowing(!isFollowing);
    console.log(isFollowing ? 'Unfollowed' : 'Followed', brand.name);
  };

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
