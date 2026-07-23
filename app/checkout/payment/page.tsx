'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '../../../components/common/Header';
import Footer from '../../../components/common/Footer';
import { useCheckout } from '../../../contexts/CheckoutContext';

export default function PaymentPage() {
  const router = useRouter();
  const { checkoutData, updatePaymentMethod } = useCheckout();
  const [paymentType, setPaymentType] = useState<'new' | 'bank' | 'paypal'>('new');
  const [billingAddressSame, setBillingAddressSame] = useState(true);

  const handleNewCardSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    updatePaymentMethod({
      id: 'new',
      type: 'card',
      cardNumber: formData.get('cardNumber') as string,
      cardHolder: formData.get('cardHolder') as string,
      expiryDate: formData.get('expiryDate') as string,
      cvv: formData.get('cvv') as string
    });
    router.push('/checkout/review');
  };

  const handlePayPal = () => {
    updatePaymentMethod({
      id: 'paypal',
      type: 'paypal'
    });
    router.push('/checkout/review');
  };


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
                  index <= 2 ? 'bg-gold-600 text-white' : 'bg-cool-gray-200 dark:bg-charcoal-700 text-charcoal-600 dark:text-cool-gray-400'
                }`}>
                  {index < 2 ? '✓' : index + 1}
                </div>
                {index < 4 && (
                  <div className={`w-12 sm:w-20 h-1 ${
                    index < 2 ? 'bg-gold-600' : 'bg-cool-gray-200 dark:bg-charcoal-700'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>

        <h1 className="text-3xl font-bold text-charcoal-900 dark:text-white mb-6">Payment Method</h1>

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            {/* Payment Type Selection */}
            <div className="mb-6">
              <div className="grid sm:grid-cols-3 gap-3">
                <button
                  onClick={() => setPaymentType('new')}
                  className={`p-4 rounded-lg border-2 text-left transition-all ${
                    paymentType === 'new'
                      ? 'border-gold-600 bg-gold-50 dark:bg-gold-900/10'
                      : 'border-cool-gray-300 dark:border-charcoal-700 hover:border-gold-400'
                  }`}
                >
                  <div className="text-2xl mb-1">💳</div>
                  <div className="font-semibold text-charcoal-900 dark:text-white">Card Payment</div>
                  <div className="text-xs text-charcoal-600 dark:text-cool-gray-400">Pay with card</div>
                </button>
                <button
                  onClick={() => setPaymentType('bank')}
                  className={`p-4 rounded-lg border-2 text-left transition-all ${
                    paymentType === 'bank'
                      ? 'border-gold-600 bg-gold-50 dark:bg-gold-900/10'
                      : 'border-cool-gray-300 dark:border-charcoal-700 hover:border-gold-400'
                  }`}
                >
                  <div className="text-2xl mb-1">🏛️</div>
                  <div className="font-semibold text-charcoal-900 dark:text-white">Bank Transfer</div>
                  <div className="text-xs text-charcoal-600 dark:text-cool-gray-400">Pay with bank transfer</div>
                </button>
                <button
                  onClick={() => setPaymentType('paypal')}
                  className={`p-4 rounded-lg border-2 text-left transition-all ${
                    paymentType === 'paypal'
                      ? 'border-gold-600 bg-gold-50 dark:bg-gold-900/10'
                      : 'border-cool-gray-300 dark:border-charcoal-700 hover:border-gold-400'
                  }`}
                >
                  <div className="text-2xl mb-1">💰</div>
                  <div className="font-semibold text-charcoal-900 dark:text-white">PayPal</div>
                  <div className="text-xs text-charcoal-600 dark:text-cool-gray-400">Pay with PayPal</div>
                </button>
              </div>
            </div>

            {/* Hosted Card Payment Redirect */}
            {paymentType === 'new' && (
              <div className="bg-white dark:bg-charcoal-800 border border-cool-gray-300 dark:border-charcoal-700 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-charcoal-900 dark:text-white mb-4">
                  Pay with Credit / Debit Card (Flutterwave)
                </h3>
                <div className="bg-gold-50 dark:bg-gold-900/10 border border-gold-200 dark:border-gold-800 rounded-xl p-5 mb-4">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-gold-600 text-xl">💳</span>
                    <h3 className="font-semibold text-gold-900 dark:text-gold-300 text-sm">Secure Card Payment</h3>
                  </div>
                  <p className="text-xs text-charcoal-700 dark:text-cool-gray-300 leading-relaxed">
                    You will be securely redirected to Flutterwave's checkout portal to process your card payment. No card information is stored on our site.
                  </p>
                </div>
                <form onSubmit={handleNewCardSubmit} className="space-y-4">
                  <input type="hidden" name="cardNumber" value="1111222233334444" />
                  <input type="hidden" name="cardHolder" value="Flutterwave Checkout" />
                  <input type="hidden" name="expiryDate" value="12/30" />
                  <input type="hidden" name="cvv" value="123" />
                  <button
                    type="submit"
                    className="w-full py-4 bg-gold-600 text-white rounded-lg hover:bg-gold-700 transition-colors font-semibold"
                  >
                    Continue to Review Order
                  </button>
                </form>
              </div>
            )}

            {/* Bank Transfer Redirect */}
            {paymentType === 'bank' && (
              <div className="bg-white dark:bg-charcoal-800 border border-cool-gray-300 dark:border-charcoal-700 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-charcoal-900 dark:text-white mb-4">
                  Pay with Bank Transfer (Flutterwave)
                </h3>
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-5 mb-4">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-blue-600 text-xl">🏛️</span>
                    <h3 className="font-semibold text-blue-900 dark:text-blue-300 text-sm">Secure Bank Transfer</h3>
                  </div>
                  <p className="text-xs text-charcoal-700 dark:text-cool-gray-300 leading-relaxed">
                    A secure virtual account will be generated for you on Flutterwave. You can transfer funds directly from any banking application.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    updatePaymentMethod({
                      id: 'bank',
                      type: 'bank',
                      cardHolder: 'Bank Transfer Client',
                    });
                    router.push('/checkout/review');
                  }}
                  className="w-full py-4 bg-gold-600 text-white rounded-lg hover:bg-gold-700 transition-colors font-semibold"
                >
                  Continue to Review Order
                </button>
              </div>
            )}

            {/* PayPal */}
            {paymentType === 'paypal' && (
              <div className="bg-white dark:bg-charcoal-800 border border-cool-gray-300 dark:border-charcoal-700 rounded-lg p-6">
                <div className="text-center py-8">
                  <div className="text-6xl mb-4">💰</div>
                  <h3 className="text-xl font-semibold text-charcoal-900 dark:text-white mb-2">
                    Pay with PayPal
                  </h3>
                  <p className="text-charcoal-600 dark:text-cool-gray-400 mb-6">
                    You&apos;ll be redirected to PayPal to complete your purchase securely
                  </p>
                  <button
                    onClick={handlePayPal}
                    className="px-8 py-4 bg-[#0070ba] text-white rounded-lg hover:bg-[#005ea6] transition-colors font-semibold"
                  >
                    Continue with PayPal
                  </button>
                </div>
              </div>
            )}

            {/* Security Notice */}
            <div className="mt-6 flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <span className="text-2xl">🔒</span>
              <div>
                <p className="text-sm font-semibold text-blue-900 dark:text-blue-300 mb-1">
                  Secure Payment
                </p>
                <p className="text-xs text-blue-700 dark:text-blue-400">
                  Your payment information is encrypted and secure. We never store your full card details.
                </p>
              </div>
            </div>
          </div>

          {/* Order Summary */}
          <div>
            <div className="bg-white dark:bg-charcoal-800 border border-cool-gray-300 dark:border-charcoal-700 rounded-lg p-6 sticky top-4">
              <h3 className="text-xl font-bold text-charcoal-900 dark:text-white mb-4">Order Summary</h3>
              <div className="space-y-3 mb-4 pb-4 border-b border-cool-gray-300 dark:border-charcoal-700">
                <div className="flex justify-between text-charcoal-700 dark:text-cool-gray-300">
                  <span>Subtotal</span>
                  <span>${checkoutData.subtotal.toFixed(2)}</span>
                </div>
                {checkoutData.discount > 0 && (
                  <div className="flex justify-between text-green-600 dark:text-green-400">
                    <span>Discount ({checkoutData.discount}%)</span>
                    <span>-${((checkoutData.subtotal * checkoutData.discount) / 100).toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-charcoal-700 dark:text-cool-gray-300">
                  <span>Shipping</span>
                  <span>${checkoutData.shippingCost.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-charcoal-700 dark:text-cool-gray-300">
                  <span>Tax</span>
                  <span>${checkoutData.tax.toFixed(2)}</span>
                </div>
              </div>
              <div className="flex justify-between text-lg font-bold text-charcoal-900 dark:text-white mb-6">
                <span>Total</span>
                <span className="text-gold-600">${checkoutData.total.toFixed(2)}</span>
              </div>
              {paymentType === 'new' && (
                <p className="text-sm text-charcoal-600 dark:text-cool-gray-400 text-center">
                  Fill in your card details above and click &quot;Continue to Review&quot;.
                </p>
              )}
              <button
                onClick={() => router.push('/checkout/shipping')}
                className="w-full mt-3 py-2 text-charcoal-600 dark:text-cool-gray-400 hover:text-gold-600 text-sm"
              >
                ← Back to Shipping
              </button>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
