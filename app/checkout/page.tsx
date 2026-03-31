'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';

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
    fullName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    country: 'United States',
  });

  const [paymentInfo, setPaymentInfo] = useState({
    cardNumber: '',
    cardName: '',
    expiryDate: '',
    cvv: '',
    saveCard: false,
  });

  // Mock cart items - replace with actual cart context
  const cartItems: CartItem[] = [
    {
      id: '1',
      name: 'Designer Leather Jacket',
      price: 299.99,
      quantity: 1,
      image: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=400',
      vendor: 'Luxury Fashion Co.',
    },
    {
      id: '2',
      name: 'Premium Sneakers',
      price: 149.99,
      quantity: 2,
      image: 'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=400',
      vendor: 'Urban Footwear',
    },
  ];

  const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const shipping = 15.00;
  const tax = subtotal * 0.08; // 8% tax
  const total = subtotal + shipping + tax;

  const handleShippingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!shippingInfo.fullName || !shippingInfo.email || !shippingInfo.address || !shippingInfo.city || !shippingInfo.zipCode) {
      alert('Please fill in all required fields');
      return;
    }
    setCurrentStep(2);
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentInfo.cardNumber || !paymentInfo.cardName || !paymentInfo.expiryDate || !paymentInfo.cvv) {
      alert('Please fill in all payment details');
      return;
    }
    setCurrentStep(3);
  };

  const handlePlaceOrder = async () => {
    setIsProcessing(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log('Order placed:', {
      shippingInfo,
      paymentInfo,
      items: cartItems,
      total,
    });

    // Redirect to success page
    router.push('/order/confirmation?orderId=ORD-' + Date.now());
  };

  const steps = [
    { number: 1, title: 'Shipping', icon: '📦' },
    { number: 2, title: 'Payment', icon: '💳' },
    { number: 3, title: 'Review', icon: '✓' },
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-charcoal-900">
      {/* Header */}
      <div className="bg-white dark:bg-charcoal-800 border-b border-cool-gray-300 dark:border-charcoal-700">
        <div className="container mx-auto px-4 py-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-charcoal-800 to-charcoal-900 rounded-lg flex items-center justify-center">
              <span className="text-gold-300 font-bold text-sm">CLW</span>
            </div>
            <span className="text-lg font-display font-bold text-charcoal-900 dark:text-white">Secure Checkout</span>
          </Link>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="bg-white dark:bg-charcoal-800 border-b border-cool-gray-300 dark:border-charcoal-700">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-center gap-4 sm:gap-8">
            {steps.map((step, index) => (
              <div key={step.number} className="flex items-center">
                <div className="flex flex-col items-center">
                  <div
                    className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center text-lg sm:text-xl font-bold transition-all ${
                      currentStep >= step.number
                        ? 'bg-gold-600 text-white'
                        : 'bg-cool-gray-300 dark:bg-charcoal-700 text-charcoal-600 dark:text-cool-gray-400'
                    }`}
                  >
                    {currentStep > step.number ? '✓' : step.icon}
                  </div>
                  <span className={`mt-2 text-xs sm:text-sm font-medium ${
                    currentStep >= step.number ? 'text-gold-600' : 'text-charcoal-600 dark:text-cool-gray-400'
                  }`}>
                    {step.title}
                  </span>
                </div>
                {index < steps.length - 1 && (
                  <div className={`w-12 sm:w-20 h-1 mx-2 sm:mx-4 ${
                    currentStep > step.number ? 'bg-gold-600' : 'bg-cool-gray-300 dark:bg-charcoal-700'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Column - Forms */}
          <div className="lg:col-span-2">
            {/* Step 1: Shipping Information */}
            {currentStep === 1 && (
              <div className="bg-white dark:bg-charcoal-800 border border-cool-gray-300 dark:border-charcoal-700 rounded-lg p-6">
                <h2 className="text-2xl font-bold text-charcoal-900 dark:text-white mb-6">Shipping Information</h2>
                <form onSubmit={handleShippingSubmit} className="space-y-4">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-charcoal-700 dark:text-cool-gray-300 mb-2">
                        Full Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={shippingInfo.fullName}
                        onChange={(e) => setShippingInfo({ ...shippingInfo, fullName: e.target.value })}
                        className="w-full px-4 py-2 bg-white dark:bg-charcoal-700 border border-cool-gray-300 dark:border-charcoal-600 text-charcoal-900 dark:text-white rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-transparent"
                        placeholder="John Doe"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-charcoal-700 dark:text-cool-gray-300 mb-2">
                        Email *
                      </label>
                      <input
                        type="email"
                        required
                        value={shippingInfo.email}
                        onChange={(e) => setShippingInfo({ ...shippingInfo, email: e.target.value })}
                        className="w-full px-4 py-2 bg-white dark:bg-charcoal-700 border border-cool-gray-300 dark:border-charcoal-600 text-charcoal-900 dark:text-white rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-transparent"
                        placeholder="john@example.com"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-charcoal-700 dark:text-cool-gray-300 mb-2">
                      Phone Number *
                    </label>
                    <input
                      type="tel"
                      required
                      value={shippingInfo.phone}
                      onChange={(e) => setShippingInfo({ ...shippingInfo, phone: e.target.value })}
                      className="w-full px-4 py-2 bg-white dark:bg-charcoal-700 border border-cool-gray-300 dark:border-charcoal-600 text-charcoal-900 dark:text-white rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-transparent"
                      placeholder="+1 (555) 123-4567"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-charcoal-700 dark:text-cool-gray-300 mb-2">
                      Street Address *
                    </label>
                    <input
                      type="text"
                      required
                      value={shippingInfo.address}
                      onChange={(e) => setShippingInfo({ ...shippingInfo, address: e.target.value })}
                      className="w-full px-4 py-2 bg-white dark:bg-charcoal-700 border border-cool-gray-300 dark:border-charcoal-600 text-charcoal-900 dark:text-white rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-transparent"
                      placeholder="123 Main Street, Apt 4B"
                    />
                  </div>

                  <div className="grid sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-charcoal-700 dark:text-cool-gray-300 mb-2">
                        City *
                      </label>
                      <input
                        type="text"
                        required
                        value={shippingInfo.city}
                        onChange={(e) => setShippingInfo({ ...shippingInfo, city: e.target.value })}
                        className="w-full px-4 py-2 bg-white dark:bg-charcoal-700 border border-cool-gray-300 dark:border-charcoal-600 text-charcoal-900 dark:text-white rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-transparent"
                        placeholder="New York"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-charcoal-700 dark:text-cool-gray-300 mb-2">
                        State *
                      </label>
                      <input
                        type="text"
                        required
                        value={shippingInfo.state}
                        onChange={(e) => setShippingInfo({ ...shippingInfo, state: e.target.value })}
                        className="w-full px-4 py-2 bg-white dark:bg-charcoal-700 border border-cool-gray-300 dark:border-charcoal-600 text-charcoal-900 dark:text-white rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-transparent"
                        placeholder="NY"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-charcoal-700 dark:text-cool-gray-300 mb-2">
                        ZIP Code *
                      </label>
                      <input
                        type="text"
                        required
                        value={shippingInfo.zipCode}
                        onChange={(e) => setShippingInfo({ ...shippingInfo, zipCode: e.target.value })}
                        className="w-full px-4 py-2 bg-white dark:bg-charcoal-700 border border-cool-gray-300 dark:border-charcoal-600 text-charcoal-900 dark:text-white rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-transparent"
                        placeholder="10001"
                      />
                    </div>
                  </div>

                  <div className="flex gap-4 pt-4">
                    <Link
                      href="/cart"
                      className="flex-1 px-6 py-3 border-2 border-cool-gray-300 dark:border-charcoal-600 bg-white dark:bg-charcoal-700 text-charcoal-700 dark:text-white rounded-lg font-semibold hover:bg-cool-gray-100 dark:hover:bg-charcoal-600 transition-colors"
                    >
                      Back to Cart
                    </Link>
                    <button
                      type="submit"
                      className="flex-1 px-6 py-3 bg-gold-600 text-white rounded-lg font-semibold hover:bg-gold-700 transition-colors"
                    >
                      Continue to Payment
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Step 2: Payment Information */}
            {currentStep === 2 && (
              <div className="bg-white dark:bg-charcoal-800 border border-cool-gray-300 dark:border-charcoal-700 rounded-lg p-6">
                <h2 className="text-2xl font-bold text-charcoal-900 dark:text-white mb-6">Payment Information</h2>
                <form onSubmit={handlePaymentSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-charcoal-700 dark:text-cool-gray-300 mb-2">
                      Card Number *
                    </label>
                    <input
                      type="text"
                      required
                      value={paymentInfo.cardNumber}
                      onChange={(e) => setPaymentInfo({ ...paymentInfo, cardNumber: e.target.value })}
                      className="w-full px-4 py-2 bg-white dark:bg-charcoal-700 border border-cool-gray-300 dark:border-charcoal-600 text-charcoal-900 dark:text-white rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-transparent"
                      placeholder="1234 5678 9012 3456"
                      maxLength={19}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-charcoal-700 dark:text-cool-gray-300 mb-2">
                      Cardholder Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={paymentInfo.cardName}
                      onChange={(e) => setPaymentInfo({ ...paymentInfo, cardName: e.target.value })}
                      className="w-full px-4 py-2 bg-white dark:bg-charcoal-700 border border-cool-gray-300 dark:border-charcoal-600 text-charcoal-900 dark:text-white rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-transparent"
                      placeholder="John Doe"
                    />
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-charcoal-700 dark:text-cool-gray-300 mb-2">
                        Expiry Date *
                      </label>
                      <input
                        type="text"
                        required
                        value={paymentInfo.expiryDate}
                        onChange={(e) => setPaymentInfo({ ...paymentInfo, expiryDate: e.target.value })}
                        className="w-full px-4 py-2 bg-white dark:bg-charcoal-700 border border-cool-gray-300 dark:border-charcoal-600 text-charcoal-900 dark:text-white rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-transparent"
                        placeholder="MM/YY"
                        maxLength={5}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-charcoal-700 dark:text-cool-gray-300 mb-2">
                        CVV *
                      </label>
                      <input
                        type="text"
                        required
                        value={paymentInfo.cvv}
                        onChange={(e) => setPaymentInfo({ ...paymentInfo, cvv: e.target.value })}
                        className="w-full px-4 py-2 bg-white dark:bg-charcoal-700 border border-cool-gray-300 dark:border-charcoal-600 text-charcoal-900 dark:text-white rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-transparent"
                        placeholder="123"
                        maxLength={4}
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="saveCard"
                      checked={paymentInfo.saveCard}
                      onChange={(e) => setPaymentInfo({ ...paymentInfo, saveCard: e.target.checked })}
                      className="w-4 h-4 text-gold-600 rounded focus:ring-gold-500"
                    />
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
                    <button
                      type="button"
                      onClick={() => setCurrentStep(1)}
                      className="flex-1 px-6 py-3 border-2 border-cool-gray-300 dark:border-charcoal-600 bg-white dark:bg-charcoal-700 text-charcoal-700 dark:text-white rounded-lg font-semibold hover:bg-cool-gray-100 dark:hover:bg-charcoal-600 transition-colors"
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      className="flex-1 px-6 py-3 bg-gold-600 text-white rounded-lg font-semibold hover:bg-gold-700 transition-colors"
                    >
                      Review Order
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Step 3: Review Order */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <div className="bg-white dark:bg-charcoal-800 border border-cool-gray-300 dark:border-charcoal-700 rounded-lg p-6">
                  <h2 className="text-2xl font-bold text-charcoal-900 dark:text-white mb-6">Review Your Order</h2>
                  
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-semibold text-charcoal-900 dark:text-white mb-2">Shipping Address</h3>
                      <p className="text-sm text-charcoal-600 dark:text-cool-gray-400">
                        {shippingInfo.fullName}<br />
                        {shippingInfo.address}<br />
                        {shippingInfo.city}, {shippingInfo.state} {shippingInfo.zipCode}<br />
                        {shippingInfo.phone}
                      </p>
                      <button
                        onClick={() => setCurrentStep(1)}
                        className="text-sm text-gold-600 hover:text-gold-700 mt-2"
                      >
                        Edit
                      </button>
                    </div>

                    <div className="border-t border-cool-gray-300 dark:border-charcoal-700 pt-4">
                      <h3 className="font-semibold text-charcoal-900 dark:text-white mb-2">Payment Method</h3>
                      <p className="text-sm text-charcoal-600 dark:text-cool-gray-400">
                        Card ending in {paymentInfo.cardNumber.slice(-4)}<br />
                        Expires {paymentInfo.expiryDate}
                      </p>
                      <button
                        onClick={() => setCurrentStep(2)}
                        className="text-sm text-gold-600 hover:text-gold-700 mt-2"
                      >
                        Edit
                      </button>
                    </div>
                  </div>
                </div>

                <div className="bg-white dark:bg-charcoal-800 border border-cool-gray-300 dark:border-charcoal-700 rounded-lg p-6">
                  <h3 className="font-semibold text-charcoal-900 dark:text-white mb-4">Order Items</h3>
                  <div className="space-y-4">
                    {cartItems.map((item) => (
                      <div key={item.id} className="flex gap-4">
                        <div className="relative w-20 h-20 rounded-lg overflow-hidden flex-shrink-0">
                          <Image
                            src={item.image}
                            alt={item.name}
                            fill
                            className="object-cover"
                          />
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
                  <button
                    onClick={() => setCurrentStep(2)}
                    className="flex-1 px-6 py-3 border-2 border-cool-gray-300 dark:border-charcoal-600 bg-white dark:bg-charcoal-700 text-charcoal-700 dark:text-white rounded-lg font-semibold hover:bg-cool-gray-100 dark:hover:bg-charcoal-600 transition-colors"
                  >
                    Back
                  </button>
                  <button
                    onClick={handlePlaceOrder}
                    disabled={isProcessing}
                    className="flex-1 px-6 py-3 bg-gold-600 text-white rounded-lg font-semibold hover:bg-gold-700 transition-colors disabled:bg-cool-gray-400 disabled:cursor-not-allowed"
                  >
                    {isProcessing ? 'Processing...' : 'Place Order'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-charcoal-800 border border-cool-gray-300 dark:border-charcoal-700 rounded-lg p-6 sticky top-4">
              <h3 className="text-xl font-bold text-charcoal-900 dark:text-white mb-4">Order Summary</h3>
              
              <div className="space-y-3 mb-4">
                {cartItems.map((item) => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <span className="text-charcoal-600 dark:text-cool-gray-400">
                      {item.name} x{item.quantity}
                    </span>
                    <span className="font-medium text-charcoal-900 dark:text-white">
                      ${(item.price * item.quantity).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>

              <div className="border-t border-cool-gray-300 dark:border-charcoal-700 pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-charcoal-600 dark:text-cool-gray-400">Subtotal</span>
                  <span className="font-medium text-charcoal-900 dark:text-white">${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-charcoal-600 dark:text-cool-gray-400">Shipping</span>
                  <span className="font-medium text-charcoal-900 dark:text-white">${shipping.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-charcoal-600 dark:text-cool-gray-400">Tax</span>
                  <span className="font-medium text-charcoal-900 dark:text-white">${tax.toFixed(2)}</span>
                </div>
              </div>

              <div className="border-t border-cool-gray-300 dark:border-charcoal-700 mt-4 pt-4">
                <div className="flex justify-between">
                  <span className="text-lg font-bold text-charcoal-900 dark:text-white">Total</span>
                  <span className="text-lg font-bold text-gold-600">${total.toFixed(2)}</span>
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-cool-gray-300 dark:border-charcoal-700">
                <div className="flex items-center gap-2 text-xs text-charcoal-600 dark:text-cool-gray-400">
                  <span>🔒</span>
                  <span>Secure SSL Encrypted Payment</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
