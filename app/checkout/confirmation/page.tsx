'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Header from '../../../components/common/Header';
import Footer from '../../../components/common/Footer';

// Pre-computed outside component so Math.random() is never called during render
const CONFETTI = Array.from({ length: 50 }, () => ({
  left: `${Math.random() * 100}%`,
  delay: `${Math.random() * 2}s`,
  duration: `${2 + Math.random() * 2}s`,
}));

export default function ConfirmationPage() {
  const _router = useRouter();
  const [orderNumber] = useState(() =>
    (typeof window !== 'undefined' ? localStorage.getItem('lastOrderNumber') : null) ?? `ORD-${Date.now()}`
  );
  const [showConfetti, setShowConfetti] = useState(true);

  useEffect(() => {
    // Hide confetti after animation
    const timer = setTimeout(() => setShowConfetti(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  const estimatedDelivery = new Date();
  estimatedDelivery.setDate(estimatedDelivery.getDate() + 7);

  return (
    <div className="min-h-screen bg-white dark:bg-charcoal-900 relative overflow-hidden">
      <Header />

      {/* Confetti Animation */}
      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none z-50">
          {CONFETTI.map((piece, i) => (
            <div
              key={i}
              className="absolute w-2 h-2 bg-gold-500 rounded-full animate-confetti"
              style={{
                left: piece.left,
                top: '-10px',
                animationDelay: piece.delay,
                animationDuration: piece.duration,
              }}
            />
          ))}
        </div>
      )}

      <div className="container mx-auto px-4 py-12">
        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-center mb-4">
            {['Cart', 'Shipping', 'Payment', 'Review', 'Confirmation'].map((step, index) => (
              <div key={step} className="flex items-center">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gold-600 text-white">
                  ✓
                </div>
                {index < 4 && <div className="w-12 sm:w-20 h-1 bg-gold-600" />}
              </div>
            ))}
          </div>
        </div>

        {/* Success Message */}
        <div className="max-w-2xl mx-auto text-center">
          <div className="mb-6 animate-bounce">
            <div className="inline-block w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
              <span className="text-5xl">✓</span>
            </div>
          </div>

          <h1 className="text-3xl sm:text-4xl font-bold text-charcoal-900 dark:text-white mb-3">
            Order Placed Successfully!
          </h1>
          <p className="text-lg text-charcoal-600 dark:text-cool-gray-400 mb-8">
            Thank you for your purchase. We&apos;ve received your order and will process it shortly.
          </p>

          {/* Order Details Card */}
          <div className="bg-white dark:bg-charcoal-800 border border-cool-gray-300 dark:border-charcoal-700 rounded-lg p-6 sm:p-8 mb-6 text-left">
            <div className="grid sm:grid-cols-2 gap-6 mb-6 pb-6 border-b border-cool-gray-300 dark:border-charcoal-700">
              <div>
                <p className="text-sm text-charcoal-600 dark:text-cool-gray-400 mb-1">Order Number</p>
                <p className="text-xl font-bold text-gold-600">{orderNumber}</p>
              </div>
              <div>
                <p className="text-sm text-charcoal-600 dark:text-cool-gray-400 mb-1">Estimated Delivery</p>
                <p className="text-xl font-bold text-charcoal-900 dark:text-white">
                  {estimatedDelivery.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <span className="text-2xl">📧</span>
                <div className="flex-1">
                  <p className="font-semibold text-blue-900 dark:text-blue-300 mb-1">
                    Confirmation Email Sent
                  </p>
                  <p className="text-sm text-blue-700 dark:text-blue-400">
                    We&apos;ve sent an order confirmation to your email address with all the details.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <span className="text-2xl">📦</span>
                <div className="flex-1">
                  <p className="font-semibold text-green-900 dark:text-green-300 mb-1">
                    Track Your Order
                  </p>
                  <p className="text-sm text-green-700 dark:text-green-400">
                    You can track your order status anytime in your order history.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid sm:grid-cols-2 gap-4 mb-8">
            <Link
              href="/orders"
              className="py-4 bg-gold-600 text-white rounded-lg hover:bg-gold-700 transition-colors font-semibold"
            >
              View Order Details
            </Link>
            <Link
              href="/shop"
              className="py-4 bg-white dark:bg-charcoal-800 text-charcoal-900 dark:text-white border-2 border-cool-gray-300 dark:border-charcoal-700 rounded-lg hover:border-gold-600 dark:hover:border-gold-500 transition-colors font-semibold"
            >
              Continue Shopping
            </Link>
          </div>

          {/* What's Next */}
          <div className="bg-cool-gray-50 dark:bg-charcoal-800 rounded-lg p-6 text-left">
            <h3 className="text-lg font-bold text-charcoal-900 dark:text-white mb-4">What happens next?</h3>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-gold-600 text-white rounded-full flex items-center justify-center shrink-0 font-bold">
                  1
                </div>
                <div>
                  <p className="font-semibold text-charcoal-900 dark:text-white mb-1">
                    Order Processing (1-2 business days)
                  </p>
                  <p className="text-sm text-charcoal-600 dark:text-cool-gray-400">
                    Our vendors will prepare your items for shipment
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-gold-600 text-white rounded-full flex items-center justify-center shrink-0 font-bold">
                  2
                </div>
                <div>
                  <p className="font-semibold text-charcoal-900 dark:text-white mb-1">
                    Shipping (5-7 business days)
                  </p>
                  <p className="text-sm text-charcoal-600 dark:text-cool-gray-400">
                    You&apos;ll receive tracking information via email
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-gold-600 text-white rounded-full flex items-center justify-center shrink-0 font-bold">
                  3
                </div>
                <div>
                  <p className="font-semibold text-charcoal-900 dark:text-white mb-1">
                    Delivery
                  </p>
                  <p className="text-sm text-charcoal-600 dark:text-cool-gray-400">
                    Your items will arrive at your doorstep
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Help Section */}
          <div className="mt-8 p-6 bg-white dark:bg-charcoal-800 border border-cool-gray-300 dark:border-charcoal-700 rounded-lg">
            <p className="text-charcoal-700 dark:text-cool-gray-300 mb-4">
              Need help with your order?
            </p>
            <div className="flex justify-center gap-4">
              <Link
                href="/help"
                className="px-6 py-2 text-gold-600 dark:text-gold-500 hover:underline font-semibold"
              >
                Visit Help Center
              </Link>
              <Link
                href="/contact"
                className="px-6 py-2 text-gold-600 dark:text-gold-500 hover:underline font-semibold"
              >
                Contact Support
              </Link>
            </div>
          </div>
        </div>
      </div>

      <Footer />

      <style jsx>{`
        @keyframes confetti {
          0% {
            transform: translateY(0) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(720deg);
            opacity: 0;
          }
        }
        .animate-confetti {
          animation: confetti linear forwards;
        }
      `}</style>
    </div>
  );
}
