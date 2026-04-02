'use client';

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Header from "../components/common/Header";
import Footer from "../components/common/Footer";

// Mock data for demonstration
const mockStories = [
  { id: '1', username: 'fashionista_jane', avatar: 'https://i.pravatar.cc/150?img=1', hasNew: true },
  { id: '2', username: 'style_maven', avatar: 'https://i.pravatar.cc/150?img=2', hasNew: true },
  { id: '3', username: 'trendy_boutique', avatar: 'https://i.pravatar.cc/150?img=3', hasNew: false },
  { id: '4', username: 'fashion_hub', avatar: 'https://i.pravatar.cc/150?img=4', hasNew: true },
  { id: '5', username: 'chic_styles', avatar: 'https://i.pravatar.cc/150?img=5', hasNew: false },
];

const mockPosts = [
  { id: '1', username: 'fashionista_jane', avatar: 'https://i.pravatar.cc/150?img=1', image: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=500', caption: 'New summer collection! 🌸', likes: 234, comments: 45 },
  { id: '2', username: 'style_maven', avatar: 'https://i.pravatar.cc/150?img=2', image: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=500', caption: 'Minimal chic vibes ✨', likes: 567, comments: 89 },
  { id: '3', username: 'trendy_boutique', avatar: 'https://i.pravatar.cc/150?img=3', image: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=500', caption: 'Sustainable fashion 🌿', likes: 892, comments: 123 },
];

const mockVendors = [
  { id: '1', name: 'Chic Boutique', logo: 'https://i.pravatar.cc/100?img=10', rating: 4.8, products: 156, distance: 2.3, verified: true },
  { id: '2', name: 'Urban Threads', logo: 'https://i.pravatar.cc/100?img=11', rating: 4.9, products: 243, distance: 1.8, verified: true },
  { id: '3', name: 'Style Haven', logo: 'https://i.pravatar.cc/100?img=12', rating: 4.7, products: 198, distance: 3.5, verified: false },
  { id: '4', name: 'Fashion First', logo: 'https://i.pravatar.cc/100?img=13', rating: 4.6, products: 167, distance: 4.2, verified: true },
];

const mockBrands = [
  { 
    id: '1', 
    name: 'Gucci', 
    logo: 'https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?w=200',
    banner: 'https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?w=800',
    category: 'Luxury Fashion',
    description: 'Italian luxury fashion house',
    products: 342,
    verified: true,
    hasDirectStore: true,
    affiliateVendors: 12
  },
  { 
    id: '2', 
    name: 'Nike', 
    logo: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=200',
    banner: 'https://images.unsplash.com/photo-1556906781-9a412961c28c?w=800',
    category: 'Sportswear',
    description: 'Just Do It - Athletic excellence',
    products: 567,
    verified: true,
    hasDirectStore: true,
    affiliateVendors: 28
  },
  { 
    id: '3', 
    name: 'Prada', 
    logo: 'https://images.unsplash.com/photo-1591348278863-e0b6f9c5e6f8?w=200',
    banner: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=800',
    category: 'Designer',
    description: 'Italian luxury fashion',
    products: 289,
    verified: true,
    hasDirectStore: false,
    affiliateVendors: 15
  },
  { 
    id: '4', 
    name: 'Adidas', 
    logo: 'https://images.unsplash.com/photo-1556906781-9a412961c28c?w=200',
    banner: 'https://images.unsplash.com/photo-1552346154-21d32810aba3?w=800',
    category: 'Athletic',
    description: 'Impossible is Nothing',
    products: 498,
    verified: true,
    hasDirectStore: true,
    affiliateVendors: 22
  },
  { 
    id: '5', 
    name: 'Zara', 
    logo: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=200',
    banner: 'https://images.unsplash.com/photo-1445205170230-053b83016050?w=800',
    category: 'Fast Fashion',
    description: 'Contemporary fashion trends',
    products: 623,
    verified: true,
    hasDirectStore: false,
    affiliateVendors: 34
  },
  { 
    id: '6', 
    name: 'Rolex', 
    logo: 'https://images.unsplash.com/photo-1523170335258-f5ed11844a49?w=200',
    banner: 'https://images.unsplash.com/photo-1587836374828-4dbafa94cf0e?w=800',
    category: 'Luxury Watches',
    description: 'Swiss luxury timepieces',
    products: 156,
    verified: true,
    hasDirectStore: true,
    affiliateVendors: 8
  },
];

const mockProducts = [
  { id: '1', name: 'Summer Floral Dress', price: 89.99, oldPrice: 129.99, image: 'https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=400', rating: 4.8, sales: 234, vendor: 'Chic Boutique' },
  { id: '2', name: 'Denim Jacket', price: 124.99, image: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=400', rating: 4.9, sales: 456, vendor: 'Urban Threads' },
  { id: '3', name: 'Casual Sneakers', price: 79.99, image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400', rating: 4.7, sales: 789, vendor: 'Style Haven' },
  { id: '4', name: 'Leather Handbag', price: 199.99, oldPrice: 299.99, image: 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=400', rating: 4.9, sales: 345, vendor: 'Fashion First' },
  { id: '5', name: 'Sunglasses', price: 49.99, image: 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=400', rating: 4.6, sales: 567, vendor: 'Chic Boutique' },
  { id: '6', name: 'Summer Hat', price: 34.99, image: 'https://images.unsplash.com/photo-1521369909029-2afed882baee?w=400', rating: 4.5, sales: 234, vendor: 'Style Haven' },
];

export default function Home() {
  const [searchQuery, setSearchQuery] = useState('');
  const [_selectedCategory, setSelectedCategory] = useState('');
  const router = useRouter();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/shop?search=${encodeURIComponent(searchQuery)}`);
    }
  };

  const handleCategoryClick = (category: string) => {
    setSelectedCategory(category);
    router.push(`/shop?category=${encodeURIComponent(category.toLowerCase())}`);
  };

  const handleProductClick = (productId: string) => {
    router.push(`/product/${productId}`);
  };

  const handleLikePost = (postId: string) => {
    console.log('Liked post:', postId);
    // Add to favorites or increase like count
  };

  const handleAddToCart = (productId: string) => {
    console.log('Added to cart:', productId);
    // Implement cart logic with CartContext
    alert('Product added to cart!');
  };

  const handleAddToWishlist = (productId: string) => {
    console.log('Added to wishlist:', productId);
    // Implement wishlist logic
    alert('Product added to wishlist!');
  };

  return (
    <div className="min-h-screen bg-cool-gray-50 dark:bg-charcoal-950 transition-colors duration-200">
      <Header />

      {/* Hero Section with Search */}
      <section className="relative bg-linear-to-br from-charcoal-900 via-charcoal-800 to-charcoal-700 dark:from-charcoal-950 dark:via-charcoal-900 dark:to-charcoal-800 text-white overflow-hidden">
        <div className="absolute inset-0 opacity-10 dark:opacity-20">
          <div className="absolute top-0 right-0 w-96 h-96 bg-gold-400 dark:bg-gold-600 rounded-full filter blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-charcoal-600 dark:bg-charcoal-900 rounded-full filter blur-3xl"></div>
        </div>
        
        <div className="container mx-auto px-4 py-12 sm:py-16 lg:py-20 relative">
          <div className="max-w-4xl mx-auto text-center">
            <div className="mb-3 sm:mb-4">
              <span className="inline-block px-3 py-1.5 sm:px-4 sm:py-2 bg-gold-500/20 dark:bg-gold-600/30 backdrop-blur-sm rounded-full text-gold-200 dark:text-gold-300 text-xs sm:text-sm font-medium">
                Certified Luxury World
              </span>
            </div>
            
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-display font-bold mb-3 sm:mb-4 md:mb-6 animate-fade-in px-4 leading-tight">
              Experience Luxury,
              <span className="block mt-1 sm:mt-2 text-gold-300 dark:text-gold-400">Share Your Elegance</span>
            </h1>
            
            <p className="text-sm sm:text-base md:text-lg lg:text-xl text-white/90 mb-5 sm:mb-8 md:mb-10 max-w-2xl mx-auto px-6 sm:px-4 leading-relaxed">
              Shop from certified luxury vendors, share your refined style, and connect with connoisseurs worldwide
            </p>

            {/* Quick Search Bar */}
            <div className="max-w-3xl mx-auto px-4">
              <form onSubmit={handleSearch} className="bg-white dark:bg-charcoal-800 rounded-2xl sm:rounded-full shadow-2xl dark:shadow-charcoal-950/50 p-2.5 sm:p-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <input
                  type="text"
                  placeholder="Search luxury..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 px-3 sm:px-6 py-2.5 sm:py-3 text-charcoal-900 dark:text-white bg-transparent focus:outline-none rounded-xl sm:rounded-full text-sm sm:text-base placeholder:text-sm sm:placeholder:text-base placeholder-cool-gray-500 dark:placeholder-cool-gray-400"
                />
                <button 
                  type="submit"
                  className="px-5 sm:px-8 py-2.5 sm:py-3 bg-charcoal-900 dark:bg-gold-600 text-white rounded-xl sm:rounded-full font-semibold hover:bg-charcoal-800 dark:hover:bg-gold-700 active:scale-95 transition-all flex items-center justify-center gap-2 min-h-[44px] text-sm sm:text-base"
                >
                  <span className="text-base sm:text-lg">🔍</span>
                  <span>Search</span>
                </button>
              </form>
              
              {/* Quick Categories */}
              <div className="flex flex-wrap justify-center gap-1.5 sm:gap-2 md:gap-3 mt-3 sm:mt-4 md:mt-6">
                {['Women', 'Men', 'Accessories', 'Watches', 'Jewelry'].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => handleCategoryClick(cat)}
                    className="px-2.5 sm:px-3 md:px-4 py-1.5 sm:py-2 bg-white/20 dark:bg-white/10 hover:bg-white/30 dark:hover:bg-white/20 active:bg-white/40 dark:active:bg-white/30 backdrop-blur-sm rounded-full text-xs sm:text-sm font-medium transition-all min-h-[32px] sm:min-h-[36px] touch-manipulation"
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stories Section */}
      <section className="bg-white dark:bg-charcoal-900 border-b border-cool-gray-200 dark:border-charcoal-800">
        <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6">
          <div className="flex items-center gap-3 sm:gap-4 overflow-x-auto pb-2 scrollbar-hide -mx-1 px-1">
            {mockStories.map((story) => (
              <button
                key={story.id}
                onClick={() => router.push(`/stories/${story.id}`)}
                className="flex-shrink-0 text-center group touch-manipulation"
              >
                <div className="relative w-16 h-16 sm:w-20 sm:h-20 mb-1.5 sm:mb-2">
                  <div className={`absolute inset-0 rounded-full ${story.hasNew ? 'bg-linear-to-tr from-yellow-400 via-red-500 to-purple-500' : 'bg-gray-300'} p-[2.5px] sm:p-[3px]`}>
                    <div className="w-full h-full rounded-full bg-white p-[2px] sm:p-[3px]">
                      <Image
                        src={story.avatar}
                        alt={story.username}
                        width={80}
                        height={80}
                        className="w-full h-full rounded-full object-cover"
                      />
                    </div>
                  </div>
                </div>
                <p className="text-[10px] sm:text-xs text-charcoal-700 dark:text-cool-gray-300 truncate w-16 sm:w-20 group-hover:text-gold-600 dark:group-hover:text-gold-400 transition-colors">
                  {story.username}
                </p>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-12">
        {/* Fashion Feed / Posts Section */}
        <section className="mb-10 sm:mb-12 md:mb-16">
          <div className="flex items-start sm:items-center justify-between mb-5 sm:mb-6 md:mb-8 gap-3">
            <div className="flex-1 min-w-0">
              <h2 className="text-xl sm:text-2xl md:text-3xl font-display font-bold text-charcoal-900 dark:text-white">Fashion Feed</h2>
              <p className="text-xs sm:text-sm md:text-base text-cool-gray-500 dark:text-cool-gray-400 mt-0.5 sm:mt-1 pr-2">Latest style inspiration</p>
            </div>
            <Link 
              href="/feed"
              className="text-gold-600 dark:text-gold-400 hover:text-gold-700 dark:hover:text-gold-500 font-semibold flex items-center gap-1 sm:gap-2 text-sm sm:text-base whitespace-nowrap touch-manipulation"
            >
              <span className="hidden sm:inline">View All</span>
              <span className="sm:hidden">All</span>
              <span>→</span>
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-5 md:gap-6">
            {mockPosts.map((post) => (
              <div key={post.id} className="bg-white dark:bg-charcoal-800 rounded-xl overflow-hidden shadow-md dark:shadow-charcoal-950/50 hover:shadow-xl dark:hover:shadow-charcoal-950/70 transition-shadow">
                <button
                  onClick={() => router.push(`/feed/post/${post.id}`)}
                  className="relative aspect-square w-full"
                >
                  <Image
                    src={post.image}
                    alt={post.caption}
                    fill
                    className="object-cover"
                  />
                </button>
                <div className="p-3 sm:p-4">
                  <button
                    onClick={() => router.push(`/profile/${post.username}`)}
                    className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3 hover:opacity-80 transition-opacity touch-manipulation"
                  >
                    <Image
                      src={post.avatar}
                      alt={post.username}
                      width={32}
                      height={32}
                      className="w-7 h-7 sm:w-8 sm:h-8 rounded-full"
                    />
                    <span className="font-semibold text-charcoal-900 dark:text-white text-sm sm:text-base">{post.username}</span>
                  </button>
                  <p className="text-charcoal-700 dark:text-cool-gray-300 mb-2 sm:mb-3 text-sm sm:text-base line-clamp-2">{post.caption}</p>
                  <div className="flex items-center gap-3 sm:gap-4 text-charcoal-600 dark:text-cool-gray-400 text-xs sm:text-sm">
                    <button
                      onClick={() => handleLikePost(post.id)}
                      className="flex items-center gap-1 hover:text-red-500 dark:hover:text-red-400 transition-colors touch-manipulation min-h-[36px] -ml-1 pl-1"
                    >
                      <span className="text-base sm:text-lg">❤️</span> <span>{post.likes}</span>
                    </button>
                    <button
                      onClick={() => router.push(`/feed/post/${post.id}#comments`)}
                      className="flex items-center gap-1 hover:text-gold-600 dark:hover:text-gold-400 transition-colors touch-manipulation min-h-[36px]"
                    >
                      <span className="text-base sm:text-lg">💬</span> <span>{post.comments}</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Best Selling Vendors */}
        <section className="mb-10 sm:mb-12 md:mb-16">
          <div className="flex items-start sm:items-center justify-between mb-5 sm:mb-6 md:mb-8 gap-3">
            <div className="flex-1 min-w-0">
              <h2 className="text-xl sm:text-2xl md:text-3xl font-display font-bold text-charcoal-900 dark:text-white">Top Vendors</h2>
              <p className="text-xs sm:text-sm md:text-base text-cool-gray-500 dark:text-cool-gray-400 mt-0.5 sm:mt-1 pr-2">Highest-rated sellers</p>
            </div>
            <Link 
              href="/vendors"
              className="text-gold-600 dark:text-gold-400 hover:text-gold-700 dark:hover:text-gold-500 font-semibold flex items-center gap-1 sm:gap-2 text-sm sm:text-base whitespace-nowrap touch-manipulation"
            >
              <span className="hidden sm:inline">Explore All</span>
              <span className="sm:hidden">All</span>
              <span>→</span>
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
            {mockVendors.map((vendor) => (
              <Link
                key={vendor.id}
                href={`/vendors/${vendor.id}`}
                className="bg-white dark:bg-charcoal-800 rounded-lg sm:rounded-xl p-3 sm:p-4 md:p-6 shadow-md dark:shadow-charcoal-950/50 hover:shadow-xl dark:hover:shadow-charcoal-950/70 transition-all hover:-translate-y-1 touch-manipulation"
              >
                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-2 sm:gap-4 mb-3 sm:mb-4">
                  <Image
                    src={vendor.logo}
                    alt={vendor.name}
                    width={60}
                    height={60}
                    className="w-12 h-12 sm:w-14 sm:h-14 md:w-15 md:h-15 rounded-full flex-shrink-0"
                  />
                  {vendor.verified && (
                    <span className="px-1.5 sm:px-2 py-0.5 sm:py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 text-[10px] sm:text-xs font-semibold rounded">
                      ✓ Verified
                    </span>
                  )}
                </div>
                <h3 className="font-display font-bold text-sm sm:text-base md:text-lg text-charcoal-900 dark:text-white mb-1.5 sm:mb-2 text-center sm:text-left">{vendor.name}</h3>
                <div className="space-y-1 sm:space-y-1.5 md:space-y-2 text-xs sm:text-sm text-charcoal-600 dark:text-cool-gray-400">
                  <div className="flex items-center justify-center sm:justify-start gap-1.5 sm:gap-2">
                    <span className="text-yellow-500 text-sm sm:text-base">⭐</span>
                    <span className="font-semibold text-charcoal-900 dark:text-white">{vendor.rating}</span>
                    <span className="hidden xs:inline">•</span>
                    <span className="hidden xs:inline">{vendor.products} products</span>
                  </div>
                  <div className="flex items-center justify-center sm:justify-start gap-1.5 sm:gap-2">
                    <span className="text-sm sm:text-base">📍</span>
                    <span>{vendor.distance} km</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Featured Brands */}
        <section className="mb-10 sm:mb-12 md:mb-16">
          <div className="flex items-start sm:items-center justify-between mb-5 sm:mb-6 md:mb-8 gap-3">
            <div className="flex-1 min-w-0">
              <h2 className="text-xl sm:text-2xl md:text-3xl font-display font-bold text-charcoal-900 dark:text-white">Featured Brands</h2>
              <p className="text-xs sm:text-sm md:text-base text-cool-gray-500 dark:text-cool-gray-400 mt-0.5 sm:mt-1 pr-2">Shop from official brand stores and authorized retailers</p>
            </div>
            <Link 
              href="/brands"
              className="text-gold-600 dark:text-gold-400 hover:text-gold-700 dark:hover:text-gold-500 font-semibold flex items-center gap-1 sm:gap-2 text-sm sm:text-base whitespace-nowrap touch-manipulation"
            >
              <span className="hidden sm:inline">View All</span>
              <span className="sm:hidden">All</span>
              <span>→</span>
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {mockBrands.map((brand) => (
              <Link
                key={brand.id}
                href={`/brand/${brand.id}`}
                className="group bg-white dark:bg-charcoal-800 rounded-xl overflow-hidden shadow-md dark:shadow-charcoal-950/50 hover:shadow-2xl dark:hover:shadow-charcoal-950/70 transition-all hover:-translate-y-1"
              >
                {/* Banner Image */}
                <div className="relative h-32 sm:h-40 bg-linear-to-br from-gray-100 to-gray-200 dark:from-charcoal-700 dark:to-charcoal-800 overflow-hidden">
                  <Image
                    src={brand.banner}
                    alt={brand.name}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-linear-to-t from-black/50 to-transparent"></div>
                  
                  {/* Brand Logo */}
                  <div className="absolute bottom-0 left-4 sm:left-6 translate-y-1/2">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 bg-white dark:bg-charcoal-800 rounded-xl shadow-lg border-4 border-white dark:border-charcoal-900 overflow-hidden">
                      <Image
                        src={brand.logo}
                        alt={brand.name}
                        width={80}
                        height={80}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>

                  {/* Verified Badge */}
                  {brand.verified && (
                    <div className="absolute top-3 right-3 px-2 py-1 bg-blue-600 text-white text-xs font-semibold rounded-full flex items-center gap-1">
                      <span>✓</span>
                      <span className="hidden sm:inline">Official</span>
                    </div>
                  )}
                </div>

                {/* Brand Info */}
                <div className="pt-10 sm:pt-12 px-4 sm:px-6 pb-4 sm:pb-6">
                  <h3 className="font-display font-bold text-lg sm:text-xl text-charcoal-900 dark:text-white mb-2">{brand.name}</h3>
                  <p className="text-xs sm:text-sm text-cool-gray-600 dark:text-cool-gray-400 mb-3 sm:mb-4">{brand.description}</p>
                  
                  <div className="flex items-center gap-2 mb-3 sm:mb-4">
                    <span className="px-2 py-1 bg-gold-100 dark:bg-gold-900/30 text-gold-700 dark:text-gold-400 text-xs font-semibold rounded">
                      {brand.category}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs sm:text-sm">
                    <div className="flex items-center gap-4 text-charcoal-600 dark:text-cool-gray-400">
                      <div className="flex items-center gap-1">
                        <span>📦</span>
                        <span className="font-semibold text-charcoal-900 dark:text-white">{brand.products}</span>
                        <span className="hidden sm:inline">products</span>
                      </div>
                      {brand.affiliateVendors > 0 && (
                        <div className="flex items-center gap-1">
                          <span>🏪</span>
                          <span className="font-semibold text-charcoal-900 dark:text-white">{brand.affiliateVendors}</span>
                          <span className="hidden sm:inline">sellers</span>
                        </div>
                      )}
                    </div>
                    {brand.hasDirectStore && (
                      <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-semibold rounded">
                        Direct Store
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Top Selling Products */}
        <section className="mb-10 sm:mb-12 md:mb-16">
          <div className="flex items-start sm:items-center justify-between mb-5 sm:mb-6 md:mb-8 gap-3">
            <div className="flex-1 min-w-0">
              <h2 className="text-xl sm:text-2xl md:text-3xl font-display font-bold text-charcoal-900 dark:text-white">Trending Products</h2>
              <p className="text-xs sm:text-sm md:text-base text-cool-gray-500 dark:text-cool-gray-400 mt-0.5 sm:mt-1 pr-2">Most popular items</p>
            </div>
            <Link 
              href="/shop"
              className="text-gold-600 dark:text-gold-400 hover:text-gold-700 dark:hover:text-gold-500 font-semibold flex items-center gap-1 sm:gap-2 text-sm sm:text-base whitespace-nowrap touch-manipulation"
            >
              <span className="hidden sm:inline">Shop All</span>
              <span className="sm:hidden">All</span>
              <span>→</span>
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4 md:gap-6">
            {mockProducts.map((product) => (
              <div key={product.id} className="group relative">
                <div className="bg-white dark:bg-charcoal-800 rounded-lg sm:rounded-xl overflow-hidden shadow-md dark:shadow-charcoal-950/50 hover:shadow-xl dark:hover:shadow-charcoal-950/70 transition-all">
                  <button
                    onClick={() => handleProductClick(product.id)}
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
                    {/* Quick Action Buttons - Hidden on small mobile */}
                    <div className="absolute top-1.5 right-1.5 sm:top-2 sm:right-2 flex flex-col gap-1.5 sm:gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAddToWishlist(product.id);
                        }}
                        className="w-7 h-7 sm:w-8 sm:h-8 bg-white/90 dark:bg-charcoal-700/90 sm:bg-white sm:dark:bg-charcoal-700 rounded-full flex items-center justify-center shadow-md dark:shadow-charcoal-950/50 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors touch-manipulation text-xs sm:text-sm"
                        aria-label="Add to wishlist"
                      >
                        ❤️
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleProductClick(product.id);
                        }}
                        className="w-7 h-7 sm:w-8 sm:h-8 bg-white/90 dark:bg-charcoal-700/90 sm:bg-white sm:dark:bg-charcoal-700 rounded-full flex items-center justify-center shadow-md dark:shadow-charcoal-950/50 hover:bg-primary-50 dark:hover:bg-gold-900/30 transition-colors touch-manipulation text-xs sm:text-sm hidden sm:flex"
                        aria-label="Quick view"
                      >
                        👁️
                      </button>
                    </div>
                  </button>
                  <div className="p-2 sm:p-3">
                    <p className="text-[10px] sm:text-xs text-cool-gray-500 dark:text-cool-gray-400 mb-0.5 sm:mb-1 truncate">{product.vendor}</p>
                    <h3 className="font-semibold text-xs sm:text-sm text-charcoal-900 dark:text-white mb-1 sm:mb-2 line-clamp-2 group-hover:text-gold-600 dark:group-hover:text-gold-400 transition-colors leading-tight">
                      {product.name}
                    </h3>
                    <div className="flex items-center gap-0.5 sm:gap-1 mb-1 sm:mb-2">
                      <span className="text-yellow-500 text-[10px] sm:text-xs">⭐</span>
                      <span className="text-[10px] sm:text-xs font-medium text-charcoal-700 dark:text-cool-gray-300">{product.rating}</span>
                      <span className="text-[10px] sm:text-xs text-cool-gray-500 dark:text-cool-gray-400">({product.sales})</span>
                    </div>
                    <div className="flex items-center gap-1 sm:gap-2 mb-1.5 sm:mb-2">
                      <span className="font-bold text-sm sm:text-base text-charcoal-900 dark:text-white">${product.price}</span>
                      {product.oldPrice && (
                        <span className="text-[10px] sm:text-xs text-cool-gray-500 dark:text-cool-gray-400 line-through">${product.oldPrice}</span>
                      )}
                    </div>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        handleAddToCart(product.id);
                      }}
                      className="w-full py-1.5 sm:py-2 min-h-[36px] bg-gold-600 dark:bg-gold-600 text-white rounded-lg hover:bg-gold-700 dark:hover:bg-gold-700 active:scale-95 transition-all font-semibold text-[11px] sm:text-xs touch-manipulation"
                    >
                      Add to Cart
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Statistics / Trust Section */}
        <section className="mb-10 sm:mb-12 md:mb-16">
          <div className="bg-linear-to-r from-gold-600 to-gold-700 dark:from-gold-700 dark:to-gold-800 rounded-xl sm:rounded-2xl p-6 sm:p-8 md:p-12 text-white shadow-lg dark:shadow-charcoal-950/50">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 md:gap-8 text-center">
              <div>
                <div className="text-2xl sm:text-3xl md:text-4xl font-bold mb-1 sm:mb-2">2,500+</div>
                <div className="text-white/80 dark:text-white/70 text-xs sm:text-sm md:text-base">Active Vendors</div>
              </div>
              <div>
                <div className="text-2xl sm:text-3xl md:text-4xl font-bold mb-1 sm:mb-2">50K+</div>
                <div className="text-white/80 dark:text-white/70 text-xs sm:text-sm md:text-base">Fashion Products</div>
              </div>
              <div>
                <div className="text-2xl sm:text-3xl md:text-4xl font-bold mb-1 sm:mb-2">100K+</div>
                <div className="text-white/80 dark:text-white/70 text-xs sm:text-sm md:text-base">Happy Customers</div>
              </div>
              <div>
                <div className="text-2xl sm:text-3xl md:text-4xl font-bold mb-1 sm:mb-2">4.8★</div>
                <div className="text-white/80 dark:text-white/70 text-xs sm:text-sm md:text-base">Average Rating</div>
              </div>
            </div>
          </div>
        </section>

        {/* Categories Grid */}
        <section className="mb-10 sm:mb-12 md:mb-16">
          <div className="mb-5 sm:mb-6 md:mb-8">
            <h2 className="text-xl sm:text-2xl md:text-3xl font-display font-bold text-charcoal-900 dark:text-white mb-1 sm:mb-2">Shop by Category</h2>
            <p className="text-xs sm:text-sm md:text-base text-cool-gray-500 dark:text-cool-gray-400">Find exactly what you&apos;re looking for</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
            {[
              { name: "Women's Fashion", icon: '👗', color: 'from-pink-500 to-rose-500' },
              { name: "Men's Fashion", icon: '👔', color: 'from-blue-500 to-indigo-500' },
              { name: 'Accessories', icon: '👜', color: 'from-purple-500 to-pink-500' },
              { name: 'Footwear', icon: '👟', color: 'from-orange-500 to-red-500' },
            ].map((category) => (
              <Link
                key={category.name}
                href={`/shop?category=${category.name}`}
                className="group relative overflow-hidden rounded-lg sm:rounded-xl h-32 sm:h-40 md:h-48 flex items-center justify-center touch-manipulation"
              >
                <div className={`absolute inset-0 bg-linear-to-br ${category.color} group-hover:scale-110 transition-transform duration-300`} />
                <div className="relative z-10 text-center text-white px-2">
                  <div className="text-3xl sm:text-4xl md:text-5xl mb-1.5 sm:mb-2 md:mb-3">{category.icon}</div>
                  <div className="font-display font-bold text-sm sm:text-base md:text-xl leading-tight">{category.name}</div>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* CTA Section */}
        <section>
          <div className="bg-white dark:bg-charcoal-800 rounded-xl sm:rounded-2xl shadow-xl dark:shadow-charcoal-950/50 p-6 sm:p-8 md:p-12 text-center">
            <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-display font-bold text-charcoal-900 dark:text-white mb-2 sm:mb-3 md:mb-4 leading-tight px-2">
              Start Your Fashion Business Today
            </h2>
            <p className="text-sm sm:text-base md:text-lg lg:text-xl text-cool-gray-500 dark:text-cool-gray-400 mb-6 sm:mb-7 md:mb-8 max-w-2xl mx-auto px-2">
              Join thousands of vendors selling on our platform. Easy setup, powerful tools, and reach thousands of customers.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center px-4 sm:px-0">
              <Link 
                href="/auth/signup?role=vendor"
                className="px-6 sm:px-8 py-3 sm:py-4 min-h-[44px] bg-charcoal-800 dark:bg-charcoal-700 text-white rounded-lg font-semibold hover:bg-charcoal-900 dark:hover:bg-charcoal-600 active:scale-95 transition-all shadow-lg hover:shadow-xl text-sm sm:text-base touch-manipulation"
              >
                Become a Vendor
              </Link>
              <Link 
                href="/auth/signup?role=customer"
                className="px-6 sm:px-8 py-3 sm:py-4 min-h-[44px] bg-gold-600 dark:bg-gold-600 text-white rounded-lg font-semibold hover:bg-gold-700 dark:hover:bg-gold-700 active:scale-95 transition-all shadow-lg hover:shadow-xl text-sm sm:text-base touch-manipulation"
              >
                Start Shopping
              </Link>
            </div>
          </div>
        </section>
      </div>

      <Footer />
    </div>
  );
}
