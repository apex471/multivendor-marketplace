'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  validateReferralToken,
  getDaysUntilExpiry,
  type ReferralPayload,
} from '@/lib/utils/referral';

// ─── Types ───────────────────────────────────────────────────────────────────

type TokenState = 'validating' | 'valid' | 'invalid';
type FormStep = 1 | 2 | 3 | 'success';

interface CompanyInfo {
  companyName: string;
  contactName: string;
  email: string;
  phone: string;
  addressLine1: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  licenseNumber: string;
  yearsInOperation: string;
  fleetSize: string;
}

interface ServiceDetails {
  coverageAreas: string[];
  serviceTypes: string[];
  specialCapabilities: string[];
  estimatedDelivery: string;
  baseFee: string;
  pricePerKg: string;
  insuranceCoverage: string;
  websiteUrl: string;
}

interface AccountSecurity {
  password: string;
  confirmPassword: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const COVERAGE_OPTIONS = [
  'United States (Nationwide)',
  'Canada',
  'Mexico',
  'United Kingdom',
  'Europe',
  'Asia Pacific',
  'Middle East',
  'Africa',
  'Latin America',
  'Worldwide',
];

const SERVICE_TYPES = [
  'Standard Delivery (5–7 days)',
  'Express Delivery (2–3 days)',
  'Same-Day Delivery',
  'Overnight Delivery',
  'International Shipping',
  'White-Glove Service',
  'Scheduled Delivery',
  'Freight & Bulk',
];

const CAPABILITIES = [
  'Real-time GPS Tracking',
  'Signature on Delivery',
  'Temperature-controlled',
  'Fragile Item Handling',
  'Insurance Coverage',
  'Cash on Delivery',
  'Contactless Delivery',
  'Customs & Brokerage',
  'Packaging Service',
  'Returns Management',
];

const FLEET_SIZES = [
  { value: '1-5', label: 'Small (1–5 vehicles)' },
  { value: '6-20', label: 'Medium (6–20 vehicles)' },
  { value: '21-100', label: 'Large (21–100 vehicles)' },
  { value: '100+', label: 'Enterprise (100+ vehicles)' },
];

const DELIVERY_TIMES = [
  { value: 'same-day', label: 'Same Day' },
  { value: '24h', label: '24 Hours' },
  { value: '2-3 days', label: '2–3 Business Days' },
  { value: '3-5 days', label: '3–5 Business Days' },
  { value: '5-7 days', label: '5–7 Business Days' },
  { value: 'varies', label: 'Varies by Route' },
];

// ─── Access Denied Screen ─────────────────────────────────────────────────────

function AccessDenied({ error }: { error: string }) {
  return (
    <div className="min-h-screen bg-linear-to-br from-charcoal-950 via-charcoal-900 to-charcoal-800 flex items-center justify-center px-4 py-12">
      <div className="max-w-lg w-full text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-red-900/30 border-2 border-red-700 mb-6">
          <span className="text-4xl">🔒</span>
        </div>
        <h1 className="text-3xl font-bold text-white mb-3">Invitation Required</h1>
        <p className="text-cool-gray-300 mb-6 leading-relaxed">{error}</p>

        <div className="bg-charcoal-800 border border-charcoal-700 rounded-xl p-6 mb-8 text-left">
          <h2 className="text-gold-400 font-semibold mb-3 flex items-center gap-2">
            <span>💡</span> How to get access
          </h2>
          <ol className="space-y-2 text-sm text-cool-gray-300">
            <li className="flex items-start gap-2">
              <span className="text-gold-500 font-bold mt-0.5">1.</span>
              Contact a verified vendor or brand owner on CLW.
            </li>
            <li className="flex items-start gap-2">
              <span className="text-gold-500 font-bold mt-0.5">2.</span>
              Ask them to generate a logistics referral link from their dashboard.
            </li>
            <li className="flex items-start gap-2">
              <span className="text-gold-500 font-bold mt-0.5">3.</span>
              Use that unique link to complete your registration within 7 days.
            </li>
          </ol>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/"
            className="px-6 py-3 bg-charcoal-700 text-white rounded-xl font-semibold hover:bg-charcoal-600 transition-colors"
          >
            ← Back to Home
          </Link>
          <Link
            href="/contact"
            className="px-6 py-3 bg-gold-600 text-white rounded-xl font-semibold hover:bg-gold-700 transition-colors"
          >
            Contact Support
          </Link>
        </div>
      </div>
    </div>
  );
}

// ─── Success Screen ───────────────────────────────────────────────────────────

function SuccessScreen({ companyName }: { companyName: string }) {
  return (
    <div className="min-h-screen bg-linear-to-br from-charcoal-950 via-charcoal-900 to-charcoal-800 flex items-center justify-center px-4 py-12">
      <div className="max-w-lg w-full text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-900/30 border-2 border-green-600 mb-6 animate-bounce">
          <span className="text-4xl">✅</span>
        </div>
        <h1 className="text-3xl font-bold text-white mb-3">Application Submitted!</h1>
        <p className="text-cool-gray-300 mb-2">
          <span className="text-gold-400 font-semibold">{companyName}</span> has been registered for review.
        </p>
        <p className="text-cool-gray-400 text-sm mb-8">
          Our team will verify your credentials and contact you within 2–3 business days. You&apos;ll receive an email once your account is approved.
        </p>

        <div className="bg-charcoal-800 border border-charcoal-700 rounded-xl p-5 mb-8 text-left space-y-3">
          <h2 className="text-white font-semibold flex items-center gap-2">
            <span>📋</span> What happens next?
          </h2>
          {[
            { icon: '📧', text: 'Check your email for a confirmation message.' },
            { icon: '🔍', text: 'Our team reviews your license and fleet details.' },
            { icon: '✅', text: 'Approved providers gain access to the Logistics Dashboard.' },
            { icon: '🤝', text: 'Vendors and brands can then select you as their preferred partner.' },
          ].map((item, i) => (
            <div key={i} className="flex items-start gap-3 text-sm text-cool-gray-300">
              <span className="text-lg">{item.icon}</span>
              <span>{item.text}</span>
            </div>
          ))}
        </div>

        <Link
          href="/"
          className="inline-block px-8 py-3 bg-gold-600 text-white rounded-xl font-semibold hover:bg-gold-700 transition-colors"
        >
          Return to Home
        </Link>
      </div>
    </div>
  );
}

// ─── Progress Bar ─────────────────────────────────────────────────────────────

function StepProgress({ current }: { current: 1 | 2 | 3 }) {
  const steps = [
    { n: 1, label: 'Company Info' },
    { n: 2, label: 'Service Details' },
    { n: 3, label: 'Account Setup' },
  ];
  return (
    <div className="flex items-center justify-center mb-8 gap-0">
      {steps.map((step, idx) => (
        <div key={step.n} className="flex items-center">
          <div className="flex flex-col items-center">
            <div
              className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm transition-all ${
                step.n < current
                  ? 'bg-green-600 text-white'
                  : step.n === current
                  ? 'bg-gold-600 text-white ring-4 ring-gold-600/30'
                  : 'bg-charcoal-700 text-cool-gray-400'
              }`}
            >
              {step.n < current ? '✓' : step.n}
            </div>
            <span
              className={`text-xs mt-1 font-medium hidden sm:block ${
                step.n === current ? 'text-gold-400' : 'text-cool-gray-500'
              }`}
            >
              {step.label}
            </span>
          </div>
          {idx < steps.length - 1 && (
            <div
              className={`w-16 sm:w-24 h-1 mx-1 rounded-full transition-all ${
                step.n < current ? 'bg-green-600' : 'bg-charcoal-700'
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Toggle Multi-Select Helper ───────────────────────────────────────────────

function toggleItem(arr: string[], item: string): string[] {
  return arr.includes(item) ? arr.filter((i) => i !== item) : [...arr, item];
}

// ─── Main Form Component ──────────────────────────────────────────────────────

function LogisticsSignupContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [tokenState, setTokenState] = useState<TokenState>('validating');
  const [tokenError, setTokenError] = useState('');
  const [referralPayload, setReferralPayload] = useState<ReferralPayload | null>(null);

  const [step, setStep] = useState<FormStep>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Step 1
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo>({
    companyName: '',
    contactName: '',
    email: '',
    phone: '',
    addressLine1: '',
    city: '',
    state: '',
    zipCode: '',
    country: '',
    licenseNumber: '',
    yearsInOperation: '',
    fleetSize: '',
  });

  // Step 2
  const [serviceDetails, setServiceDetails] = useState<ServiceDetails>({
    coverageAreas: [],
    serviceTypes: [],
    specialCapabilities: [],
    estimatedDelivery: '',
    baseFee: '',
    pricePerKg: '',
    insuranceCoverage: '',
    websiteUrl: '',
  });

  // Step 3
  const [accountSecurity, setAccountSecurity] = useState<AccountSecurity>({
    password: '',
    confirmPassword: '',
  });
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [agreedToLogisticsPolicy, setAgreedToLogisticsPolicy] = useState(false);

  // ── Validate token on mount ──
  useEffect(() => {
    const ref = searchParams.get('ref') || '';
    const result = validateReferralToken(ref);
    if (result.valid && result.payload) {
      setReferralPayload(result.payload);
      setTokenState('valid');
    } else {
      setTokenError(result.error || 'Invalid token.');
      setTokenState('invalid');
    }
  }, [searchParams]);

  // ── Field helpers ──
  const handleCompanyChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    setCompanyInfo((p) => ({ ...p, [e.target.name]: e.target.value }));
  };

  const handleServiceChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setServiceDetails((p) => ({ ...p, [e.target.name]: e.target.value }));
  };

  // ── Step 1 submit ──
  const handleStep1Submit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    const required: (keyof CompanyInfo)[] = [
      'companyName',
      'contactName',
      'email',
      'phone',
      'addressLine1',
      'city',
      'state',
      'zipCode',
      'country',
      'licenseNumber',
      'yearsInOperation',
      'fleetSize',
    ];
    for (const field of required) {
      if (!companyInfo[field].trim()) {
        setFormError(`Please fill in the "${field.replace(/([A-Z])/g, ' $1').toLowerCase()}" field.`);
        return;
      }
    }
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRe.test(companyInfo.email)) {
      setFormError('Please enter a valid email address.');
      return;
    }
    setStep(2);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // ── Step 2 submit ──
  const handleStep2Submit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (serviceDetails.coverageAreas.length === 0) {
      setFormError('Please select at least one coverage area.');
      return;
    }
    if (serviceDetails.serviceTypes.length === 0) {
      setFormError('Please select at least one service type.');
      return;
    }
    if (!serviceDetails.estimatedDelivery) {
      setFormError('Please select your typical delivery time.');
      return;
    }
    if (!serviceDetails.baseFee || isNaN(Number(serviceDetails.baseFee))) {
      setFormError('Please enter a valid base fee.');
      return;
    }
    if (!serviceDetails.pricePerKg || isNaN(Number(serviceDetails.pricePerKg))) {
      setFormError('Please enter a valid price per kg.');
      return;
    }
    setStep(3);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // ── Step 3 (final) submit ──
  const handleFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (accountSecurity.password.length < 8) {
      setFormError('Password must be at least 8 characters.');
      return;
    }
    if (accountSecurity.password !== accountSecurity.confirmPassword) {
      setFormError('Passwords do not match.');
      return;
    }
    if (!agreedToTerms || !agreedToLogisticsPolicy) {
      setFormError('You must agree to both policy documents to continue.');
      return;
    }

    setIsSubmitting(true);
    try {
      // TODO: replace with real API call to /api/auth/logistics/signup
      console.log('Logistics signup payload:', {
        ...companyInfo,
        ...serviceDetails,
        password: '[REDACTED]',
        referredBy: referralPayload?.referrerId,
        referrerRole: referralPayload?.referrerRole,
      });
      await new Promise((r) => setTimeout(r, 2000));
      setStep('success');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch {
      setFormError('An error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Render: validating
  // ─────────────────────────────────────────────────────────────────────────
  if (tokenState === 'validating') {
    return (
      <div className="min-h-screen bg-charcoal-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-gold-600 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-cool-gray-400">Verifying your invitation…</p>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Render: invalid token
  // ─────────────────────────────────────────────────────────────────────────
  if (tokenState === 'invalid') {
    return <AccessDenied error={tokenError} />;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Render: success
  // ─────────────────────────────────────────────────────────────────────────
  if (step === 'success') {
    return <SuccessScreen companyName={companyInfo.companyName} />;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Render: valid token — show form
  // ─────────────────────────────────────────────────────────────────────────
  const daysLeft = referralPayload ? getDaysUntilExpiry(referralPayload) : 0;

  return (
    <div className="min-h-screen bg-linear-to-br from-charcoal-950 via-charcoal-900 to-charcoal-800 py-8 px-4">
      <div className="max-w-2xl mx-auto">

        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-linear-to-br from-gold-500 to-gold-700 rounded-2xl mb-4">
            <span className="text-3xl">🚚</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold text-white">
            Logistics Provider Registration
          </h1>
          <p className="text-cool-gray-400 mt-2 text-sm">
            Join CLW&apos;s trusted delivery network
          </p>
        </div>

        {/* Referral Banner */}
        <div className="bg-charcoal-800/80 border border-gold-700/50 rounded-xl px-5 py-4 mb-6 flex items-start gap-3">
          <span className="text-2xl mt-0.5 shrink-0">
            {referralPayload?.referrerRole === 'brand' ? '👑' : '🏪'}
          </span>
          <div className="min-w-0">
            <p className="text-white text-sm font-semibold">
              Invited by {referralPayload?.referrerName}
            </p>
            <p className="text-cool-gray-400 text-xs mt-0.5">
              {referralPayload?.referrerRole === 'brand' ? 'Brand Owner' : 'Verified Vendor'} ·{' '}
              Invitation expires in{' '}
              <span className="text-gold-400 font-semibold">{daysLeft} day{daysLeft !== 1 ? 's' : ''}</span>
            </p>
          </div>
          <span className="ml-auto shrink-0 px-2.5 py-1 bg-green-900/40 border border-green-700/50 text-green-400 text-xs rounded-full font-semibold">
            ✓ Valid
          </span>
        </div>

        {/* Step Progress */}
        <StepProgress current={step as 1 | 2 | 3} />

        {/* ── STEP 1: Company Info ── */}
        {step === 1 && (
          <form onSubmit={handleStep1Submit} className="bg-charcoal-800 border border-charcoal-700 rounded-2xl p-6 sm:p-8 space-y-5">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span>🏢</span> Company Information
            </h2>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-cool-gray-300 mb-1.5">
                  Company / Business Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  name="companyName"
                  value={companyInfo.companyName}
                  onChange={handleCompanyChange}
                  required
                  placeholder="SwiftDeliver Co."
                  className="w-full px-4 py-2.5 bg-charcoal-700 border border-charcoal-600 text-white placeholder-cool-gray-500 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-transparent transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-cool-gray-300 mb-1.5">
                  Contact Person <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  name="contactName"
                  value={companyInfo.contactName}
                  onChange={handleCompanyChange}
                  required
                  placeholder="John Smith"
                  className="w-full px-4 py-2.5 bg-charcoal-700 border border-charcoal-600 text-white placeholder-cool-gray-500 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-transparent transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-cool-gray-300 mb-1.5">
                  Business Email <span className="text-red-400">*</span>
                </label>
                <input
                  type="email"
                  name="email"
                  value={companyInfo.email}
                  onChange={handleCompanyChange}
                  required
                  placeholder="ops@company.com"
                  className="w-full px-4 py-2.5 bg-charcoal-700 border border-charcoal-600 text-white placeholder-cool-gray-500 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-transparent transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-cool-gray-300 mb-1.5">
                  Phone Number <span className="text-red-400">*</span>
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={companyInfo.phone}
                  onChange={handleCompanyChange}
                  required
                  placeholder="+1 (800) 555-0100"
                  className="w-full px-4 py-2.5 bg-charcoal-700 border border-charcoal-600 text-white placeholder-cool-gray-500 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-transparent transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-cool-gray-300 mb-1.5">
                Street Address <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                name="addressLine1"
                value={companyInfo.addressLine1}
                onChange={handleCompanyChange}
                required
                placeholder="123 Logistics Way, Suite 400"
                className="w-full px-4 py-2.5 bg-charcoal-700 border border-charcoal-600 text-white placeholder-cool-gray-500 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-transparent transition-colors"
              />
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-cool-gray-300 mb-1.5">
                  City <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  name="city"
                  value={companyInfo.city}
                  onChange={handleCompanyChange}
                  required
                  placeholder="New York"
                  className="w-full px-4 py-2.5 bg-charcoal-700 border border-charcoal-600 text-white placeholder-cool-gray-500 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-transparent transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-cool-gray-300 mb-1.5">
                  State / Province <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  name="state"
                  value={companyInfo.state}
                  onChange={handleCompanyChange}
                  required
                  placeholder="NY"
                  className="w-full px-4 py-2.5 bg-charcoal-700 border border-charcoal-600 text-white placeholder-cool-gray-500 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-transparent transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-cool-gray-300 mb-1.5">
                  ZIP / Postal Code <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  name="zipCode"
                  value={companyInfo.zipCode}
                  onChange={handleCompanyChange}
                  required
                  placeholder="10001"
                  className="w-full px-4 py-2.5 bg-charcoal-700 border border-charcoal-600 text-white placeholder-cool-gray-500 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-transparent transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-cool-gray-300 mb-1.5">
                  Country <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  name="country"
                  value={companyInfo.country}
                  onChange={handleCompanyChange}
                  required
                  placeholder="United States"
                  className="w-full px-4 py-2.5 bg-charcoal-700 border border-charcoal-600 text-white placeholder-cool-gray-500 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-transparent transition-colors"
                />
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-cool-gray-300 mb-1.5">
                  Business License / Reg. No. <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  name="licenseNumber"
                  value={companyInfo.licenseNumber}
                  onChange={handleCompanyChange}
                  required
                  placeholder="DOT-1234567"
                  className="w-full px-4 py-2.5 bg-charcoal-700 border border-charcoal-600 text-white placeholder-cool-gray-500 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-transparent transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-cool-gray-300 mb-1.5">
                  Years in Operation <span className="text-red-400">*</span>
                </label>
                <input
                  type="number"
                  name="yearsInOperation"
                  value={companyInfo.yearsInOperation}
                  onChange={handleCompanyChange}
                  required
                  min="0"
                  max="200"
                  placeholder="5"
                  className="w-full px-4 py-2.5 bg-charcoal-700 border border-charcoal-600 text-white placeholder-cool-gray-500 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-transparent transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-cool-gray-300 mb-2">
                Fleet Size <span className="text-red-400">*</span>
              </label>
              <div className="grid grid-cols-2 gap-3">
                {FLEET_SIZES.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setCompanyInfo((p) => ({ ...p, fleetSize: option.value }))}
                    className={`px-4 py-3 rounded-xl border-2 text-sm font-medium text-left transition-all ${
                      companyInfo.fleetSize === option.value
                        ? 'border-gold-500 bg-gold-900/20 text-gold-300'
                        : 'border-charcoal-600 text-cool-gray-300 hover:border-charcoal-500'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {formError && (
              <div className="p-4 bg-red-900/30 border border-red-700 rounded-lg text-sm text-red-300">
                ⚠️ {formError}
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                className="px-8 py-3 bg-gold-600 text-white rounded-xl font-semibold hover:bg-gold-700 active:scale-95 transition-all"
              >
                Continue to Service Details →
              </button>
            </div>
          </form>
        )}

        {/* ── STEP 2: Service Details ── */}
        {step === 2 && (
          <form onSubmit={handleStep2Submit} className="bg-charcoal-800 border border-charcoal-700 rounded-2xl p-6 sm:p-8 space-y-6">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span>📦</span> Service Details
            </h2>

            {/* Coverage Areas */}
            <div>
              <label className="block text-sm font-medium text-cool-gray-300 mb-3">
                Coverage Areas <span className="text-red-400">*</span>
                <span className="text-cool-gray-500 font-normal ml-1">(select all that apply)</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                {COVERAGE_OPTIONS.map((area) => (
                  <button
                    key={area}
                    type="button"
                    onClick={() =>
                      setServiceDetails((p) => ({
                        ...p,
                        coverageAreas: toggleItem(p.coverageAreas, area),
                      }))
                    }
                    className={`px-3 py-2.5 rounded-lg border text-sm text-left font-medium transition-all ${
                      serviceDetails.coverageAreas.includes(area)
                        ? 'border-gold-500 bg-gold-900/20 text-gold-300'
                        : 'border-charcoal-600 text-cool-gray-400 hover:border-charcoal-500'
                    }`}
                  >
                    {serviceDetails.coverageAreas.includes(area) ? '✓ ' : ''}{area}
                  </button>
                ))}
              </div>
            </div>

            {/* Service Types */}
            <div>
              <label className="block text-sm font-medium text-cool-gray-300 mb-3">
                Service Types <span className="text-red-400">*</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {SERVICE_TYPES.map((svc) => (
                  <button
                    key={svc}
                    type="button"
                    onClick={() =>
                      setServiceDetails((p) => ({
                        ...p,
                        serviceTypes: toggleItem(p.serviceTypes, svc),
                      }))
                    }
                    className={`px-3 py-2.5 rounded-lg border text-sm text-left font-medium transition-all ${
                      serviceDetails.serviceTypes.includes(svc)
                        ? 'border-gold-500 bg-gold-900/20 text-gold-300'
                        : 'border-charcoal-600 text-cool-gray-400 hover:border-charcoal-500'
                    }`}
                  >
                    {serviceDetails.serviceTypes.includes(svc) ? '✓ ' : ''}{svc}
                  </button>
                ))}
              </div>
            </div>

            {/* Special Capabilities */}
            <div>
              <label className="block text-sm font-medium text-cool-gray-300 mb-3">
                Special Capabilities
                <span className="text-cool-gray-500 font-normal ml-1">(optional)</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                {CAPABILITIES.map((cap) => (
                  <button
                    key={cap}
                    type="button"
                    onClick={() =>
                      setServiceDetails((p) => ({
                        ...p,
                        specialCapabilities: toggleItem(p.specialCapabilities, cap),
                      }))
                    }
                    className={`px-3 py-2.5 rounded-lg border text-xs text-left font-medium transition-all ${
                      serviceDetails.specialCapabilities.includes(cap)
                        ? 'border-gold-500 bg-gold-900/20 text-gold-300'
                        : 'border-charcoal-600 text-cool-gray-400 hover:border-charcoal-500'
                    }`}
                  >
                    {serviceDetails.specialCapabilities.includes(cap) ? '✓ ' : ''}{cap}
                  </button>
                ))}
              </div>
            </div>

            {/* Delivery Time + Pricing */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-cool-gray-300 mb-1.5">
                  Typical Delivery Time <span className="text-red-400">*</span>
                </label>
                <select
                  name="estimatedDelivery"
                  value={serviceDetails.estimatedDelivery}
                  onChange={handleServiceChange}
                  required
                  className="w-full px-4 py-2.5 bg-charcoal-700 border border-charcoal-600 text-white rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-transparent transition-colors"
                >
                  <option value="">Select…</option>
                  {DELIVERY_TIMES.map((d) => (
                    <option key={d.value} value={d.value}>
                      {d.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-cool-gray-300 mb-1.5">
                  Website URL <span className="text-cool-gray-500 font-normal">(optional)</span>
                </label>
                <input
                  type="url"
                  name="websiteUrl"
                  value={serviceDetails.websiteUrl}
                  onChange={handleServiceChange}
                  placeholder="https://yourlogistics.com"
                  className="w-full px-4 py-2.5 bg-charcoal-700 border border-charcoal-600 text-white placeholder-cool-gray-500 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-transparent transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-cool-gray-300 mb-1.5">
                  Base Fee (USD) <span className="text-red-400">*</span>
                </label>
                <input
                  type="number"
                  name="baseFee"
                  value={serviceDetails.baseFee}
                  onChange={handleServiceChange}
                  required
                  min="0"
                  step="0.01"
                  placeholder="5.00"
                  className="w-full px-4 py-2.5 bg-charcoal-700 border border-charcoal-600 text-white placeholder-cool-gray-500 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-transparent transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-cool-gray-300 mb-1.5">
                  Price Per KG (USD) <span className="text-red-400">*</span>
                </label>
                <input
                  type="number"
                  name="pricePerKg"
                  value={serviceDetails.pricePerKg}
                  onChange={handleServiceChange}
                  required
                  min="0"
                  step="0.01"
                  placeholder="2.50"
                  className="w-full px-4 py-2.5 bg-charcoal-700 border border-charcoal-600 text-white placeholder-cool-gray-500 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-transparent transition-colors"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-cool-gray-300 mb-1.5">
                  Max Insurance Coverage (USD) <span className="text-cool-gray-500 font-normal">(optional)</span>
                </label>
                <input
                  type="number"
                  name="insuranceCoverage"
                  value={serviceDetails.insuranceCoverage}
                  onChange={handleServiceChange}
                  min="0"
                  step="100"
                  placeholder="50000"
                  className="w-full px-4 py-2.5 bg-charcoal-700 border border-charcoal-600 text-white placeholder-cool-gray-500 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-transparent transition-colors"
                />
              </div>
            </div>

            {formError && (
              <div className="p-4 bg-red-900/30 border border-red-700 rounded-lg text-sm text-red-300">
                ⚠️ {formError}
              </div>
            )}

            <div className="flex justify-between pt-2">
              <button
                type="button"
                onClick={() => { setStep(1); setFormError(''); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                className="px-6 py-3 border border-charcoal-600 text-cool-gray-300 rounded-xl font-semibold hover:bg-charcoal-700 transition-colors"
              >
                ← Back
              </button>
              <button
                type="submit"
                className="px-8 py-3 bg-gold-600 text-white rounded-xl font-semibold hover:bg-gold-700 active:scale-95 transition-all"
              >
                Continue to Account Setup →
              </button>
            </div>
          </form>
        )}

        {/* ── STEP 3: Account Security ── */}
        {step === 3 && (
          <form onSubmit={handleFinalSubmit} className="bg-charcoal-800 border border-charcoal-700 rounded-2xl p-6 sm:p-8 space-y-5">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span>🔒</span> Account Security
            </h2>

            {/* Summary */}
            <div className="bg-charcoal-700/60 border border-charcoal-600 rounded-xl p-4 text-sm text-cool-gray-300 space-y-1">
              <p className="text-white font-semibold mb-2">📋 Application Summary</p>
              <p>🏢 <span className="text-cool-gray-400">Company:</span> {companyInfo.companyName}</p>
              <p>📧 <span className="text-cool-gray-400">Email:</span> {companyInfo.email}</p>
              <p>🌍 <span className="text-cool-gray-400">Coverage:</span> {serviceDetails.coverageAreas.slice(0, 3).join(', ')}{serviceDetails.coverageAreas.length > 3 ? ` +${serviceDetails.coverageAreas.length - 3} more` : ''}</p>
              <p>🚛 <span className="text-cool-gray-400">Fleet:</span> {FLEET_SIZES.find(f => f.value === companyInfo.fleetSize)?.label || companyInfo.fleetSize}</p>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-cool-gray-300 mb-1.5">
                  Password <span className="text-red-400">*</span>
                </label>
                <input
                  type="password"
                  value={accountSecurity.password}
                  onChange={(e) => setAccountSecurity((p) => ({ ...p, password: e.target.value }))}
                  required
                  placeholder="Min. 8 characters"
                  className="w-full px-4 py-2.5 bg-charcoal-700 border border-charcoal-600 text-white placeholder-cool-gray-500 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-transparent transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-cool-gray-300 mb-1.5">
                  Confirm Password <span className="text-red-400">*</span>
                </label>
                <input
                  type="password"
                  value={accountSecurity.confirmPassword}
                  onChange={(e) => setAccountSecurity((p) => ({ ...p, confirmPassword: e.target.value }))}
                  required
                  placeholder="Re-enter password"
                  className="w-full px-4 py-2.5 bg-charcoal-700 border border-charcoal-600 text-white placeholder-cool-gray-500 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-transparent transition-colors"
                />
              </div>
            </div>

            {/* Password strength hint */}
            {accountSecurity.password && (
              <div className="text-xs text-cool-gray-400 space-y-1">
                <div className={`flex items-center gap-1.5 ${accountSecurity.password.length >= 8 ? 'text-green-400' : 'text-red-400'}`}>
                  {accountSecurity.password.length >= 8 ? '✓' : '✗'} At least 8 characters
                </div>
                <div className={`flex items-center gap-1.5 ${/[A-Z]/.test(accountSecurity.password) ? 'text-green-400' : 'text-cool-gray-500'}`}>
                  {/[A-Z]/.test(accountSecurity.password) ? '✓' : '○'} Uppercase letter
                </div>
                <div className={`flex items-center gap-1.5 ${/[0-9]/.test(accountSecurity.password) ? 'text-green-400' : 'text-cool-gray-500'}`}>
                  {/[0-9]/.test(accountSecurity.password) ? '✓' : '○'} Number
                </div>
              </div>
            )}

            {/* Agreements */}
            <div className="space-y-3 pt-2 border-t border-charcoal-700">
              <label className="flex items-start gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={agreedToTerms}
                  onChange={(e) => setAgreedToTerms(e.target.checked)}
                  className="mt-0.5 w-4 h-4 accent-gold-500 shrink-0"
                />
                <span className="text-sm text-cool-gray-300 group-hover:text-cool-gray-200 transition-colors">
                  I agree to the{' '}
                  <Link href="/terms" className="text-gold-400 hover:underline">
                    Terms of Service
                  </Link>{' '}
                  and{' '}
                  <Link href="/privacy" className="text-gold-400 hover:underline">
                    Privacy Policy
                  </Link>
                </span>
              </label>
              <label className="flex items-start gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={agreedToLogisticsPolicy}
                  onChange={(e) => setAgreedToLogisticsPolicy(e.target.checked)}
                  className="mt-0.5 w-4 h-4 accent-gold-500 shrink-0"
                />
                <span className="text-sm text-cool-gray-300 group-hover:text-cool-gray-200 transition-colors">
                  I certify that all business information is accurate and I am authorised to register this logistics company on CLW. I understand that false information will result in permanent account suspension.
                </span>
              </label>
            </div>

            {formError && (
              <div className="p-4 bg-red-900/30 border border-red-700 rounded-lg text-sm text-red-300">
                ⚠️ {formError}
              </div>
            )}

            <div className="flex justify-between pt-2">
              <button
                type="button"
                onClick={() => { setStep(2); setFormError(''); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                className="px-6 py-3 border border-charcoal-600 text-cool-gray-300 rounded-xl font-semibold hover:bg-charcoal-700 transition-colors"
              >
                ← Back
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-8 py-3 bg-gold-600 text-white rounded-xl font-semibold hover:bg-gold-700 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                    Submitting…
                  </>
                ) : (
                  'Submit Application'
                )}
              </button>
            </div>
          </form>
        )}

        {/* Footer note */}
        <p className="text-center text-cool-gray-600 text-xs mt-6">
          Already have an account?{' '}
          <Link href="/auth/login" className="text-gold-500 hover:text-gold-400">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

// ─── Exported Page ────────────────────────────────────────────────────────────

export default function LogisticsSignupPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-charcoal-950 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin w-12 h-12 border-4 border-gold-600 border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-cool-gray-400">Loading…</p>
          </div>
        </div>
      }
    >
      <LogisticsSignupContent />
    </Suspense>
  );
}
