'use client';

import Link from 'next/link';
import Header from '@/components/common/Header';
import Footer from '@/components/common/Footer';

export default function ReturnPolicyPage() {
  const sections = [
    {
      icon: '📦',
      title: '30-Day Return Window',
      content: 'We offer a 30-day return policy from the date of delivery on most items. Products must be unused, unworn, unwashed, and in their original condition with all tags attached and original packaging intact.',
    },
    {
      icon: '✅',
      title: 'Eligible Items',
      content: 'The following items are eligible for return: clothing (unworn), footwear (unworn with original box), accessories (unused with all packaging), and electronics (unopened in original sealed packaging).',
    },
    {
      icon: '❌',
      title: 'Non-Returnable Items',
      content: 'The following items cannot be returned: intimate apparel and swimwear (for hygiene reasons), customized or personalized items, beauty products that have been opened or used, gift cards, and items marked as "Final Sale" at time of purchase.',
    },
    {
      icon: '🔄',
      title: 'How to Initiate a Return',
      content: '1. Log in to your account and go to Orders.\n2. Select the order and click "Request Return".\n3. Choose the items and reason for return.\n4. Print the prepaid return shipping label.\n5. Drop off at any authorized shipping location.\n\nOnce received, refunds are processed within 5–10 business days.',
    },
    {
      icon: '💳',
      title: 'Refund Methods',
      content: 'Refunds are issued to your original payment method. Credit/debit card refunds take 5–10 business days to appear on your statement after we process the return. Original shipping fees are non-refundable unless the return is due to our error or a defective item.',
    },
    {
      icon: '🔁',
      title: 'Exchanges',
      content: 'We offer free size or color exchanges on all clothing and footwear within 30 days of delivery. To exchange, initiate a return through your account and select "Exchange" as the reason. Replacement items ship within 1–2 business days of receiving the return.',
    },
    {
      icon: '📏',
      title: 'Damaged or Incorrect Items',
      content: 'If you received a damaged, defective, or incorrect item, please contact us within 7 days of delivery with photos of the item. We will arrange a free return and send a replacement or full refund at no cost to you.',
    },
    {
      icon: '🌍',
      title: 'International Returns',
      content: 'International orders are eligible for returns within 30 days. However, the customer is responsible for return shipping costs unless the item is damaged or incorrect. Duties and taxes paid at import are non-refundable.',
    },
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-charcoal-900">
      <Header />

      {/* Hero */}
      <div className="bg-charcoal-900 text-white py-16 px-4 text-center">
        <h1 className="text-4xl md:text-5xl font-bold mb-4">Return & Refund Policy</h1>
        <p className="text-white/70 text-lg max-w-2xl mx-auto">We want you to love every purchase. If something isn&apos;t right, we make returns simple.</p>
        <p className="text-gold-400 text-sm mt-4">Last updated: June 2025</p>
      </div>

      <div className="container mx-auto px-4 py-12 max-w-4xl">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-cool-gray-500 mb-10">
          <Link href="/" className="hover:text-gold-600 transition-colors">Home</Link>
          <span>/</span>
          <span className="text-charcoal-900 dark:text-white font-medium">Return Policy</span>
        </nav>

        {/* Quick Summary Banner */}
        <div className="bg-gold-50 dark:bg-gold-900/20 border border-gold-200 dark:border-gold-700/40 rounded-2xl p-6 mb-12 grid sm:grid-cols-3 gap-6 text-center">
          <div>
            <div className="text-3xl font-bold text-gold-600 mb-1">30</div>
            <div className="text-sm font-semibold text-charcoal-700 dark:text-cool-gray-300">Day Return Window</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-gold-600 mb-1">Free</div>
            <div className="text-sm font-semibold text-charcoal-700 dark:text-cool-gray-300">Return Shipping (US)</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-gold-600 mb-1">5–10</div>
            <div className="text-sm font-semibold text-charcoal-700 dark:text-cool-gray-300">Days for Refund</div>
          </div>
        </div>

        {/* Policy Sections */}
        <div className="space-y-8">
          {sections.map((section, i) => (
            <div key={i} className="bg-white dark:bg-charcoal-800 rounded-2xl p-6 shadow-sm border border-cool-gray-100 dark:border-charcoal-700">
              <div className="flex items-start gap-4">
                <span className="text-3xl shrink-0 mt-0.5">{section.icon}</span>
                <div>
                  <h2 className="text-xl font-bold text-charcoal-900 dark:text-white mb-3">{section.title}</h2>
                  <p className="text-charcoal-600 dark:text-cool-gray-400 leading-relaxed whitespace-pre-line">{section.content}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Contact CTA */}
        <div className="mt-12 bg-gradient-to-r from-gold-600 to-gold-700 rounded-2xl p-8 text-white text-center">
          <h2 className="text-2xl font-bold mb-3">Need Help with a Return?</h2>
          <p className="text-white/80 mb-6">Our support team is available Monday–Friday, 9am–6pm EST.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/contact"
              className="px-6 py-3 bg-white text-gold-700 rounded-xl font-semibold hover:bg-gray-100 transition-colors"
            >
              Contact Support
            </Link>
            <Link
              href="/orders"
              className="px-6 py-3 border-2 border-white text-white rounded-xl font-semibold hover:bg-white/10 transition-colors"
            >
              My Orders
            </Link>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
