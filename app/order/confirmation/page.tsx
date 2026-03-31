'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Suspense } from 'react';

function ConfirmationContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const orderId = searchParams.get('orderId') || 'ORD-UNKNOWN';

  return (
    <div className="min-h-screen bg-white dark:bg-charcoal-900 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        <div className="bg-white dark:bg-charcoal-800 border border-cool-gray-300 dark:border-charcoal-700 rounded-2xl shadow-xl p-8 text-center">
          {/* Success Icon */}
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-4xl">✓</span>
          </div>

          {/* Success Message */}
          <h1 className="text-3xl font-bold text-charcoal-900 mb-4">
            Order Placed Successfully!
          </h1>
          <p className="text-charcoal-600 mb-8">
            Thank you for your purchase. Your order has been confirmed and will be processed shortly.
          </p>

          {/* Order Details */}
          <div className="bg-gray-50 rounded-lg p-6 mb-8">
            <div className="grid grid-cols-2 gap-4 text-left">
              <div>
                <p className="text-sm text-charcoal-600 mb-1">Order Number</p>
                <p className="font-bold text-charcoal-900">{orderId}</p>
              </div>
              <div>
                <p className="text-sm text-charcoal-600 mb-1">Order Date</p>
                <p className="font-bold text-charcoal-900">
                  {new Date().toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </p>
              </div>
            </div>
          </div>

          {/* What's Next */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8 text-left">
            <h3 className="font-semibold text-charcoal-900 mb-4">What happens next?</h3>
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <span className="text-blue-600 mt-0.5">📧</span>
                <div>
                  <p className="text-sm font-medium text-charcoal-900">Order Confirmation Email</p>
                  <p className="text-xs text-charcoal-600">We've sent a confirmation to your email</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-blue-600 mt-0.5">📦</span>
                <div>
                  <p className="text-sm font-medium text-charcoal-900">Processing</p>
                  <p className="text-xs text-charcoal-600">Your order will be processed within 24-48 hours</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-blue-600 mt-0.5">🚚</span>
                <div>
                  <p className="text-sm font-medium text-charcoal-900">Shipping Updates</p>
                  <p className="text-xs text-charcoal-600">You'll receive tracking information once shipped</p>
                </div>
              </li>
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4">
            <Link
              href={`/order/${orderId}`}
              className="flex-1 px-6 py-3 bg-gold-600 text-white rounded-lg font-semibold hover:bg-gold-700 transition-colors"
            >
              Track Order
            </Link>
            <Link
              href="/shop"
              className="flex-1 px-6 py-3 border-2 border-gray-300 text-charcoal-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
            >
              Continue Shopping
            </Link>
          </div>

          {/* Support */}
          <div className="mt-8 pt-8 border-t">
            <p className="text-sm text-charcoal-600">
              Need help?{' '}
              <Link href="/contact" className="text-gold-600 hover:text-gold-700 font-medium">
                Contact Support
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function OrderConfirmationPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold-600 mx-auto mb-4"></div>
          <p className="text-charcoal-600">Loading...</p>
        </div>
      </div>
    }>
      <ConfirmationContent />
    </Suspense>
  );
}
