'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import Header from '../../components/common/Header';
import Footer from '../../components/common/Footer';
import { useRouter } from 'next/navigation';
import { useCheckout } from '../../contexts/CheckoutContext';

interface CartItem {
  id: string;
  productId: string;
  name: string;
  price: number;
  image: string;
  vendor: string;
  quantity: number;
  size?: string;
  color?: string;
}

export default function CartPage() {
  const router = useRouter();
  const { checkoutData, updateCartItems, calculateTotals } = useCheckout();
  
  const [cartItems, setCartItems] = useState<CartItem[]>([
    {
      id: '1',
      productId: 'p1',
      name: 'Designer Silk Dress',
      price: 299,
      image: '/images/products/product1.jpg',
      vendor: 'Luxury Fashion Co.',
      quantity: 1,
      size: 'M',
      color: 'Navy Blue'
    },
    {
      id: '2',
      productId: 'p2',
      name: 'Premium Leather Jacket',
      price: 599,
      image: '/images/products/product2.jpg',
      vendor: 'Elite Wear',
      quantity: 1,
      size: 'L',
      color: 'Black'
    },
    {
      id: '3',
      productId: 'p3',
      name: 'Gold Chain Necklace',
      price: 899,
      image: '/images/products/product3.jpg',
      vendor: 'Jewel Masters',
      quantity: 2
    },
  ]);

  // Sync cart items with checkout context on mount
  useEffect(() => {
    updateCartItems(cartItems);
    calculateTotals();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update checkout context when cart items change
  useEffect(() => {
    if (cartItems.length > 0) {
      updateCartItems(cartItems);
      calculateTotals();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cartItems.length, cartItems.map(item => item.quantity).join(',')]);

  const updateQuantity = (itemId: string, newQuantity: number) => {
    if (newQuantity < 1) return;
    setCartItems(items =>
      items.map(item =>
        item.id === itemId ? { ...item, quantity: newQuantity } : item
      )
    );
  };

  const removeItem = (itemId: string) => {
    setCartItems(items => items.filter(item => item.id !== itemId));
  };

  const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const shipping = subtotal > 500 ? 0 : 25;
  const tax = subtotal * 0.08;
  const total = subtotal + shipping + tax;

  const handleCheckout = () => {
    if (cartItems.length === 0) {
      alert('Your cart is empty!');
      return;
    }
    router.push('/checkout/cart-review');
  };

  return (
    <div className="min-h-screen bg-white dark:bg-charcoal-900">
      <Header />

      <div className="container mx-auto px-4 py-6 sm:py-8 md:py-12">
        {/* Page Header */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-display font-bold text-charcoal-900 dark:text-white mb-2">
            Shopping Cart
          </h1>
          <p className="text-sm sm:text-base text-charcoal-600 dark:text-cool-gray-400">
            {cartItems.length} {cartItems.length === 1 ? 'item' : 'items'} in your cart
          </p>
        </div>

        {cartItems.length === 0 ? (
          /* Empty Cart */
          <div className="text-center py-12 sm:py-16 bg-white dark:bg-charcoal-800 rounded-xl border border-cool-gray-300 dark:border-charcoal-700">
            <div className="text-5xl sm:text-6xl mb-4">🛒</div>
            <h3 className="text-xl sm:text-2xl font-display font-bold text-charcoal-900 dark:text-white mb-2">Your cart is empty</h3>
            <p className="text-sm sm:text-base text-charcoal-600 dark:text-cool-gray-400 mb-6">Add some luxury items to get started</p>
            <Link
              href="/shop"
              className="inline-block px-6 py-3 bg-gold-600 text-white rounded-lg font-semibold hover:bg-gold-700 transition-colors text-sm sm:text-base touch-manipulation min-h-[44px]"
            >
              Start Shopping
            </Link>
          </div>
        ) : (
          <div className="grid lg:grid-cols-3 gap-6 sm:gap-8">
            {/* Cart Items */}
            <div className="lg:col-span-2 space-y-4">
              {cartItems.map(item => (
                <div key={item.id} className="bg-white dark:bg-charcoal-800 border border-cool-gray-300 dark:border-charcoal-700 rounded-lg sm:rounded-xl p-4 sm:p-6">
                  <div className="flex gap-4">
                    {/* Product Image */}
                    <div className="relative w-20 h-20 sm:w-24 sm:h-24 flex-shrink-0 rounded-lg overflow-hidden">
                      <Image
                        src={item.image}
                        alt={item.name}
                        fill
                        className="object-cover"
                      />
                    </div>

                    {/* Product Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-sm sm:text-base text-charcoal-900 dark:text-white mb-1 line-clamp-1">
                            {item.name}
                          </h3>
                          <p className="text-xs sm:text-sm text-charcoal-600 dark:text-cool-gray-400">{item.vendor}</p>
                        </div>
                        <button
                          onClick={() => removeItem(item.id)}
                          className="text-red-600 hover:text-red-700 p-1 touch-manipulation"
                          aria-label="Remove item"
                        >
                          <span className="text-lg sm:text-xl">🗑️</span>
                        </button>
                      </div>

                      {/* Variants */}
                      {(item.size || item.color) && (
                        <div className="flex gap-3 mb-3 text-xs sm:text-sm text-charcoal-600 dark:text-cool-gray-400">
                          {item.size && <span>Size: {item.size}</span>}
                          {item.color && <span>Color: {item.color}</span>}
                        </div>
                      )}

                      {/* Price and Quantity */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 sm:gap-3">
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg border border-cool-gray-300 dark:border-charcoal-600 bg-white dark:bg-charcoal-700 text-charcoal-900 dark:text-white flex items-center justify-center hover:bg-cool-gray-100 dark:hover:bg-charcoal-600 active:scale-95 transition-all touch-manipulation"
                          >
                            −
                          </button>
                          <span className="w-8 sm:w-10 text-center font-semibold text-sm sm:text-base text-charcoal-900 dark:text-white">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg border border-cool-gray-300 dark:border-charcoal-600 bg-white dark:bg-charcoal-700 text-charcoal-900 dark:text-white flex items-center justify-center hover:bg-cool-gray-100 dark:hover:bg-charcoal-600 active:scale-95 transition-all touch-manipulation"
                          >
                            +
                          </button>
                        </div>
                        <div className="font-bold text-base sm:text-lg text-charcoal-900 dark:text-white">
                          ${(item.price * item.quantity).toFixed(2)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {/* Continue Shopping */}
              <Link
                href="/shop"
                className="inline-flex items-center gap-2 text-gold-600 hover:text-gold-700 dark:text-gold-500 dark:hover:text-gold-600 font-semibold text-sm sm:text-base touch-manipulation"
              >
                <span>←</span> Continue Shopping
              </Link>
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-1">
              <div className="bg-white dark:bg-charcoal-800 border border-cool-gray-300 dark:border-charcoal-700 rounded-lg sm:rounded-xl p-4 sm:p-6 sticky top-4">
                <h2 className="text-lg sm:text-xl font-display font-bold text-charcoal-900 dark:text-white mb-4 sm:mb-6">
                  Order Summary
                </h2>

                <div className="space-y-3 sm:space-y-4 mb-4 sm:mb-6">
                  <div className="flex justify-between text-sm sm:text-base">
                    <span className="text-charcoal-600 dark:text-cool-gray-400">Subtotal</span>
                    <span className="font-semibold text-charcoal-900 dark:text-white">${subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm sm:text-base">
                    <span className="text-charcoal-600 dark:text-cool-gray-400">Shipping</span>
                    <span className="font-semibold text-charcoal-900 dark:text-white">
                      {shipping === 0 ? 'FREE' : `$${shipping.toFixed(2)}`}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm sm:text-base">
                    <span className="text-charcoal-600 dark:text-cool-gray-400">Tax</span>
                    <span className="font-semibold text-charcoal-900 dark:text-white">${tax.toFixed(2)}</span>
                  </div>
                  <div className="border-t border-cool-gray-300 dark:border-charcoal-700 pt-3 sm:pt-4">
                    <div className="flex justify-between text-base sm:text-lg">
                      <span className="font-bold text-charcoal-900 dark:text-white">Total</span>
                      <span className="font-bold text-charcoal-900 dark:text-white">${total.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {shipping > 0 && (
                  <div className="mb-4 sm:mb-6 p-3 bg-gold-600/10 dark:bg-gold-600/20 border border-gold-600/30 dark:border-gold-600/40 rounded-lg text-xs sm:text-sm text-charcoal-900 dark:text-white">
                    💡 Add ${(500 - subtotal).toFixed(2)} more to get FREE shipping!
                  </div>
                )}

                <button
                  onClick={handleCheckout}
                  className="w-full py-3 sm:py-4 min-h-[48px] bg-gold-600 text-white rounded-lg font-semibold hover:bg-gold-700 active:scale-95 transition-all text-sm sm:text-base touch-manipulation mb-3"
                >
                  Proceed to Checkout
                </button>

                <div className="text-center text-xs sm:text-sm text-charcoal-600 dark:text-cool-gray-400">
                  <p>🔒 Secure checkout powered by Stripe</p>
                </div>

                {/* Trust Badges */}
                <div className="mt-6 pt-6 border-t border-cool-gray-300 dark:border-charcoal-700 space-y-2 text-xs sm:text-sm text-charcoal-600 dark:text-cool-gray-400">
                  <div className="flex items-center gap-2">
                    <span className="text-gold-600">✓</span>
                    <span>Free returns within 30 days</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-gold-600">✓</span>
                    <span>Authenticity guaranteed</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-gold-600">✓</span>
                    <span>24/7 customer support</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}
