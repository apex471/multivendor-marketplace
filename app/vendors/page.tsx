'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import Header from '../../components/common/Header';
import Footer from '../../components/common/Footer';
import { useRouter } from 'next/navigation';

interface Vendor {
  id: string;
  name: string;
  logo: string;
  banner: string;
  description: string;
  category: string;
  rating: number;
  reviews: number;
  products: number;
  verified: boolean;
  distance: number;
  location: string;
}

export default function VendorsPage() {
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('popular');

  // Mock vendors data
  const allVendors: Vendor[] = [
    {
      id: '1',
      name: 'Luxury Fashion Co.',
      logo: '/images/vendors/vendor1.jpg',
      banner: '/images/vendors/banner1.jpg',
      description: 'Premium designer clothing and accessories for the modern individual',
      category: 'fashion',
      rating: 4.9,
      reviews: 1234,
      products: 250,
      verified: true,
      distance: 2.5,
      location: 'New York, NY'
    },
    {
      id: '2',
      name: 'Elite Wear',
      logo: '/images/vendors/vendor2.jpg',
      banner: '/images/vendors/banner2.jpg',
      description: 'Curated collection of luxury menswear and formal attire',
      category: 'menswear',
      rating: 4.8,
      reviews: 987,
      products: 180,
      verified: true,
      distance: 3.2,
      location: 'Los Angeles, CA'
    },
    {
      id: '3',
      name: 'Jewel Masters',
      logo: '/images/vendors/vendor3.jpg',
      banner: '/images/vendors/banner3.jpg',
      description: 'Fine jewelry and luxury accessories since 1995',
      category: 'jewelry',
      rating: 5.0,
      reviews: 567,
      products: 120,
      verified: true,
      distance: 1.8,
      location: 'Miami, FL'
    },
    {
      id: '4',
      name: 'Footwear Elite',
      logo: '/images/vendors/vendor4.jpg',
      banner: '/images/vendors/banner4.jpg',
      description: 'Designer footwear from top luxury brands worldwide',
      category: 'footwear',
      rating: 4.7,
      reviews: 823,
      products: 340,
      verified: true,
      distance: 4.1,
      location: 'Chicago, IL'
    },
    {
      id: '5',
      name: 'Vision Luxury',
      logo: '/images/vendors/vendor1.jpg',
      banner: '/images/vendors/banner1.jpg',
      description: 'Premium eyewear and sunglasses from exclusive designers',
      category: 'accessories',
      rating: 4.8,
      reviews: 445,
      products: 95,
      verified: true,
      distance: 2.9,
      location: 'San Francisco, CA'
    },
    {
      id: '6',
      name: 'Haute Couture',
      logo: '/images/vendors/vendor2.jpg',
      banner: '/images/vendors/banner2.jpg',
      description: 'Exclusive haute couture and custom tailoring services',
      category: 'fashion',
      rating: 4.9,
      reviews: 678,
      products: 150,
      verified: true,
      distance: 3.5,
      location: 'Boston, MA'
    },
  ];

  const categories = [
    { id: 'all', name: 'All Vendors', icon: '🏪' },
    { id: 'fashion', name: 'Fashion', icon: '👗' },
    { id: 'menswear', name: 'Menswear', icon: '👔' },
    { id: 'jewelry', name: 'Jewelry', icon: '💎' },
    { id: 'footwear', name: 'Footwear', icon: '👟' },
    { id: 'accessories', name: 'Accessories', icon: '👜' },
  ];

  // Filter vendors
  const filteredVendors = allVendors.filter(vendor => {
    const matchesCategory = selectedCategory === 'all' || vendor.category === selectedCategory;
    const matchesSearch = vendor.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         vendor.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         vendor.location.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Sort vendors
  const sortedVendors = [...filteredVendors].sort((a, b) => {
    if (sortBy === 'rating') return b.rating - a.rating;
    if (sortBy === 'distance') return a.distance - b.distance;
    if (sortBy === 'products') return b.products - a.products;
    if (sortBy === 'popular') return b.reviews - a.reviews;
    return 0;
  });

  return (
    <div className="min-h-screen bg-white dark:bg-charcoal-900">
      <Header />

      <div className="container mx-auto px-4 py-6 sm:py-8 md:py-12">
        {/* Page Header */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-display font-bold text-charcoal-900 dark:text-white mb-2">
            Discover Luxury Vendors
          </h1>
          <p className="text-sm sm:text-base text-charcoal-600 dark:text-cool-gray-400">
            Connect with certified luxury brands and boutiques near you
          </p>
        </div>

        {/* Search Bar */}
        <div className="mb-6 sm:mb-8">
          <div className="relative">
            <input
              type="text"
              placeholder="Search vendors, brands, locations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 sm:px-6 py-3 sm:py-4 pr-12 rounded-lg border border-cool-gray-300 dark:border-charcoal-700 bg-white dark:bg-charcoal-800 text-charcoal-900 dark:text-white focus:outline-none focus:border-gold-600 text-sm sm:text-base"
            />
            <button className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 text-gold-600 text-lg sm:text-xl">
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
                className={`flex items-center gap-1.5 sm:gap-2 px-4 sm:px-6 py-2 sm:py-3 rounded-lg font-semibold whitespace-nowrap transition-all text-xs sm:text-sm touch-manipulation min-h-[36px] ${
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
            <div className="bg-white dark:bg-charcoal-800 rounded-lg sm:rounded-xl p-4 sm:p-6 sticky top-4">
              <h2 className="text-lg sm:text-xl font-display font-bold text-charcoal-900 dark:text-white mb-4 sm:mb-6">Filters</h2>

              {/* Sort By */}
              <div className="mb-6">
                <h3 className="font-semibold text-charcoal-900 dark:text-white mb-3 text-sm sm:text-base">Sort By</h3>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-full px-3 sm:px-4 py-2 sm:py-3 rounded-lg border border-cool-gray-300 dark:border-charcoal-700 bg-white dark:bg-charcoal-700 text-charcoal-900 dark:text-white focus:outline-none focus:border-gold-600 text-sm sm:text-base"
                >
                  <option value="popular">Most Popular</option>
                  <option value="rating">Highest Rated</option>
                  <option value="distance">Nearest First</option>
                  <option value="products">Most Products</option>
                </select>
              </div>

              {/* Verified Only */}
              <div className="mb-6">
                <label className="flex items-center gap-2 cursor-pointer touch-manipulation">
                  <input
                    type="checkbox"
                    defaultChecked
                    className="w-4 h-4 text-primary-600 rounded"
                  />
                  <span className="text-sm sm:text-base text-gray-700">Verified vendors only</span>
                </label>
              </div>

              {/* Clear Filters */}
              <button
                onClick={() => {
                  setSelectedCategory('all');
                  setSortBy('popular');
                  setSearchQuery('');
                }}
                className="w-full px-4 py-2 sm:py-3 border-2 border-primary-700 text-primary-700 rounded-lg font-semibold hover:bg-primary-50 transition-colors text-sm sm:text-base touch-manipulation min-h-[40px]"
              >
                Clear All Filters
              </button>
            </div>
          </div>

          {/* Vendors Grid */}
          <div className="lg:col-span-3">
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <p className="text-sm sm:text-base text-gray-600">
                <span className="font-semibold text-gray-900">{sortedVendors.length}</span> vendors found
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              {sortedVendors.map(vendor => (
                <div key={vendor.id} className="group bg-white dark:bg-charcoal-800 rounded-lg sm:rounded-xl overflow-hidden shadow-md hover:shadow-xl transition-all">
                  {/* Banner */}
                  <div className="relative h-32 sm:h-40 bg-gradient-to-r from-gold-600 to-gold-700">
                    <Image
                      src={vendor.banner}
                      alt={vendor.name}
                      fill
                      className="object-cover opacity-50"
                    />
                  </div>

                  {/* Vendor Info */}
                  <div className="p-4 sm:p-6 relative">
                    {/* Logo */}
                    <div className="absolute -top-12 sm:-top-14 left-4 sm:left-6">
                      <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full border-4 border-white dark:border-charcoal-800 bg-white dark:bg-charcoal-700 shadow-lg overflow-hidden">
                        <Image
                          src={vendor.logo}
                          alt={vendor.name}
                          width={96}
                          height={96}
                          className="object-cover w-full h-full"
                        />
                      </div>
                    </div>

                    <div className="mt-10 sm:mt-12">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1 min-w-0 pr-2">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-base sm:text-lg font-display font-bold text-charcoal-900 dark:text-white truncate">
                              {vendor.name}
                            </h3>
                            {vendor.verified && (
                              <span className="text-blue-600 text-base sm:text-lg flex-shrink-0" title="Verified">✓</span>
                            )}
                          </div>
                          <p className="text-xs sm:text-sm text-charcoal-600 dark:text-cool-gray-400 flex items-center gap-1">
                            📍 {vendor.location} • {vendor.distance} km away
                          </p>
                        </div>
                      </div>

                      <p className="text-xs sm:text-sm text-charcoal-600 dark:text-cool-gray-400 mb-4 line-clamp-2">{vendor.description}</p>

                      <div className="flex items-center gap-4 sm:gap-6 mb-4 text-xs sm:text-sm">
                        <div className="flex items-center gap-1">
                          <span className="text-yellow-500">⭐</span>
                          <span className="font-semibold text-charcoal-900 dark:text-white">{vendor.rating}</span>
                          <span className="text-charcoal-600 dark:text-cool-gray-400">({vendor.reviews})</span>
                        </div>
                        <div className="text-charcoal-600 dark:text-cool-gray-400">
                          {vendor.products} Products
                        </div>
                      </div>

                      <div className="flex gap-2 sm:gap-3">
                        <button
                          onClick={() => router.push(`/vendor/${vendor.id}`)}
                          className="flex-1 py-2 sm:py-3 min-h-[40px] bg-gold-600 text-white rounded-lg font-semibold hover:bg-gold-700 active:scale-95 transition-all text-xs sm:text-sm touch-manipulation"
                        >
                          Visit Store
                        </button>
                        <button
                          onClick={() => alert('Following ' + vendor.name)}
                          className="px-4 sm:px-6 py-2 sm:py-3 min-h-[40px] border-2 border-gold-600 text-gold-600 rounded-lg font-semibold hover:bg-gold-50 dark:hover:bg-charcoal-700 active:scale-95 transition-all text-xs sm:text-sm touch-manipulation"
                        >
                          Follow
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Empty State */}
            {sortedVendors.length === 0 && (
              <div className="text-center py-12 sm:py-16 bg-white dark:bg-charcoal-800 rounded-xl">
                <div className="text-5xl sm:text-6xl mb-4">🔍</div>
                <h3 className="text-xl sm:text-2xl font-display font-bold text-charcoal-900 dark:text-white mb-2">No vendors found</h3>
                <p className="text-sm sm:text-base text-charcoal-600 dark:text-cool-gray-400 mb-6">Try adjusting your filters or search terms</p>
                <button
                  onClick={() => {
                    setSelectedCategory('all');
                    setSearchQuery('');
                  }}
                  className="px-6 py-3 bg-primary-700 text-white rounded-lg font-semibold hover:bg-primary-800 transition-colors text-sm sm:text-base touch-manipulation min-h-[44px]"
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
