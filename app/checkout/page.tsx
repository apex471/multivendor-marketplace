'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import Script from 'next/script';
import { COURIERS, BADGE_STYLES, TRACKING_LABEL } from '../../lib/couriers';
import { useCart } from '@/contexts/CartContext';
import { getAuthToken } from '@/lib/api/auth';
import { useToast } from '@/components/common/Toast';
import { calculateFees } from '@/lib/fees';
import { useLocalization } from '@/contexts/LocalizationContext';
import { calculateParcelSpecs } from '@/lib/parcel';
import { NIGERIA_STATE_CODE_MAP } from '@/lib/courierplus';

// ── Card helpers ─────────────────────────────────────────────────────────────
type CardType = 'visa' | 'mastercard' | 'amex' | 'discover' | 'unknown';

function detectCardType(num: string): CardType {
  const n = num.replace(/\s/g, '');
  if (/^4/.test(n)) return 'visa';
  if (/^5[1-5]/.test(n) || /^2[2-7]/.test(n)) return 'mastercard';
  if (/^3[47]/.test(n)) return 'amex';
  if (/^6(?:011|5)/.test(n)) return 'discover';
  return 'unknown';
}

function formatCardNumber(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 16);
  return digits.replace(/(\d{4})(?=\d)/g, '$1 ');
}

function formatExpiry(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 4);
  if (digits.length >= 3) return digits.slice(0, 2) + '/' + digits.slice(2);
  return digits;
}

function luhnCheck(num: string): boolean {
  const digits = num.replace(/\s/g, '');
  if (digits.length < 13) return false;
  let sum = 0;
  let alt = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let n = parseInt(digits[i], 10);
    if (alt) { n *= 2; if (n > 9) n -= 9; }
    sum += n;
    alt = !alt;
  }
  return sum % 10 === 0;
}

const CARD_LOGOS: Record<CardType, string> = {
  visa: '💳 Visa',
  mastercard: '💳 Mastercard',
  amex: '💳 Amex',
  discover: '💳 Discover',
  unknown: '💳',
};

export default function CheckoutPage() {
  const router = useRouter();
  const { items: cartItems, clearCart } = useCart();
  const { warning: toastWarning, success: toastSuccess } = useToast();
  const { formatPrice, currency } = useLocalization();

  // Auth guard — redirect unauthenticated users to login
  useEffect(() => {
    document.title = "Secure Checkout | Certified Luxury World";
    const token = getAuthToken();
    if (!token) {
      router.replace('/auth/login?redirect=/checkout');
    }
  }, [router]);
  const [currentStep, setCurrentStep] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [orderError, setOrderError] = useState('');

  // Form states
  const [shippingInfo, setShippingInfo] = useState({
    fullName: '', email: '', phone: '', address: '', city: '', state: '', zipCode: '', country: 'Nigeria',
  });
  const [selectedCourierId, setSelectedCourierId] = useState<string>('');
  const [paymentInfo, setPaymentInfo] = useState({
    cardNumber: '', cardName: '', expiryDate: '', cvv: '', saveCard: false,
  });
  const [cardType, setCardType] = useState<CardType>('unknown');
  const [cardError, setCardError] = useState('');
  const [paymentMethodType, setPaymentMethodType] = useState<'card' | 'bank'>('card');

  const [couriers, setCouriers] = useState<any[]>([]);
  const [_loadingCouriers, setLoadingCouriers] = useState(false);

  // Dynamic parcel specification calculated from cart contents
  const parcel = calculateParcelSpecs(cartItems);

  // Fetch live CourierPlus tariff ONLY after client provides destination
  const fetchLiveCourierRates = useCallback(async (stateName?: string, cityName?: string, addressStr?: string) => {
    const s = (stateName || shippingInfo.state || '').trim();
    const c = (cityName || shippingInfo.city || '').trim();
    if (!s && !c) return;

    setLoadingCouriers(true);
    try {
      const res = await fetch('/api/courierplus/rates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          state: s,
          city: c,
          address: addressStr || shippingInfo.address || '',
          weight: parcel.billableWeight,
          description: parcel.summaryText,
        }),
      });
      const data = await res.json();
      if (data.success && data.data?.rates?.length > 0) {
        // Ensure rates are in USD base (defensive safeguard against raw NGN)
        const normalizedRates = data.data.rates.map((r: any) => ({
          ...r,
          price: Number(r.price) > 100 ? Math.round((Number(r.price) / 1500) * 100) / 100 : Number(r.price),
        }));
        setCouriers(normalizedRates);
        setSelectedCourierId(prev => {
          const exists = normalizedRates.some((r: any) => r.id === prev);
          return exists && prev ? prev : normalizedRates[0].id;
        });
      }
    } catch (err) {
      console.warn('Failed to fetch live CourierPlus rates:', err);
    } finally {
      setLoadingCouriers(false);
    }
  }, [parcel.billableWeight, parcel.summaryText, shippingInfo.state, shippingInfo.city, shippingInfo.address]);

  // Selected courier is only defined when rates have been retrieved and client chooses an option
  const selectedCourier = couriers.find(c => c.id === selectedCourierId);
  const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const shipping = selectedCourier ? selectedCourier.price : 0;
  const fees = calculateFees(subtotal, shipping);
  const { buyerServiceFee, tax, buyerTotal: total } = fees;

  // ── Handlers ────────────────────────────────────────────────────────────────
  const handleShippingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shippingInfo.fullName || !shippingInfo.email || !shippingInfo.address || !shippingInfo.city || !shippingInfo.state) {
      toastWarning('Please fill in all required shipping fields including State and City'); return;
    }
    // Calculate live CourierPlus rates for this exact location and parcel weight
    await fetchLiveCourierRates(shippingInfo.state, shippingInfo.city, shippingInfo.address);
    setCurrentStep(2);
  };

  const handleCourierContinue = () => {
    if (!selectedCourierId || !selectedCourier) {
      toastWarning('Please select a CourierPlus delivery option to continue');
      return;
    }
    setCurrentStep(3);
  };

  // ── Card field handlers with formatting + validation ──────────────────────
  const handleCardNumberChange = useCallback((raw: string) => {
    const formatted = formatCardNumber(raw);
    const type = detectCardType(formatted);
    setPaymentInfo(prev => ({ ...prev, cardNumber: formatted }));
    setCardType(type);
    const stripped = formatted.replace(/\s/g, '');
    if (stripped.length === 16) {
      setCardError(luhnCheck(stripped) ? '' : 'Invalid card number');
    } else {
      setCardError('');
    }
  }, []);

  const handleExpiryChange = useCallback((raw: string) => {
    setPaymentInfo(prev => ({ ...prev, expiryDate: formatExpiry(raw) }));
  }, []);

  const handlePaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Bank transfer: no card fields needed — Flutterwave handles everything on their page
    // Phone number is required by Flutterwave for virtual account generation
    if (paymentMethodType === 'bank' && !shippingInfo.phone) {
      toastWarning('Please add a phone number in shipping details — required for bank transfer');
      return;
    }
    setCurrentStep(4);
  };

  const handlePlaceOrder = async () => {
    setIsProcessing(true);
    const token = getAuthToken();
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          shippingInfo,
          currency,
          paymentInfo: {
            cardName: paymentMethodType === 'card' ? 'Flutterwave Card' : 'Flutterwave Bank Transfer',
          },
          paymentMethod: {
            type: paymentMethodType,
            cardHolder: paymentMethodType === 'card' ? 'Flutterwave Card' : 'Flutterwave Bank Transfer',
          },
          cartItems,
          courierId:       selectedCourier.id,
          courierName:     selectedCourier.name,
          courierIcon:     selectedCourier.icon,
          courierPrice:    selectedCourier.price,
          courierEta:      selectedCourier.estimatedDate,
          courierCarrier:  selectedCourier.carrier,
          courierTracking: selectedCourier.tracking,
          subtotal,
          shipping,
          tax,
          total,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data?.success) {
        setOrderError(data?.message || 'Failed to initialize payment with Flutterwave. Please try again.');
        setIsProcessing(false);
        return;
      }
      const orderId = data.data?.orderId;
      const paymentLink = data.paymentLink;
      const flwPublicKey = data.flwPublicKey || process.env.NEXT_PUBLIC_FLUTTERWAVE_PUBLIC_KEY || '';

      // Direct redirection to Flutterwave hosted payment gateway
      if (paymentLink) {
        clearCart();
        window.location.href = paymentLink;
        return;
      }

      // If Flutterwave inline modal is available and public key is configured
      if (typeof window !== 'undefined' && (window as any).FlutterwaveCheckout && flwPublicKey && !flwPublicKey.includes('xxxx')) {
        (window as any).FlutterwaveCheckout({
          public_key: flwPublicKey,
          tx_ref: orderId,
          amount: data.flwAmount || total,
          currency: data.flwCurrency || 'USD',
          payment_options: paymentMethodType === 'bank' ? 'banktransfer,card,account,ussd' : 'card,banktransfer,ussd,account,qr',
          customer: {
            email: shippingInfo.email || `${shippingInfo.fullName.replace(/\s+/g, '').toLowerCase()}@clwcustomer.com`,
            phone_number: shippingInfo.phone || '',
            name: shippingInfo.fullName,
          },
          customizations: {
            title: 'Certified Luxury World',
            description: `Payment for Order #${orderId}`,
            logo: `${window.location.origin}/images/brand/clw-logo.png`,
          },
          callback: (response: any) => {
            clearCart();
            window.location.href = `/checkout/verify?gateway=flutterwave&order_id=${orderId}&transaction_id=${response.transaction_id}&status=${response.status}`;
          },
          onclose: () => {
            setIsProcessing(false);
          },
        });
        return;
      }

      // CRITICAL: NEVER silently bypass payment! If gateway did not return a payment link, show error
      setOrderError(data?.message || 'Payment Gateway Error: Unable to redirect to Flutterwave. Please check your network or contact support.');
    } catch {
      setOrderError('Network error. Please check your connection and try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const steps = [
    { number: 1, title: 'Shipping', icon: '📋' },
    { number: 2, title: 'Delivery', icon: '🚚' },
    { number: 3, title: 'Payment',  icon: '💳' },
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-charcoal-900">
      <Script src="https://checkout.flutterwave.com/v3.js" strategy="lazyOnload" />
      {/* ── Header ── */}
      <div className="bg-white dark:bg-charcoal-800 border-b border-cool-gray-300 dark:border-charcoal-700">
        <div className="container mx-auto px-4 py-4">
          <Link href="/" className="flex items-center gap-2.5">
            <Image
              src="/images/brand/clw-logo.png"
              alt="Certified Luxury World"
              width={231}
              height={160}
              className="h-10 w-auto object-contain"
            />
            <span className="text-sm font-medium text-cool-gray-400 dark:text-cool-gray-500">/ Secure Checkout</span>
          </Link>
        </div>
      </div>

      {/* ── Progress Steps ── */}
      <div className="bg-white dark:bg-charcoal-800 border-b border-cool-gray-300 dark:border-charcoal-700">
        <div className="container mx-auto px-4 py-5">
          <div className="flex items-center justify-center gap-1 sm:gap-3">
            {steps.map((step, index) => (
              <div key={step.number} className="flex items-center">
                <div className="flex flex-col items-center">
                  <div className={`w-9 h-9 sm:w-11 sm:h-11 rounded-full flex items-center justify-center text-sm sm:text-lg font-bold transition-all ${
                    currentStep > step.number
                      ? 'bg-gold-600 text-white'
                      : currentStep === step.number
                      ? 'bg-gold-600 text-white ring-4 ring-gold-200 dark:ring-gold-900/50'
                      : 'bg-cool-gray-200 dark:bg-charcoal-700 text-charcoal-500 dark:text-cool-gray-500'
                  }`}>
                    {currentStep > step.number ? '✓' : step.icon}
                  </div>
                  <span className={`mt-1 text-[10px] sm:text-xs font-medium whitespace-nowrap ${
                    currentStep >= step.number ? 'text-gold-600' : 'text-charcoal-500 dark:text-cool-gray-500'
                  }`}>{step.title}</span>
                </div>
                {index < steps.length - 1 && (
                  <div className={`w-6 sm:w-12 h-0.5 mx-1 sm:mx-2 mb-4 transition-colors ${
                    currentStep > step.number ? 'bg-gold-600' : 'bg-cool-gray-300 dark:bg-charcoal-700'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Main Content ── */}
      <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-8">

          {/* ─ Left column ─────────────────────────────────────────────────── */}
          <div className="lg:col-span-2 space-y-0">

            {/* ── STEP 1: Shipping ─────────────────────────────────────────── */}
            {currentStep === 1 && (
              <div className="bg-white dark:bg-charcoal-800 border border-cool-gray-300 dark:border-charcoal-700 rounded-xl p-6">
                <h2 className="text-2xl font-bold text-charcoal-900 dark:text-white mb-6">Shipping Information</h2>
                <form onSubmit={handleShippingSubmit} className="space-y-4">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-charcoal-700 dark:text-cool-gray-300 mb-2">Full Name *</label>
                      <input type="text" required value={shippingInfo.fullName}
                        onChange={(e) => setShippingInfo({ ...shippingInfo, fullName: e.target.value })}
                        className="w-full px-4 py-2.5 bg-white dark:bg-charcoal-700 border border-cool-gray-300 dark:border-charcoal-600 text-charcoal-900 dark:text-white rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-transparent"
                        placeholder="John Doe" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-charcoal-700 dark:text-cool-gray-300 mb-2">Email *</label>
                      <input type="email" required value={shippingInfo.email}
                        onChange={(e) => setShippingInfo({ ...shippingInfo, email: e.target.value })}
                        className="w-full px-4 py-2.5 bg-white dark:bg-charcoal-700 border border-cool-gray-300 dark:border-charcoal-600 text-charcoal-900 dark:text-white rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-transparent"
                        placeholder="john@example.com" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-charcoal-700 dark:text-cool-gray-300 mb-2">Phone Number *</label>
                    <input type="tel" required value={shippingInfo.phone}
                      onChange={(e) => setShippingInfo({ ...shippingInfo, phone: e.target.value })}
                      className="w-full px-4 py-2.5 bg-white dark:bg-charcoal-700 border border-cool-gray-300 dark:border-charcoal-600 text-charcoal-900 dark:text-white rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-transparent"
                      placeholder="+1 (555) 123-4567" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-charcoal-700 dark:text-cool-gray-300 mb-2">Street Address *</label>
                    <input type="text" required value={shippingInfo.address}
                      onChange={(e) => setShippingInfo({ ...shippingInfo, address: e.target.value })}
                      className="w-full px-4 py-2.5 bg-white dark:bg-charcoal-700 border border-cool-gray-300 dark:border-charcoal-600 text-charcoal-900 dark:text-white rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-transparent"
                      placeholder="123 Main Street, Apt 4B" />
                  </div>
                  <div className="grid sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-charcoal-700 dark:text-cool-gray-300 mb-2">City / Town *</label>
                      <input type="text" required value={shippingInfo.city}
                        onChange={(e) => setShippingInfo({ ...shippingInfo, city: e.target.value })}
                        className="w-full px-4 py-2.5 bg-white dark:bg-charcoal-700 border border-cool-gray-300 dark:border-charcoal-600 text-charcoal-900 dark:text-white rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-transparent"
                        placeholder="e.g. Ikeja, Wuse, Lekki" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-charcoal-700 dark:text-cool-gray-300 mb-2">State *</label>
                      <input type="text" required value={shippingInfo.state}
                        list="nigerian-states-checkout"
                        onChange={(e) => setShippingInfo({ ...shippingInfo, state: e.target.value })}
                        className="w-full px-4 py-2.5 bg-white dark:bg-charcoal-700 border border-cool-gray-300 dark:border-charcoal-600 text-charcoal-900 dark:text-white rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-transparent"
                        placeholder="e.g. Lagos, Abuja FCT, Rivers" />
                      <datalist id="nigerian-states-checkout">
                        {Object.values(NIGERIA_STATE_CODE_MAP).map(s => (
                          <option key={s.code} value={s.name} />
                        ))}
                      </datalist>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-charcoal-700 dark:text-cool-gray-300 mb-2">ZIP / Postal Code</label>
                      <input type="text" value={shippingInfo.zipCode}
                        onChange={(e) => setShippingInfo({ ...shippingInfo, zipCode: e.target.value })}
                        className="w-full px-4 py-2.5 bg-white dark:bg-charcoal-700 border border-cool-gray-300 dark:border-charcoal-600 text-charcoal-900 dark:text-white rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-transparent"
                        placeholder="100001" />
                    </div>
                  </div>

                  {/* Parcel specs & dynamic pricing reassurance note */}
                  <div className="mt-4 p-3.5 rounded-xl bg-gold-50/60 dark:bg-charcoal-700/50 border border-gold-200 dark:border-charcoal-600 flex items-center gap-3">
                    <span className="text-xl shrink-0">🚚</span>
                    <p className="text-xs text-charcoal-600 dark:text-cool-gray-300">
                      <strong>Transparent CourierPlus Delivery:</strong> Delivery tariffs are calculated dynamically in the next step based on your destination and parcel specifications (<strong className="text-charcoal-900 dark:text-white">{parcel.summaryText}</strong>).
                    </p>
                  </div>

                  <div className="flex gap-4 pt-4">
                    <Link href="/cart" className="flex-1 px-6 py-3 border-2 border-cool-gray-300 dark:border-charcoal-600 bg-white dark:bg-charcoal-700 text-charcoal-700 dark:text-white rounded-lg font-semibold hover:bg-cool-gray-100 dark:hover:bg-charcoal-600 transition-colors text-center">
                      Back to Cart
                    </Link>
                    <button type="submit" className="flex-1 px-6 py-3 bg-gold-600 text-white rounded-lg font-semibold hover:bg-gold-700 transition-colors">
                      Choose Delivery →
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* ── STEP 2: Delivery / Courier Selection — Uber style ────────── */}
            {currentStep === 2 && (
              <div className="overflow-hidden rounded-2xl border border-cool-gray-200 dark:border-charcoal-700 shadow-sm">

                {/* ── Route header (dark Uber-style bar) ─────────────────── */}
                <div className="bg-charcoal-900 dark:bg-charcoal-950 px-5 py-4">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gold-400 mb-3">Delivery Route</p>
                  <div className="flex items-stretch gap-3">
                    {/* Dot → dashed line → dot */}
                    <div className="flex flex-col items-center pt-1 pb-0.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-gold-400 shrink-0" />
                      <div className="w-px flex-1 my-1 border-l-2 border-dashed border-charcoal-600" />
                      <div className="w-2.5 h-2.5 rounded-full border-2 border-white shrink-0" />
                    </div>
                    {/* Addresses */}
                    <div className="flex flex-col flex-1 min-w-0 gap-1.5">
                      <div>
                        <p className="text-[10px] text-charcoal-400 uppercase tracking-wider mb-0.5">From</p>
                        <p className="text-sm font-medium text-white truncate">Multiple Vendors · Your Cart</p>
                      </div>
                      <div className="border-t border-charcoal-700" />
                      <div>
                        <p className="text-[10px] text-charcoal-400 uppercase tracking-wider mb-0.5">To</p>
                        <p className="text-sm font-medium text-white truncate">
                          {[shippingInfo.address, shippingInfo.city, shippingInfo.state, shippingInfo.zipCode].filter(Boolean).join(', ')}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setCurrentStep(1)}
                      className="self-start text-[11px] font-semibold text-gold-400 hover:text-gold-300 transition-colors shrink-0 mt-0.5"
                    >
                      Edit
                    </button>
                  </div>
                </div>

                {/* ── Consignment parcel specs ───────────────────────────── */}
                <div className="bg-charcoal-800 text-white px-5 py-2.5 border-b border-charcoal-700 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="flex items-center gap-1.5 text-cool-gray-200">
                    <span>📦</span> <strong>Consignment:</strong> {parcel.summaryText} ({parcel.dimensions.length}×{parcel.dimensions.width}×{parcel.dimensions.height} cm)
                  </span>
                  <span className="text-gold-400 font-medium">Volumetric: {parcel.billableWeight} kg</span>
                </div>

                {/* ── Section label bar ───────────────────────────────────── */}
                <div className="bg-cool-gray-50 dark:bg-charcoal-900 px-5 py-2.5 border-b border-cool-gray-200 dark:border-charcoal-700 flex flex-wrap items-center justify-between gap-2">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-charcoal-400 dark:text-cool-gray-500">
                    Select a delivery option
                  </p>
                  {_loadingCouriers ? (
                    <span className="text-[11px] font-medium text-gold-600 dark:text-gold-400 flex items-center gap-1.5 animate-pulse">
                      <span className="w-1.5 h-1.5 rounded-full bg-gold-500 animate-ping" />
                      Calculating live CourierPlus rates for {shippingInfo.city || shippingInfo.state || 'your location'}...
                    </span>
                  ) : (
                    <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      <span>✓</span> Live CourierPlus Tariff Applied ({shippingInfo.city || 'Lagos'}, {shippingInfo.state || 'Nigeria'})
                    </span>
                  )}
                </div>

                {/* ── Courier rows or loading / empty state ────────────────── */}
                {_loadingCouriers ? (
                  <div className="p-10 text-center space-y-3 bg-white dark:bg-charcoal-800">
                    <div className="animate-spin rounded-full h-8 w-8 border-2 border-gold-600 border-t-transparent mx-auto" />
                    <p className="text-sm font-semibold text-charcoal-900 dark:text-white">
                      Calculating live CourierPlus rates for {shippingInfo.city || shippingInfo.state || 'your location'}...
                    </p>
                    <p className="text-xs text-charcoal-500 dark:text-cool-gray-400">
                      Consignment: {parcel.summaryText} ({parcel.billableWeight} kg billable)
                    </p>
                  </div>
                ) : couriers.length === 0 ? (
                  <div className="p-8 text-center space-y-3 bg-white dark:bg-charcoal-800">
                    <p className="text-sm text-charcoal-600 dark:text-cool-gray-300">
                      No rates loaded. Please ensure your delivery address in Step 1 is complete.
                    </p>
                    <button
                      type="button"
                      onClick={() => setCurrentStep(1)}
                      className="px-4 py-2 bg-gold-600 text-white rounded-lg text-xs font-semibold hover:bg-gold-700 transition-colors"
                    >
                      ← Back to Shipping Details
                    </button>
                  </div>
                ) : (
                <div className="bg-white dark:bg-charcoal-800 divide-y divide-cool-gray-100 dark:divide-charcoal-700/60">
                  {couriers.map((courier) => {
                    const isSelected    = selectedCourierId === courier.id;
                    const isUnavailable = !courier.available;
                    return (
                      <button
                        key={courier.id}
                        type="button"
                        disabled={isUnavailable}
                        onClick={() => !isUnavailable && setSelectedCourierId(courier.id)}
                        className={`relative w-full text-left flex items-center gap-4 px-5 py-4 transition-colors ${
                          isUnavailable
                            ? 'opacity-40 cursor-not-allowed'
                            : isSelected
                            ? 'bg-gold-50 dark:bg-gold-900/10'
                            : 'hover:bg-cool-gray-50 dark:hover:bg-charcoal-700/40 active:bg-cool-gray-100 dark:active:bg-charcoal-700'
                        }`}
                      >
                        {/* Gold left accent strip */}
                        {isSelected && (
                          <span className="absolute left-0 top-2 bottom-2 w-0.75 bg-gold-500 rounded-r-full" />
                        )}

                        {/* Icon circle */}
                        <div className={`w-14 h-14 rounded-full flex items-center justify-center text-2xl shrink-0 transition-colors ${
                          isSelected
                            ? 'bg-gold-100 dark:bg-gold-900/30'
                            : 'bg-cool-gray-100 dark:bg-charcoal-700'
                        }`}>
                          {courier.icon}
                        </div>

                        {/* Center info */}
                        <div className="flex-1 min-w-0">
                          {/* Name + badge */}
                          <div className="flex flex-wrap items-center gap-1.5 mb-1">
                            <span className="text-base font-bold text-charcoal-900 dark:text-white leading-tight">
                              {courier.name}
                            </span>
                            {courier.badge && courier.badgeVariant && (
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${BADGE_STYLES[courier.badgeVariant]}`}>
                                {courier.badge}
                              </span>
                            )}
                            {isUnavailable && (
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-cool-gray-200 dark:bg-charcoal-700 text-charcoal-400">
                                Unavailable
                              </span>
                            )}
                          </div>
                          {/* ETA row */}
                          <div className="flex items-center gap-1.5 mb-2">
                            <span className={`text-sm font-semibold ${
                              isSelected ? 'text-gold-600 dark:text-gold-400' : 'text-charcoal-700 dark:text-cool-gray-200'
                            }`}>
                              {courier.deliveryDays}
                            </span>
                            <span className="text-cool-gray-300 dark:text-charcoal-600">·</span>
                            <span className="text-xs text-charcoal-400 dark:text-cool-gray-500">
                              by {courier.estimatedDate}
                            </span>
                          </div>
                          {/* Feature chips */}
                          <div className="flex flex-wrap gap-1.5">
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-cool-gray-100 dark:bg-charcoal-700 text-charcoal-500 dark:text-cool-gray-400">
                              {TRACKING_LABEL[courier.tracking]}
                            </span>
                            {courier.insurance && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-300">
                                🛡️ Insured
                              </span>
                            )}
                            {courier.signature && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-300">
                                ✍️ Signature
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Right: price + checkmark */}
                        <div className="shrink-0 flex flex-col items-end gap-2.5">
                          <span className={`text-lg font-bold leading-none ${
                            courier.price === 0
                              ? 'text-green-600 dark:text-green-400'
                              : 'text-charcoal-900 dark:text-white'
                          }`}>
                            {courier.price === 0 ? 'FREE' : formatPrice(courier.price)}
                          </span>
                          <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                            isSelected
                              ? 'bg-gold-500 border-gold-500'
                              : 'border-cool-gray-300 dark:border-charcoal-600'
                          }`}>
                            {isSelected && (
                              <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
                )}

                {/* ── Info note ───────────────────────────────────────────── */}
                <div className="bg-cool-gray-50 dark:bg-charcoal-900 border-t border-cool-gray-100 dark:border-charcoal-700 px-5 py-3 flex items-start gap-2">
                  <span className="text-xs shrink-0 mt-px">ℹ️</span>
                  <p className="text-xs text-charcoal-400 dark:text-cool-gray-500 leading-relaxed">
                    Estimates are calculated via CourierPlus based on destination distance and consignment weight ({parcel.summaryText}).
                  </p>
                </div>

                {/* ── Bottom CTA ──────────────────────────────────────────── */}
                <div className="bg-white dark:bg-charcoal-800 border-t-2 border-cool-gray-100 dark:border-charcoal-700 px-5 pt-4 pb-5">
                  {/* Selected courier summary */}
                  {selectedCourier ? (
                    <div className="flex items-center justify-between mb-3 px-1">
                      <div className="flex items-center gap-2.5">
                        <span className="text-2xl select-none">{selectedCourier.icon}</span>
                        <div>
                          <p className="text-sm font-bold text-charcoal-900 dark:text-white leading-tight">
                            {selectedCourier.name}
                          </p>
                          <p className="text-xs text-charcoal-400 dark:text-cool-gray-500">
                            {selectedCourier.deliveryDays} · {selectedCourier.estimatedDate}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`text-lg font-bold leading-tight ${
                          selectedCourier.price === 0 ? 'text-green-600 dark:text-green-400' : 'text-charcoal-900 dark:text-white'
                        }`}>
                          {selectedCourier.price === 0 ? 'FREE' : formatPrice(selectedCourier.price)}
                        </p>
                        <p className="text-[11px] text-charcoal-400 dark:text-cool-gray-500">delivery fee</p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-amber-600 dark:text-amber-400 mb-3 px-1">
                      Please select a CourierPlus delivery option above to proceed.
                    </p>
                  )}
                  {/* Action buttons */}
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setCurrentStep(1)}
                      className="px-5 py-3.5 rounded-xl border-2 border-cool-gray-200 dark:border-charcoal-600 text-charcoal-600 dark:text-cool-gray-300 font-semibold text-sm hover:border-gold-400 hover:text-gold-600 dark:hover:text-gold-400 transition-colors"
                    >
                      ← Back
                    </button>
                    <button
                      type="button"
                      onClick={handleCourierContinue}
                      disabled={!selectedCourier}
                      className="flex-1 py-3.5 bg-gold-600 hover:bg-gold-700 active:bg-gold-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-colors text-sm tracking-wide shadow-md shadow-gold-600/20"
                    >
                      {selectedCourier ? `Confirm ${selectedCourier.name} →` : 'Select a Delivery Option →'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ── STEP 3: Payment & Order Confirmation ─────────────────────── */}
            {currentStep === 3 && (
              <div className="space-y-6">
                {/* Payment Selection Box */}
                <div className="bg-white dark:bg-charcoal-800 border border-cool-gray-300 dark:border-charcoal-700 rounded-xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="text-xl sm:text-2xl font-bold text-charcoal-900 dark:text-white">Select Payment Channel</h2>
                      <p className="text-xs text-cool-gray-500 dark:text-cool-gray-400 mt-0.5">
                        Processed via Flutterwave official PCI-DSS Level 1 secure payment gateway
                      </p>
                    </div>
                    <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 font-bold flex items-center gap-1">
                      <span>🔒</span> Escrow Protected
                    </span>
                  </div>
                  
                  {/* Payment Method Switcher */}
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <button
                      type="button"
                      onClick={() => setPaymentMethodType('card')}
                      className={`py-3.5 px-4 rounded-xl border-2 font-bold transition-all flex items-center justify-center gap-2 text-sm cursor-pointer ${
                        paymentMethodType === 'card'
                          ? 'border-gold-600 bg-gold-600/10 text-gold-700 dark:text-gold-300 shadow-sm'
                          : 'border-cool-gray-200 dark:border-charcoal-700 text-charcoal-600 dark:text-cool-gray-400 hover:border-cool-gray-300 dark:hover:border-charcoal-600'
                      }`}
                    >
                      <span className="text-lg">💳</span>
                      <span>Pay with Card</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMethodType('bank')}
                      className={`py-3.5 px-4 rounded-xl border-2 font-bold transition-all flex items-center justify-center gap-2 text-sm cursor-pointer ${
                        paymentMethodType === 'bank'
                          ? 'border-gold-600 bg-gold-600/10 text-gold-700 dark:text-gold-300 shadow-sm'
                          : 'border-cool-gray-200 dark:border-charcoal-700 text-charcoal-600 dark:text-cool-gray-400 hover:border-cool-gray-300 dark:hover:border-charcoal-600'
                      }`}
                    >
                      <span className="text-lg">🏛️</span>
                      <span>Bank Transfer</span>
                    </button>
                  </div>

                  {paymentMethodType === 'card' ? (
                    <div className="bg-gold-50 dark:bg-gold-900/10 border border-gold-200 dark:border-gold-800 rounded-xl p-5">
                      <div className="flex items-center gap-2.5 mb-2">
                        <span className="text-xl">💳</span>
                        <h4 className="font-bold text-gold-900 dark:text-gold-300 text-sm">Flutterwave 3D Secure Card Processing</h4>
                      </div>
                      <p className="text-xs text-gold-800 dark:text-gold-300/90 leading-relaxed mb-3">
                        You will be directly redirected to Flutterwave’s official checkout UI to complete your payment with any Nigerian or international Visa, Mastercard, or Verve card with OTP verification.
                      </p>
                      <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold text-gold-800 dark:text-gold-300">
                        <span className="px-2 py-0.5 bg-white dark:bg-charcoal-800 border border-gold-200 dark:border-gold-800 rounded">Visa</span>
                        <span className="px-2 py-0.5 bg-white dark:bg-charcoal-800 border border-gold-200 dark:border-gold-800 rounded">Mastercard</span>
                        <span className="px-2 py-0.5 bg-white dark:bg-charcoal-800 border border-gold-200 dark:border-gold-800 rounded">Verve</span>
                        <span className="px-2 py-0.5 bg-white dark:bg-charcoal-800 border border-gold-200 dark:border-gold-800 rounded">Apple Pay / Google Pay</span>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-5">
                        <div className="flex items-center gap-2.5 mb-2">
                          <span className="text-xl">🏛️</span>
                          <h4 className="font-bold text-blue-900 dark:text-blue-300 text-sm">Instant Virtual Bank Transfer via Flutterwave</h4>
                        </div>
                        <p className="text-xs text-blue-800 dark:text-blue-300/90 leading-relaxed mb-3">
                          Flutterwave will automatically generate a unique, dedicated virtual Nigerian bank account for your order amount. Transfer directly from your banking app for instant verification.
                        </p>
                        <div className="flex items-center justify-between p-3.5 bg-white dark:bg-charcoal-800 border border-blue-200 dark:border-blue-700 rounded-lg">
                          <div>
                            <p className="text-[11px] text-cool-gray-500">Order Equivalent (NGN)</p>
                            <p className="text-lg font-bold text-charcoal-900 dark:text-white">
                              ₦{(Math.round(total * 1600)).toLocaleString()}
                            </p>
                          </div>
                          <span className="text-xs px-2.5 py-1 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded font-semibold">
                            Live Rate @ ₦1,600/USD
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="mt-4 pt-4 border-t border-cool-gray-200 dark:border-charcoal-700 flex items-center justify-between text-xs text-cool-gray-500 dark:text-cool-gray-400">
                    <span className="flex items-center gap-1.5">
                      <span>🔒</span> 256-Bit Bank-Grade SSL Encryption
                    </span>
                    <span>No card details stored on our servers</span>
                  </div>
                </div>

                {/* Shipping & Delivery Review */}
                <div className="bg-white dark:bg-charcoal-800 border border-cool-gray-300 dark:border-charcoal-700 rounded-xl p-6">
                  <h3 className="text-lg font-bold text-charcoal-900 dark:text-white mb-4">Order &amp; Delivery Review</h3>
                  <div className="space-y-4">
                    {/* Shipping Address */}
                    <div className="flex items-start justify-between p-3.5 rounded-xl bg-cool-gray-50 dark:bg-charcoal-900 border border-cool-gray-200 dark:border-charcoal-700">
                      <div>
                        <p className="text-xs font-semibold text-cool-gray-400 dark:text-cool-gray-500 mb-0.5">Shipping Destination</p>
                        <p className="text-sm font-bold text-charcoal-900 dark:text-white">{shippingInfo.fullName}</p>
                        <p className="text-xs text-charcoal-600 dark:text-cool-gray-400">
                          {shippingInfo.address}, {shippingInfo.city}, {shippingInfo.state} {shippingInfo.zipCode}
                        </p>
                        <p className="text-xs text-charcoal-500 dark:text-cool-gray-400 mt-0.5">📞 {shippingInfo.phone || 'No phone provided'}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setCurrentStep(1)}
                        className="text-xs text-gold-600 hover:text-gold-700 font-bold cursor-pointer"
                      >
                        Edit
                      </button>
                    </div>

                    {/* Delivery Provider */}
                    <div className="flex items-start justify-between p-3.5 rounded-xl bg-cool-gray-50 dark:bg-charcoal-900 border border-cool-gray-200 dark:border-charcoal-700">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{selectedCourier?.icon || '🚚'}</span>
                        <div>
                          <p className="text-xs font-semibold text-cool-gray-400 dark:text-cool-gray-500 mb-0.5">CourierPlus Service</p>
                          <p className="text-sm font-bold text-charcoal-900 dark:text-white">{selectedCourier?.name || 'CourierPlus Delivery'}</p>
                          <p className="text-xs text-charcoal-500 dark:text-cool-gray-400">
                            Est. Arrival: <strong>{selectedCourier?.estimatedDate || '2-4 business days'}</strong>
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-bold text-charcoal-900 dark:text-white block">
                          {selectedCourier?.price === 0 ? 'FREE' : formatPrice(shipping)}
                        </span>
                        <button
                          type="button"
                          onClick={() => setCurrentStep(2)}
                          className="text-xs text-gold-600 hover:text-gold-700 font-bold cursor-pointer"
                        >
                          Change
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Items Summary */}
                <div className="bg-white dark:bg-charcoal-800 border border-cool-gray-300 dark:border-charcoal-700 rounded-xl p-6">
                  <h3 className="font-bold text-charcoal-900 dark:text-white mb-3 text-sm">
                    Items in Bag ({cartItems.length})
                  </h3>
                  <div className="space-y-3">
                    {cartItems.map((item) => (
                      <div key={item.id} className="flex items-center gap-3 py-2 border-b border-cool-gray-100 dark:border-charcoal-700/60 last:border-0">
                        <div className="relative w-12 h-12 rounded-lg overflow-hidden shrink-0 border border-cool-gray-200 dark:border-charcoal-700">
                          <Image src={item.image} alt={item.name} fill className="object-cover" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-xs text-charcoal-900 dark:text-white truncate">{item.name}</h4>
                          <p className="text-[11px] text-charcoal-500 dark:text-cool-gray-400">{item.vendor} • Qty: {item.quantity}</p>
                        </div>
                        <span className="font-bold text-xs text-charcoal-900 dark:text-white shrink-0">
                          {formatPrice(item.price * item.quantity)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Error Banner */}
                {orderError && (
                  <div className="p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl text-xs text-red-700 dark:text-red-300 font-semibold flex items-start gap-2">
                    <span className="text-base shrink-0">⚠️</span>
                    <span className="leading-relaxed">{orderError}</span>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setCurrentStep(2)}
                    className="sm:w-1/3 py-4 border-2 border-cool-gray-300 dark:border-charcoal-600 bg-white dark:bg-charcoal-700 text-charcoal-700 dark:text-white rounded-xl font-bold hover:bg-cool-gray-100 dark:hover:bg-charcoal-600 transition-colors text-sm cursor-pointer"
                  >
                    ← Back to Delivery
                  </button>
                  <button
                    type="button"
                    onClick={handlePlaceOrder}
                    disabled={isProcessing}
                    className="sm:w-2/3 py-4 bg-gold-600 hover:bg-gold-500 active:scale-95 text-white font-bold rounded-xl transition-all shadow-md shadow-gold-600/20 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2 text-base"
                  >
                    {isProcessing ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                        <span>Connecting to Flutterwave Secure Gateway…</span>
                      </span>
                    ) : (
                      <span>Pay {formatPrice(total)} with Flutterwave 🔒</span>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ─ Right column — Order Summary ──────────────────────────────────── */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-charcoal-800 border border-cool-gray-300 dark:border-charcoal-700 rounded-xl p-6 sticky top-4">
              <h3 className="text-xl font-bold text-charcoal-900 dark:text-white mb-4">Order Summary</h3>

              <div className="space-y-3 mb-4">
                {cartItems.map((item) => (
                  <div key={item.id} className="flex justify-between text-sm gap-2">
                    <span className="text-charcoal-600 dark:text-cool-gray-400 truncate">{item.name} ×{item.quantity}</span>
                    <span className="font-medium text-charcoal-900 dark:text-white shrink-0">{formatPrice(item.price * item.quantity)}</span>
                  </div>
                ))}
              </div>

              <div className="border-t border-cool-gray-300 dark:border-charcoal-700 pt-4 space-y-2.5">
                <div className="flex justify-between text-sm">
                  <span className="text-charcoal-600 dark:text-cool-gray-400">Subtotal</span>
                  <span className="font-medium text-charcoal-900 dark:text-white">{formatPrice(subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-charcoal-600 dark:text-cool-gray-400">Service Fee (10%)</span>
                  <span className="font-medium text-charcoal-900 dark:text-white">{formatPrice(fees.buyerServiceFee)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <div>
                    <span className="text-charcoal-600 dark:text-cool-gray-400">Delivery</span>
                    {selectedCourier ? (
                      <>
                        <div className="flex items-center gap-1 mt-0.5">
                          <span className="text-xs">{selectedCourier.icon}</span>
                          <span className="text-[11px] text-charcoal-400 dark:text-cool-gray-500">{selectedCourier.name}</span>
                        </div>
                        <div className="text-[11px] text-charcoal-400 dark:text-cool-gray-500 mt-0.5">
                          Est. {selectedCourier.estimatedDate}
                        </div>
                      </>
                    ) : (
                      <div className="text-[11px] text-charcoal-400 dark:text-cool-gray-500 mt-0.5">
                        Calculated after address
                      </div>
                    )}
                  </div>
                  <span className={`font-medium shrink-0 ${!selectedCourier ? 'text-charcoal-500 dark:text-cool-gray-400' : selectedCourier.price === 0 ? 'text-green-600 dark:text-green-400' : 'text-charcoal-900 dark:text-white'}`}>
                    {selectedCourier ? (selectedCourier.price === 0 ? 'FREE' : formatPrice(shipping)) : '—'}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-charcoal-600 dark:text-cool-gray-400">Tax (8%)</span>
                  <span className="font-medium text-charcoal-900 dark:text-white">{formatPrice(tax)}</span>
                </div>
              </div>

              <div className="border-t border-cool-gray-300 dark:border-charcoal-700 mt-4 pt-4">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-bold text-charcoal-900 dark:text-white">Total</span>
                  <span className="text-xl font-bold text-gold-600">{formatPrice(total)}</span>
                </div>
                <p className="text-[11px] text-charcoal-400 dark:text-cool-gray-500 mt-1">Includes 10% service fee + 8% tax</p>
              </div>

              {/* Trust badges */}
              <div className="mt-5 pt-5 border-t border-cool-gray-200 dark:border-charcoal-700 space-y-2">
                <div className="flex items-center gap-2 text-xs text-charcoal-600 dark:text-cool-gray-400">
                  <span>🔒</span><span>Secure SSL Encrypted Payment</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-charcoal-600 dark:text-cool-gray-400">
                  <span>↩️</span><span>Free returns within 30 days</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-charcoal-600 dark:text-cool-gray-400">
                  <span>🛡️</span><span>Buyer protection guaranteed</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
