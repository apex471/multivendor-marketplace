'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import Header from '../../../components/common/Header';
import Footer from '../../../components/common/Footer';
import { useCheckout } from '../../../contexts/CheckoutContext';

export default function CartReviewPage() {
  const router = useRouter();
  const { checkoutData, updateCartItem, removeCartItem, applyCoupon, calculateTotals } = useCheckout();
  const { cartItems, subtotal, discount, couponCode } = checkoutData;

  useEffect(() => {
    calculateTotals();
  }, []);

  const handleQuantityChange = (itemId: string, newQuantity: number) => {
    if (newQuantity > 0) {
      updateCartItem(itemId, newQuantity);
    }
  };

  const handleRemove = (itemId: string) => {
    if (confirm('Remove this item from cart?')) {
      removeCartItem(itemId);
    }
  };

  const handleApplyCoupon = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const code = formData.get('coupon') as string;
    applyCoupon(code);
  };

  const handleContinue = () => {
    if (cartItems.length === 0) {
      alert('Your cart is empty');
      return;
    }
    router.push('/checkout/shipping');
  };

  const discountAmount = (subtotal * discount) / 100;

  return (
    <div className="min-h-screen bg-white dark:bg-charcoal-900">
      <Header />

      <div className="container mx-auto px-4 py-8">
        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-center mb-4">
            {['Cart', 'Shipping', 'Payment', 'Review', 'Confirmation'].map((step, index) => (
              <div key={step} className="flex items-center">
                <div className={`flex items-center justify-center w-10 h-10 rounded-full ${
                  index === 0 ? 'bg-gold-600 text-white' : 'bg-cool-gray-200 dark:bg-charcoal-700 text-charcoal-600 dark:text-cool-gray-400'
                }`}>
                  {index + 1}
                </div>
                {index < 4 && (
                  <div className={`w-12 sm:w-20 h-1 ${
                    index < 0 ? 'bg-gold-600' : 'bg-cool-gray-200 dark:bg-charcoal-700'
                  }`} />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-center gap-12 sm:gap-20 text-xs sm:text-sm">
            {['Cart', 'Shipping', 'Payment', 'Review', 'Confirmation'].map((step, index) => (
              <span key={step} className={index === 0 ? 'text-gold-600 font-semibold' : 'text-charcoal-600 dark:text-cool-gray-400'}>
                {step}
              </span>
            ))}
          </div>
        </div>

        <h1 className="text-3xl font-bold text-charcoal-900 dark:text-white mb-6">Shopping Cart</h1>

        {cartItems.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🛒</div>
            <p className="text-xl text-charcoal-600 dark:text-cool-gray-400 mb-6">Your cart is empty</p>
            <Link
              href="/shop"
              className="inline-block px-6 py-3 bg-gold-600 text-white rounded-lg hover:bg-gold-700 transition-colors"
            >
              Continue Shopping
            </Link>
          </div>
        ) : (
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Cart Items */}
            <div className="lg:col-span-2">
              <div className="space-y-4">
                {cartItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex gap-4 bg-white dark:bg-charcoal-800 border border-cool-gray-300 dark:border-charcoal-700 rounded-lg p-4"
                  >
                    <div className="relative w-24 h-24 rounded-lg overflow-hidden shrink-0">
                      <Image src={item.image} alt={item.name} fill className="object-cover" />
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between mb-2">
                        <div>
                          <h3 className="font-semibold text-charcoal-900 dark:text-white">{item.name}</h3>
                          <p className="text-sm text-charcoal-600 dark:text-cool-gray-400">{item.vendor}</p>
                          {item.size && <p className="text-sm text-charcoal-600 dark:text-cool-gray-400">Size: {item.size}</p>}
                          {item.color && <p className="text-sm text-charcoal-600 dark:text-cool-gray-400">Color: {item.color}</p>}
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-gold-600">${item.price.toFixed(2)}</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleQuantityChange(item.id, item.quantity - 1)}
                            className="w-8 h-8 rounded border border-cool-gray-300 dark:border-charcoal-700 hover:bg-cool-gray-50 dark:hover:bg-charcoal-700 transition-colors"
                          >
                            −
                          </button>
                          <span className="w-12 text-center font-semibold text-charcoal-900 dark:text-white">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                            className="w-8 h-8 rounded border border-cool-gray-300 dark:border-charcoal-700 hover:bg-cool-gray-50 dark:hover:bg-charcoal-700 transition-colors"
                          >
                            +
                          </button>
                        </div>
                        <button
                          onClick={() => handleRemove(item.id)}
                          className="text-red-600 dark:text-red-400 hover:underline text-sm"
                        >
                          Remove
                        </button>
                      </div>
                      <div className="mt-2 text-right">
                        <span className="text-sm text-charcoal-600 dark:text-cool-gray-400">
                          Subtotal: <span className="font-semibold text-charcoal-900 dark:text-white">
                            ${(item.price * item.quantity).toFixed(2)}
                          </span>
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Coupon Code */}
              <div className="mt-6 bg-white dark:bg-charcoal-800 border border-cool-gray-300 dark:border-charcoal-700 rounded-lg p-4">
                <h3 className="font-semibold text-charcoal-900 dark:text-white mb-3">Have a coupon code?</h3>
                <form onSubmit={handleApplyCoupon} className="flex gap-2">
                  <input
                    type="text"
                    name="coupon"
                    defaultValue={couponCode}
                    placeholder="Enter coupon code"
                    className="flex-1 px-4 py-2 border border-cool-gray-300 dark:border-charcoal-700 rounded-lg bg-white dark:bg-charcoal-900 text-charcoal-900 dark:text-white"
                  />
                  <button
                    type="submit"
                    className="px-6 py-2 bg-charcoal-900 dark:bg-charcoal-700 text-white rounded-lg hover:bg-charcoal-800 dark:hover:bg-charcoal-600 transition-colors"
                  >
                    Apply
                  </button>
                </form>
                {discount > 0 && (
                  <p className="mt-2 text-sm text-green-600 dark:text-green-400">
                    ✓ {discount}% discount applied! Try: SAVE10 or WELCOME20
                  </p>
                )}
                <p className="mt-2 text-xs text-charcoal-600 dark:text-cool-gray-400">
                  Try: SAVE10 or WELCOME20
                </p>
              </div>
            </div>

            {/* Order Summary */}
            <div>
              <div className="bg-white dark:bg-charcoal-800 border border-cool-gray-300 dark:border-charcoal-700 rounded-lg p-6 sticky top-4">
                <h3 className="text-xl font-bold text-charcoal-900 dark:text-white mb-4">Order Summary</h3>
                <div className="space-y-3 mb-4 pb-4 border-b border-cool-gray-300 dark:border-charcoal-700">
                  <div className="flex justify-between text-charcoal-700 dark:text-cool-gray-300">
                    <span>Subtotal ({cartItems.length} items)</span>
                    <span>${subtotal.toFixed(2)}</span>
                  </div>
                  {discount > 0 && (
                    <div className="flex justify-between text-green-600 dark:text-green-400">
                      <span>Discount ({discount}%)</span>
                      <span>-${discountAmount.toFixed(2)}</span>
                    </div>
                  )}
                </div>
                <div className="flex justify-between text-lg font-bold text-charcoal-900 dark:text-white mb-6">
                  <span>Total</span>
                  <span className="text-gold-600">${(subtotal - discountAmount).toFixed(2)}</span>
                </div>
                <button
                  onClick={handleContinue}
                  className="w-full py-4 bg-gold-600 text-white rounded-lg hover:bg-gold-700 transition-colors font-semibold"
                >
                  Continue to Shipping
                </button>
                <Link
                  href="/shop"
                  className="block text-center mt-4 text-sm text-gold-600 dark:text-gold-500 hover:underline"
                >
                  Continue Shopping
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}
