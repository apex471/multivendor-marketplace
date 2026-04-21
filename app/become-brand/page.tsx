'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Header from '@/components/common/Header';
import Footer from '@/components/common/Footer';
import { storeAuthToken, storeUser } from '@/lib/api/auth';

export default function BecomeBrandPage() {
  const router = useRouter();
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
    password: '',
    confirmPassword: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    setIsLoading(true);
    try {
      const nameParts = formData.ownerName.trim().split(/\s+/);
      const firstName = nameParts[0] || 'Brand';
      const lastName = nameParts.slice(1).join(' ') || nameParts[0];
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName,
          lastName,
          email: formData.email,
          password: formData.password,
          confirmPassword: formData.confirmPassword,
          phoneNumber: formData.phone || undefined,
          role: 'brand',
          storeName: formData.brandName || undefined,
          businessDescription: formData.description || undefined,
          website: formData.website || undefined,
          socialLinks: formData.instagram ? { instagram: formData.instagram } : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        const msg = data.errors ? (Object.values(data.errors)[0] as string) : data.message || 'Signup failed';
        setError(msg);
        setIsLoading(false);
        return;
      }
      if (data.data?.token) storeAuthToken(data.data.token);
      if (data.data?.user) storeUser(data.data.user);
      router.push('/dashboard/brand');
    } catch {
      setError('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
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

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-charcoal-700 dark:text-cool-gray-300 font-semibold mb-2">Password *</label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-4 py-3 border border-cool-gray-300 dark:border-charcoal-600 bg-white dark:bg-charcoal-700 text-charcoal-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-600"
                    placeholder="Min. 6 characters"
                  />
                </div>
                <div>
                  <label className="block text-charcoal-700 dark:text-cool-gray-300 font-semibold mb-2">Confirm Password *</label>
                  <input
                    type="password"
                    required
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    className="w-full px-4 py-3 border border-cool-gray-300 dark:border-charcoal-600 bg-white dark:bg-charcoal-700 text-charcoal-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-600"
                  />
                </div>
              </div>

              {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg text-sm">{error}</div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full px-6 py-4 bg-gold-600 text-white rounded-lg font-bold text-lg hover:bg-gold-700 transition-colors disabled:bg-cool-gray-400 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Submitting...' : 'Submit Application'}
              </button>
            </form>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
