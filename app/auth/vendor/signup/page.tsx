'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function VendorSignupPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    // Business Info
    businessName: '',
    businessType: 'individual',
    taxId: '',
    website: '',
    // Owner Info
    ownerName: '',
    email: '',
    phone: '',
    // Address
    address: '',
    city: '',
    state: '',
    zipCode: '',
    country: 'United States',
    // Account
    password: '',
    confirmPassword: '',
    // Documents
    businessLicense: null as File | null,
    taxCertificate: null as File | null
  });
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleNext = () => {
    if (step === 1 && (!formData.businessName || !formData.taxId)) {
      setError('Please fill in all required fields');
      return;
    }
    if (step === 2 && (!formData.ownerName || !formData.email || !formData.phone)) {
      setError('Please fill in all required fields');
      return;
    }
    if (step === 3 && (!formData.address || !formData.city || !formData.state || !formData.zipCode)) {
      setError('Please fill in all required fields');
      return;
    }
    setError('');
    setStep(step + 1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (!acceptTerms) {
      setError('Please accept the terms and conditions');
      return;
    }

    setIsLoading(true);

    try {
      // Split ownerName into firstName + lastName
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
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        const msg = data.errors
          ? Object.values(data.errors)[0] as string
          : data.message || 'Signup failed. Please try again.';
        setError(msg);
        setIsLoading(false);
        return;
      }

      // Redirect to "check your inbox" page
      const emailWarning = data.data?.emailWarning;
      router.push(
        `/auth/verify-email/pending?email=${encodeURIComponent(formData.email)}&role=vendor${
          emailWarning ? `&emailWarning=1` : ''
        }`
      );
    } catch {
      setError('Network error. Please check your connection and try again.');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-charcoal-900 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <div className="inline-block p-4 bg-purple-600 rounded-2xl mb-4">
            <span className="text-4xl">🏪</span>
          </div>
          <h1 className="text-3xl font-bold text-charcoal-900 dark:text-white mb-2">Become a Vendor</h1>
          <p className="text-charcoal-600 dark:text-cool-gray-400">Join our marketplace and reach millions of customers</p>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-center space-x-4">
            {[1, 2, 3, 4].map((s) => (
              <div key={s} className="flex items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                  step >= s ? 'bg-purple-600 text-white' : 'bg-cool-gray-200 dark:bg-charcoal-700 text-charcoal-600 dark:text-cool-gray-400'
                }`}>
                  {s}
                </div>
                {s < 4 && <div className={`w-12 h-1 ${step > s ? 'bg-purple-600' : 'bg-cool-gray-200 dark:bg-charcoal-700'}`}></div>}
              </div>
            ))}
          </div>
          <div className="flex justify-center mt-2 text-xs text-charcoal-600 dark:text-cool-gray-400">
            <span className="w-24 text-center">Business</span>
            <span className="w-24 text-center">Owner</span>
            <span className="w-24 text-center">Address</span>
            <span className="w-24 text-center">Account</span>
          </div>
        </div>

        <div className="bg-white dark:bg-charcoal-800 border border-cool-gray-300 dark:border-charcoal-700 rounded-2xl shadow-xl p-8">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
              <p className="text-sm text-red-800 dark:text-red-400">⚠️ {error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Step 1: Business Information */}
            {step === 1 && (
              <div className="space-y-4">
                <h2 className="text-xl font-bold text-charcoal-900 dark:text-white mb-4">Business Information</h2>
                
                <div>
                  <label className="block text-sm font-semibold text-charcoal-900 dark:text-white mb-2">
                    Business Name *
                  </label>
                  <input
                    type="text"
                    value={formData.businessName}
                    onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                    placeholder="Your Fashion Store"
                    className="w-full px-4 py-3 bg-white dark:bg-charcoal-700 border border-cool-gray-300 dark:border-charcoal-600 text-charcoal-900 dark:text-white rounded-lg focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-charcoal-900 dark:text-white mb-2">
                    Business Type *
                  </label>
                  <select
                    value={formData.businessType}
                    onChange={(e) => setFormData({ ...formData, businessType: e.target.value })}
                    className="w-full px-4 py-3 bg-white dark:bg-charcoal-700 border border-cool-gray-300 dark:border-charcoal-600 text-charcoal-900 dark:text-white rounded-lg focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="individual">Individual/Sole Proprietor</option>
                    <option value="llc">LLC</option>
                    <option value="corporation">Corporation</option>
                    <option value="partnership">Partnership</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-charcoal-900 dark:text-white mb-2">
                    Tax ID / EIN *
                  </label>
                  <input
                    type="text"
                    value={formData.taxId}
                    onChange={(e) => setFormData({ ...formData, taxId: e.target.value })}
                    placeholder="12-3456789"
                    className="w-full px-4 py-3 bg-white dark:bg-charcoal-700 border border-cool-gray-300 dark:border-charcoal-600 text-charcoal-900 dark:text-white rounded-lg focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-charcoal-900 dark:text-white mb-2">
                    Website (Optional)
                  </label>
                  <input
                    type="url"
                    value={formData.website}
                    onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                    placeholder="https://yourstore.com"
                    className="w-full px-4 py-3 bg-white dark:bg-charcoal-700 border border-cool-gray-300 dark:border-charcoal-600 text-charcoal-900 dark:text-white rounded-lg focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>
            )}

            {/* Step 2: Owner Information */}
            {step === 2 && (
              <div className="space-y-4">
                <h2 className="text-xl font-bold text-charcoal-900 dark:text-white mb-4">Owner Information</h2>
                
                <div>
                  <label className="block text-sm font-semibold text-charcoal-900 dark:text-white mb-2">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    value={formData.ownerName}
                    onChange={(e) => setFormData({ ...formData, ownerName: e.target.value })}
                    placeholder="John Doe"
                    className="w-full px-4 py-3 bg-white dark:bg-charcoal-700 border border-cool-gray-300 dark:border-charcoal-600 text-charcoal-900 dark:text-white rounded-lg focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-charcoal-900 dark:text-white mb-2">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="owner@business.com"
                    className="w-full px-4 py-3 bg-white dark:bg-charcoal-700 border border-cool-gray-300 dark:border-charcoal-600 text-charcoal-900 dark:text-white rounded-lg focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-charcoal-900 dark:text-white mb-2">
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+1 (555) 123-4567"
                    className="w-full px-4 py-3 bg-white dark:bg-charcoal-700 border border-cool-gray-300 dark:border-charcoal-600 text-charcoal-900 dark:text-white rounded-lg focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>
            )}

            {/* Step 3: Business Address */}
            {step === 3 && (
              <div className="space-y-4">
                <h2 className="text-xl font-bold text-charcoal-900 dark:text-white mb-4">Business Address</h2>
                
                <div>
                  <label className="block text-sm font-semibold text-charcoal-900 dark:text-white mb-2">
                    Street Address *
                  </label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="123 Business St"
                    className="w-full px-4 py-3 bg-white dark:bg-charcoal-700 border border-cool-gray-300 dark:border-charcoal-600 text-charcoal-900 dark:text-white rounded-lg focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-charcoal-900 dark:text-white mb-2">
                      City *
                    </label>
                    <input
                      type="text"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      placeholder="New York"
                      className="w-full px-4 py-3 bg-white dark:bg-charcoal-700 border border-cool-gray-300 dark:border-charcoal-600 text-charcoal-900 dark:text-white rounded-lg focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-charcoal-900 dark:text-white mb-2">
                      State *
                    </label>
                    <input
                      type="text"
                      value={formData.state}
                      onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                      placeholder="NY"
                      className="w-full px-4 py-3 bg-white dark:bg-charcoal-700 border border-cool-gray-300 dark:border-charcoal-600 text-charcoal-900 dark:text-white rounded-lg focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-charcoal-900 dark:text-white mb-2">
                      ZIP Code *
                    </label>
                    <input
                      type="text"
                      value={formData.zipCode}
                      onChange={(e) => setFormData({ ...formData, zipCode: e.target.value })}
                      placeholder="10001"
                      className="w-full px-4 py-3 bg-white dark:bg-charcoal-700 border border-cool-gray-300 dark:border-charcoal-600 text-charcoal-900 dark:text-white rounded-lg focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-charcoal-900 dark:text-white mb-2">
                      Country *
                    </label>
                    <select
                      value={formData.country}
                      onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                      className="w-full px-4 py-3 bg-white dark:bg-charcoal-700 border border-cool-gray-300 dark:border-charcoal-600 text-charcoal-900 dark:text-white rounded-lg focus:ring-2 focus:ring-purple-500"
                    >
                      <option>United States</option>
                      <option>Canada</option>
                      <option>United Kingdom</option>
                      <option>Other</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Step 4: Account & Documents */}
            {step === 4 && (
              <div className="space-y-4">
                <h2 className="text-xl font-bold text-charcoal-900 dark:text-white mb-4">Account Setup</h2>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-charcoal-900 dark:text-white mb-2">
                      Password *
                    </label>
                    <input
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      placeholder="Min. 8 characters"
                      minLength={8}
                      className="w-full px-4 py-3 bg-white dark:bg-charcoal-700 border border-cool-gray-300 dark:border-charcoal-600 text-charcoal-900 dark:text-white rounded-lg focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-charcoal-900 dark:text-white mb-2">
                      Confirm Password *
                    </label>
                    <input
                      type="password"
                      value={formData.confirmPassword}
                      onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                      placeholder="Repeat password"
                      className="w-full px-4 py-3 bg-white dark:bg-charcoal-700 border border-cool-gray-300 dark:border-charcoal-600 text-charcoal-900 dark:text-white rounded-lg focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                </div>

                <div className="border-t border-cool-gray-300 dark:border-charcoal-700 pt-4 mt-6">
                  <h3 className="text-lg font-bold text-charcoal-900 dark:text-white mb-4">Required Documents</h3>
                  
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-semibold text-charcoal-900 dark:text-white mb-2">
                        Business License
                      </label>
                      <input
                        type="file"
                        accept=".pdf,.jpg,.png"
                        onChange={(e) => setFormData({ ...formData, businessLicense: e.target.files?.[0] || null })}
                        className="w-full px-4 py-3 bg-white dark:bg-charcoal-700 border border-cool-gray-300 dark:border-charcoal-600 text-charcoal-900 dark:text-white rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-charcoal-900 dark:text-white mb-2">
                        Tax Certificate
                      </label>
                      <input
                        type="file"
                        accept=".pdf,.jpg,.png"
                        onChange={(e) => setFormData({ ...formData, taxCertificate: e.target.files?.[0] || null })}
                        className="w-full px-4 py-3 bg-white dark:bg-charcoal-700 border border-cool-gray-300 dark:border-charcoal-600 text-charcoal-900 dark:text-white rounded-lg"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-2 pt-4">
                  <input
                    type="checkbox"
                    checked={acceptTerms}
                    onChange={(e) => setAcceptTerms(e.target.checked)}
                    className="w-4 h-4 mt-1 text-purple-600 rounded"
                  />
                  <label className="text-sm text-charcoal-700 dark:text-cool-gray-300">
                    I agree to the Vendor{' '}
                    <Link href="/terms" className="text-purple-600 hover:text-purple-700 font-semibold">
                      Terms of Service
                    </Link>
                    {' '}and understand that my application will be reviewed by the admin team.
                  </label>
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex gap-4 pt-6">
              {step > 1 && (
                <button
                  type="button"
                  onClick={() => setStep(step - 1)}
                  className="flex-1 py-3 bg-cool-gray-200 dark:bg-charcoal-700 text-charcoal-900 dark:text-white font-bold rounded-lg hover:bg-cool-gray-300 dark:hover:bg-charcoal-600 transition-colors"
                >
                  ← Back
                </button>
              )}
              
              {step < 4 ? (
                <button
                  type="button"
                  onClick={handleNext}
                  className="flex-1 py-3 bg-purple-600 text-white font-bold rounded-lg hover:bg-purple-700 transition-colors"
                >
                  Continue →
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 py-3 bg-purple-600 text-white font-bold rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
                >
                  {isLoading ? '🔄 Submitting...' : 'Submit Application'}
                </button>
              )}
            </div>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-charcoal-600 dark:text-cool-gray-400">
              Already have a vendor account?{' '}
              <Link href="/auth/vendor/login" className="text-purple-600 hover:text-purple-700 font-semibold">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
