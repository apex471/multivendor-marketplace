'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import Header from '../../components/common/Header';
import Footer from '../../components/common/Footer';
import { useRouter } from 'next/navigation';

interface Product {
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

export default function ShopPage() {
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [priceRange, setPriceRange] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('popular');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Mock products data
  const allProducts: Product[] = [
    { id: '1', name: 'Designer Silk Dress', price: 299, oldPrice: 399, image: '/images/products/product1.jpg', vendor: 'Luxury Fashion Co.', rating: 4.8, sales: 234, category: 'women' },
    { id: '2', name: 'Premium Leather Jacket', price: 599, image: '/images/products/product2.jpg', vendor: 'Elite Wear', rating: 4.9, sales: 567, category: 'men' },
    { id: '3', name: 'Gold Chain Necklace', price: 899, image: '/images/products/product3.jpg', vendor: 'Jewel Masters', rating: 5.0, sales: 123, category: 'accessories' },
    { id: '4', name: 'Italian Leather Boots', price: 449, oldPrice: 599, image: '/images/products/product4.jpg', vendor: 'Footwear Elite', rating: 4.7, sales: 345, category: 'footwear' },
    { id: '5', name: 'Cashmere Sweater', price: 249, image: '/images/products/product5.jpg', vendor: 'Luxury Fashion Co.', rating: 4.6, sales: 189, category: 'women' },
    { id: '6', name: 'Designer Sunglasses', price: 349, image: '/images/products/product6.jpg', vendor: 'Vision Luxury', rating: 4.8, sales: 278, category: 'accessories' },
    { id: '7', name: 'Tailored Suit', price: 799, oldPrice: 999, image: '/images/products/product1.jpg', vendor: 'Elite Wear', rating: 4.9, sales: 456, category: 'men' },
    { id: '8', name: 'Diamond Earrings', price: 1299, image: '/images/products/product2.jpg', vendor: 'Jewel Masters', rating: 5.0, sales: 89, category: 'accessories' },
    { id: '9', name: 'Evening Gown', price: 549, image: '/images/products/product3.jpg', vendor: 'Luxury Fashion Co.', rating: 4.7, sales: 167, category: 'women' },
    { id: '10', name: 'Leather Loafers', price: 329, image: '/images/products/product4.jpg', vendor: 'Footwear Elite', rating: 4.8, sales: 423, category: 'footwear' },
    { id: '11', name: 'Designer Handbag', price: 699, oldPrice: 899, image: '/images/products/product5.jpg', vendor: 'Luxury Fashion Co.', rating: 4.9, sales: 234, category: 'accessories' },
    { id: '12', name: 'Oxford Shirt', price: 149, image: '/images/products/product6.jpg', vendor: 'Elite Wear', rating: 4.6, sales: 567, category: 'men' },
  ];

  const categories = [
    { id: 'all', name: 'All Products', icon: '🛍️' },
    { id: 'women', name: "Women's Fashion", icon: '👗' },
    { id: 'men', name: "Men's Fashion", icon: '👔' },
    { id: 'accessories', name: 'Accessories', icon: '👜' },
    { id: 'footwear', name: 'Footwear', icon: '👟' },
  ];

  // Filter products
  const filteredProducts = allProducts.filter(product => {
    const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory;
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         product.vendor.toLowerCase().includes(searchQuery.toLowerCase());
    
    let matchesPrice = true;
    if (priceRange === 'under200') matchesPrice = product.price < 200;
    else if (priceRange === '200-500') matchesPrice = product.price >= 200 && product.price <= 500;
    else if (priceRange === '500-1000') matchesPrice = product.price >= 500 && product.price <= 1000;
    else if (priceRange === 'over1000') matchesPrice = product.price > 1000;

    return matchesCategory && matchesSearch && matchesPrice;
  });

  // Sort products
  const sortedProducts = [...filteredProducts].sort((a, b) => {
    if (sortBy === 'price-low') return a.price - b.price;
    if (sortBy === 'price-high') return b.price - a.price;
    if (sortBy === 'rating') return b.rating - a.rating;
    if (sortBy === 'popular') return b.sales - a.sales;
    return 0;
  });

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
                className="w-full mt-6 px-4 py-2 sm:py-3 border-2 border-primary-700 text-primary-700 rounded-lg font-semibold hover:bg-primary-50 transition-colors text-sm sm:text-base touch-manipulation min-h-[40px]"
              >
                Clear All Filters
              </button>
            </div>
          </div>

          {/* Products Grid */}
          <div className="lg:col-span-3">
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <p className="text-sm sm:text-base text-gray-600">
                <span className="font-semibold text-gray-900">{sortedProducts.length}</span> products found
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
              {sortedProducts.map(product => (
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
                        className="w-full py-1.5 sm:py-2 min-h-[36px] bg-primary-700 text-white rounded-lg hover:bg-primary-800 active:scale-95 transition-all font-semibold text-[11px] sm:text-xs touch-manipulation"
                      >
                        Add to Cart
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Empty State */}
            {sortedProducts.length === 0 && (
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
