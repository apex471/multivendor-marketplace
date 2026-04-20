'use client';

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Header from "../components/common/Header";
import Footer from "../components/common/Footer";
import { useCart } from "../contexts/CartContext";
import { getAuthToken } from "../lib/api/auth";

interface Post {
  _id: string;
  authorName?: string;
  authorAvatar?: string;
  images?: string[];
  caption?: string;
  likesCount?: number;
  commentsCount?: number;
}

interface Vendor {
  id: string;
  name: string;
  avatar: string | null;
  bio: string;
  products: number;
}

interface Brand {
  id: string;
  name: string;
  avatar: string | null;
  bio: string;
  products: number;
}

interface Product {
  _id: string;
  name: string;
  price: number;
  salePrice?: number;
  images: string[];
  rating?: number;
  salesCount?: number;
  vendorName?: string;
}

export default function Home() {
  const [searchQuery, setSearchQuery] = useState('');
  const [_selectedCategory, setSelectedCategory] = useState('');
  const router = useRouter();
  const { addItem } = useCart();

  const [posts,    setPosts]    = useState<Post[]>([]);
  const [vendors,  setVendors]  = useState<Vendor[]>([]);
  const [brands,   setBrands]   = useState<Brand[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    // Fetch all homepage data in parallel
    Promise.all([
      fetch('/api/posts?limit=6').then(r => r.json()).catch(() => ({})),
      fetch('/api/vendors?limit=4').then(r => r.json()).catch(() => ({})),
      fetch('/api/brands?limit=6').then(r => r.json()).catch(() => ({})),
      fetch('/api/products?limit=6&sort=popular').then(r => r.json()).catch(() => ({})),
    ]).then(([postsRes, vendorsRes, brandsRes, productsRes]) => {
      if (postsRes?.data?.posts)    setPosts(postsRes.data.posts);
      if (vendorsRes?.data?.vendors) setVendors(vendorsRes.data.vendors);
      if (brandsRes?.data?.brands)  setBrands(brandsRes.data.brands);
      if (productsRes?.data?.products) setProducts(productsRes.data.products);
    });
  }, []);

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

  const handleAddToCart = (productId: string) => {
    const product = products.find(p => p._id === productId);
    if (!product) return;
    addItem({
      productId,
      name: product.name,
      price: product.salePrice ?? product.price,
      image: product.images?.[0] ?? '',
      vendor: product.vendorName ?? '',
      size: '',
      color: '',
      quantity: 1,
    });
  };

  const handleAddToWishlist = async (productId: string) => {
    const token = getAuthToken();
    if (!token) { router.push('/auth/login'); return; }
    await fetch('/api/wishlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ productId }),
    });
  };

  return (
    <div className="min-h-screen bg-cool-gray-50 dark:bg-charcoal-950 transition-colors duration-200">
      <Header />

      {/* Hero Section with Search */}
      <section className="relative bg-linear-to-br from-charcoal-900 via-charcoal-800 to-charcoal-700 dark:from-charcoal-950 dark:via-charcoal-900 dark:to-charcoal-800 text-white overflow-hidden">
        {/* Branded hero background */}
        <div className="absolute inset-0">
          <Image
            src="/images/brand/clw-banner1.jpg"
            alt="Certified Luxury World"
            fill
            className="object-cover object-center"
            priority
            quality={85}
          />
          <div className="absolute inset-0 bg-charcoal-950/65 dark:bg-charcoal-950/75" />
          <div className="absolute inset-0 bg-linear-to-br from-charcoal-900/40 via-transparent to-gold-900/20" />
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
                  className="px-5 sm:px-8 py-2.5 sm:py-3 bg-charcoal-900 dark:bg-gold-600 text-white rounded-xl sm:rounded-full font-semibold hover:bg-charcoal-800 dark:hover:bg-gold-700 active:scale-95 transition-all flex items-center justify-center gap-2 min-h-11 text-sm sm:text-base"
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
                    className="px-2.5 sm:px-3 md:px-4 py-1.5 sm:py-2 bg-white/20 dark:bg-white/10 hover:bg-white/30 dark:hover:bg-white/20 active:bg-white/40 dark:active:bg-white/30 backdrop-blur-sm rounded-full text-xs sm:text-sm font-medium transition-all min-h-8 sm:min-h-9 touch-manipulation"
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
            {vendors.slice(0, 6).map((vendor, i) => (
              <button
                key={vendor.id}
                onClick={() => router.push(`/vendors/${vendor.id}`)}
                className="shrink-0 text-center group touch-manipulation"
              >
                <div className="relative w-16 h-16 sm:w-20 sm:h-20 mb-1.5 sm:mb-2">
                  <div className={`absolute inset-0 rounded-full ${i % 2 === 0 ? 'bg-linear-to-tr from-yellow-400 via-red-500 to-purple-500' : 'bg-gray-300'} p-[2.5px] sm:p-[3px]`}>
                    <div className="w-full h-full rounded-full bg-white p-[2px] sm:p-[3px]">
                      {vendor.avatar ? (
                        <Image src={vendor.avatar} alt={vendor.name} width={80} height={80} className="w-full h-full rounded-full object-cover" />
                      ) : (
                        <div className="w-full h-full rounded-full bg-gold-100 dark:bg-charcoal-700 flex items-center justify-center text-lg font-bold text-gold-600">
                          {vendor.name.charAt(0)}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <p className="text-[10px] sm:text-xs text-charcoal-700 dark:text-cool-gray-300 truncate w-16 sm:w-20 group-hover:text-gold-600 dark:group-hover:text-gold-400 transition-colors">
                  {vendor.name.split(' ')[0]}
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

          {posts.length === 0 ? (
            <div className="text-center py-12 text-cool-gray-400">
              <p className="text-4xl mb-3">📸</p>
              <p>No posts yet. Be the first to share your style!</p>
            </div>
          ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-5 md:gap-6">
            {posts.map((post) => (
              <div key={post._id} className="bg-white dark:bg-charcoal-800 rounded-xl overflow-hidden shadow-md dark:shadow-charcoal-950/50 hover:shadow-xl dark:hover:shadow-charcoal-950/70 transition-shadow">
                <button
                  onClick={() => router.push(`/post/${post._id}`)}
                  className="relative aspect-square w-full"
                >
                  {post.images?.[0] ? (
                    <Image src={post.images[0]} alt={post.caption || 'Post'} fill className="object-cover" />
                  ) : (
                    <div className="w-full h-full bg-charcoal-100 dark:bg-charcoal-700 flex items-center justify-center text-4xl">🖼️</div>
                  )}
                </button>
                <div className="p-3 sm:p-4">
                  <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                    {post.authorAvatar ? (
                      <Image src={post.authorAvatar} alt={post.authorName || 'Author'} width={32} height={32} className="w-7 h-7 sm:w-8 sm:h-8 rounded-full" />
                    ) : (
                      <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gold-100 dark:bg-charcoal-700 flex items-center justify-center text-xs font-bold text-gold-600">
                        {(post.authorName || 'U').charAt(0)}
                      </div>
                    )}
                    <span className="font-semibold text-charcoal-900 dark:text-white text-sm sm:text-base">{post.authorName || 'Anonymous'}</span>
                  </div>
                  {post.caption && <p className="text-charcoal-700 dark:text-cool-gray-300 mb-2 sm:mb-3 text-sm sm:text-base line-clamp-2">{post.caption}</p>}
                  <div className="flex items-center gap-3 sm:gap-4 text-charcoal-600 dark:text-cool-gray-400 text-xs sm:text-sm">
                    <span className="flex items-center gap-1"><span className="text-base sm:text-lg">❤️</span> <span>{post.likesCount ?? 0}</span></span>
                    <span className="flex items-center gap-1"><span className="text-base sm:text-lg">💬</span> <span>{post.commentsCount ?? 0}</span></span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          )}
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

          {vendors.length === 0 ? (
            <div className="text-center py-12 text-cool-gray-400">
              <p className="text-4xl mb-3">🏪</p>
              <p>No vendors yet. <Link href="/become-vendor" className="text-gold-600 hover:underline">Be the first!</Link></p>
            </div>
          ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
            {vendors.map((vendor) => (
              <Link
                key={vendor.id}
                href={`/vendors/${vendor.id}`}
                className="bg-white dark:bg-charcoal-800 rounded-lg sm:rounded-xl p-3 sm:p-4 md:p-6 shadow-md dark:shadow-charcoal-950/50 hover:shadow-xl dark:hover:shadow-charcoal-950/70 transition-all hover:-translate-y-1 touch-manipulation"
              >
                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-2 sm:gap-4 mb-3 sm:mb-4">
                  {vendor.avatar ? (
                    <Image src={vendor.avatar} alt={vendor.name} width={60} height={60} className="w-12 h-12 sm:w-14 sm:h-14 rounded-full shrink-0 object-cover" />
                  ) : (
                    <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gold-100 dark:bg-charcoal-700 flex items-center justify-center text-xl font-bold text-gold-600 shrink-0">
                      {vendor.name.charAt(0)}
                    </div>
                  )}
                  <span className="px-1.5 sm:px-2 py-0.5 sm:py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 text-[10px] sm:text-xs font-semibold rounded">✓ Verified</span>
                </div>
                <h3 className="font-display font-bold text-sm sm:text-base md:text-lg text-charcoal-900 dark:text-white mb-1.5 sm:mb-2 text-center sm:text-left truncate">{vendor.name}</h3>
                <p className="text-xs sm:text-sm text-charcoal-600 dark:text-cool-gray-400">{vendor.products} products</p>
              </Link>
            ))}
          </div>
          )}
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

          {brands.length === 0 ? (
            <div className="text-center py-12 text-cool-gray-400">
              <p className="text-4xl mb-3">🏷️</p>
              <p>No brands registered yet. <Link href="/become-brand" className="text-gold-600 hover:underline">Register yours!</Link></p>
            </div>
          ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 gap-4 sm:gap-6">
            {brands.map((brand) => (
              <Link
                key={brand.id}
                href={`/brand/${brand.id}`}
                className="group bg-white dark:bg-charcoal-800 rounded-xl overflow-hidden shadow-md dark:shadow-charcoal-950/50 hover:shadow-2xl dark:hover:shadow-charcoal-950/70 transition-all hover:-translate-y-1"
              >
                <div className="relative h-24 sm:h-32 bg-linear-to-br from-gold-900/20 to-charcoal-800 flex items-center justify-center">
                  <div className="absolute top-3 right-3 z-10 px-2 py-1 bg-blue-600 text-white text-xs font-semibold rounded-full flex items-center gap-1">
                    <span>✓</span><span className="hidden sm:inline">Official</span>
                  </div>
                  {brand.avatar ? (
                    <Image src={brand.avatar} alt={brand.name} width={80} height={80} className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl object-cover border-4 border-white dark:border-charcoal-700 shadow-lg" />
                  ) : (
                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-white dark:bg-charcoal-700 flex items-center justify-center text-2xl sm:text-3xl font-bold text-gold-600 border-4 border-white dark:border-charcoal-700 shadow-lg">
                      {brand.name.charAt(0)}
                    </div>
                  )}
                </div>
                <div className="p-4 sm:p-6">
                  <h3 className="font-display font-bold text-base sm:text-lg text-charcoal-900 dark:text-white mb-1">{brand.name}</h3>
                  {brand.bio && <p className="text-xs sm:text-sm text-cool-gray-600 dark:text-cool-gray-400 mb-3 line-clamp-2">{brand.bio}</p>}
                  <div className="flex items-center gap-1 text-xs text-charcoal-600 dark:text-cool-gray-400">
                    <span>📦</span>
                    <span className="font-semibold text-charcoal-900 dark:text-white">{brand.products}</span>
                    <span>products</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
          )}
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

          {products.length === 0 ? (
            <div className="text-center py-12 text-cool-gray-400">
              <p className="text-4xl mb-3">🛒</p>
              <p>No products listed yet.</p>
            </div>
          ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 md:gap-6">
            {products.map((product) => (
              <div key={product._id} className="group relative isolate">
                <div className="bg-white dark:bg-charcoal-800 rounded-lg sm:rounded-xl overflow-hidden shadow-md dark:shadow-charcoal-950/50 hover:shadow-xl dark:hover:shadow-charcoal-950/70 transition-shadow duration-300">
                  <div
                    onClick={() => handleProductClick(product._id)}
                    className="group/img relative aspect-square overflow-hidden w-full cursor-pointer touch-manipulation"
                  >
                    {product.images?.[0] ? (
                      <Image
                        src={product.images[0]}
                        alt={product.name}
                        fill
                        sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 16vw"
                        className="object-cover object-center group-hover/img:scale-110 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full bg-charcoal-100 dark:bg-charcoal-700 flex items-center justify-center text-4xl">🖼️</div>
                    )}
                    {product.salePrice && product.salePrice < product.price && (
                      <span className="absolute top-1.5 left-1.5 sm:top-2 sm:left-2 px-1.5 py-0.5 sm:px-2 sm:py-1 bg-red-600 text-white text-[10px] sm:text-xs font-bold rounded">SALE</span>
                    )}
                    <div className="absolute top-1.5 right-1.5 sm:top-2 sm:right-2 flex flex-col gap-1.5 sm:gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleAddToWishlist(product._id); }}
                        className="w-7 h-7 sm:w-8 sm:h-8 bg-white/90 dark:bg-charcoal-700/90 rounded-full flex items-center justify-center shadow-md hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors touch-manipulation text-xs sm:text-sm"
                        aria-label="Add to wishlist"
                      >❤️</button>
                    </div>
                  </div>
                  <div className="p-2 sm:p-3">
                    <p className="text-[10px] sm:text-xs text-cool-gray-500 dark:text-cool-gray-400 mb-0.5 sm:mb-1 truncate">{product.vendorName}</p>
                    <h3 className="font-semibold text-xs sm:text-sm text-charcoal-900 dark:text-white mb-1 sm:mb-2 line-clamp-2 group-hover:text-gold-600 dark:group-hover:text-gold-400 transition-colors leading-tight">{product.name}</h3>
                    <div className="flex items-center gap-0.5 sm:gap-1 mb-1 sm:mb-2">
                      <span className="text-yellow-500 text-[10px] sm:text-xs">⭐</span>
                      <span className="text-[10px] sm:text-xs font-medium text-charcoal-700 dark:text-cool-gray-300">{(product.rating ?? 0).toFixed(1)}</span>
                      <span className="text-[10px] sm:text-xs text-cool-gray-500 dark:text-cool-gray-400">({product.salesCount ?? 0})</span>
                    </div>
                    <div className="flex items-center gap-1 sm:gap-2 mb-1.5 sm:mb-2">
                      <span className="font-bold text-sm sm:text-base text-charcoal-900 dark:text-white">${(product.salePrice ?? product.price).toFixed(2)}</span>
                      {product.salePrice && product.salePrice < product.price && (
                        <span className="text-[10px] sm:text-xs text-cool-gray-500 dark:text-cool-gray-400 line-through">${product.price.toFixed(2)}</span>
                      )}
                    </div>
                    <button
                      onClick={(e) => { e.preventDefault(); handleAddToCart(product._id); }}
                      className="w-full py-1.5 sm:py-2 min-h-9 bg-gold-600 dark:bg-gold-600 text-white rounded-lg hover:bg-gold-700 dark:hover:bg-gold-700 active:scale-95 transition-all font-semibold text-[11px] sm:text-xs touch-manipulation"
                    >Add to Cart</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          )}
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
                className="px-6 sm:px-8 py-3 sm:py-4 min-h-11 bg-charcoal-800 dark:bg-charcoal-700 text-white rounded-lg font-semibold hover:bg-charcoal-900 dark:hover:bg-charcoal-600 active:scale-95 transition-all shadow-lg hover:shadow-xl text-sm sm:text-base touch-manipulation"
              >
                Become a Vendor
              </Link>
              <Link 
                href="/auth/signup?role=customer"
                className="px-6 sm:px-8 py-3 sm:py-4 min-h-11 bg-gold-600 dark:bg-gold-600 text-white rounded-lg font-semibold hover:bg-gold-700 dark:hover:bg-gold-700 active:scale-95 transition-all shadow-lg hover:shadow-xl text-sm sm:text-base touch-manipulation"
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
