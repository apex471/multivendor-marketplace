'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { COURIERS, BADGE_STYLES, TRACKING_LABEL } from '../../lib/couriers';

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
  vendor: string;
}

export default function CheckoutPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);

  // Form states
  const [shippingInfo, setShippingInfo] = useState({
    fullName: '', email: '', phone: '', address: '', city: '', state: '', zipCode: '', country: 'United States',
  });
  const [selectedCourierId, setSelectedCourierId] = useState<string>('quickbox');
  const [paymentInfo, setPaymentInfo] = useState({
    cardNumber: '', cardName: '', expiryDate: '', cvv: '', saveCard: false,
  });

  // Mock cart items — replace with real cart context
  const cartItems: CartItem[] = [
    { id: '1', name: 'Designer Leather Jacket', price: 299.99, quantity: 1, image: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=400', vendor: 'Luxury Fashion Co.' },
    { id: '2', name: 'Premium Sneakers', price: 149.99, quantity: 2, image: 'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=400', vendor: 'Urban Footwear' },
  ];

  const selectedCourier = COURIERS.find(c => c.id === selectedCourierId) ?? COURIERS[2];
  const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const shipping = selectedCourier.price;
  const tax      = subtotal * 0.08;
  const total    = subtotal + shipping + tax;

  // ── Handlers ────────────────────────────────────────────────────────────────
  const handleShippingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!shippingInfo.fullName || !shippingInfo.email || !shippingInfo.address || !shippingInfo.city || !shippingInfo.zipCode) {
      alert('Please fill in all required fields'); return;
    }
    setCurrentStep(2);
  };

  const handleCourierContinue = () => setCurrentStep(3);

  const handlePaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentInfo.cardNumber || !paymentInfo.cardName || !paymentInfo.expiryDate || !paymentInfo.cvv) {
      alert('Please fill in all payment details'); return;
    }
    setCurrentStep(4);
  };

  const handlePlaceOrder = async () => {
    setIsProcessing(true);
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shippingInfo,
          paymentInfo: {
            cardNumber: paymentInfo.cardNumber.slice(-4), // only last 4 digits
            cardName: paymentInfo.cardName,
            expiryDate: paymentInfo.expiryDate,
          },
          cartItems,
          courierId:       selectedCourier.id,
          courierName:     selectedCourier.name,
          courierIcon:     selectedCourier.icon,
          courierPrice:    selectedCourier.price,
          courierEta:      selectedCourier.estimatedDate,
          courierCarrier:  selectedCourier.carrier,
          courierTracking: selectedCourier.tracking,
          subtotal,
          shipping,
          tax,
          total,
        }),
      });
      const data = await res.json();
      const orderId = data?.data?.orderId ?? `ORD-${Math.floor(Math.random() * 1_000_000)}`;
      router.push(`/order/confirmation?orderId=${orderId}`);
    } catch {
      // Fallback — still navigate to confirmation on client-side error
      const orderId = `ORD-${Math.floor(Math.random() * 1_000_000)}`;
      router.push(`/order/confirmation?orderId=${orderId}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const steps = [
    { number: 1, title: 'Shipping', icon: '📋' },
    { number: 2, title: 'Delivery', icon: '🚚' },
    { number: 3, title: 'Payment', icon: '💳' },
    { number: 4, title: 'Review',  icon: '✓'  },
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-charcoal-900">
      {/* ── Header ── */}
      <div className="bg-white dark:bg-charcoal-800 border-b border-cool-gray-300 dark:border-charcoal-700">
        <div className="container mx-auto px-4 py-4">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg overflow-hidden border border-gold-500/30 shadow-sm">
              <Image
                src="/images/brand/clw-icon.jpg"
                alt="CLW"
                width={32}
                height={32}
                className="w-full h-full object-cover object-center"
              />
            </div>
            <Image
              src="/images/brand/clw-logo.jpg"
              alt="Certified Luxury World"
              width={90}
              height={28}
              className="hidden dark:inline h-5 w-auto object-contain"
            />
            <span className="text-sm font-medium text-cool-gray-400 dark:text-cool-gray-500">/ Secure Checkout</span>
          </Link>
        </div>
      </div>

      {/* ── Progress Steps ── */}
      <div className="bg-white dark:bg-charcoal-800 border-b border-cool-gray-300 dark:border-charcoal-700">
        <div className="container mx-auto px-4 py-5">
          <div className="flex items-center justify-center gap-1 sm:gap-3">
            {steps.map((step, index) => (
              <div key={step.number} className="flex items-center">
                <div className="flex flex-col items-center">
                  <div className={`w-9 h-9 sm:w-11 sm:h-11 rounded-full flex items-center justify-center text-sm sm:text-lg font-bold transition-all ${
                    currentStep > step.number
                      ? 'bg-gold-600 text-white'
                      : currentStep === step.number
                      ? 'bg-gold-600 text-white ring-4 ring-gold-200 dark:ring-gold-900/50'
                      : 'bg-cool-gray-200 dark:bg-charcoal-700 text-charcoal-500 dark:text-cool-gray-500'
                  }`}>
                    {currentStep > step.number ? '✓' : step.icon}
                  </div>
                  <span className={`mt-1 text-[10px] sm:text-xs font-medium whitespace-nowrap ${
                    currentStep >= step.number ? 'text-gold-600' : 'text-charcoal-500 dark:text-cool-gray-500'
                  }`}>{step.title}</span>
                </div>
                {index < steps.length - 1 && (
                  <div className={`w-6 sm:w-12 h-0.5 mx-1 sm:mx-2 mb-4 transition-colors ${
                    currentStep > step.number ? 'bg-gold-600' : 'bg-cool-gray-300 dark:bg-charcoal-700'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Main Content ── */}
      <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-8">

          {/* ─ Left column ─────────────────────────────────────────────────── */}
          <div className="lg:col-span-2 space-y-0">

            {/* ── STEP 1: Shipping ─────────────────────────────────────────── */}
            {currentStep === 1 && (
              <div className="bg-white dark:bg-charcoal-800 border border-cool-gray-300 dark:border-charcoal-700 rounded-xl p-6">
                <h2 className="text-2xl font-bold text-charcoal-900 dark:text-white mb-6">Shipping Information</h2>
                <form onSubmit={handleShippingSubmit} className="space-y-4">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-charcoal-700 dark:text-cool-gray-300 mb-2">Full Name *</label>
                      <input type="text" required value={shippingInfo.fullName}
                        onChange={(e) => setShippingInfo({ ...shippingInfo, fullName: e.target.value })}
                        className="w-full px-4 py-2.5 bg-white dark:bg-charcoal-700 border border-cool-gray-300 dark:border-charcoal-600 text-charcoal-900 dark:text-white rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-transparent"
                        placeholder="John Doe" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-charcoal-700 dark:text-cool-gray-300 mb-2">Email *</label>
                      <input type="email" required value={shippingInfo.email}
                        onChange={(e) => setShippingInfo({ ...shippingInfo, email: e.target.value })}
                        className="w-full px-4 py-2.5 bg-white dark:bg-charcoal-700 border border-cool-gray-300 dark:border-charcoal-600 text-charcoal-900 dark:text-white rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-transparent"
                        placeholder="john@example.com" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-charcoal-700 dark:text-cool-gray-300 mb-2">Phone Number *</label>
                    <input type="tel" required value={shippingInfo.phone}
                      onChange={(e) => setShippingInfo({ ...shippingInfo, phone: e.target.value })}
                      className="w-full px-4 py-2.5 bg-white dark:bg-charcoal-700 border border-cool-gray-300 dark:border-charcoal-600 text-charcoal-900 dark:text-white rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-transparent"
                      placeholder="+1 (555) 123-4567" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-charcoal-700 dark:text-cool-gray-300 mb-2">Street Address *</label>
                    <input type="text" required value={shippingInfo.address}
                      onChange={(e) => setShippingInfo({ ...shippingInfo, address: e.target.value })}
                      className="w-full px-4 py-2.5 bg-white dark:bg-charcoal-700 border border-cool-gray-300 dark:border-charcoal-600 text-charcoal-900 dark:text-white rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-transparent"
                      placeholder="123 Main Street, Apt 4B" />
                  </div>
                  <div className="grid sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-charcoal-700 dark:text-cool-gray-300 mb-2">City *</label>
                      <input type="text" required value={shippingInfo.city}
                        onChange={(e) => setShippingInfo({ ...shippingInfo, city: e.target.value })}
                        className="w-full px-4 py-2.5 bg-white dark:bg-charcoal-700 border border-cool-gray-300 dark:border-charcoal-600 text-charcoal-900 dark:text-white rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-transparent"
                        placeholder="New York" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-charcoal-700 dark:text-cool-gray-300 mb-2">State *</label>
                      <input type="text" required value={shippingInfo.state}
                        onChange={(e) => setShippingInfo({ ...shippingInfo, state: e.target.value })}
                        className="w-full px-4 py-2.5 bg-white dark:bg-charcoal-700 border border-cool-gray-300 dark:border-charcoal-600 text-charcoal-900 dark:text-white rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-transparent"
                        placeholder="NY" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-charcoal-700 dark:text-cool-gray-300 mb-2">ZIP Code *</label>
                      <input type="text" required value={shippingInfo.zipCode}
                        onChange={(e) => setShippingInfo({ ...shippingInfo, zipCode: e.target.value })}
                        className="w-full px-4 py-2.5 bg-white dark:bg-charcoal-700 border border-cool-gray-300 dark:border-charcoal-600 text-charcoal-900 dark:text-white rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-transparent"
                        placeholder="10001" />
                    </div>
                  </div>
                  <div className="flex gap-4 pt-4">
                    <Link href="/cart" className="flex-1 px-6 py-3 border-2 border-cool-gray-300 dark:border-charcoal-600 bg-white dark:bg-charcoal-700 text-charcoal-700 dark:text-white rounded-lg font-semibold hover:bg-cool-gray-100 dark:hover:bg-charcoal-600 transition-colors text-center">
                      Back to Cart
                    </Link>
                    <button type="submit" className="flex-1 px-6 py-3 bg-gold-600 text-white rounded-lg font-semibold hover:bg-gold-700 transition-colors">
                      Choose Delivery →
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* ── STEP 2: Delivery / Courier Selection — Uber style ────────── */}
            {currentStep === 2 && (
              <div className="overflow-hidden rounded-2xl border border-cool-gray-200 dark:border-charcoal-700 shadow-sm">

                {/* ── Route header (dark Uber-style bar) ─────────────────── */}
                <div className="bg-charcoal-900 dark:bg-charcoal-950 px-5 py-4">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gold-400 mb-3">Delivery Route</p>
                  <div className="flex items-stretch gap-3">
                    {/* Dot → dashed line → dot */}
                    <div className="flex flex-col items-center pt-1 pb-0.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-gold-400 shrink-0" />
                      <div className="w-px flex-1 my-1 border-l-2 border-dashed border-charcoal-600" />
                      <div className="w-2.5 h-2.5 rounded-full border-2 border-white shrink-0" />
                    </div>
                    {/* Addresses */}
                    <div className="flex flex-col flex-1 min-w-0 gap-1.5">
                      <div>
                        <p className="text-[10px] text-charcoal-400 uppercase tracking-wider mb-0.5">From</p>
                        <p className="text-sm font-medium text-white truncate">Multiple Vendors · Your Cart</p>
                      </div>
                      <div className="border-t border-charcoal-700" />
                      <div>
                        <p className="text-[10px] text-charcoal-400 uppercase tracking-wider mb-0.5">To</p>
                        <p className="text-sm font-medium text-white truncate">
                          {[shippingInfo.address, shippingInfo.city, shippingInfo.state, shippingInfo.zipCode].filter(Boolean).join(', ')}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setCurrentStep(1)}
                      className="self-start text-[11px] font-semibold text-gold-400 hover:text-gold-300 transition-colors shrink-0 mt-0.5"
                    >
                      Edit
                    </button>
                  </div>
                </div>

                {/* ── Section label bar ───────────────────────────────────── */}
                <div className="bg-cool-gray-50 dark:bg-charcoal-900 px-5 py-2.5 border-b border-cool-gray-200 dark:border-charcoal-700">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-charcoal-400 dark:text-cool-gray-500">
                    Select a delivery option
                  </p>
                </div>

                {/* ── Courier rows ────────────────────────────────────────── */}
                <div className="bg-white dark:bg-charcoal-800 divide-y divide-cool-gray-100 dark:divide-charcoal-700/60">
                  {COURIERS.map((courier) => {
                    const isSelected    = selectedCourierId === courier.id;
                    const isUnavailable = !courier.available;
                    return (
                      <button
                        key={courier.id}
                        type="button"
                        disabled={isUnavailable}
                        onClick={() => !isUnavailable && setSelectedCourierId(courier.id)}
                        className={`relative w-full text-left flex items-center gap-4 px-5 py-4 transition-colors ${
                          isUnavailable
                            ? 'opacity-40 cursor-not-allowed'
                            : isSelected
                            ? 'bg-gold-50 dark:bg-gold-900/10'
                            : 'hover:bg-cool-gray-50 dark:hover:bg-charcoal-700/40 active:bg-cool-gray-100 dark:active:bg-charcoal-700'
                        }`}
                      >
                        {/* Gold left accent strip */}
                        {isSelected && (
                          <span className="absolute left-0 top-2 bottom-2 w-0.75 bg-gold-500 rounded-r-full" />
                        )}

                        {/* Icon circle */}
                        <div className={`w-14 h-14 rounded-full flex items-center justify-center text-2xl shrink-0 transition-colors ${
                          isSelected
                            ? 'bg-gold-100 dark:bg-gold-900/30'
                            : 'bg-cool-gray-100 dark:bg-charcoal-700'
                        }`}>
                          {courier.icon}
                        </div>

                        {/* Center info */}
                        <div className="flex-1 min-w-0">
                          {/* Name + badge */}
                          <div className="flex flex-wrap items-center gap-1.5 mb-1">
                            <span className="text-base font-bold text-charcoal-900 dark:text-white leading-tight">
                              {courier.name}
                            </span>
                            {courier.badge && courier.badgeVariant && (
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${BADGE_STYLES[courier.badgeVariant]}`}>
                                {courier.badge}
                              </span>
                            )}
                            {isUnavailable && (
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-cool-gray-200 dark:bg-charcoal-700 text-charcoal-400">
                                Unavailable
                              </span>
                            )}
                          </div>
                          {/* ETA row */}
                          <div className="flex items-center gap-1.5 mb-2">
                            <span className={`text-sm font-semibold ${
                              isSelected ? 'text-gold-600 dark:text-gold-400' : 'text-charcoal-700 dark:text-cool-gray-200'
                            }`}>
                              {courier.deliveryDays}
                            </span>
                            <span className="text-cool-gray-300 dark:text-charcoal-600">·</span>
                            <span className="text-xs text-charcoal-400 dark:text-cool-gray-500">
                              by {courier.estimatedDate}
                            </span>
                          </div>
                          {/* Feature chips */}
                          <div className="flex flex-wrap gap-1.5">
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-cool-gray-100 dark:bg-charcoal-700 text-charcoal-500 dark:text-cool-gray-400">
                              {TRACKING_LABEL[courier.tracking]}
                            </span>
                            {courier.insurance && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-300">
                                🛡️ Insured
                              </span>
                            )}
                            {courier.signature && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-300">
                                ✍️ Signature
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Right: price + checkmark */}
                        <div className="shrink-0 flex flex-col items-end gap-2.5">
                          <span className={`text-lg font-bold leading-none ${
                            courier.price === 0
                              ? 'text-green-600 dark:text-green-400'
                              : 'text-charcoal-900 dark:text-white'
                          }`}>
                            {courier.price === 0 ? 'FREE' : `$${courier.price.toFixed(2)}`}
                          </span>
                          <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                            isSelected
                              ? 'bg-gold-500 border-gold-500'
                              : 'border-cool-gray-300 dark:border-charcoal-600'
                          }`}>
                            {isSelected && (
                              <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* ── Info note ───────────────────────────────────────────── */}
                <div className="bg-cool-gray-50 dark:bg-charcoal-900 border-t border-cool-gray-100 dark:border-charcoal-700 px-5 py-3 flex items-start gap-2">
                  <span className="text-xs shrink-0 mt-px">ℹ️</span>
                  <p className="text-xs text-charcoal-400 dark:text-cool-gray-500 leading-relaxed">
                    Estimates are for business days and may vary for multi-vendor orders.
                    Same-day delivery is available in select metro areas only.
                  </p>
                </div>

                {/* ── Bottom CTA ──────────────────────────────────────────── */}
                <div className="bg-white dark:bg-charcoal-800 border-t-2 border-cool-gray-100 dark:border-charcoal-700 px-5 pt-4 pb-5">
                  {/* Selected courier summary */}
                  <div className="flex items-center justify-between mb-3 px-1">
                    <div className="flex items-center gap-2.5">
                      <span className="text-2xl select-none">{selectedCourier.icon}</span>
                      <div>
                        <p className="text-sm font-bold text-charcoal-900 dark:text-white leading-tight">
                          {selectedCourier.name}
                        </p>
                        <p className="text-xs text-charcoal-400 dark:text-cool-gray-500">
                          {selectedCourier.deliveryDays} · {selectedCourier.estimatedDate}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-lg font-bold leading-tight ${
                        selectedCourier.price === 0 ? 'text-green-600 dark:text-green-400' : 'text-charcoal-900 dark:text-white'
                      }`}>
                        {selectedCourier.price === 0 ? 'FREE' : `$${selectedCourier.price.toFixed(2)}`}
                      </p>
                      <p className="text-[11px] text-charcoal-400 dark:text-cool-gray-500">delivery fee</p>
                    </div>
                  </div>
                  {/* Action buttons */}
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setCurrentStep(1)}
                      className="px-5 py-3.5 rounded-xl border-2 border-cool-gray-200 dark:border-charcoal-600 text-charcoal-600 dark:text-cool-gray-300 font-semibold text-sm hover:border-gold-400 hover:text-gold-600 dark:hover:text-gold-400 transition-colors"
                    >
                      ← Back
                    </button>
                    <button
                      type="button"
                      onClick={handleCourierContinue}
                      className="flex-1 py-3.5 bg-gold-600 hover:bg-gold-700 active:bg-gold-800 text-white font-bold rounded-xl transition-colors text-sm tracking-wide shadow-md shadow-gold-600/20"
                    >
                      Confirm {selectedCourier.name} →
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ── STEP 3: Payment ──────────────────────────────────────────── */}
            {currentStep === 3 && (
              <div className="bg-white dark:bg-charcoal-800 border border-cool-gray-300 dark:border-charcoal-700 rounded-xl p-6">
                <h2 className="text-2xl font-bold text-charcoal-900 dark:text-white mb-6">Payment Information</h2>
                <form onSubmit={handlePaymentSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-charcoal-700 dark:text-cool-gray-300 mb-2">Card Number *</label>
                    <input type="text" required value={paymentInfo.cardNumber}
                      onChange={(e) => setPaymentInfo({ ...paymentInfo, cardNumber: e.target.value })}
                      className="w-full px-4 py-2.5 bg-white dark:bg-charcoal-700 border border-cool-gray-300 dark:border-charcoal-600 text-charcoal-900 dark:text-white rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-transparent"
                      placeholder="1234 5678 9012 3456" maxLength={19} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-charcoal-700 dark:text-cool-gray-300 mb-2">Cardholder Name *</label>
                    <input type="text" required value={paymentInfo.cardName}
                      onChange={(e) => setPaymentInfo({ ...paymentInfo, cardName: e.target.value })}
                      className="w-full px-4 py-2.5 bg-white dark:bg-charcoal-700 border border-cool-gray-300 dark:border-charcoal-600 text-charcoal-900 dark:text-white rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-transparent"
                      placeholder="John Doe" />
                  </div>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-charcoal-700 dark:text-cool-gray-300 mb-2">Expiry Date *</label>
                      <input type="text" required value={paymentInfo.expiryDate}
                        onChange={(e) => setPaymentInfo({ ...paymentInfo, expiryDate: e.target.value })}
                        className="w-full px-4 py-2.5 bg-white dark:bg-charcoal-700 border border-cool-gray-300 dark:border-charcoal-600 text-charcoal-900 dark:text-white rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-transparent"
                        placeholder="MM/YY" maxLength={5} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-charcoal-700 dark:text-cool-gray-300 mb-2">CVV *</label>
                      <input type="text" required value={paymentInfo.cvv}
                        onChange={(e) => setPaymentInfo({ ...paymentInfo, cvv: e.target.value })}
                        className="w-full px-4 py-2.5 bg-white dark:bg-charcoal-700 border border-cool-gray-300 dark:border-charcoal-600 text-charcoal-900 dark:text-white rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-transparent"
                        placeholder="123" maxLength={4} />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <input type="checkbox" id="saveCard" checked={paymentInfo.saveCard}
                      onChange={(e) => setPaymentInfo({ ...paymentInfo, saveCard: e.target.checked })}
                      className="w-4 h-4 text-gold-600 rounded focus:ring-gold-500" />
                    <label htmlFor="saveCard" className="text-sm text-charcoal-700 dark:text-cool-gray-300">
                      Save card for future purchases
                    </label>
                  </div>
                  <div className="bg-gold-600/10 dark:bg-gold-600/20 border border-gold-600/30 dark:border-gold-600/40 rounded-lg p-4 mt-4">
                    <div className="flex items-start gap-3">
                      <span className="text-gold-600 text-xl">🔒</span>
                      <div>
                        <p className="text-sm font-medium text-charcoal-900 dark:text-white">Secure Payment</p>
                        <p className="text-xs text-charcoal-600 dark:text-cool-gray-400 mt-1">
                          Your payment information is encrypted and secure. We never store your full card details.
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-4 pt-4">
                    <button type="button" onClick={() => setCurrentStep(2)}
                      className="flex-1 px-6 py-3 border-2 border-cool-gray-300 dark:border-charcoal-600 bg-white dark:bg-charcoal-700 text-charcoal-700 dark:text-white rounded-lg font-semibold hover:bg-cool-gray-100 dark:hover:bg-charcoal-600 transition-colors">
                      Back
                    </button>
                    <button type="submit" className="flex-1 px-6 py-3 bg-gold-600 text-white rounded-lg font-semibold hover:bg-gold-700 transition-colors">
                      Review Order →
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* ── STEP 4: Review ───────────────────────────────────────────── */}
            {currentStep === 4 && (
              <div className="space-y-6">
                {/* Summary cards */}
                <div className="bg-white dark:bg-charcoal-800 border border-cool-gray-300 dark:border-charcoal-700 rounded-xl p-6">
                  <h2 className="text-2xl font-bold text-charcoal-900 dark:text-white mb-6">Review Your Order</h2>
                  <div className="space-y-5">

                    {/* Shipping address */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold text-charcoal-900 dark:text-white">Shipping Address</h3>
                        <button onClick={() => setCurrentStep(1)} className="text-xs text-gold-600 hover:text-gold-700 font-medium">Edit</button>
                      </div>
                      <p className="text-sm text-charcoal-600 dark:text-cool-gray-400 leading-relaxed">
                        {shippingInfo.fullName}<br />{shippingInfo.address}<br />
                        {shippingInfo.city}, {shippingInfo.state} {shippingInfo.zipCode}<br />
                        {shippingInfo.phone}
                      </p>
                    </div>

                    {/* Delivery method */}
                    <div className="border-t border-cool-gray-200 dark:border-charcoal-700 pt-5">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-semibold text-charcoal-900 dark:text-white">Delivery Method</h3>
                        <button onClick={() => setCurrentStep(2)} className="text-xs text-gold-600 hover:text-gold-700 font-medium">Change</button>
                      </div>
                      <div className="flex items-start gap-3 p-3 rounded-xl bg-cool-gray-50 dark:bg-charcoal-900 border border-cool-gray-200 dark:border-charcoal-700">
                        <span className="text-2xl select-none">{selectedCourier.icon}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-sm text-charcoal-900 dark:text-white">{selectedCourier.name}</span>
                            {selectedCourier.badge && selectedCourier.badgeVariant && (
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${BADGE_STYLES[selectedCourier.badgeVariant]}`}>
                                {selectedCourier.badge}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-charcoal-500 dark:text-cool-gray-400 mt-0.5">
                            {selectedCourier.deliveryDays} · Est. <strong>{selectedCourier.estimatedDate}</strong>
                          </p>
                          <p className="text-xs text-charcoal-400 dark:text-cool-gray-500">{selectedCourier.carrier}</p>
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-cool-gray-200 dark:bg-charcoal-700 text-charcoal-600 dark:text-cool-gray-400">
                              {TRACKING_LABEL[selectedCourier.tracking]}
                            </span>
                            {selectedCourier.insurance && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300">🛡️ Insured</span>
                            )}
                            {selectedCourier.signature && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300">✍️ Signature</span>
                            )}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <span className={`font-bold text-sm ${selectedCourier.price === 0 ? 'text-green-600 dark:text-green-400' : 'text-charcoal-900 dark:text-white'}`}>
                            {selectedCourier.price === 0 ? 'FREE' : `$${selectedCourier.price.toFixed(2)}`}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Payment */}
                    <div className="border-t border-cool-gray-200 dark:border-charcoal-700 pt-5">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold text-charcoal-900 dark:text-white">Payment Method</h3>
                        <button onClick={() => setCurrentStep(3)} className="text-xs text-gold-600 hover:text-gold-700 font-medium">Edit</button>
                      </div>
                      <p className="text-sm text-charcoal-600 dark:text-cool-gray-400">
                        💳 Card ending in {paymentInfo.cardNumber.slice(-4)}<br />
                        Expires {paymentInfo.expiryDate}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Order items */}
                <div className="bg-white dark:bg-charcoal-800 border border-cool-gray-300 dark:border-charcoal-700 rounded-xl p-6">
                  <h3 className="font-semibold text-charcoal-900 dark:text-white mb-4">
                    Order Items ({cartItems.length})
                  </h3>
                  <div className="space-y-4">
                    {cartItems.map((item) => (
                      <div key={item.id} className="flex gap-4">
                        <div className="relative w-20 h-20 rounded-lg overflow-hidden shrink-0">
                          <Image src={item.image} alt={item.name} fill className="object-cover" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-medium text-charcoal-900 dark:text-white">{item.name}</h4>
                          <p className="text-sm text-charcoal-600 dark:text-cool-gray-400">{item.vendor}</p>
                          <p className="text-sm text-charcoal-600 dark:text-cool-gray-400">Qty: {item.quantity}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-charcoal-900 dark:text-white">${(item.price * item.quantity).toFixed(2)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex gap-4">
                  <button onClick={() => setCurrentStep(3)}
                    className="flex-1 px-6 py-3 border-2 border-cool-gray-300 dark:border-charcoal-600 bg-white dark:bg-charcoal-700 text-charcoal-700 dark:text-white rounded-lg font-semibold hover:bg-cool-gray-100 dark:hover:bg-charcoal-600 transition-colors">
                    Back
                  </button>
                  <button onClick={handlePlaceOrder} disabled={isProcessing}
                    className="flex-1 px-6 py-3 bg-gold-600 text-white rounded-lg font-semibold hover:bg-gold-700 transition-colors disabled:bg-cool-gray-400 disabled:cursor-not-allowed">
                    {isProcessing ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                        Processing…
                      </span>
                    ) : 'Place Order 🎉'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ─ Right column — Order Summary ──────────────────────────────────── */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-charcoal-800 border border-cool-gray-300 dark:border-charcoal-700 rounded-xl p-6 sticky top-4">
              <h3 className="text-xl font-bold text-charcoal-900 dark:text-white mb-4">Order Summary</h3>

              <div className="space-y-3 mb-4">
                {cartItems.map((item) => (
                  <div key={item.id} className="flex justify-between text-sm gap-2">
                    <span className="text-charcoal-600 dark:text-cool-gray-400 truncate">{item.name} ×{item.quantity}</span>
                    <span className="font-medium text-charcoal-900 dark:text-white shrink-0">${(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>

              <div className="border-t border-cool-gray-300 dark:border-charcoal-700 pt-4 space-y-2.5">
                <div className="flex justify-between text-sm">
                  <span className="text-charcoal-600 dark:text-cool-gray-400">Subtotal</span>
                  <span className="font-medium text-charcoal-900 dark:text-white">${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <div>
                    <span className="text-charcoal-600 dark:text-cool-gray-400">Delivery</span>
                    <div className="flex items-center gap-1 mt-0.5">
                      <span className="text-xs">{selectedCourier.icon}</span>
                      <span className="text-[11px] text-charcoal-400 dark:text-cool-gray-500">{selectedCourier.name}</span>
                    </div>
                    <div className="text-[11px] text-charcoal-400 dark:text-cool-gray-500 mt-0.5">
                      Est. {selectedCourier.estimatedDate}
                    </div>
                  </div>
                  <span className={`font-medium shrink-0 ${shipping === 0 ? 'text-green-600 dark:text-green-400' : 'text-charcoal-900 dark:text-white'}`}>
                    {shipping === 0 ? 'FREE' : `$${shipping.toFixed(2)}`}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-charcoal-600 dark:text-cool-gray-400">Tax (8%)</span>
                  <span className="font-medium text-charcoal-900 dark:text-white">${tax.toFixed(2)}</span>
                </div>
              </div>

              <div className="border-t border-cool-gray-300 dark:border-charcoal-700 mt-4 pt-4">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-bold text-charcoal-900 dark:text-white">Total</span>
                  <span className="text-xl font-bold text-gold-600">${total.toFixed(2)}</span>
                </div>
              </div>

              {/* Trust badges */}
              <div className="mt-5 pt-5 border-t border-cool-gray-200 dark:border-charcoal-700 space-y-2">
                <div className="flex items-center gap-2 text-xs text-charcoal-600 dark:text-cool-gray-400">
                  <span>🔒</span><span>Secure SSL Encrypted Payment</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-charcoal-600 dark:text-cool-gray-400">
                  <span>↩️</span><span>Free returns within 30 days</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-charcoal-600 dark:text-cool-gray-400">
                  <span>🛡️</span><span>Buyer protection guaranteed</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
