'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';

type WaitlistRole = 'vendor' | 'brand' | 'both';

export default function WaitlistPage() {
  const [role, setRole] = useState<WaitlistRole>('vendor');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  
  // General Info
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');

  // Vendor Details
  const [storeName, setStoreName] = useState('');
  const [businessCategory, setBusinessCategory] = useState('');
  const [website, setWebsite] = useState('');
  const [instagram, setInstagram] = useState('');
  const [experienceYears, setExperienceYears] = useState('');
  const [inventorySize, setInventorySize] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('');

  // Brand Owner Details
  const [brandName, setBrandName] = useState('');
  const [trademarkNumber, setTrademarkNumber] = useState('');
  const [brandDescription, setBrandDescription] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [yearEstablished, setYearEstablished] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes('@')) {
      setError('Please provide a valid email address.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const payload = {
        name,
        email,
        role,
        storeName,
        businessCategory,
        website,
        instagram,
        experienceYears,
        inventorySize,
        city,
        country,
        brandName,
        trademarkNumber,
        brandDescription,
        targetAudience,
        yearEstablished,
      };

      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to join waitlist.');
      }

      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-charcoal-950 text-white font-sans selection:bg-gold-500/30 flex flex-col justify-between">
      {/* Navbar / Logo */}
      <header className="border-b border-charcoal-800 bg-charcoal-950/80 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center">
            <Image
              src="/images/brand/clw-logo.png"
              alt="Certified Luxury World"
              width={200}
              height={140}
              className="h-12 w-auto object-contain"
              priority
            />
          </Link>
          <Link
            href="/"
            className="text-xs font-semibold uppercase tracking-wider text-gold-500 hover:text-gold-400 transition"
          >
            Back to Marketplace
          </Link>
        </div>
      </header>

      {/* Main Waitlist Content */}
      <main className="flex-grow py-12 px-6 lg:py-24 max-w-7xl mx-auto w-full grid lg:grid-cols-12 gap-12 items-center">
        {/* Left Column: Branding / Info */}
        <div className="lg:col-span-5 space-y-6 lg:space-y-8">
          <div className="inline-flex items-center gap-2 bg-gold-950/30 border border-gold-800/40 text-gold-400 px-4 py-1.5 rounded-full text-xs font-medium uppercase tracking-wider">
            ✨ Pre-Launch VIP Waitlist
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold leading-tight">
            Elevate Your <span className="text-gold-500 bg-linear-to-r from-gold-400 via-gold-500 to-gold-600 bg-clip-text text-transparent">Luxury Business</span>
          </h1>
          <p className="text-cool-gray-400 text-base md:text-lg leading-relaxed">
            Certified Luxury World is the premier destination for verified boutique vendors and designer brand owners. Secure your placement before our global launch and connect with high-net-worth buyers worldwide.
          </p>

          {/* Perks list */}
          <div className="space-y-4 pt-4 border-t border-charcoal-800">
            <div className="flex items-start gap-3">
              <span className="text-gold-500 text-xl">✓</span>
              <div>
                <h4 className="font-semibold text-white">Priority Verification</h4>
                <p className="text-xs text-cool-gray-400">Get verified first and list products on Day One.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-gold-500 text-xl">✓</span>
              <div>
                <h4 className="font-semibold text-white">Reduced Platform Commission</h4>
                <p className="text-xs text-cool-gray-400">Enjoy lifetime launch-partner discount rates.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-gold-500 text-xl">✓</span>
              <div>
                <h4 className="font-semibold text-white">Dedicated Brand Placement</h4>
                <p className="text-xs text-cool-gray-400">Premium homepage layout visibility for waitlisted partners.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Interactive Waitlist Form Card */}
        <div className="lg:col-span-7 bg-charcoal-900/60 border border-charcoal-800 rounded-3xl p-6 md:p-10 shadow-2xl relative backdrop-blur-md">
          {success ? (
            <div className="text-center py-12 space-y-6">
              <div className="w-20 h-20 bg-gold-950/40 border-2 border-gold-500 rounded-full flex items-center justify-center mx-auto text-3xl">
                🏆
              </div>
              <h2 className="text-2xl sm:text-3xl font-display font-bold text-white">You're on the list!</h2>
              <p className="text-cool-gray-400 max-w-md mx-auto text-sm sm:text-base leading-relaxed">
                Thank you for applying. Our luxury onboarding team will review your application details. We will reach out via <strong className="text-gold-400">{email}</strong> once verification opens or when the platform goes live.
              </p>
              <button
                onClick={() => {
                  setSuccess(false);
                  setName('');
                  setEmail('');
                  setStoreName('');
                  setBrandName('');
                }}
                className="px-6 py-3 bg-gold-600 hover:bg-gold-500 text-charcoal-950 font-bold rounded-xl transition text-sm cursor-pointer"
              >
                Submit another application
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <h2 className="text-xl sm:text-2xl font-display font-bold">Apply for Pre-Launch Access</h2>
                <p className="text-xs sm:text-sm text-cool-gray-400 mt-1">All business details are fully optional, but providing them helps us verify you instantly.</p>
              </div>

              {/* Role Selection Tabs */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-cool-gray-400 mb-2">Select Your Role</label>
                <div className="grid grid-cols-3 gap-2 bg-charcoal-950 p-1 rounded-xl border border-charcoal-800">
                  {(['vendor', 'brand', 'both'] as const).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setRole(r)}
                      className={`py-2.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition cursor-pointer ${
                        role === r
                          ? 'bg-gold-600 text-charcoal-950 shadow-md font-bold'
                          : 'text-cool-gray-400 hover:text-white'
                      }`}
                    >
                      {r === 'both' ? 'Both' : r === 'vendor' ? 'Boutique/Vendor' : 'Brand Owner'}
                    </button>
                  ))}
                </div>
              </div>

              {/* General Contact Info */}
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="fullName" className="block text-xs font-medium text-cool-gray-400 mb-1">Full Name</label>
                  <input
                    type="text"
                    id="fullName"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your name"
                    className="w-full px-4 py-3 bg-charcoal-950 border border-charcoal-800 rounded-xl focus:border-gold-500 focus:ring-1 focus:ring-gold-500 outline-none text-sm transition"
                  />
                </div>
                <div>
                  <label htmlFor="email" className="block text-xs font-medium text-cool-gray-400 mb-1">
                    Email Address <span className="text-gold-500">*</span>
                  </label>
                  <input
                    type="email"
                    id="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@business.com"
                    className="w-full px-4 py-3 bg-charcoal-950 border border-charcoal-800 rounded-xl focus:border-gold-500 focus:ring-1 focus:ring-gold-500 outline-none text-sm transition"
                  />
                </div>
              </div>

              {/* Vendor Boutique details (if Vendor or Both) */}
              {(role === 'vendor' || role === 'both') && (
                <div className="space-y-4 pt-4 border-t border-charcoal-800/80">
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-gold-500">🏪 Boutique / Store Details (Optional)</h3>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="storeName" className="block text-xs text-cool-gray-400 mb-1">Store / Boutique Name</label>
                      <input
                        type="text"
                        id="storeName"
                        value={storeName}
                        onChange={(e) => setStoreName(e.target.value)}
                        placeholder="e.g. Milan Luxury Wear"
                        className="w-full px-4 py-3 bg-charcoal-950 border border-charcoal-800 rounded-xl focus:border-gold-500 outline-none text-sm"
                      />
                    </div>
                    <div>
                      <label htmlFor="businessCategory" className="block text-xs text-cool-gray-400 mb-1">Product Category</label>
                      <input
                        type="text"
                        id="businessCategory"
                        value={businessCategory}
                        onChange={(e) => setBusinessCategory(e.target.value)}
                        placeholder="e.g. Leather Goods, Watches"
                        className="w-full px-4 py-3 bg-charcoal-950 border border-charcoal-800 rounded-xl focus:border-gold-500 outline-none text-sm"
                      />
                    </div>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="website" className="block text-xs text-cool-gray-400 mb-1">Website URL</label>
                      <input
                        type="text"
                        id="website"
                        value={website}
                        onChange={(e) => setWebsite(e.target.value)}
                        placeholder="https://yourstore.com"
                        className="w-full px-4 py-3 bg-charcoal-950 border border-charcoal-800 rounded-xl focus:border-gold-500 outline-none text-sm"
                      />
                    </div>
                    <div>
                      <label htmlFor="instagram" className="block text-xs text-cool-gray-400 mb-1">Instagram Handle</label>
                      <input
                        type="text"
                        id="instagram"
                        value={instagram}
                        onChange={(e) => setInstagram(e.target.value)}
                        placeholder="@yourhandle"
                        className="w-full px-4 py-3 bg-charcoal-950 border border-charcoal-800 rounded-xl focus:border-gold-500 outline-none text-sm"
                      />
                    </div>
                  </div>
                  <div className="grid sm:grid-cols-4 gap-4">
                    <div className="sm:col-span-2">
                      <label htmlFor="inventorySize" className="block text-xs text-cool-gray-400 mb-1">Est. Inventory Size</label>
                      <input
                        type="text"
                        id="inventorySize"
                        value={inventorySize}
                        onChange={(e) => setInventorySize(e.target.value)}
                        placeholder="e.g. 50-100 items"
                        className="w-full px-4 py-3 bg-charcoal-950 border border-charcoal-800 rounded-xl focus:border-gold-500 outline-none text-sm"
                      />
                    </div>
                    <div>
                      <label htmlFor="city" className="block text-xs text-cool-gray-400 mb-1">City</label>
                      <input
                        type="text"
                        id="city"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        placeholder="Paris"
                        className="w-full px-4 py-3 bg-charcoal-950 border border-charcoal-800 rounded-xl focus:border-gold-500 outline-none text-sm"
                      />
                    </div>
                    <div>
                      <label htmlFor="country" className="block text-xs text-cool-gray-400 mb-1">Country</label>
                      <input
                        type="text"
                        id="country"
                        value={country}
                        onChange={(e) => setCountry(e.target.value)}
                        placeholder="France"
                        className="w-full px-4 py-3 bg-charcoal-950 border border-charcoal-800 rounded-xl focus:border-gold-500 outline-none text-sm"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Brand Owner details (if Brand or Both) */}
              {(role === 'brand' || role === 'both') && (
                <div className="space-y-4 pt-4 border-t border-charcoal-800/80">
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-gold-500">👑 Brand Owner details (Optional)</h3>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="brandName" className="block text-xs text-cool-gray-400 mb-1">Official Brand Name</label>
                      <input
                        type="text"
                        id="brandName"
                        value={brandName}
                        onChange={(e) => setBrandName(e.target.value)}
                        placeholder="e.g. Atelier Luxury"
                        className="w-full px-4 py-3 bg-charcoal-950 border border-charcoal-800 rounded-xl focus:border-gold-500 outline-none text-sm"
                      />
                    </div>
                    <div>
                      <label htmlFor="trademarkNumber" className="block text-xs text-cool-gray-400 mb-1">Trademark Number (if registered)</label>
                      <input
                        type="text"
                        id="trademarkNumber"
                        value={trademarkNumber}
                        onChange={(e) => setTrademarkNumber(e.target.value)}
                        placeholder="e.g. TM-198822"
                        className="w-full px-4 py-3 bg-charcoal-950 border border-charcoal-800 rounded-xl focus:border-gold-500 outline-none text-sm"
                      />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="brandDescription" className="block text-xs text-cool-gray-400 mb-1">Brand Legacy / Description</label>
                    <textarea
                      id="brandDescription"
                      rows={3}
                      value={brandDescription}
                      onChange={(e) => setBrandDescription(e.target.value)}
                      placeholder="Briefly describe your brand identity or legacy..."
                      className="w-full px-4 py-3 bg-charcoal-950 border border-charcoal-800 rounded-xl focus:border-gold-500 outline-none text-sm resize-none"
                    />
                  </div>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="targetAudience" className="block text-xs text-cool-gray-400 mb-1">Target Audience / Demographic</label>
                      <input
                        type="text"
                        id="targetAudience"
                        value={targetAudience}
                        onChange={(e) => setTargetAudience(e.target.value)}
                        placeholder="e.g. Haute Couture / Men's Jewelry"
                        className="w-full px-4 py-3 bg-charcoal-950 border border-charcoal-800 rounded-xl focus:border-gold-500 outline-none text-sm"
                      />
                    </div>
                    <div>
                      <label htmlFor="yearEstablished" className="block text-xs text-cool-gray-400 mb-1">Year Established</label>
                      <input
                        type="text"
                        id="yearEstablished"
                        value={yearEstablished}
                        onChange={(e) => setYearEstablished(e.target.value)}
                        placeholder="e.g. 2021"
                        className="w-full px-4 py-3 bg-charcoal-950 border border-charcoal-800 rounded-xl focus:border-gold-500 outline-none text-sm"
                      />
                    </div>
                  </div>
                </div>
              )}

              {error && <div className="p-4 bg-red-950/40 border border-red-800/60 rounded-xl text-red-300 text-xs">{error}</div>}

              {/* Submit button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-4 bg-gold-600 hover:bg-gold-500 disabled:bg-charcoal-800 text-charcoal-950 font-bold uppercase tracking-wider rounded-xl transition shadow-xl hover:shadow-gold-500/10 cursor-pointer flex items-center justify-center gap-2 text-sm"
              >
                {isSubmitting ? (
                  <>
                    <span className="w-4 h-4 border-2 border-charcoal-950 border-t-transparent rounded-full animate-spin"></span>
                    Processing Application...
                  </>
                ) : (
                  'Apply for Onboarding'
                )}
              </button>
            </form>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-charcoal-900 bg-charcoal-950 text-center py-6 text-xs text-cool-gray-500">
        <p>&copy; {new Date().getFullYear()} Certified Luxury World. All rights reserved.</p>
      </footer>
    </div>
  );
}
