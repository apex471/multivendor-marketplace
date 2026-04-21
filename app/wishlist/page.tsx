'use client';

import { getAuthToken } from '@/lib/api/auth';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import Header from '@/components/common/Header';
import Footer from '@/components/common/Footer';
import { useCart } from '@/contexts/CartContext';

interface WishlistItem {
  wishlistId: string;
  productId: string;
  name: string;
  price: number;
  oldPrice?: number;
  image: string;
  vendor: string;
  rating: number;
  inStock: boolean;
  addedAt: string;
}

export default function WishlistPage() {
  const router = useRouter();
  const { addItem: addToCart } = useCart();
  useEffect(() => { if (!getAuthToken()) router.replace('/auth/login?redirect=/wishlist'); }, [router]);
  const [wishlistItems, setWishlistItems] = useState<WishlistItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchWishlist = useCallback(async () => {
    const token = getAuthToken();
    if (!token) { setIsLoading(false); return; }
    try {
      const res = await fetch('/api/wishlist', { headers: { Authorization: `Bearer ${token}` } });
      const json = await res.json();
      if (json.success) setWishlistItems(json.data.wishlist ?? []);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchWishlist(); }, [fetchWishlist]);

  const handleRemoveItem = async (productId: string) => {
    const token = getAuthToken();
    if (!token) return;
    await fetch(`/api/wishlist?productId=${productId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    setWishlistItems(prev => prev.filter(item => item.productId !== productId));
  };

  const handleAddToCart = (item: WishlistItem) => {
    addToCart({
      productId: item.productId,
      name:      item.name,
      price:     item.price,
      image:     item.image,
      vendor:    item.vendor,
      size:      '',
      color:     '',
      quantity:  1,
    });
  };

  const handleMoveAllToCart = () => {
    wishlistItems.filter(i => i.inStock).forEach(item => handleAddToCart(item));
  };

  const totalValue = wishlistItems.reduce((sum, item) => sum + item.price, 0);
  const inStockCount = wishlistItems.filter(item => item.inStock).length;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white dark:bg-charcoal-900 flex items-center justify-center">
        <p className="text-charcoal-600 dark:text-cool-gray-400">Loading wishlist...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-charcoal-900">
      <Header />

      <div className="container mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-charcoal-900 dark:text-white mb-2">My Wishlist</h1>
          <p className="text-charcoal-600 dark:text-cool-gray-400">
            {wishlistItems.length} {wishlistItems.length === 1 ? 'item' : 'items'} saved for later
          </p>
        </div>

        {wishlistItems.length === 0 ? (
          // Empty Wishlist
          <div className="bg-white dark:bg-charcoal-800 rounded-lg shadow-md p-12 text-center">
            <div className="text-6xl mb-4">💝</div>
            <h3 className="text-xl font-bold text-charcoal-900 dark:text-white mb-2">Your wishlist is empty</h3>
            <p className="text-charcoal-600 dark:text-cool-gray-400 mb-6">
              Start adding items you love to keep track of them!

            </p>
            <Link
              href="/shop"
              className="inline-block px-6 py-3 bg-gold-600 text-white rounded-lg font-semibold hover:bg-gold-700 transition-colors"
            >
              Explore Products
            </Link>
          </div>
        ) : (
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Left Column - Wishlist Items */}
            <div className="lg:col-span-2 space-y-4">
              {/* Actions Bar */}
              <div className="bg-white dark:bg-charcoal-800 rounded-lg shadow-md p-4 flex flex-wrap items-center justify-between gap-4">
                <div className="text-sm text-charcoal-600 dark:text-cool-gray-400">
                  <span className="font-semibold text-charcoal-900 dark:text-white">{inStockCount}</span> items available in stock
                </div>
                <button
                  onClick={handleMoveAllToCart}
                  disabled={inStockCount === 0}
                  className="px-6 py-2 bg-gold-600 text-white rounded-lg font-semibold hover:bg-gold-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  Add All to Cart
                </button>
              </div>

              {/* Wishlist Items */}
              {wishlistItems.map((item) => (
                <div key={item.wishlistId} className="bg-white dark:bg-charcoal-800 rounded-lg shadow-md hover:shadow-lg transition-shadow">
                  <div className="p-4 sm:p-6">
                    <div className="flex gap-4">
                      {/* Product Image */}
                      <Link href={`/product/${item.productId}`} className="shrink-0">
                        <div className="relative w-24 h-24 sm:w-32 sm:h-32 rounded-lg overflow-hidden">
                          <Image
                            src={item.image}
                            alt={item.name}
                            fill
                            className="object-cover hover:scale-105 transition-transform"
                          />
                          {!item.inStock && (
                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                              <span className="text-white text-xs font-bold">Out of Stock</span>
                            </div>
                          )}
                        </div>
                      </Link>

                      {/* Product Info */}
                      <div className="flex-1 min-w-0">
                        <Link href={`/product/${item.productId}`}>
                          <h3 className="font-semibold text-charcoal-900 dark:text-white hover:text-gold-600 transition-colors mb-1">
                            {item.name}
                          </h3>
                        </Link>
                        <Link
                          href={`/product/${item.productId}`}
                          className="text-sm text-charcoal-600 dark:text-cool-gray-400 hover:text-gold-600 transition-colors mb-2 block"
                        >
                          {item.vendor}
                        </Link>
                        
                        <div className="flex items-center gap-2 mb-3">
                          <div className="flex items-center gap-1">
                            <span className="text-yellow-500">⭐</span>
                            <span className="text-sm font-medium text-charcoal-900 dark:text-white">{item.rating}</span>
                          </div>
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                            item.inStock
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {item.inStock ? 'In Stock' : 'Out of Stock'}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 mb-4">
                          <span className="text-xl font-bold text-charcoal-900 dark:text-white">${item.price.toFixed(2)}</span>
                          {item.oldPrice && (
                            <>
                              <span className="text-sm text-gray-500 dark:text-cool-gray-500 line-through">${item.oldPrice.toFixed(2)}</span>
                              <span className="px-2 py-1 bg-red-100 text-red-800 text-xs font-bold rounded">
                                SALE
                              </span>
                            </>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => handleAddToCart(item)}
                            disabled={!item.inStock}
                            className="px-4 py-2 bg-gold-600 text-white rounded-lg text-sm font-semibold hover:bg-gold-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                          >
                            Add to Cart
                          </button>
                          <button
                            onClick={() => handleRemoveItem(item.productId)}
                            className="px-4 py-2 border-2 border-gray-300 dark:border-charcoal-600 text-charcoal-700 dark:text-cool-gray-300 rounded-lg text-sm font-semibold hover:bg-gray-50 dark:hover:bg-charcoal-700 transition-colors"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Added Date */}
                  <div className="px-4 sm:px-6 pb-4 text-xs text-charcoal-600 dark:text-cool-gray-400">
                    Added {new Date(item.addedAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Right Column - Summary */}
            <div className="lg:col-span-1">
              <div className="bg-white dark:bg-charcoal-800 rounded-lg shadow-md p-6 sticky top-4 space-y-6">
                {/* Wishlist Summary */}
                <div>
                  <h3 className="text-xl font-bold text-charcoal-900 dark:text-white mb-4">Wishlist Summary</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-charcoal-600 dark:text-cool-gray-400">Total Items</span>
                      <span className="font-semibold text-charcoal-900 dark:text-white">{wishlistItems.length}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-charcoal-600 dark:text-cool-gray-400">In Stock</span>
                      <span className="font-semibold text-green-600">{inStockCount}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-charcoal-600 dark:text-cool-gray-400">Out of Stock</span>
                      <span className="font-semibold text-red-600">{wishlistItems.length - inStockCount}</span>
                    </div>
                  </div>

                  <div className="border-t dark:border-charcoal-700 mt-4 pt-4">
                    <div className="flex justify-between">
                      <span className="font-semibold text-charcoal-900 dark:text-white">Total Value</span>
                      <span className="text-xl font-bold text-gold-600">${totalValue.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="border-t dark:border-charcoal-700 pt-6">
                  <h4 className="font-semibold text-charcoal-900 dark:text-white mb-3">Quick Actions</h4>
                  <div className="space-y-2">
                    <button
                      onClick={handleMoveAllToCart}
                      disabled={inStockCount === 0}
                      className="w-full px-4 py-3 bg-gold-600 text-white rounded-lg font-semibold hover:bg-gold-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                      Move All to Cart
                    </button>
                    <Link
                      href="/shop"
                      className="block w-full px-4 py-3 border-2 border-gray-300 dark:border-charcoal-600 text-charcoal-700 dark:text-cool-gray-300 rounded-lg font-semibold hover:bg-gray-50 dark:hover:bg-charcoal-700 transition-colors text-center"
                    >
                      Continue Shopping
                    </Link>
                    <button
                      onClick={async () => {
                        if (confirm('Are you sure you want to clear your wishlist?')) {
                          const token = getAuthToken();
                          if (token) await fetch('/api/wishlist?all=true', { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
                          setWishlistItems([]);
                        }
                      }}
                      className="w-full px-4 py-3 border-2 border-red-300 text-red-600 rounded-lg font-semibold hover:bg-red-50 transition-colors"
                    >
                      Clear Wishlist
                    </button>
                  </div>
                </div>

                {/* Share Wishlist */}
                <div className="border-t dark:border-charcoal-700 pt-6">
                  <h4 className="font-semibold text-charcoal-900 dark:text-white mb-3">Share Your Wishlist</h4>
                  <p className="text-sm text-charcoal-600 dark:text-cool-gray-400 mb-3">
                    Share your wishlist with friends and family
                  </p>
                  <button className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors">
                    Get Shareable Link
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Recommendations */}
        {wishlistItems.length > 0 && (
          <div className="mt-12">
            <h2 className="text-2xl font-bold text-charcoal-900 dark:text-white mb-6">You Might Also Like</h2>
            <div className="bg-white dark:bg-charcoal-800 rounded-lg shadow-md p-6">
              <p className="text-charcoal-600 dark:text-cool-gray-400 text-center">
                Based on items in your wishlist...
                <br />
                <Link href="/shop" className="text-gold-600 hover:text-gold-700 font-medium">
                  View Recommendations →
                </Link>
              </p>
            </div>
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}
