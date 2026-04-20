'use client';

import { getAuthToken } from '@/lib/api/auth';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Header from '../../../components/common/Header';
import Footer from '../../../components/common/Footer';
import { useCheckout } from '../../../contexts/CheckoutContext';
import { getCourierById } from '../../../lib/couriers';

export default function ReviewPage() {
  const router = useRouter();
  const { checkoutData, clearCheckout } = useCheckout();
  const { cartItems, shippingAddress, paymentMethod, selectedCourierId, subtotal, discount, shippingCost, tax, total, couponCode } = checkoutData;
  const selectedCourier = getCourierById(selectedCourierId);

  const [isPlacing, setIsPlacing] = useState(false);
  const [placeError, setPlaceError] = useState('');

  const handlePlaceOrder = async () => {
    setPlaceError('');
    setIsPlacing(true);
    try {
      const token = getAuthToken();

      const body = {
        shippingInfo: shippingAddress,
        cartItems,
        courierId:       selectedCourier.id,
        courierName:     selectedCourier.name,
        courierIcon:     selectedCourier.icon,
        courierPrice:    selectedCourier.price,
        courierEta:      selectedCourier.estimatedDate,
        courierCarrier:  selectedCourier.carrier,
        courierTracking: selectedCourier.tracking,
        subtotal,
        shippingCost,
        tax,
        discount,
        total,
        couponCode: couponCode || undefined,
        paymentMethod: paymentMethod
          ? { type: paymentMethod.type, cardNumber: paymentMethod.cardNumber, cardHolder: paymentMethod.cardHolder }
          : null,
      };

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!data.success) {
        setPlaceError(data.message || 'Failed to place order. Please try again.');
        return;
      }

      const orderId: string = data.data.orderId;
      localStorage.setItem('lastOrderNumber', orderId);
      localStorage.setItem('lastOrderData', JSON.stringify(data.data.order));

      clearCheckout();
      router.push('/checkout/confirmation');
    } catch {
      setPlaceError('Network error. Please check your connection and try again.');
    } finally {
      setIsPlacing(false);
    }
  };

  const discountAmount = (subtotal * discount) / 100;

  const getShippingMethodName = () =>
    `${selectedCourier.name} (${selectedCourier.deliveryDays})`;

  if (!shippingAddress || !paymentMethod) {
    return (
      <div className="min-h-screen bg-white dark:bg-charcoal-900">
        <Header />
        <div className="container mx-auto px-4 py-12 text-center">
          <p className="text-xl text-charcoal-600 dark:text-cool-gray-400 mb-6">
            Please complete previous steps first
          </p>
          <button
            onClick={() => router.push('/checkout/cart-review')}
            className="px-6 py-3 bg-gold-600 text-white rounded-lg hover:bg-gold-700 transition-colors"
          >
            Go to Cart
          </button>
        </div>
        <Footer />
      </div>
    );
  }

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
                  index <= 3 ? 'bg-gold-600 text-white' : 'bg-cool-gray-200 dark:bg-charcoal-700 text-charcoal-600 dark:text-cool-gray-400'
                }`}>
                  {index < 3 ? '✓' : index + 1}
                </div>
                {index < 4 && (
                  <div className={`w-12 sm:w-20 h-1 ${
                    index < 3 ? 'bg-gold-600' : 'bg-cool-gray-200 dark:bg-charcoal-700'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>

        <h1 className="text-3xl font-bold text-charcoal-900 dark:text-white mb-6">Review Your Order</h1>

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            {/* Order Items */}
            <div className="bg-white dark:bg-charcoal-800 border border-cool-gray-300 dark:border-charcoal-700 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-charcoal-900 dark:text-white">
                  Order Items ({cartItems.length})
                </h3>
                <button
                  onClick={() => router.push('/checkout/cart-review')}
                  className="text-sm text-gold-600 dark:text-gold-500 hover:underline"
                >
                  Edit
                </button>
              </div>
              <div className="space-y-4">
                {cartItems.map((item) => (
                  <div key={item.id} className="flex gap-4">
                    <div className="relative w-20 h-20 rounded-lg overflow-hidden shrink-0">
                      <Image src={item.image} alt={item.name} fill className="object-cover" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-charcoal-900 dark:text-white">{item.name}</h4>
                      <p className="text-sm text-charcoal-600 dark:text-cool-gray-400">{item.vendor}</p>
                      {item.size && <p className="text-sm text-charcoal-600 dark:text-cool-gray-400">Size: {item.size}</p>}
                      {item.color && <p className="text-sm text-charcoal-600 dark:text-cool-gray-400">Color: {item.color}</p>}
                      <p className="text-sm text-charcoal-600 dark:text-cool-gray-400">Qty: {item.quantity}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-gold-600">${(item.price * item.quantity).toFixed(2)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Shipping Address */}
            <div className="bg-white dark:bg-charcoal-800 border border-cool-gray-300 dark:border-charcoal-700 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-charcoal-900 dark:text-white">
                  Shipping Address
                </h3>
                <button
                  onClick={() => router.push('/checkout/shipping')}
                  className="text-sm text-gold-600 dark:text-gold-500 hover:underline"
                >
                  Edit
                </button>
              </div>
              <div className="text-charcoal-700 dark:text-cool-gray-300">
                <p className="font-semibold text-charcoal-900 dark:text-white">{shippingAddress.fullName}</p>
                <p>{shippingAddress.addressLine1}</p>
                {shippingAddress.addressLine2 && <p>{shippingAddress.addressLine2}</p>}
                <p>{shippingAddress.city}, {shippingAddress.state} {shippingAddress.zipCode}</p>
                <p>{shippingAddress.country}</p>
                <p className="mt-2">{shippingAddress.phone}</p>
              </div>
            </div>

            {/* Shipping Method */}
            <div className="bg-white dark:bg-charcoal-800 border border-cool-gray-300 dark:border-charcoal-700 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-charcoal-900 dark:text-white">
                  Shipping Method
                </h3>
                <button
                  onClick={() => router.push('/checkout/shipping')}
                  className="text-sm text-gold-600 dark:text-gold-500 hover:underline"
                >
                  Edit
                </button>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-charcoal-700 dark:text-cool-gray-300">{getShippingMethodName()}</span>
                <span className="font-semibold text-charcoal-900 dark:text-white">${shippingCost.toFixed(2)}</span>
              </div>
            </div>

            {/* Payment Method */}
            <div className="bg-white dark:bg-charcoal-800 border border-cool-gray-300 dark:border-charcoal-700 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-charcoal-900 dark:text-white">
                  Payment Method
                </h3>
                <button
                  onClick={() => router.push('/checkout/payment')}
                  className="text-sm text-gold-600 dark:text-gold-500 hover:underline"
                >
                  Edit
                </button>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-3xl">
                  {paymentMethod.type === 'paypal' ? '💰' : '💳'}
                </div>
                <div>
                  {paymentMethod.type === 'card' && (
                    <>
                      <p className="font-semibold text-charcoal-900 dark:text-white">
                        {paymentMethod.cardNumber}
                      </p>
                      <p className="text-sm text-charcoal-600 dark:text-cool-gray-400">
                        {paymentMethod.cardHolder}
                      </p>
                    </>
                  )}
                  {paymentMethod.type === 'paypal' && (
                    <p className="font-semibold text-charcoal-900 dark:text-white">PayPal</p>
                  )}
                </div>
              </div>
            </div>

            {/* Terms & Conditions */}
            <div className="bg-white dark:bg-charcoal-800 border border-cool-gray-300 dark:border-charcoal-700 rounded-lg p-6">
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  id="terms"
                  required
                  className="mt-1 w-4 h-4 text-gold-600 border-cool-gray-300 rounded"
                />
                <label htmlFor="terms" className="text-sm text-charcoal-700 dark:text-cool-gray-300">
                  I agree to the{' '}
                  <a href="/terms" className="text-gold-600 dark:text-gold-500 hover:underline">
                    Terms & Conditions
                  </a>{' '}
                  and{' '}
                  <a href="/privacy" className="text-gold-600 dark:text-gold-500 hover:underline">
                    Privacy Policy
                  </a>
                </label>
              </div>
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
                <div className="flex justify-between text-charcoal-700 dark:text-cool-gray-300">
                  <span>Shipping</span>
                  <span>${shippingCost.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-charcoal-700 dark:text-cool-gray-300">
                  <span>Tax</span>
                  <span>${tax.toFixed(2)}</span>
                </div>
              </div>
              <div className="flex justify-between text-xl font-bold text-charcoal-900 dark:text-white mb-6">
                <span>Total</span>
                <span className="text-gold-600">${total.toFixed(2)}</span>
              </div>
              <button
                onClick={handlePlaceOrder}
                disabled={isPlacing}
                className="w-full py-4 bg-gold-600 text-white rounded-lg hover:bg-gold-700 transition-colors font-semibold mb-3 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isPlacing ? '⏳ Placing Order…' : 'Place Order'}
              </button>
              {placeError && (
                <p className="text-sm text-red-600 dark:text-red-400 text-center mb-2">{placeError}</p>
              )}
              <button
                onClick={() => router.push('/checkout/payment')}
                className="w-full py-2 text-charcoal-600 dark:text-cool-gray-400 hover:text-gold-600 text-sm"
              >
                ← Back to Payment
              </button>
              <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <p className="text-xs text-green-700 dark:text-green-400 text-center">
                  🔒 Secure checkout • Your data is protected
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
