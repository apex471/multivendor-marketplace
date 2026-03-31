'use client';

import { useState } from 'react';
import Link from 'next/link';
import Header from '@/components/common/Header';
import Footer from '@/components/common/Footer';

export default function BecomeBrandPage() {
  const [formData, setFormData] = useState({
    brandName: '',
    ownerName: '',
    email: '',
    phone: '',
    founded: '',
    headquarters: '',
    category: '',
    description: '',
    website: '',
    instagram: '',
    annualRevenue: '',
    productRange: '',
    certifications: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Brand application:', formData);
    alert('Application submitted! Our team will review and contact you within 3-5 business days.');
  };

  const benefits = [
    { icon: '🏆', title: 'Official Brand Store', description: 'Your own dedicated storefront' },
    { icon: '🌟', title: 'Verified Badge', description: 'Build trust with official verification' },
    { icon: '📈', title: 'Brand Analytics', description: 'Track performance and insights' },
    { icon: '🤝', title: 'Affiliate Network', description: 'Partner with authorized sellers' },
    { icon: '🎯', title: 'Premium Placement', description: 'Featured in brand showcase' },
    { icon: '💎', title: 'Direct to Consumer', description: 'Sell directly to customers' },
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-charcoal-900">
      <Header />

      <div className="container mx-auto px-4 py-12">
        {/* Hero */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-charcoal-900 dark:text-white mb-4">
            Become a Brand Owner
          </h1>
          <p className="text-xl text-charcoal-600 dark:text-cool-gray-400 max-w-3xl mx-auto">
            Establish your official brand presence and connect with luxury fashion enthusiasts
          </p>
        </div>

        {/* Benefits */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-charcoal-900 dark:text-white text-center mb-8">
            Brand Partnership Benefits
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {benefits.map((benefit, index) => (
              <div
                key={index}
                className="bg-white dark:bg-charcoal-800 rounded-xl shadow-md p-6 hover:shadow-xl transition-shadow"
              >
                <div className="text-5xl mb-4">{benefit.icon}</div>
                <h3 className="text-xl font-bold text-charcoal-900 dark:text-white mb-2">{benefit.title}</h3>
                <p className="text-charcoal-600 dark:text-cool-gray-400">{benefit.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Application Form */}
        <div className="max-w-3xl mx-auto">
          <div className="bg-white dark:bg-charcoal-800 rounded-xl shadow-lg p-8">
            <h2 className="text-2xl font-bold text-charcoal-900 dark:text-white mb-6">Brand Application</h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-charcoal-700 dark:text-cool-gray-300 font-semibold mb-2">
                    Brand Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.brandName}
                    onChange={(e) => setFormData({ ...formData, brandName: e.target.value })}
                    className="w-full px-4 py-3 border border-cool-gray-300 dark:border-charcoal-600 bg-white dark:bg-charcoal-700 text-charcoal-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-600"
                  />
                </div>

                <div>
                  <label className="block text-charcoal-700 dark:text-cool-gray-300 font-semibold mb-2">
                    Contact Person *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.ownerName}
                    onChange={(e) => setFormData({ ...formData, ownerName: e.target.value })}
                    className="w-full px-4 py-3 border border-cool-gray-300 dark:border-charcoal-600 bg-white dark:bg-charcoal-700 text-charcoal-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-600"
                  />
                </div>

                <div>
                  <label className="block text-charcoal-700 dark:text-cool-gray-300 font-semibold mb-2">
                    Email *
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-3 border border-cool-gray-300 dark:border-charcoal-600 bg-white dark:bg-charcoal-700 text-charcoal-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-600"
                  />
                </div>

                <div>
                  <label className="block text-charcoal-700 dark:text-cool-gray-300 font-semibold mb-2">
                    Phone *
                  </label>
                  <input
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-4 py-3 border border-cool-gray-300 dark:border-charcoal-600 bg-white dark:bg-charcoal-700 text-charcoal-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-600"
                  />
                </div>

                <div>
                  <label className="block text-charcoal-700 dark:text-cool-gray-300 font-semibold mb-2">
                    Year Founded *
                  </label>
                  <input
                    type="number"
                    required
                    value={formData.founded}
                    onChange={(e) => setFormData({ ...formData, founded: e.target.value })}
                    className="w-full px-4 py-3 border border-cool-gray-300 dark:border-charcoal-600 bg-white dark:bg-charcoal-700 text-charcoal-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-600"
                  />
                </div>

                <div>
                  <label className="block text-charcoal-700 dark:text-cool-gray-300 font-semibold mb-2">
                    Headquarters *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.headquarters}
                    onChange={(e) => setFormData({ ...formData, headquarters: e.target.value })}
                    className="w-full px-4 py-3 border border-cool-gray-300 dark:border-charcoal-600 bg-white dark:bg-charcoal-700 text-charcoal-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-charcoal-700 dark:text-cool-gray-300 font-semibold mb-2">
                  Category *
                </label>
                <select
                  required
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-4 py-3 border border-cool-gray-300 dark:border-charcoal-600 bg-white dark:bg-charcoal-700 text-charcoal-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-600"
                >
                  <option value="">Select category</option>
                  <option value="luxury">Luxury Fashion</option>
                  <option value="sportswear">Sportswear</option>
                  <option value="designer">Designer</option>
                  <option value="watches">Watches</option>
                  <option value="accessories">Accessories</option>
                </select>
              </div>

              <div>
                <label className="block text-charcoal-700 dark:text-cool-gray-300 font-semibold mb-2">
                  Brand Description *
                </label>
                <textarea
                  required
                  rows={4}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-3 border border-cool-gray-300 dark:border-charcoal-600 bg-white dark:bg-charcoal-700 text-charcoal-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-600"
                  placeholder="Tell us about your brand heritage, values, and products..."
                />
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-charcoal-700 dark:text-cool-gray-300 font-semibold mb-2">
                    Website *
                  </label>
                  <input
                    type="url"
                    required
                    value={formData.website}
                    onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                    className="w-full px-4 py-3 border border-cool-gray-300 dark:border-charcoal-600 bg-white dark:bg-charcoal-700 text-charcoal-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-600"
                  />
                </div>

                <div>
                  <label className="block text-charcoal-700 dark:text-cool-gray-300 font-semibold mb-2">
                    Instagram (Optional)
                  </label>
                  <input
                    type="text"
                    value={formData.instagram}
                    onChange={(e) => setFormData({ ...formData, instagram: e.target.value })}
                    className="w-full px-4 py-3 border border-cool-gray-300 dark:border-charcoal-600 bg-white dark:bg-charcoal-700 text-charcoal-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-600"
                    placeholder="@yourbrand"
                  />
                </div>
              </div>

              <div>
                <label className="block text-charcoal-700 dark:text-cool-gray-300 font-semibold mb-2">
                  Annual Revenue Range *
                </label>
                <select
                  required
                  value={formData.annualRevenue}
                  onChange={(e) => setFormData({ ...formData, annualRevenue: e.target.value })}
                  className="w-full px-4 py-3 border border-cool-gray-300 dark:border-charcoal-600 bg-white dark:bg-charcoal-700 text-charcoal-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-600"
                >
                  <option value="">Select range</option>
                  <option value="<1M">Less than $1M</option>
                  <option value="1M-5M">$1M - $5M</option>
                  <option value="5M-10M">$5M - $10M</option>
                  <option value="10M+">$10M+</option>
                </select>
              </div>

              <div className="flex items-start gap-3">
                <input type="checkbox" required className="mt-1" />
                <p className="text-sm text-charcoal-600 dark:text-cool-gray-400">
                  I confirm that I have the authority to represent this brand and agree to the{' '}
                  <Link href="/terms" className="text-gold-600 hover:text-gold-700">
                    Terms & Conditions
                  </Link>
                  .
                </p>
              </div>

              <button
                type="submit"
                className="w-full px-6 py-4 bg-gold-600 text-white rounded-lg font-bold text-lg hover:bg-gold-700 transition-colors"
              >
                Submit Application
              </button>
            </form>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
