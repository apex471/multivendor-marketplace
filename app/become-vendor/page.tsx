'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Header from '@/components/common/Header';
import Footer from '@/components/common/Footer';
import { storeAuthToken, storeUser } from '@/lib/api/auth';

export default function BecomeVendorPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    businessName: '',
    ownerName: '',
    email: '',
    phone: '',
    businessType: '',
    description: '',
    address: '',
    city: '',
    state: '',
    zip: '',
    website: '',
    taxId: '',
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
      const firstName = nameParts[0] || 'Vendor';
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
          role: 'vendor',
          storeName: formData.businessName || undefined,
          businessDescription: formData.description || undefined,
          businessCity: formData.city || undefined,
          businessState: formData.state || undefined,
          website: formData.website || undefined,
          taxId: formData.taxId || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        const msg = data.errors ? (Object.values(data.errors)[0] as string) : data.message || 'Signup failed';
        setError(msg);
        setIsLoading(false);
        return;
      }
      // Store auth token and user
      if (data.data?.token) storeAuthToken(data.data.token);
      if (data.data?.user) storeUser(data.data.user);
      router.push('/dashboard/vendor');
    } catch {
      setError('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const benefits = [
    { icon: '🌍', title: 'Global Reach', description: 'Access millions of luxury shoppers worldwide' },
    { icon: '💰', title: 'Low Fees', description: 'Competitive commission rates starting at 10%' },
    { icon: '📊', title: 'Analytics', description: 'Detailed insights into your sales and customers' },
    { icon: '🚀', title: 'Marketing Support', description: 'Featured placements and promotional opportunities' },
    { icon: '🔒', title: 'Secure Payments', description: 'Fast, secure payment processing' },
    { icon: '🎯', title: 'Verified Badge', description: 'Build trust with verified seller status' },
  ];

  const requirements = [
    'Valid business registration documents',
    'Tax identification number',
    'Bank account for payments',
    'High-quality product images',
    'Commitment to authenticity',
    'Responsive customer service',
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-charcoal-900">
      <Header />

      <div className="container mx-auto px-4 py-12">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-charcoal-900 dark:text-white mb-4">
            Become a Vendor
          </h1>
          <p className="text-xl text-charcoal-600 dark:text-cool-gray-400 max-w-3xl mx-auto">
            Join our exclusive marketplace and reach millions of luxury fashion enthusiasts worldwide
          </p>
        </div>

        {/* Benefits */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-charcoal-900 dark:text-white text-center mb-8">
            Why Sell With Us?
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

        {/* Requirements */}
        <div className="bg-gold-50 dark:bg-gold-900/20 rounded-xl p-8 mb-16">
          <h2 className="text-3xl font-bold text-charcoal-900 dark:text-white mb-6">Requirements</h2>
          <div className="grid md:grid-cols-2 gap-4">
            {requirements.map((requirement, index) => (
              <div key={index} className="flex items-start gap-3">
                <span className="text-gold-600 text-xl mt-1">✓</span>
                <span className="text-charcoal-700 dark:text-cool-gray-300">{requirement}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Application Form */}
        <div className="max-w-3xl mx-auto">
          <div className="bg-white dark:bg-charcoal-800 rounded-xl shadow-lg p-8">
            <h2 className="text-2xl font-bold text-charcoal-900 dark:text-white mb-6">Application Form</h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-charcoal-700 dark:text-cool-gray-300 font-semibold mb-2">
                    Business Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.businessName}
                    onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                    className="w-full px-4 py-3 border border-cool-gray-300 dark:border-charcoal-600 bg-white dark:bg-charcoal-700 text-charcoal-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-600"
                  />
                </div>

                <div>
                  <label className="block text-charcoal-700 dark:text-cool-gray-300 font-semibold mb-2">
                    Owner Name *
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
              </div>

              <div>
                <label className="block text-charcoal-700 dark:text-cool-gray-300 font-semibold mb-2">
                  Business Type *
                </label>
                <select
                  required
                  value={formData.businessType}
                  onChange={(e) => setFormData({ ...formData, businessType: e.target.value })}
                  className="w-full px-4 py-3 border border-cool-gray-300 dark:border-charcoal-600 bg-white dark:bg-charcoal-700 text-charcoal-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-600"
                >
                  <option value="">Select type</option>
                  <option value="boutique">Boutique</option>
                  <option value="retailer">Retailer</option>
                  <option value="wholesaler">Wholesaler</option>
                  <option value="individual">Individual Seller</option>
                </select>
              </div>

              <div>
                <label className="block text-charcoal-700 dark:text-cool-gray-300 font-semibold mb-2">
                  Business Description *
                </label>
                <textarea
                  required
                  rows={4}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-3 border border-cool-gray-300 dark:border-charcoal-600 bg-white dark:bg-charcoal-700 text-charcoal-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-600"
                  placeholder="Tell us about your business..."
                />
              </div>

              <div>
                <label className="block text-charcoal-700 dark:text-cool-gray-300 font-semibold mb-2">
                  Business Address *
                </label>
                <input
                  type="text"
                  required
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-4 py-3 border border-cool-gray-300 dark:border-charcoal-600 bg-white dark:bg-charcoal-700 text-charcoal-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-600"
                />
              </div>

              <div className="grid md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-charcoal-700 dark:text-cool-gray-300 font-semibold mb-2">
                    City *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full px-4 py-3 border border-cool-gray-300 dark:border-charcoal-600 bg-white dark:bg-charcoal-700 text-charcoal-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-600"
                  />
                </div>

                <div>
                  <label className="block text-charcoal-700 dark:text-cool-gray-300 font-semibold mb-2">
                    State *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    className="w-full px-4 py-3 border border-cool-gray-300 dark:border-charcoal-600 bg-white dark:bg-charcoal-700 text-charcoal-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-600"
                  />
                </div>

                <div>
                  <label className="block text-charcoal-700 dark:text-cool-gray-300 font-semibold mb-2">
                    ZIP Code *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.zip}
                    onChange={(e) => setFormData({ ...formData, zip: e.target.value })}
                    className="w-full px-4 py-3 border border-cool-gray-300 dark:border-charcoal-600 bg-white dark:bg-charcoal-700 text-charcoal-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-600"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-charcoal-700 dark:text-cool-gray-300 font-semibold mb-2">
                    Website (Optional)
                  </label>
                  <input
                    type="url"
                    value={formData.website}
                    onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                    className="w-full px-4 py-3 border border-cool-gray-300 dark:border-charcoal-600 bg-white dark:bg-charcoal-700 text-charcoal-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-600"
                  />
                </div>

                <div>
                  <label className="block text-charcoal-700 dark:text-cool-gray-300 font-semibold mb-2">
                    Tax ID *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.taxId}
                    onChange={(e) => setFormData({ ...formData, taxId: e.target.value })}
                    className="w-full px-4 py-3 border border-cool-gray-300 dark:border-charcoal-600 bg-white dark:bg-charcoal-700 text-charcoal-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-600"
                  />
                </div>
              </div>

              <div className="flex items-start gap-3">
                <input type="checkbox" required className="mt-1" />
                <p className="text-sm text-charcoal-600 dark:text-cool-gray-400">
                  I agree to the <Link href="/terms" className="text-gold-600 hover:text-gold-700">Terms & Conditions</Link> and confirm that all information provided is accurate.
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
