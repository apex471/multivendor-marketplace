'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCart } from '@/contexts/CartContext';
import Header from '@/components/common/Header';
import Footer from '@/components/common/Footer';
import Link from 'next/link';

function VerifyPaymentContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { clearCart } = useCart();
  const [statusMsg, setStatusMsg] = useState('Initializing verification...');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const gateway = searchParams.get('gateway') || 'flutterwave';
  const status = searchParams.get('status');
  const txRef = searchParams.get('tx_ref') || searchParams.get('order_id'); // orderId
  const transactionId = searchParams.get('transaction_id');

  useEffect(() => {
    if (gateway === 'flutterwave') {
      if (!status || !txRef) {
        setErrorMsg('Invalid return parameters from payment gateway.');
        return;
      }

      if (status !== 'successful') {
        setErrorMsg('Payment was not completed successfully.');
        return;
      }
    } else if (gateway === 'korapay') {
      if (!txRef) {
        setErrorMsg('Missing order reference for Korapay verification.');
        return;
      }
    }

    const verify = async () => {
      setStatusMsg(`Verifying your payment with ${gateway === 'korapay' ? 'Korapay' : 'Flutterwave'}...`);
      try {
        const queryParams = new URLSearchParams();
        queryParams.set('gateway', gateway);
        if (txRef) queryParams.set('order_id', txRef);
        if (transactionId) queryParams.set('transaction_id', transactionId || '');

        const res = await fetch(`/api/payment/verify?${queryParams.toString()}`);
        const data = await res.json();
        
        if (res.ok && data.success) {
          setIsSuccess(true);
          clearCart();
          setStatusMsg('Payment verified! Redirecting to confirmation page...');
          setTimeout(() => {
            router.replace(`/order/confirmation?orderId=${txRef}`);
          }, 2000);
        } else {
          setErrorMsg(data.message || 'Payment verification failed. Please contact support.');
        }
      } catch {
        setErrorMsg('Network error occurred while verifying payment.');
      }
    };

    verify();
  }, [gateway, status, txRef, transactionId, clearCart, router]);

  return (
    <div className="max-w-md w-full mx-auto bg-white dark:bg-charcoal-800 rounded-2xl shadow-xl p-8 text-center border border-cool-gray-100 dark:border-charcoal-700">
      {!errorMsg ? (
        <div className="space-y-6">
          <div className="flex justify-center">
            {isSuccess ? (
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full flex items-center justify-center text-3xl animate-bounce">
                ✓
              </div>
            ) : (
              <div className="w-16 h-16 border-4 border-gold-500 border-t-transparent rounded-full animate-spin" />
            )}
          </div>
          <h2 className="text-2xl font-display font-bold text-charcoal-900 dark:text-white">
            {isSuccess ? 'Payment Confirmed' : 'Verifying Payment'}
          </h2>
          <p className="text-sm text-cool-gray-500 dark:text-cool-gray-400 leading-relaxed">
            {statusMsg}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex justify-center">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center text-3xl">
              ✕
            </div>
          </div>
          <h2 className="text-2xl font-display font-bold text-charcoal-900 dark:text-white">
            Verification Failed
          </h2>
          <p className="text-sm text-red-600 dark:text-red-400 leading-relaxed bg-red-50 dark:bg-red-900/10 p-4 rounded-xl border border-red-100 dark:border-red-900/20">
            {errorMsg}
          </p>
          <div className="pt-4 flex flex-col gap-3">
            <Link
              href="/checkout"
              className="w-full py-3 bg-gold-600 hover:bg-gold-500 text-charcoal-950 rounded-xl font-bold transition-colors inline-block text-center"
            >
              Return to Checkout
            </Link>
            <Link
              href="/"
              className="w-full py-3 bg-cool-gray-100 dark:bg-charcoal-700 text-charcoal-800 dark:text-white hover:bg-cool-gray-200 dark:hover:bg-charcoal-600 rounded-xl font-bold transition-colors inline-block text-center"
            >
              Back to Home
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

export default function VerifyPaymentPage() {
  return (
    <div className="min-h-screen flex flex-col bg-cool-gray-50 dark:bg-charcoal-950">
      <Header />
      <main className="flex-1 flex items-center justify-center px-4 py-16">
        <Suspense fallback={
          <div className="max-w-md w-full mx-auto bg-white dark:bg-charcoal-800 rounded-2xl shadow-xl p-8 text-center">
            <div className="w-16 h-16 border-4 border-gold-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-cool-gray-500">Loading verification details...</p>
          </div>
        }>
          <VerifyPaymentContent />
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}
