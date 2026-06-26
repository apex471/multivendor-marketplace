'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import Header from '../../../components/common/Header';
import Footer from '../../../components/common/Footer';
import { useRouter } from 'next/navigation';
import { useCart } from '../../../contexts/CartContext';
import { getAuthToken } from '@/lib/api/auth';
import { useToast } from '@/components/common/Toast';
import Link from 'next/link';

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

export default function NewArrivalsPage() {
  const router = useRouter();
  const { success: toastSuccess, error: toastError, info: toastInfo } = useToast();
  const { addItem } = useCart();
  const [products, setProducts] = useState<ApiProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  const fetchProducts = useCallback(async (p = 1) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/products?sort=newest&page=${p}&limit=24`);
      const json = await res.json();
      if (json.success) {
        const items: ApiProduct[] = json.data.products;
        setProducts(prev => p === 1 ? items : [...prev, ...items]);
        setHasMore(json.data.pagination.hasNext);
      }
    } catch {
      toastError('Failed to load products');
    } finally {
      setIsLoading(false);
    }
  }, [toastError]);

  useEffect(() => { fetchProducts(1); }, [fetchProducts]);

  const handleAddToCart = (product: ApiProduct) => {
    addItem({
      productId: product._id,
      name:      product.name,
      price:     product.salePrice ?? product.price,
      image:     product.images[0] ?? '',
      vendor:    product.vendorName,
      size:      'One Size',
      color:     'Default',
      quantity:  1,
    });
    toastSuccess(`"${product.name}" added to cart! 🛒`);
  };

  const handleAddToWishlist = async (productId: string) => {
    const token = getAuthToken();
    if (!token) { toastInfo('Please log in to save items.'); router.push('/auth/login'); return; }
    const res = await fetch('/api/wishlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ productId }),
    });
    res.ok ? toastSuccess('Added to wishlist ❤️') : toastError('Could not add to wishlist.');
  };

  return (
    <div className="min-h-screen bg-white dark:bg-charcoal-900">
      <Header />

      {/* Hero */}
      <div className="bg-gradient-to-r from-charcoal-900 to-charcoal-800 text-white py-16 px-4">
        <div className="container mx-auto text-center">
          <span className="inline-block px-4 py-1.5 bg-gold-500/20 rounded-full text-gold-300 text-sm font-medium mb-4">Just Dropped</span>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">New Arrivals</h1>
          <p className="text-white/70 text-lg max-w-xl mx-auto">The freshest luxury pieces, just in. Be the first to own them.</p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-cool-gray-500 mb-8">
          <Link href="/" className="hover:text-gold-600 transition-colors">Home</Link>
          <span>/</span>
          <Link href="/shop" className="hover:text-gold-600 transition-colors">Shop</Link>
          <span>/</span>
          <span className="text-charcoal-900 dark:text-white font-medium">New Arrivals</span>
        </nav>

        {/* Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
          {isLoading && page === 1 && Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-white dark:bg-charcoal-800 rounded-xl overflow-hidden shadow-md animate-pulse">
              <div className="aspect-square bg-cool-gray-200 dark:bg-charcoal-700" />
              <div className="p-3 space-y-2">
                <div className="h-3 bg-cool-gray-200 dark:bg-charcoal-700 rounded w-2/3" />
                <div className="h-4 bg-cool-gray-200 dark:bg-charcoal-700 rounded" />
                <div className="h-8 bg-cool-gray-200 dark:bg-charcoal-700 rounded mt-2" />
              </div>
            </div>
          ))}

          {products.map(product => (
            <div key={product._id} className="group bg-white dark:bg-charcoal-800 rounded-xl overflow-hidden shadow-md hover:shadow-xl transition-all">
              <button
                onClick={() => router.push(`/product/${product._id}`)}
                className="relative aspect-square overflow-hidden w-full"
              >
                <span className="absolute top-2 left-2 z-10 px-2 py-0.5 bg-emerald-500 text-white text-[10px] font-bold rounded">NEW</span>
                <Image
                  src={product.images[0] || '/images/placeholder-product.jpg'}
                  alt={product.name}
                  fill
                  className="object-cover group-hover:scale-110 transition-transform duration-300"
                />
                {product.salePrice && product.salePrice < product.price && (
                  <span className="absolute top-2 right-2 z-10 px-2 py-0.5 bg-red-500 text-white text-[10px] font-bold rounded">SALE</span>
                )}
                <button
                  onClick={e => { e.stopPropagation(); handleAddToWishlist(product._id); }}
                  className="absolute bottom-2 right-2 w-8 h-8 bg-white/90 rounded-full flex items-center justify-center shadow-md hover:bg-red-50 transition-colors text-sm z-10"
                  aria-label="Add to wishlist"
                >❤️</button>
              </button>
              <div className="p-3">
                <p className="text-[10px] text-cool-gray-500 mb-1 truncate">{product.vendorName}</p>
                <h3 className="font-semibold text-sm text-charcoal-900 dark:text-white mb-2 line-clamp-2 leading-tight">
                  {product.name}
                </h3>
                <div className="flex items-center gap-1 mb-2">
                  <span className="text-yellow-500 text-xs">⭐</span>
                  <span className="text-xs font-medium text-charcoal-700 dark:text-cool-gray-300">{(product.rating ?? 0).toFixed(1)}</span>
                </div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="font-bold text-sm text-charcoal-900 dark:text-white">
                    ${(product.salePrice ?? product.price).toFixed(2)}
                  </span>
                  {product.salePrice && product.salePrice < product.price && (
                    <span className="text-xs text-cool-gray-500 line-through">${product.price.toFixed(2)}</span>
                  )}
                </div>
                <button
                  onClick={() => handleAddToCart(product)}
                  className="w-full py-2 bg-gold-600 text-white rounded-lg hover:bg-gold-700 active:scale-95 transition-all font-semibold text-xs"
                >
                  Add to Cart
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Empty state */}
        {!isLoading && products.length === 0 && (
          <div className="text-center py-20">
            <p className="text-5xl mb-4">📦</p>
            <h3 className="text-2xl font-bold text-charcoal-900 dark:text-white mb-2">No new arrivals yet</h3>
            <p className="text-cool-gray-500 mb-6">Check back soon for fresh drops.</p>
            <Link href="/shop" className="px-6 py-3 bg-gold-600 text-white rounded-lg font-semibold hover:bg-gold-700 transition-colors">
              Browse All Products
            </Link>
          </div>
        )}

        {/* Load more */}
        {hasMore && (
          <div className="text-center mt-12">
            <button
              onClick={() => { const next = page + 1; setPage(next); fetchProducts(next); }}
              disabled={isLoading}
              className="px-8 py-3 bg-charcoal-900 dark:bg-charcoal-700 text-white rounded-xl font-semibold hover:bg-charcoal-800 disabled:opacity-50 transition-all"
            >
              {isLoading ? 'Loading…' : 'Load More'}
            </button>
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}
