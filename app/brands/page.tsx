'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import Header from '@/components/common/Header';
import Footer from '@/components/common/Footer';

interface Brand {
  id: string;
  name: string;
  logo: string;
  banner: string;
  category: string;
  description: string;
  products: number;
  verified: boolean;
  hasDirectStore: boolean;
  affiliateVendors: number;
  rating: number;
  followers: string;
}

export default function BrandsPage() {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const categories = [
    { id: 'all', name: 'All Brands', icon: '🏷️' },
    { id: 'luxury', name: 'Luxury Fashion', icon: '💎' },
    { id: 'sportswear', name: 'Sportswear', icon: '⚽' },
    { id: 'designer', name: 'Designer', icon: '👗' },
    { id: 'athletic', name: 'Athletic', icon: '🏃' },
    { id: 'fast-fashion', name: 'Contemporary', icon: '✨' },
    { id: 'watches', name: 'Watches', icon: '⌚' },
    { id: 'accessories', name: 'Accessories', icon: '👜' },
  ];

  const allBrands: Brand[] = [
    { 
      id: '1', 
      name: 'Gucci', 
      logo: 'https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?w=200',
      banner: 'https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?w=800',
      category: 'luxury',
      description: 'Italian luxury fashion house',
      products: 342,
      verified: true,
      hasDirectStore: true,
      affiliateVendors: 12,
      rating: 4.9,
      followers: '2.4M'
    },
    { 
      id: '2', 
      name: 'Nike', 
      logo: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=200',
      banner: 'https://images.unsplash.com/photo-1556906781-9a412961c28c?w=800',
      category: 'sportswear',
      description: 'Just Do It - Athletic excellence',
      products: 567,
      verified: true,
      hasDirectStore: true,
      affiliateVendors: 28,
      rating: 4.8,
      followers: '5.2M'
    },
    { 
      id: '3', 
      name: 'Prada', 
      logo: 'https://images.unsplash.com/photo-1591348278863-e0b6f9c5e6f8?w=200',
      banner: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=800',
      category: 'designer',
      description: 'Italian luxury fashion',
      products: 289,
      verified: true,
      hasDirectStore: false,
      affiliateVendors: 15,
      rating: 4.9,
      followers: '1.8M'
    },
    { 
      id: '4', 
      name: 'Adidas', 
      logo: 'https://images.unsplash.com/photo-1556906781-9a412961c28c?w=200',
      banner: 'https://images.unsplash.com/photo-1552346154-21d32810aba3?w=800',
      category: 'athletic',
      description: 'Impossible is Nothing',
      products: 498,
      verified: true,
      hasDirectStore: true,
      affiliateVendors: 22,
      rating: 4.7,
      followers: '4.8M'
    },
    { 
      id: '5', 
      name: 'Zara', 
      logo: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=200',
      banner: 'https://images.unsplash.com/photo-1445205170230-053b83016050?w=800',
      category: 'fast-fashion',
      description: 'Contemporary fashion trends',
      products: 623,
      verified: true,
      hasDirectStore: false,
      affiliateVendors: 34,
      rating: 4.6,
      followers: '3.1M'
    },
    { 
      id: '6', 
      name: 'Rolex', 
      logo: 'https://images.unsplash.com/photo-1523170335258-f5ed11844a49?w=200',
      banner: 'https://images.unsplash.com/photo-1587836374828-4dbafa94cf0e?w=800',
      category: 'watches',
      description: 'Swiss luxury timepieces',
      products: 156,
      verified: true,
      hasDirectStore: true,
      affiliateVendors: 8,
      rating: 5.0,
      followers: '1.5M'
    },
    { 
      id: '7', 
      name: 'Louis Vuitton', 
      logo: 'https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=200',
      banner: 'https://images.unsplash.com/photo-1509631179647-0177331693ae?w=800',
      category: 'luxury',
      description: 'French luxury fashion house',
      products: 412,
      verified: true,
      hasDirectStore: true,
      affiliateVendors: 18,
      rating: 4.9,
      followers: '3.2M'
    },
    { 
      id: '8', 
      name: 'Chanel', 
      logo: 'https://images.unsplash.com/photo-1617038220319-276d3cfab638?w=200',
      banner: 'https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=800',
      category: 'luxury',
      description: 'Parisian haute couture',
      products: 378,
      verified: true,
      hasDirectStore: true,
      affiliateVendors: 14,
      rating: 5.0,
      followers: '2.9M'
    },
  ];

  const filteredBrands = allBrands.filter(brand => {
    const matchesCategory = selectedCategory === 'all' || brand.category === selectedCategory;
    const matchesSearch = searchQuery === '' || 
      brand.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      brand.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

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

        {/* Category Filters */}
        <div className="mb-8">
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                  selectedCategory === category.id
                    ? 'bg-gold-600 text-white'
                    : 'bg-white dark:bg-charcoal-800 text-charcoal-700 dark:text-cool-gray-300 hover:bg-cool-gray-100 dark:hover:bg-charcoal-700 shadow-sm'
                }`}
              >
                {category.icon} {category.name}
              </button>
            ))}
          </div>
        </div>

        {/* Results Count */}
        <div className="mb-6">
          <p className="text-charcoal-600 dark:text-cool-gray-400">
            Showing <span className="font-semibold">{filteredBrands.length}</span> {filteredBrands.length === 1 ? 'brand' : 'brands'}
          </p>
        </div>

        {/* Brands Grid */}
        {filteredBrands.length === 0 ? (
          <div className="bg-white dark:bg-charcoal-800 rounded-xl shadow-md p-12 text-center">
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-xl font-bold text-charcoal-900 dark:text-white mb-2">No brands found</h3>
            <p className="text-charcoal-600 dark:text-cool-gray-400 mb-6">Try adjusting your search or filters</p>
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('all');
              }}
              className="px-6 py-2 bg-gold-600 text-white rounded-lg font-semibold hover:bg-gold-700 transition-colors"
            >
              Clear Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredBrands.map((brand) => (
              <Link
                key={brand.id}
                href={`/brand/${brand.id}`}
                className="group bg-white dark:bg-charcoal-800 rounded-xl overflow-hidden shadow-md hover:shadow-2xl transition-all hover:-translate-y-1"
              >
                {/* Banner Image */}
                <div className="relative h-40 bg-linear-to-br from-gray-100 to-gray-200 dark:from-charcoal-700 dark:to-charcoal-800">
                  {/* Inner overflow-hidden wraps only the fill image + gradient so hover-scale stays contained */}
                  <div className="absolute inset-0 overflow-hidden">
                    <Image
                      src={brand.banner}
                      alt={brand.name}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-linear-to-t from-black/50 to-transparent"></div>
                  </div>

                  {/* Verified Badge — outside overflow-hidden */}
                  {brand.verified && (
                    <div className="absolute top-3 right-3 z-10 px-2 py-1 bg-blue-600 text-white text-xs font-semibold rounded-full flex items-center gap-1">
                      <span>✓</span>
                      <span>Official</span>
                    </div>
                  )}

                  {/* Brand Logo — outside overflow-hidden so translate-y-1/2 correctly hangs over the banner edge */}
                  <div className="absolute bottom-0 left-6 translate-y-1/2 z-10">
                    <div className="w-20 h-20 bg-white dark:bg-charcoal-800 rounded-xl shadow-lg border-4 border-white dark:border-charcoal-900 overflow-hidden">
                      <Image
                        src={brand.logo}
                        alt={brand.name}
                        width={80}
                        height={80}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>
                </div>

                {/* Brand Info */}
                <div className="pt-12 px-6 pb-6">
                  <h3 className="font-bold text-xl text-charcoal-900 dark:text-white mb-2 group-hover:text-gold-600 transition-colors">
                    {brand.name}
                  </h3>
                  <p className="text-sm text-charcoal-600 dark:text-cool-gray-400 mb-4 line-clamp-2">{brand.description}</p>
                  
                  <div className="flex items-center justify-between text-sm mb-4">
                    <div className="flex items-center gap-4 text-charcoal-600 dark:text-cool-gray-400">
                      <div className="flex items-center gap-1">
                        <span className="text-yellow-500">⭐</span>
                        <span className="font-semibold text-charcoal-900 dark:text-white">{brand.rating}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span>👥</span>
                        <span className="font-semibold text-charcoal-900 dark:text-white">{brand.followers}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-3 text-charcoal-600 dark:text-cool-gray-400">
                      <div className="flex items-center gap-1">
                        <span>📦</span>
                        <span className="font-semibold text-charcoal-900 dark:text-white">{brand.products}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span>🏪</span>
                        <span className="font-semibold text-charcoal-900 dark:text-white">{brand.affiliateVendors}</span>
                      </div>
                    </div>
                    {brand.hasDirectStore && (
                      <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded">
                        Direct
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
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
