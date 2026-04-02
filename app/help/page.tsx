'use client';

import { useState } from 'react';
import Link from 'next/link';
import Header from '@/components/common/Header';
import Footer from '@/components/common/Footer';

interface FAQ {
  question: string;
  answer: string;
  category: string;
}

export default function HelpPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedFaq, setExpandedFaq] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const categories = [
    { id: 'all', name: 'All Topics', icon: '📚' },
    { id: 'orders', name: 'Orders & Shipping', icon: '📦' },
    { id: 'payments', name: 'Payments & Refunds', icon: '💳' },
    { id: 'account', name: 'Account & Settings', icon: '👤' },
    { id: 'products', name: 'Products & Quality', icon: '🛍️' },
    { id: 'social', name: 'Social Features', icon: '📱' },
    { id: 'vendors', name: 'For Vendors', icon: '🏪' },
  ];

  const faqs: FAQ[] = [
    {
      question: 'How do I track my order?',
      answer: 'You can track your order by going to your Orders page in your account dashboard. Click on the order you want to track, and you\'ll see the current status and tracking number if available. You can also click the "Track Order" button to see real-time updates.',
      category: 'orders',
    },
    {
      question: 'What payment methods do you accept?',
      answer: 'We accept all major credit cards (Visa, MasterCard, American Express, Discover), debit cards, PayPal, Apple Pay, and Google Pay. All payments are securely processed through our payment gateway.',
      category: 'payments',
    },
    {
      question: 'How long does shipping take?',
      answer: 'Standard shipping typically takes 5-7 business days. Express shipping takes 2-3 business days. International shipping times vary by location but usually take 7-14 business days. You\'ll receive tracking information once your order ships.',
      category: 'orders',
    },
    {
      question: 'What is your return policy?',
      answer: 'We offer a 30-day return policy on most items. Items must be unused, in original packaging, and with tags attached. To initiate a return, go to your order details page and click "Return Items". Refunds are processed within 5-7 business days after we receive your return.',
      category: 'orders',
    },
    {
      question: 'How do I create a vendor account?',
      answer: 'To become a vendor, click "Become a Brand Owner" in the footer or visit the signup page and select "Brand Owner/Vendor" as your account type. You\'ll need to provide business information, tax details, and complete identity verification.',
      category: 'vendors',
    },
    {
      question: 'How do I reset my password?',
      answer: 'Click on "Forgot Password" on the login page. Enter your email address, and we\'ll send you a password reset link. Follow the instructions in the email to set a new password. If you don\'t receive the email, check your spam folder.',
      category: 'account',
    },
    {
      question: 'Can I edit or cancel my order?',
      answer: 'You can cancel your order within 1 hour of placing it by going to your order details page and clicking "Cancel Order". After that, the order enters processing and cannot be cancelled. You can still return items after delivery.',
      category: 'orders',
    },
    {
      question: 'How do I add items to my wishlist?',
      answer: 'Click the heart icon on any product page or post to add it to your wishlist. You can view all your saved items on your Wishlist page. You can also move items from your wishlist to your cart when you\'re ready to purchase.',
      category: 'account',
    },
    {
      question: 'What are Stories and how do I post them?',
      answer: 'Stories are temporary posts that disappear after 24 hours. To post a Story, click the "+" icon in the Stories section on the homepage or your profile. You can add photos, text, stickers, and tags. Stories are a great way to share quick fashion updates!',
      category: 'social',
    },
    {
      question: 'How do I verify my account?',
      answer: 'Account verification is available for influencers, brands, and public figures. To request verification, go to Settings > Account and click "Request Verification". You\'ll need to provide proof of identity and demonstrate notable presence in the fashion community.',
      category: 'account',
    },
    {
      question: 'Are the products authentic?',
      answer: 'Yes! All vendors on our platform are verified and must meet our authenticity standards. We have a strict quality control process and work only with authorized retailers and brands. If you receive a counterfeit item, please report it immediately for a full refund.',
      category: 'products',
    },
    {
      question: 'How do vendor commissions work?',
      answer: 'Vendors pay a 10% commission on each sale. Payments are processed monthly and deposited directly to your bank account. You can view your earnings and commission details in your Vendor Dashboard under "Earnings".',
      category: 'vendors',
    },
  ];

  const filteredFaqs = faqs.filter((faq) => {
    const matchesCategory = selectedCategory === 'all' || faq.category === selectedCategory;
    const matchesSearch = searchQuery === '' || 
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-white dark:bg-charcoal-900">
      <Header />

      <div className="container mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-charcoal-900 mb-4">How can we help you?</h1>
          <p className="text-lg text-charcoal-600 mb-8">
            Search our knowledge base or browse topics below
          </p>

          {/* Search Bar */}
          <div className="max-w-2xl mx-auto">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search for help articles..."
                className="w-full px-6 py-4 pl-14 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-600 focus:border-transparent text-charcoal-900 shadow-md"
              />
              <span className="absolute left-5 top-1/2 -translate-y-1/2 text-2xl">🔍</span>
            </div>
          </div>
        </div>

        {/* Quick Links */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
          <Link
            href="/contact"
            className="bg-white rounded-lg shadow-md p-6 text-center hover:shadow-lg transition-shadow border-t-4 border-gold-600"
          >
            <div className="text-4xl mb-3">📧</div>
            <h3 className="font-bold text-charcoal-900 mb-2">Contact Support</h3>
            <p className="text-sm text-charcoal-600">Get help from our team</p>
          </Link>
          <Link
            href="/orders"
            className="bg-white rounded-lg shadow-md p-6 text-center hover:shadow-lg transition-shadow border-t-4 border-blue-600"
          >
            <div className="text-4xl mb-3">📦</div>
            <h3 className="font-bold text-charcoal-900 mb-2">Track Order</h3>
            <p className="text-sm text-charcoal-600">Check your order status</p>
          </Link>
          <Link
            href="/orders"
            className="bg-white rounded-lg shadow-md p-6 text-center hover:shadow-lg transition-shadow border-t-4 border-green-600"
          >
            <div className="text-4xl mb-3">↩️</div>
            <h3 className="font-bold text-charcoal-900 mb-2">Returns</h3>
            <p className="text-sm text-charcoal-600">Start a return or exchange</p>
          </Link>
          <Link
            href="/settings"
            className="bg-white rounded-lg shadow-md p-6 text-center hover:shadow-lg transition-shadow border-t-4 border-purple-600"
          >
            <div className="text-4xl mb-3">⚙️</div>
            <h3 className="font-bold text-charcoal-900 mb-2">Account Settings</h3>
            <p className="text-sm text-charcoal-600">Manage your account</p>
          </Link>
        </div>

        {/* Categories */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-charcoal-900 mb-4">Browse by Topic</h2>
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                  selectedCategory === category.id
                    ? 'bg-gold-600 text-white'
                    : 'bg-white text-charcoal-700 hover:bg-gray-100 shadow-sm'
                }`}
              >
                {category.icon} {category.name}
              </button>
            ))}
          </div>
        </div>

        {/* FAQs */}
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-charcoal-900 mb-6">
            Frequently Asked Questions
          </h2>

          {filteredFaqs.length === 0 ? (
            <div className="bg-white rounded-lg shadow-md p-12 text-center">
              <div className="text-6xl mb-4">🔍</div>
              <h3 className="text-xl font-bold text-charcoal-900 mb-2">No results found</h3>
              <p className="text-charcoal-600">Try different keywords or browse all topics</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredFaqs.map((faq, index) => (
                <div key={index} className="bg-white rounded-lg shadow-md overflow-hidden">
                  <button
                    onClick={() => setExpandedFaq(expandedFaq === `${index}` ? null : `${index}`)}
                    className="w-full px-6 py-4 text-left flex items-center justify-between hover:bg-gray-50 transition-colors"
                  >
                    <span className="font-semibold text-charcoal-900 pr-4">{faq.question}</span>
                    <span className="text-2xl text-gold-600 flex-shrink-0">
                      {expandedFaq === `${index}` ? '−' : '+'}
                    </span>
                  </button>
                  {expandedFaq === `${index}` && (
                    <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
                      <p className="text-charcoal-700 leading-relaxed">{faq.answer}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Still Need Help */}
        <div className="max-w-4xl mx-auto mt-12">
          <div className="bg-linear-to-r from-gold-600 to-gold-700 rounded-lg p-8 text-center text-white">
            <h2 className="text-2xl font-bold mb-3">Still need help?</h2>
            <p className="mb-6">Our support team is here to assist you</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/contact"
                className="px-8 py-3 bg-white text-gold-700 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
              >
                Contact Support
              </Link>
              <a
                href="mailto:support@fashionmarketplace.com"
                className="px-8 py-3 border-2 border-white text-white rounded-lg font-semibold hover:bg-white/10 transition-colors"
              >
                Email Us
              </a>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
