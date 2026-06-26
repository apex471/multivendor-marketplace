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

export default function FeaturedProductsPage() {
  const router = useRouter();
  const { success: toastSuccess, error: toastError, info: toastInfo } = useToast();
  const { addItem } = useCart();
  const [products, setProducts] = useState<ApiProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchProducts = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/products?featured=true&limit=48');
      const json = await res.json();
      if (json.success) setProducts(json.data.products);
    } catch {
      toastError('Failed to load featured products');
    } finally {
      setIsLoading(false);
    }
  }, [toastError]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

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
      <div className="relative bg-gradient-to-br from-gold-800 to-gold-600 text-white py-16 px-4 overflow-hidden">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '32px 32px' }} />
        <div className="container mx-auto text-center relative">
          <span className="inline-block px-4 py-1.5 bg-white/20 rounded-full text-white text-sm font-medium mb-4">⭐ Hand-Picked</span>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Featured Products</h1>
          <p className="text-white/80 text-lg max-w-xl mx-auto">Curated by our experts — the finest luxury items selected just for you.</p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-cool-gray-500 mb-8">
          <Link href="/" className="hover:text-gold-600 transition-colors">Home</Link>
          <span>/</span>
          <Link href="/shop" className="hover:text-gold-600 transition-colors">Shop</Link>
          <span>/</span>
          <span className="text-charcoal-900 dark:text-white font-medium">Featured</span>
        </nav>

        {/* Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
          {isLoading && Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-white dark:bg-charcoal-800 rounded-xl overflow-hidden shadow-md animate-pulse">
              <div className="aspect-square bg-cool-gray-200 dark:bg-charcoal-700" />
              <div className="p-3 space-y-2">
                <div className="h-3 bg-cool-gray-200 dark:bg-charcoal-700 rounded w-2/3" />
                <div className="h-4 bg-cool-gray-200 dark:bg-charcoal-700 rounded" />
                <div className="h-8 bg-cool-gray-200 dark:bg-charcoal-700 rounded mt-2" />
              </div>
            </div>
          ))}

          {!isLoading && products.map(product => (
            <div key={product._id} className="group bg-white dark:bg-charcoal-800 rounded-xl overflow-hidden shadow-md hover:shadow-xl transition-all">
              <button
                onClick={() => router.push(`/product/${product._id}`)}
                className="relative aspect-square overflow-hidden w-full"
              >
                <span className="absolute top-2 left-2 z-10 px-2 py-0.5 bg-gold-500 text-charcoal-900 text-[10px] font-bold rounded">⭐ FEATURED</span>
                <Image
                  src={product.images[0] || '/images/placeholder-product.jpg'}
                  alt={product.name}
                  fill
                  className="object-cover group-hover:scale-110 transition-transform duration-300"
                />
                <button
                  onClick={e => { e.stopPropagation(); handleAddToWishlist(product._id); }}
                  className="absolute bottom-2 right-2 w-8 h-8 bg-white/90 rounded-full flex items-center justify-center shadow-md hover:bg-red-50 transition-colors text-sm z-10"
                  aria-label="Add to wishlist"
                >❤️</button>
              </button>
              <div className="p-3">
                <p className="text-[10px] text-cool-gray-500 mb-1 truncate">{product.vendorName}</p>
                <h3 className="font-semibold text-sm text-charcoal-900 dark:text-white mb-2 line-clamp-2 leading-tight">{product.name}</h3>
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
            <p className="text-5xl mb-4">⭐</p>
            <h3 className="text-2xl font-bold text-charcoal-900 dark:text-white mb-2">No featured products yet</h3>
            <p className="text-cool-gray-500 mb-6">Check back soon — our team is curating the finest pieces.</p>
            <Link href="/shop" className="px-6 py-3 bg-gold-600 text-white rounded-lg font-semibold hover:bg-gold-700 transition-colors">
              Browse All Products
            </Link>
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}
