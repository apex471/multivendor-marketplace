'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Script from 'next/script';
import Header from '../../../components/common/Header';
import Footer from '../../../components/common/Footer';
import { useCheckout } from '../../../contexts/CheckoutContext';
import { useCart } from '../../../contexts/CartContext';
import { useLocalization } from '../../../contexts/LocalizationContext';
import { getAuthToken } from '@/lib/api/auth';

declare global {
  interface Window {
    FlutterwaveCheckout?: (options: {
      public_key: string;
      tx_ref: string;
      amount: number;
      currency: string;
      payment_options: string;
      customer: {
        email: string;
        phone_number?: string;
        name: string;
      };
      customizations: {
        title: string;
        description: string;
        logo: string;
      };
      callback: (data: { transaction_id: string; status: string; tx_ref: string }) => void;
      onclose: () => void;
    }) => void;
  }
}

export default function PaymentPage() {
  const router = useRouter();
  const { formatPrice, currency } = useLocalization();
  const { checkoutData, updatePaymentMethod, couriers, clearCheckout } = useCheckout();
  const { clearCart } = useCart();
  const [paymentType, setPaymentType] = useState<'card' | 'bank' | 'ussd'>('card');
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const selectedCourier = couriers.find(c => c.id === checkoutData.selectedCourierId) || {
    id: checkoutData.selectedCourierId || 'courierplus-standard',
    name: 'CourierPlus Delivery',
    price: checkoutData.shippingCost,
    icon: '🚚',
    carrier: 'CourierPlus Nigeria',
    estimatedDate: '2-4 business days',
    tracking: 'express',
  };

  const handleSelectType = (type: 'card' | 'bank' | 'ussd') => {
    setPaymentType(type);
    updatePaymentMethod({
      id: type,
      type: type === 'bank' ? 'bank' : 'card',
      cardHolder: type === 'bank' ? 'Bank Transfer Client' : 'Flutterwave Checkout',
    });
  };

  const handlePayWithFlutterwave = async () => {
    setErrorMessage('');
    if (!checkoutData.shippingAddress) {
      setErrorMessage('Please complete your shipping address before proceeding to payment.');
      router.push('/checkout/shipping');
      return;
    }
    if (checkoutData.cartItems.length === 0) {
      setErrorMessage('Your bag is empty.');
      router.push('/cart');
      return;
    }

    setIsProcessing(true);
    try {
      const token = getAuthToken();
      const body = {
        shippingInfo: checkoutData.shippingAddress,
        currency,
        cartItems: checkoutData.cartItems,
        courierId: selectedCourier.id,
        courierName: selectedCourier.name,
        courierIcon: selectedCourier.icon,
        courierPrice: selectedCourier.price,
        courierEta: selectedCourier.estimatedDate,
        courierCarrier: selectedCourier.carrier,
        courierTracking: selectedCourier.tracking,
        subtotal: checkoutData.subtotal,
        shippingCost: checkoutData.shippingCost,
        tax: checkoutData.tax,
        discount: checkoutData.discount,
        total: checkoutData.total,
        couponCode: checkoutData.couponCode || undefined,
        paymentMethod: {
          type: paymentType === 'bank' ? 'bank' : 'card',
          cardHolder: paymentType === 'bank' ? 'Bank Transfer Client' : 'Flutterwave Checkout',
        },
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
      if (!res.ok || !data.success) {
        setErrorMessage(data.message || 'Payment initialization failed. Please try again.');
        setIsProcessing(false);
        return;
      }

      const orderId: string = data.data.orderId;
      const paymentLink: string | undefined = data.paymentLink;
      const flwPublicKey: string = data.flwPublicKey || process.env.NEXT_PUBLIC_FLUTTERWAVE_PUBLIC_KEY || '';

      localStorage.setItem('lastOrderNumber', orderId);
      localStorage.setItem('lastOrderData', JSON.stringify(data.data.order));

      // Try Flutterwave Inline Checkout Popup if public key and script are available
      if (typeof window !== 'undefined' && window.FlutterwaveCheckout && flwPublicKey && !flwPublicKey.includes('xxxx')) {
        window.FlutterwaveCheckout({
          public_key: flwPublicKey,
          tx_ref: orderId,
          amount: data.flwAmount || checkoutData.total,
          currency: data.flwCurrency || 'USD',
          payment_options: paymentType === 'bank' ? 'banktransfer,card,account,ussd' : 'card,banktransfer,ussd,account',
          customer: {
            email: checkoutData.shippingAddress.phone ? `${checkoutData.shippingAddress.fullName.replace(/\s+/g, '').toLowerCase()}@clwcustomer.com` : 'client@certifiedluxuryworld.com',
            phone_number: checkoutData.shippingAddress.phone || '',
            name: checkoutData.shippingAddress.fullName,
          },
          customizations: {
            title: 'Certified Luxury World',
            description: `Escrow payment for Order #${orderId}`,
            logo: `${window.location.origin}/images/brand/clw-logo.png`,
          },
          callback: (response) => {
            clearCheckout();
            clearCart();
            window.location.href = `/checkout/verify?gateway=flutterwave&order_id=${orderId}&transaction_id=${response.transaction_id}&status=${response.status}`;
          },
          onclose: () => {
            setIsProcessing(false);
          },
        });
        return;
      }

      // If Flutterwave API returned a hosted payment link, redirect directly to Flutterwave
      if (paymentLink) {
        clearCheckout();
        clearCart();
        window.location.href = paymentLink;
        return;
      }

      // Fallback for development / mock environments
      clearCheckout();
      clearCart();
      router.push(`/checkout/verify?gateway=flutterwave&order_id=${orderId}&status=successful`);
    } catch {
      setErrorMessage('Network error during payment initialization. Please check your connection.');
      setIsProcessing(false);
    }
  };

  const handleProceedToReview = () => {
    updatePaymentMethod({
      id: paymentType,
      type: paymentType === 'bank' ? 'bank' : 'card',
      cardHolder: paymentType === 'bank' ? 'Bank Transfer Client' : 'Flutterwave Checkout',
    });
    router.push('/checkout/review');
  };

  return (
    <div className="min-h-screen bg-white dark:bg-charcoal-900">
      <Script src="https://checkout.flutterwave.com/v3.js" strategy="lazyOnload" />
      <Header />

      <div className="container mx-auto px-4 py-8">
        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-center mb-4">
            {['Cart', 'Shipping', 'Payment', 'Review', 'Confirmation'].map((step, index) => (
              <div key={step} className="flex items-center">
                <div
                  className={`flex items-center justify-center w-10 h-10 rounded-full font-bold text-sm ${
                    index <= 2
                      ? 'bg-gold-600 text-white shadow-md'
                      : 'bg-cool-gray-200 dark:bg-charcoal-700 text-charcoal-600 dark:text-cool-gray-400'
                  }`}
                >
                  {index < 2 ? '✓' : index + 1}
                </div>
                {index < 4 && (
                  <div
                    className={`w-12 sm:w-20 h-1 ${
                      index < 2 ? 'bg-gold-600' : 'bg-cool-gray-200 dark:bg-charcoal-700'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Page Title & Flutterwave Verification Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-display font-bold text-charcoal-900 dark:text-white">
              Payment Gateway
            </h1>
            <p className="text-sm text-cool-gray-500 dark:text-cool-gray-400 mt-1">
              Protected by the Certified Luxury World Escrow Guarantee
            </p>
          </div>
          <div className="flex items-center gap-2.5 px-3.5 py-2 bg-gold-500/10 border border-gold-500/30 rounded-xl">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-bold text-gold-700 dark:text-gold-400 tracking-wide uppercase">
              Powered by Flutterwave
            </span>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            {/* Payment Method Switcher */}
            <div className="bg-white dark:bg-charcoal-800 border border-cool-gray-200 dark:border-charcoal-700 rounded-2xl p-6 shadow-sm">
              <h2 className="text-lg font-bold text-charcoal-900 dark:text-white mb-4">
                Select Your Payment Channel
              </h2>

              <div className="grid sm:grid-cols-3 gap-3 mb-6">
                <button
                  type="button"
                  onClick={() => handleSelectType('card')}
                  className={`p-4 rounded-xl border-2 text-left transition-all cursor-pointer ${
                    paymentType === 'card'
                      ? 'border-gold-600 bg-gold-500/10 dark:bg-gold-500/15 text-gold-600 dark:text-gold-400 shadow-xs'
                      : 'border-cool-gray-200 dark:border-charcoal-700 hover:border-gold-400/50'
                  }`}
                >
                  <div className="text-2xl mb-1">💳</div>
                  <div className="font-bold text-sm text-charcoal-900 dark:text-white">Card Payment</div>
                  <div className="text-xs text-cool-gray-500 dark:text-cool-gray-400 mt-0.5">
                    Visa, Mastercard, Verve
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleSelectType('bank')}
                  className={`p-4 rounded-xl border-2 text-left transition-all cursor-pointer ${
                    paymentType === 'bank'
                      ? 'border-gold-600 bg-gold-500/10 dark:bg-gold-500/15 text-gold-600 dark:text-gold-400 shadow-xs'
                      : 'border-cool-gray-200 dark:border-charcoal-700 hover:border-gold-400/50'
                  }`}
                >
                  <div className="text-2xl mb-1">🏛️</div>
                  <div className="font-bold text-sm text-charcoal-900 dark:text-white">Bank Transfer</div>
                  <div className="text-xs text-cool-gray-500 dark:text-cool-gray-400 mt-0.5">
                    Dynamic virtual account
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleSelectType('ussd')}
                  className={`p-4 rounded-xl border-2 text-left transition-all cursor-pointer ${
                    paymentType === 'ussd'
                      ? 'border-gold-600 bg-gold-500/10 dark:bg-gold-500/15 text-gold-600 dark:text-gold-400 shadow-xs'
                      : 'border-cool-gray-200 dark:border-charcoal-700 hover:border-gold-400/50'
                  }`}
                >
                  <div className="text-2xl mb-1">📱</div>
                  <div className="font-bold text-sm text-charcoal-900 dark:text-white">USSD &amp; Mobile</div>
                  <div className="text-xs text-cool-gray-500 dark:text-cool-gray-400 mt-0.5">
                    Instant bank dial codes
                  </div>
                </button>
              </div>

              {/* Channel Description Card */}
              {paymentType === 'card' && (
                <div className="p-5 bg-gold-50/60 dark:bg-gold-950/20 border border-gold-200 dark:border-gold-800/40 rounded-xl space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">🔒</span>
                    <h3 className="font-bold text-gold-900 dark:text-gold-300 text-sm">
                      Flutterwave 3D Secure Card Processing
                    </h3>
                  </div>
                  <p className="text-xs text-charcoal-700 dark:text-cool-gray-300 leading-relaxed">
                    You will be seamlessly connected to Flutterwave’s official PCI-DSS Level 1 certified UI. Complete payment with any Nigerian or international Visa, Mastercard, or Verve card with OTP verification.
                  </p>
                  <div className="flex items-center gap-3 pt-1 text-xs font-semibold text-cool-gray-600 dark:text-cool-gray-400">
                    <span>✓ Visa</span>
                    <span>✓ Mastercard</span>
                    <span>✓ Verve</span>
                    <span>✓ American Express</span>
                  </div>
                </div>
              )}

              {paymentType === 'bank' && (
                <div className="p-5 bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800/40 rounded-xl space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">🏛️</span>
                    <h3 className="font-bold text-blue-900 dark:text-blue-300 text-sm">
                      Instant Virtual Bank Transfer via Flutterwave
                    </h3>
                  </div>
                  <p className="text-xs text-charcoal-700 dark:text-cool-gray-300 leading-relaxed">
                    A unique, dedicated NGN virtual account will be generated on Flutterwave for your order total. Transfer funds from your banking app — payment is confirmed automatically in real-time.
                  </p>
                  <p className="text-[11px] text-blue-700 dark:text-blue-400 font-medium">
                    Accepted from all commercial banks (GTBank, Zenith, Access, First Bank, Kuda, OPay, Palmpay, etc.).
                  </p>
                </div>
              )}

              {paymentType === 'ussd' && (
                <div className="p-5 bg-purple-50/60 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800/40 rounded-xl space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">📱</span>
                    <h3 className="font-bold text-purple-900 dark:text-purple-300 text-sm">
                      USSD &amp; Mobile Banking Codes
                    </h3>
                  </div>
                  <p className="text-xs text-charcoal-700 dark:text-cool-gray-300 leading-relaxed">
                    Select your bank in the Flutterwave modal and dial the pre-generated USSD code (*737#, *919#, etc.) from your registered phone number to authenticate instantly.
                  </p>
                </div>
              )}

              {/* Error Banner */}
              {errorMessage && (
                <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-xs text-red-600 dark:text-red-400 font-semibold">
                  ⚠️ {errorMessage}
                </div>
              )}

              {/* Direct Actions */}
              <div className="mt-6 pt-6 border-t border-cool-gray-200 dark:border-charcoal-700 flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={handlePayWithFlutterwave}
                  className="flex-1 py-4 bg-gold-600 hover:bg-gold-500 active:scale-95 text-white font-bold rounded-xl transition-all shadow-md shadow-gold-600/20 cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2 text-sm"
                >
                  {isProcessing ? (
                    <>
                      <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                      <span>Connecting to Flutterwave...</span>
                    </>
                  ) : (
                    <>
                      <span>🔒</span>
                      <span>Pay {formatPrice(checkoutData.total)} with Flutterwave</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleProceedToReview}
                  className="px-6 py-4 border-2 border-cool-gray-300 dark:border-charcoal-600 hover:bg-cool-gray-100 dark:hover:bg-charcoal-700 text-charcoal-800 dark:text-cool-gray-200 rounded-xl font-bold text-sm transition-colors cursor-pointer text-center"
                >
                  Review Order First →
                </button>
              </div>
            </div>

            {/* Escrow & Security Trust Badges */}
            <div className="bg-cool-gray-50 dark:bg-charcoal-800/60 border border-cool-gray-200 dark:border-charcoal-700 rounded-2xl p-6">
              <h3 className="text-sm font-bold text-charcoal-900 dark:text-white mb-3 flex items-center gap-2">
                <span>🛡️</span>
                <span>Certified Luxury World Escrow Protection</span>
              </h3>
              <div className="grid sm:grid-cols-3 gap-4 text-xs text-cool-gray-600 dark:text-cool-gray-400">
                <div className="flex items-start gap-2">
                  <span className="text-emerald-500 font-bold">✓</span>
                  <div>
                    <p className="font-semibold text-charcoal-900 dark:text-white">Escrow Secured</p>
                    <p className="text-[11px] mt-0.5">Vendor is only paid after you inspect and accept your delivery.</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-emerald-500 font-bold">✓</span>
                  <div>
                    <p className="font-semibold text-charcoal-900 dark:text-white">CBN Licensed</p>
                    <p className="text-[11px] mt-0.5">Processed through Flutterwave under Central Bank of Nigeria regulations.</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-emerald-500 font-bold">✓</span>
                  <div>
                    <p className="font-semibold text-charcoal-900 dark:text-white">Fraud Shield</p>
                    <p className="text-[11px] mt-0.5">Automated chargeback defense and 256-bit bank grade encryption.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Order Summary */}
          <div>
            <div className="bg-white dark:bg-charcoal-800 border border-cool-gray-200 dark:border-charcoal-700 rounded-2xl p-6 sticky top-4 shadow-sm">
              <h3 className="text-xl font-bold text-charcoal-900 dark:text-white mb-4">Order Summary</h3>

              <div className="space-y-3 mb-4 pb-4 border-b border-cool-gray-200 dark:border-charcoal-700 text-sm">
                <div className="flex justify-between text-charcoal-700 dark:text-cool-gray-300">
                  <span>Subtotal ({checkoutData.cartItems.length} items)</span>
                  <span className="font-semibold">{formatPrice(checkoutData.subtotal)}</span>
                </div>
                {checkoutData.discount > 0 && (
                  <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-medium">
                    <span>Discount ({checkoutData.discount}%)</span>
                    <span>-{formatPrice((checkoutData.subtotal * checkoutData.discount) / 100)}</span>
                  </div>
                )}
                <div className="flex justify-between text-charcoal-700 dark:text-cool-gray-300">
                  <div>
                    <span>Shipping</span>
                    <p className="text-[11px] text-cool-gray-400">{selectedCourier.name}</p>
                  </div>
                  <span className="font-semibold">{checkoutData.shippingCost === 0 ? 'FREE' : formatPrice(checkoutData.shippingCost)}</span>
                </div>
                <div className="flex justify-between text-charcoal-700 dark:text-cool-gray-300">
                  <span>Tax (8%)</span>
                  <span className="font-semibold">{formatPrice(checkoutData.tax)}</span>
                </div>
              </div>

              <div className="flex justify-between items-baseline mb-6">
                <span className="text-base font-bold text-charcoal-900 dark:text-white">Total Amount</span>
                <span className="text-2xl font-black text-gold-600 dark:text-gold-400">
                  {formatPrice(checkoutData.total)}
                </span>
              </div>

              <button
                type="button"
                onClick={() => router.push('/checkout/shipping')}
                className="w-full py-2.5 text-cool-gray-500 hover:text-gold-600 text-xs font-semibold transition-colors flex items-center justify-center gap-1 cursor-pointer"
              >
                <span>←</span>
                <span>Edit Shipping &amp; Delivery Details</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
