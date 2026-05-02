'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';

type Role = 'customer' | 'vendor' | 'brand';
type Step = 'role-selection' | 'form';

const ROLES: { id: Role; icon: string; label: string; subtitle: string; perks: string[] }[] = [
  {
    id: 'customer',
    icon: '🛍️',
    label: 'Customer',
    subtitle: 'Shop luxury fashion',
    perks: [
      'Browse certified luxury products',
      'Share your fashion journey',
      'Find vendors near you',
      'Save favourites & wishlists',
    ],
  },
  {
    id: 'vendor',
    icon: '🏪',
    label: 'Vendor',
    subtitle: 'Sell in your boutique',
    perks: [
      'Create your online store',
      'Manage products & orders',
      'Partner with luxury brands',
      'Access analytics & insights',
    ],
  },
  {
    id: 'brand',
    icon: '👑',
    label: 'Brand Owner',
    subtitle: 'Launch your luxury brand',
    perks: [
      'Manage your brand catalogue',
      'Build affiliate partnerships',
      'Set commission rates',
      'Track affiliate performance',
    ],
  },
];

function passwordStrength(pw: string): { score: number; label: string; color: string } {
  if (!pw) return { score: 0, label: '', color: '' };
  let s = 0;
  if (pw.length >= 8) s++;
  if (pw.length >= 12) s++;
  if (/[A-Z]/.test(pw)) s++;
  if (/[0-9]/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  if (s <= 1) return { score: s, label: 'Weak', color: 'bg-red-500' };
  if (s <= 2) return { score: s, label: 'Fair', color: 'bg-yellow-500' };
  if (s <= 3) return { score: s, label: 'Good', color: 'bg-blue-500' };
  return { score: s, label: 'Strong', color: 'bg-green-500' };
}

function SignupContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const roleParam = searchParams.get('role') as Role | null;
  const validRoles: Role[] = ['customer', 'vendor', 'brand'];
  const initialRole: Role = validRoles.includes(roleParam as Role) ? (roleParam as Role) : 'customer';
  const initialStep: Step = validRoles.includes(roleParam as Role) ? 'form' : 'role-selection';

  const [step, setStep] = useState<Step>(initialStep);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [role, setRole] = useState<Role>(initialRole);
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
    password: '',
    confirmPassword: '',
  });
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof typeof form, string>>>({});
  const [submitError, setSubmitError] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const pwStrength = passwordStrength(form.password);
  const selectedRole = ROLES.find((r) => r.id === role)!;

  const handleRoleSelect = (r: Role) => {
    setRole(r);
    setStep('form');
    setSubmitError('');
    setFieldErrors({});
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (fieldErrors[name as keyof typeof form]) {
      setFieldErrors((prev) => ({ ...prev, [name]: '' }));
    }
    if (submitError) setSubmitError('');
  };

  const validate = (): boolean => {
    const errs: Partial<Record<keyof typeof form, string>> = {};
    if (!form.firstName.trim()) errs.firstName = 'First name is required';
    if (!form.lastName.trim()) errs.lastName = 'Last name is required';
    if (!form.email.trim()) errs.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = 'Enter a valid email address';
    if (!form.password) errs.password = 'Password is required';
    else if (form.password.length < 8) errs.password = 'Password must be at least 8 characters';
    if (!form.confirmPassword) errs.confirmPassword = 'Please confirm your password';
    else if (form.password !== form.confirmPassword) errs.confirmPassword = 'Passwords do not match';
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError('');

    if (!validate()) return;

    if (!acceptTerms) {
      setSubmitError('Please accept the Terms of Service to continue');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          email: form.email.trim().toLowerCase(),
          password: form.password,
          confirmPassword: form.confirmPassword,
          ...(form.phoneNumber.trim() ? { phoneNumber: form.phoneNumber.trim() } : {}),
          role,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        // Show first field-level error, or the top-level message
        const msg = data.errors
          ? (Object.values(data.errors)[0] as string)
          : data.message || 'Sign up failed. Please try again.';
        setSubmitError(msg);
        return;
      }

      // Redirect to email verification — session is set after OTP is confirmed
      const u = data.data.user;
      const emailWarning = data.data?.emailWarning;
      router.push(
        `/auth/verify-email/pending?email=${encodeURIComponent(u.email)}&role=${u.role}${
          emailWarning ? `&emailWarning=1` : ''
        }`
      );
    } catch {
      setSubmitError('Network error. Please check your connection and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputCls = (field: keyof typeof form) =>
    `w-full px-4 py-2.5 border rounded-xl bg-white dark:bg-charcoal-900 text-charcoal-900 dark:text-white placeholder-cool-gray-400 dark:placeholder-cool-gray-500 transition-colors focus:outline-none focus:ring-2 focus:ring-gold-500 dark:focus:ring-gold-600 focus:border-transparent ${
      fieldErrors[field]
        ? 'border-red-400 dark:border-red-600'
        : 'border-cool-gray-300 dark:border-charcoal-700'
    }`;

  // ── STEP 1: Role selection ────────────────────────────────────────────────

  if (step === 'role-selection') {
    return (
      <div className="min-h-screen bg-linear-to-br from-cool-gray-50 via-white to-gold-50 dark:from-charcoal-950 dark:via-charcoal-900 dark:to-charcoal-800 py-12 px-4 transition-colors duration-200">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <Link href="/" className="inline-flex items-center justify-center mb-6">
              <Image
                src="/images/brand/clw-logo.png"
                alt="Certified Luxury World"
                width={308}
                height={214}
                className="h-16 w-auto object-contain"
              />
            </Link>
            <h1 className="text-4xl sm:text-5xl font-display font-bold text-charcoal-900 dark:text-white mb-3">
              Join CLW
            </h1>
            <p className="text-lg text-cool-gray-500 dark:text-cool-gray-400">
              Choose how you want to experience luxury fashion
            </p>
          </div>

          <div className="grid sm:grid-cols-3 gap-6">
            {ROLES.map((r) => (
              <button
                key={r.id}
                onClick={() => handleRoleSelect(r.id)}
                className="bg-white dark:bg-charcoal-800 rounded-2xl shadow-lg dark:shadow-charcoal-950/40 p-6 sm:p-8 hover:shadow-2xl dark:hover:shadow-charcoal-950/60 transition-all hover:-translate-y-1 border-2 border-transparent hover:border-gold-400 dark:hover:border-gold-600 text-left group"
              >
                <div className="text-5xl mb-4">{r.icon}</div>
                <h2 className="text-xl font-display font-bold text-charcoal-900 dark:text-white mb-1">{r.label}</h2>
                <p className="text-sm text-cool-gray-500 dark:text-cool-gray-400 mb-4">{r.subtitle}</p>
                <ul className="space-y-2 mb-6">
                  {r.perks.map((perk) => (
                    <li key={perk} className="flex items-start gap-2 text-xs text-charcoal-600 dark:text-cool-gray-300">
                      <span className="text-green-500 mt-0.5 shrink-0">&#10003;</span>
                      {perk}
                    </li>
                  ))}
                </ul>
                <span className="text-sm font-semibold text-gold-600 dark:text-gold-400 group-hover:underline flex items-center gap-1">
                  Get Started <span aria-hidden="true">&#8594;</span>
                </span>
              </button>
            ))}
          </div>

          <p className="text-center mt-10 text-sm text-cool-gray-600 dark:text-cool-gray-400">
            Already have an account?{' '}
            <Link href="/auth/login" className="text-gold-600 dark:text-gold-400 hover:text-gold-700 font-semibold">
              Sign In
            </Link>
          </p>
        </div>
      </div>
    );
  }

  // ── STEP 2: Account form ──────────────────────────────────────────────────

  const isVendorOrBrand = role === 'vendor' || role === 'brand';

  return (
    <div className="min-h-screen bg-linear-to-br from-cool-gray-50 via-white to-gold-50 dark:from-charcoal-950 dark:via-charcoal-900 dark:to-charcoal-800 py-12 px-4 transition-colors duration-200">
      <div className="max-w-lg mx-auto">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center justify-center mb-4">
            <Image
              src="/images/brand/clw-logo.png"
              alt="Certified Luxury World"
              width={308}
              height={214}
              className="h-16 w-auto object-contain"
            />
          </Link>
          <div className="text-4xl mb-2">{selectedRole.icon}</div>
          <h1 className="text-3xl font-display font-bold text-charcoal-900 dark:text-white mb-1">
            Create {selectedRole.label} Account
          </h1>
          <p className="text-sm text-cool-gray-500 dark:text-cool-gray-400">{selectedRole.subtitle}</p>
        </div>

        <div className="bg-white dark:bg-charcoal-800 rounded-2xl shadow-xl dark:shadow-charcoal-950/50 p-8">
          {isVendorOrBrand && (
            <div className="flex items-start gap-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 px-4 py-3 rounded-xl text-sm mb-6">
              <span className="shrink-0 mt-0.5">&#8505;&#65039;</span>
              <span>
                Your {role === 'vendor' ? 'vendor store' : 'brand profile'} will be reviewed by our
                team before going live. You can log in immediately and complete your profile while
                awaiting approval.
              </span>
            </div>
          )}

          {submitError && (
            <div className="flex items-start gap-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-xl text-sm mb-5">
              <span className="shrink-0 mt-0.5">&#9888;&#65039;</span>
              <span>{submitError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>

            {/* Name row */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="firstName" className="block text-sm font-medium text-charcoal-700 dark:text-cool-gray-300 mb-1.5">
                  First Name
                </label>
                <input
                  type="text"
                  id="firstName"
                  name="firstName"
                  value={form.firstName}
                  onChange={handleChange}
                  autoComplete="given-name"
                  required
                  placeholder="John"
                  className={inputCls('firstName')}
                />
                {fieldErrors.firstName && (
                  <p className="mt-1 text-xs text-red-600 dark:text-red-400">{fieldErrors.firstName}</p>
                )}
              </div>
              <div>
                <label htmlFor="lastName" className="block text-sm font-medium text-charcoal-700 dark:text-cool-gray-300 mb-1.5">
                  Last Name
                </label>
                <input
                  type="text"
                  id="lastName"
                  name="lastName"
                  value={form.lastName}
                  onChange={handleChange}
                  autoComplete="family-name"
                  required
                  placeholder="Doe"
                  className={inputCls('lastName')}
                />
                {fieldErrors.lastName && (
                  <p className="mt-1 text-xs text-red-600 dark:text-red-400">{fieldErrors.lastName}</p>
                )}
              </div>
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-charcoal-700 dark:text-cool-gray-300 mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                autoComplete="email"
                required
                placeholder="you@example.com"
                className={inputCls('email')}
              />
              {fieldErrors.email && (
                <p className="mt-1 text-xs text-red-600 dark:text-red-400">{fieldErrors.email}</p>
              )}
            </div>

            {/* Phone (optional) */}
            <div>
              <label htmlFor="phoneNumber" className="block text-sm font-medium text-charcoal-700 dark:text-cool-gray-300 mb-1.5">
                Phone Number{' '}
                <span className="text-cool-gray-400 dark:text-cool-gray-500 font-normal text-xs">(optional)</span>
              </label>
              <input
                type="tel"
                id="phoneNumber"
                name="phoneNumber"
                value={form.phoneNumber}
                onChange={handleChange}
                autoComplete="tel"
                placeholder="+1 (555) 123-4567"
                className="w-full px-4 py-2.5 border border-cool-gray-300 dark:border-charcoal-700 rounded-xl bg-white dark:bg-charcoal-900 text-charcoal-900 dark:text-white placeholder-cool-gray-400 dark:placeholder-cool-gray-500 transition-colors focus:outline-none focus:ring-2 focus:ring-gold-500 dark:focus:ring-gold-600 focus:border-transparent"
              />
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-charcoal-700 dark:text-cool-gray-300 mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  autoComplete="new-password"
                  required
                  placeholder="Min. 8 characters"
                  className={`${inputCls('password')} pr-16`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  tabIndex={-1}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-cool-gray-400 hover:text-charcoal-700 dark:hover:text-white transition-colors text-sm font-medium select-none"
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
              {form.password && (
                <div className="mt-2 space-y-1">
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div
                        key={i}
                        className={`h-1 flex-1 rounded-full transition-colors ${
                          i <= pwStrength.score ? pwStrength.color : 'bg-cool-gray-200 dark:bg-charcoal-700'
                        }`}
                      />
                    ))}
                  </div>
                  <p className={`text-xs ${
                    pwStrength.score <= 1 ? 'text-red-500' :
                    pwStrength.score <= 2 ? 'text-yellow-500' :
                    pwStrength.score <= 3 ? 'text-blue-500' : 'text-green-500'
                  }`}>
                    {pwStrength.label}
                  </p>
                </div>
              )}
              {fieldErrors.password && (
                <p className="mt-1 text-xs text-red-600 dark:text-red-400">{fieldErrors.password}</p>
              )}
            </div>

            {/* Confirm password */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-charcoal-700 dark:text-cool-gray-300 mb-1.5">
                Confirm Password
              </label>
              <div className="relative">
                <input
                  type={showConfirm ? 'text' : 'password'}
                  id="confirmPassword"
                  name="confirmPassword"
                  value={form.confirmPassword}
                  onChange={handleChange}
                  autoComplete="new-password"
                  required
                  placeholder="Re-enter password"
                  className={`${inputCls('confirmPassword')} pr-16`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((v) => !v)}
                  tabIndex={-1}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-cool-gray-400 hover:text-charcoal-700 dark:hover:text-white transition-colors text-sm font-medium select-none"
                >
                  {showConfirm ? 'Hide' : 'Show'}
                </button>
              </div>
              {form.confirmPassword && form.password === form.confirmPassword && !fieldErrors.confirmPassword && (
                <p className="mt-1 text-xs text-green-600 dark:text-green-400">&#10003; Passwords match</p>
              )}
              {fieldErrors.confirmPassword && (
                <p className="mt-1 text-xs text-red-600 dark:text-red-400">{fieldErrors.confirmPassword}</p>
              )}
            </div>

            {/* Terms checkbox */}
            <div className="flex items-start gap-2 pt-1">
              <input
                id="acceptTerms"
                type="checkbox"
                checked={acceptTerms}
                onChange={(e) => {
                  setAcceptTerms(e.target.checked);
                  if (submitError?.includes('Terms')) setSubmitError('');
                }}
                className="mt-0.5 h-4 w-4 text-gold-600 focus:ring-gold-500 border-cool-gray-300 dark:border-charcoal-700 rounded bg-white dark:bg-charcoal-900"
              />
              <label htmlFor="acceptTerms" className="text-sm text-charcoal-600 dark:text-cool-gray-400">
                I agree to the{' '}
                <Link href="/terms" className="text-gold-600 dark:text-gold-400 hover:underline font-medium">
                  Terms of Service
                </Link>{' '}
                and{' '}
                <Link href="/privacy" className="text-gold-600 dark:text-gold-400 hover:underline font-medium">
                  Privacy Policy
                </Link>
              </label>
            </div>

            {/* Action buttons */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setStep('role-selection');
                  setSubmitError('');
                }}
                className="px-5 py-2.5 border-2 border-cool-gray-300 dark:border-charcoal-700 text-charcoal-700 dark:text-cool-gray-300 rounded-xl font-medium hover:bg-cool-gray-50 dark:hover:bg-charcoal-700 transition-colors text-sm"
              >
                &#8592; Back
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 bg-charcoal-900 dark:bg-gold-600 text-white py-2.5 rounded-xl font-semibold hover:bg-charcoal-800 dark:hover:bg-gold-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                    Creating Account&#8230;
                  </>
                ) : (
                  `Create ${selectedRole.label} Account`
                )}
              </button>
            </div>
          </form>

          <p className="mt-6 text-center text-sm text-cool-gray-600 dark:text-cool-gray-400">
            Already have an account?{' '}
            <Link href="/auth/login" className="text-gold-600 dark:text-gold-400 hover:text-gold-700 font-semibold">
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-cool-gray-50 dark:bg-charcoal-950">
          <div className="animate-spin w-8 h-8 border-4 border-gold-600 border-t-transparent rounded-full" />
        </div>
      }
    >
      <SignupContent />
    </Suspense>
  );
}
