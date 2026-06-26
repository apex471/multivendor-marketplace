'use client';

import Link from 'next/link';
import Header from '@/components/common/Header';
import Footer from '@/components/common/Footer';

export default function ShippingPage() {
  const methods = [
    {
      icon: '🚀',
      name: 'Express Shipping',
      time: '1–2 Business Days',
      price: 'From $14.99',
      description: 'Need it fast? Express delivery gets your order to you the next business day when placed before 12pm EST.',
      badge: 'Fastest',
      badgeColor: 'bg-blue-500',
    },
    {
      icon: '📦',
      name: 'Standard Shipping',
      time: '3–5 Business Days',
      price: 'From $4.99 / Free over $150',
      description: 'Our most popular option. Reliable delivery with full tracking from dispatch to your door.',
      badge: 'Most Popular',
      badgeColor: 'bg-gold-500',
    },
    {
      icon: '🌍',
      name: 'International Shipping',
      time: '7–14 Business Days',
      price: 'From $19.99',
      description: 'We ship to over 50 countries worldwide. Duties and taxes may apply depending on your location.',
      badge: 'Global',
      badgeColor: 'bg-purple-500',
    },
  ];

  const faqs = [
    {
      q: 'When will my order ship?',
      a: 'Orders placed before 2pm EST on business days typically ship the same day. Orders placed after 2pm or on weekends ship the next business day. Custom and made-to-order items may require additional processing time.',
    },
    {
      q: 'How do I track my order?',
      a: 'Once your order ships, you\'ll receive a shipping confirmation email with a tracking number. You can also track your order in real-time from your account under "Orders".',
    },
    {
      q: 'Do you ship to P.O. Boxes?',
      a: 'Standard shipping is available to P.O. Boxes. However, Express shipping requires a physical street address for delivery.',
    },
    {
      q: 'What if my package is lost or damaged?',
      a: 'All orders are insured during transit. If your order arrives damaged or is lost in transit, please contact us within 7 days of the estimated delivery date. We will file a claim and send a replacement or full refund.',
    },
    {
      q: 'Can I change my shipping address after placing an order?',
      a: 'You can update your shipping address within 1 hour of placing your order by contacting our support team. After that, the order may have already been processed for shipping.',
    },
    {
      q: 'Are there additional duties and taxes for international orders?',
      a: 'International orders may be subject to import duties, taxes, and customs fees imposed by your country. These charges are the responsibility of the recipient and are not included in the order total.',
    },
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-charcoal-900">
      <Header />

      {/* Hero */}
      <div className="bg-gradient-to-br from-charcoal-900 to-charcoal-800 text-white py-16 px-4 text-center">
        <h1 className="text-4xl md:text-5xl font-bold mb-4">Shipping Information</h1>
        <p className="text-white/70 text-lg max-w-2xl mx-auto">Fast, reliable delivery to your door — wherever you are in the world.</p>
      </div>

      <div className="container mx-auto px-4 py-12 max-w-5xl">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-cool-gray-500 mb-10">
          <Link href="/" className="hover:text-gold-600 transition-colors">Home</Link>
          <span>/</span>
          <span className="text-charcoal-900 dark:text-white font-medium">Shipping</span>
        </nav>

        {/* Free Shipping Banner */}
        <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700/40 rounded-2xl px-6 py-4 flex items-center gap-4 mb-12">
          <span className="text-3xl">🎁</span>
          <div>
            <p className="font-bold text-emerald-800 dark:text-emerald-300">Free Standard Shipping on orders over $150</p>
            <p className="text-sm text-emerald-700 dark:text-emerald-400">Applied automatically at checkout — no coupon needed.</p>
          </div>
        </div>

        {/* Shipping Methods */}
        <h2 className="text-2xl font-bold text-charcoal-900 dark:text-white mb-6">Shipping Options</h2>
        <div className="grid md:grid-cols-3 gap-6 mb-16">
          {methods.map((method, i) => (
            <div key={i} className="bg-white dark:bg-charcoal-800 rounded-2xl p-6 shadow-sm border border-cool-gray-100 dark:border-charcoal-700 relative">
              <span className={`absolute top-4 right-4 text-xs px-2 py-0.5 ${method.badgeColor} text-white font-bold rounded-full`}>
                {method.badge}
              </span>
              <div className="text-4xl mb-4">{method.icon}</div>
              <h3 className="text-lg font-bold text-charcoal-900 dark:text-white mb-1">{method.name}</h3>
              <p className="text-gold-600 font-semibold text-sm mb-1">{method.time}</p>
              <p className="text-sm text-charcoal-500 dark:text-cool-gray-400 mb-4">{method.price}</p>
              <p className="text-sm text-charcoal-600 dark:text-cool-gray-400 leading-relaxed">{method.description}</p>
            </div>
          ))}
        </div>

        {/* Delivery Regions */}
        <h2 className="text-2xl font-bold text-charcoal-900 dark:text-white mb-6">Delivery Regions</h2>
        <div className="grid sm:grid-cols-2 gap-6 mb-16">
          {[
            { region: '🇺🇸 United States', standard: '3–5 days', express: '1–2 days', free: 'Over $150' },
            { region: '🇨🇦 Canada', standard: '5–7 days', express: '2–3 days', free: 'Over $200' },
            { region: '🇬🇧 United Kingdom', standard: '5–8 days', express: '2–4 days', free: 'Over $250' },
            { region: '🌍 Rest of World', standard: '10–14 days', express: '4–7 days', free: 'Over $300' },
          ].map((row, i) => (
            <div key={i} className="bg-white dark:bg-charcoal-800 rounded-xl p-5 shadow-sm border border-cool-gray-100 dark:border-charcoal-700">
              <h3 className="font-bold text-charcoal-900 dark:text-white mb-3">{row.region}</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-charcoal-500 dark:text-cool-gray-400">Standard</span><span className="font-medium text-charcoal-800 dark:text-white">{row.standard}</span></div>
                <div className="flex justify-between"><span className="text-charcoal-500 dark:text-cool-gray-400">Express</span><span className="font-medium text-charcoal-800 dark:text-white">{row.express}</span></div>
                <div className="flex justify-between"><span className="text-charcoal-500 dark:text-cool-gray-400">Free Shipping</span><span className="font-medium text-emerald-600">{row.free}</span></div>
              </div>
            </div>
          ))}
        </div>

        {/* FAQ */}
        <h2 className="text-2xl font-bold text-charcoal-900 dark:text-white mb-6">Frequently Asked Questions</h2>
        <div className="space-y-4 mb-12">
          {faqs.map((faq, i) => (
            <div key={i} className="bg-white dark:bg-charcoal-800 rounded-xl p-6 shadow-sm border border-cool-gray-100 dark:border-charcoal-700">
              <h3 className="font-semibold text-charcoal-900 dark:text-white mb-2">Q: {faq.q}</h3>
              <p className="text-charcoal-600 dark:text-cool-gray-400 leading-relaxed text-sm">{faq.a}</p>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="text-center bg-charcoal-900 dark:bg-charcoal-800 rounded-2xl p-8 text-white">
          <h2 className="text-xl font-bold mb-2">Questions about your delivery?</h2>
          <p className="text-white/70 mb-6">Our support team is happy to help track your package or resolve any shipping issues.</p>
          <Link href="/contact" className="px-6 py-3 bg-gold-600 text-white rounded-xl font-semibold hover:bg-gold-700 transition-colors">
            Contact Support
          </Link>
        </div>
      </div>

      <Footer />
    </div>
  );
}
