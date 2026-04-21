'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '../../../components/common/Header';
import Footer from '../../../components/common/Footer';
import { useCheckout } from '../../../contexts/CheckoutContext';
import { COURIERS, BADGE_STYLES, TRACKING_LABEL, getCourierById } from '../../../lib/couriers';
import { getAuthToken } from '../../../lib/api/auth';

interface SavedAddress {
  id: string;
  fullName: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  isDefault: boolean;
}

export default function ShippingPage() {
  const router = useRouter();
  const { checkoutData, updateShippingAddress, updateCourierId } = useCheckout();
  const [showNewAddressForm, setShowNewAddressForm] = useState(false);
  const [selectedAddressId, setSelectedAddressId] = useState<string>('');
  const [selectedCourierId, setSelectedCourierId] = useState<string>(checkoutData.selectedCourierId ?? 'quickbox');
  const selectedCourier = getCourierById(selectedCourierId);
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);

  useEffect(() => {
    const token = getAuthToken();
    if (!token) return;
    fetch('/api/users/me/addresses', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(json => {
        if (json.success) {
          setSavedAddresses(json.data.addresses ?? []);
          const def = (json.data.addresses ?? []).find((a: SavedAddress) => a.isDefault);
          if (def) { setSelectedAddressId(def.id); updateShippingAddress(def); }
        }
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAddressSelect = (address: SavedAddress) => {
    setSelectedAddressId(address.id);
    updateShippingAddress(address);
  };

  const handleNewAddressSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const newAddress = {
      fullName: formData.get('fullName') as string,
      phone: formData.get('phone') as string,
      addressLine1: formData.get('addressLine1') as string,
      addressLine2: formData.get('addressLine2') as string,
      city: formData.get('city') as string,
      state: formData.get('state') as string,
      zipCode: formData.get('zipCode') as string,
      country: formData.get('country') as string,
      isDefault: formData.get('isDefault') === 'on'
    };
    const token = getAuthToken();
    if (token) {
      const res = await fetch('/api/users/me/addresses', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(newAddress),
      });
      const json = await res.json();
      if (json.success) setSavedAddresses(json.data.addresses ?? []);
    }
    updateShippingAddress(newAddress);
    setShowNewAddressForm(false);
    router.push('/checkout/payment');
  };

  const [addressError, setAddressError] = useState('');

  const handleContinue = () => {
    if (!selectedAddressId && !checkoutData.shippingAddress) {
      setAddressError('Please select a shipping address to continue.');
      return;
    }
    setAddressError('');
    updateCourierId(selectedCourierId);
    router.push('/checkout/payment');
  };

  return (
    <div className="min-h-screen bg-white dark:bg-charcoal-900">
      <Header />

      <div className="container mx-auto px-4 py-8">
        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-center mb-4">
            {['Cart', 'Shipping', 'Payment', 'Review', 'Confirmation'].map((step, index) => (
              <div key={step} className="flex items-center">
                <div className={`flex items-center justify-center w-10 h-10 rounded-full ${
                  index <= 1 ? 'bg-gold-600 text-white' : 'bg-cool-gray-200 dark:bg-charcoal-700 text-charcoal-600 dark:text-cool-gray-400'
                }`}>
                  {index < 1 ? '✓' : index + 1}
                </div>
                {index < 4 && (
                  <div className={`w-12 sm:w-20 h-1 ${
                    index < 1 ? 'bg-gold-600' : 'bg-cool-gray-200 dark:bg-charcoal-700'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>

        <h1 className="text-3xl font-bold text-charcoal-900 dark:text-white mb-6">Shipping Address</h1>

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            {/* Saved Addresses */}
            {!showNewAddressForm && savedAddresses.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-charcoal-900 dark:text-white mb-4">
                  Select Shipping Address
                </h3>
                <div className="space-y-3">
                  {savedAddresses.map((address) => (
                    <div
                      key={address.id}
                      onClick={() => handleAddressSelect(address)}
                      className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                        selectedAddressId === address.id
                          ? 'border-gold-600 bg-gold-50 dark:bg-gold-900/10'
                          : 'border-cool-gray-300 dark:border-charcoal-700 hover:border-gold-400'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-charcoal-900 dark:text-white">
                              {address.fullName}
                            </span>
                            {address.isDefault && (
                              <span className="px-2 py-0.5 bg-gold-600 text-white text-xs rounded">Default</span>
                            )}
                          </div>
                          <p className="text-sm text-charcoal-700 dark:text-cool-gray-300">
                            {address.addressLine1}
                            {address.addressLine2 && `, ${address.addressLine2}`}
                          </p>
                          <p className="text-sm text-charcoal-700 dark:text-cool-gray-300">
                            {address.city}, {address.state} {address.zipCode}
                          </p>
                          <p className="text-sm text-charcoal-700 dark:text-cool-gray-300">{address.country}</p>
                          <p className="text-sm text-charcoal-600 dark:text-cool-gray-400 mt-1">
                            {address.phone}
                          </p>
                        </div>
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                          selectedAddressId === address.id
                            ? 'border-gold-600 bg-gold-600'
                            : 'border-cool-gray-300 dark:border-charcoal-700'
                        }`}>
                          {selectedAddressId === address.id && (
                            <div className="w-2 h-2 bg-white rounded-full" />
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => setShowNewAddressForm(true)}
                  className="mt-4 text-gold-600 dark:text-gold-500 hover:underline font-semibold"
                >
                  + Add New Address
                </button>
              </div>
            )}

            {/* New Address Form */}
            {showNewAddressForm && (
              <div className="bg-white dark:bg-charcoal-800 border border-cool-gray-300 dark:border-charcoal-700 rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-charcoal-900 dark:text-white">Add New Address</h3>
                  {savedAddresses.length > 0 && (
                    <button
                      onClick={() => setShowNewAddressForm(false)}
                      className="text-sm text-charcoal-600 dark:text-cool-gray-400 hover:text-gold-600"
                    >
                      ✕ Cancel
                    </button>
                  )}
                </div>
                <form onSubmit={handleNewAddressSubmit} className="space-y-4">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-charcoal-900 dark:text-white mb-2">
                        Full Name *
                      </label>
                      <input
                        type="text"
                        name="fullName"
                        required
                        className="w-full px-4 py-2 border border-cool-gray-300 dark:border-charcoal-700 rounded-lg bg-white dark:bg-charcoal-900 text-charcoal-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-charcoal-900 dark:text-white mb-2">
                        Phone Number *
                      </label>
                      <input
                        type="tel"
                        name="phone"
                        required
                        className="w-full px-4 py-2 border border-cool-gray-300 dark:border-charcoal-700 rounded-lg bg-white dark:bg-charcoal-900 text-charcoal-900 dark:text-white"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-charcoal-900 dark:text-white mb-2">
                      Address Line 1 *
                    </label>
                    <input
                      type="text"
                      name="addressLine1"
                      required
                      placeholder="Street address, P.O. box"
                      className="w-full px-4 py-2 border border-cool-gray-300 dark:border-charcoal-700 rounded-lg bg-white dark:bg-charcoal-900 text-charcoal-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-charcoal-900 dark:text-white mb-2">
                      Address Line 2
                    </label>
                    <input
                      type="text"
                      name="addressLine2"
                      placeholder="Apartment, suite, unit, building, floor, etc."
                      className="w-full px-4 py-2 border border-cool-gray-300 dark:border-charcoal-700 rounded-lg bg-white dark:bg-charcoal-900 text-charcoal-900 dark:text-white"
                    />
                  </div>
                  <div className="grid sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-charcoal-900 dark:text-white mb-2">
                        City *
                      </label>
                      <input
                        type="text"
                        name="city"
                        required
                        className="w-full px-4 py-2 border border-cool-gray-300 dark:border-charcoal-700 rounded-lg bg-white dark:bg-charcoal-900 text-charcoal-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-charcoal-900 dark:text-white mb-2">
                        State *
                      </label>
                      <input
                        type="text"
                        name="state"
                        required
                        className="w-full px-4 py-2 border border-cool-gray-300 dark:border-charcoal-700 rounded-lg bg-white dark:bg-charcoal-900 text-charcoal-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-charcoal-900 dark:text-white mb-2">
                        ZIP Code *
                      </label>
                      <input
                        type="text"
                        name="zipCode"
                        required
                        className="w-full px-4 py-2 border border-cool-gray-300 dark:border-charcoal-700 rounded-lg bg-white dark:bg-charcoal-900 text-charcoal-900 dark:text-white"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-charcoal-900 dark:text-white mb-2">
                      Country *
                    </label>
                    <select
                      name="country"
                      required
                      className="w-full px-4 py-2 border border-cool-gray-300 dark:border-charcoal-700 rounded-lg bg-white dark:bg-charcoal-900 text-charcoal-900 dark:text-white"
                    >
                      <option value="United States">United States</option>
                      <option value="Canada">Canada</option>
                      <option value="United Kingdom">United Kingdom</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      name="isDefault"
                      id="isDefault"
                      className="w-4 h-4 text-gold-600 border-cool-gray-300 rounded"
                    />
                    <label htmlFor="isDefault" className="text-sm text-charcoal-700 dark:text-cool-gray-300">
                      Set as default address
                    </label>
                  </div>
                  <button
                    type="submit"
                    className="w-full py-3 bg-gold-600 text-white rounded-lg hover:bg-gold-700 transition-colors font-semibold"
                  >
                    Save Address & Continue
                  </button>
                </form>
              </div>
            )}

            {/* Delivery Method */}
            {!showNewAddressForm && (
              <div className="mt-6">
                <h3 className="text-lg font-semibold text-charcoal-900 dark:text-white mb-4">Choose Delivery Method</h3>
                <div className="space-y-3">
                  {COURIERS.map((courier) => {
                    const isSelected    = selectedCourierId === courier.id;
                    const isUnavailable = !courier.available;
                    return (
                      <label
                        key={courier.id}
                        className={`relative flex gap-4 p-4 rounded-xl border-2 transition-all ${
                          isUnavailable
                            ? 'opacity-50 cursor-not-allowed border-cool-gray-200 dark:border-charcoal-700 bg-cool-gray-50 dark:bg-charcoal-900'
                            : isSelected
                            ? 'border-gold-500 bg-gold-50 dark:bg-gold-900/10 cursor-pointer'
                            : 'border-cool-gray-200 dark:border-charcoal-600 bg-white dark:bg-charcoal-800 hover:border-gold-300 hover:bg-gold-50/40 dark:hover:bg-gold-900/5 cursor-pointer'
                        }`}
                      >
                        <input type="radio" name="courier" value={courier.id}
                          checked={isSelected} disabled={isUnavailable}
                          onChange={() => setSelectedCourierId(courier.id)}
                          className="mt-1 w-4 h-4 shrink-0 accent-gold-600" />
                        <div className="text-3xl leading-none mt-0.5 shrink-0 select-none">{courier.icon}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <span className="font-bold text-charcoal-900 dark:text-white text-sm sm:text-base">{courier.name}</span>
                            {courier.badge && courier.badgeVariant && (
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${BADGE_STYLES[courier.badgeVariant]}`}>
                                {courier.badge}
                              </span>
                            )}
                            {isUnavailable && (
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-cool-gray-200 dark:bg-charcoal-700 text-charcoal-500 dark:text-cool-gray-400">
                                Not available in your area
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-charcoal-500 dark:text-cool-gray-400 mb-2">{courier.tagline}</p>
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mb-3">
                            <span className="flex items-center gap-1 text-xs font-semibold text-charcoal-700 dark:text-cool-gray-300">🕐 {courier.deliveryDays}</span>
                            <span className="flex items-center gap-1 text-xs text-charcoal-500 dark:text-cool-gray-400">📅 Est. <strong className="text-charcoal-700 dark:text-cool-gray-300">{courier.estimatedDate}</strong></span>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-cool-gray-100 dark:bg-charcoal-700 text-charcoal-600 dark:text-cool-gray-400">{TRACKING_LABEL[courier.tracking]}</span>
                            {courier.insurance && <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300">🛡️ Insured</span>}
                            {courier.signature && <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300">✍️ Signature</span>}
                            {courier.features.slice(2).map((f, i) => (
                              <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-cool-gray-100 dark:bg-charcoal-700 text-charcoal-600 dark:text-cool-gray-400">{f}</span>
                            ))}
                          </div>
                        </div>
                        <div className="text-right shrink-0 ml-2">
                          <div className={`font-bold text-lg leading-tight ${
                            courier.price === 0 ? 'text-green-600 dark:text-green-400' : 'text-charcoal-900 dark:text-white'
                          }`}>
                            {courier.price === 0 ? 'FREE' : `$${courier.price.toFixed(2)}`}
                          </div>
                          <div className="text-[10px] text-charcoal-500 dark:text-cool-gray-400 mt-0.5 max-w-20 text-right leading-tight">{courier.carrier}</div>
                        </div>
                      </label>
                    );
                  })}
                </div>
                <div className="mt-4 p-3 rounded-lg bg-cool-gray-50 dark:bg-charcoal-900 border border-cool-gray-200 dark:border-charcoal-700 flex items-start gap-2">
                  <span className="text-sm mt-0.5 shrink-0">ℹ️</span>
                  <p className="text-xs text-charcoal-500 dark:text-cool-gray-400">
                    Estimates are for business days and may vary for multi-vendor orders.
                    Same-day delivery is only available in select metropolitan areas.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Order Summary */}
          <div>
            <div className="bg-white dark:bg-charcoal-800 border border-cool-gray-300 dark:border-charcoal-700 rounded-lg p-6 sticky top-4">
              <h3 className="text-xl font-bold text-charcoal-900 dark:text-white mb-4">Order Summary</h3>
              <div className="space-y-3 mb-4 pb-4 border-b border-cool-gray-300 dark:border-charcoal-700">
                <div className="flex justify-between text-charcoal-700 dark:text-cool-gray-300">
                  <span>Subtotal</span>
                  <span>${checkoutData.subtotal.toFixed(2)}</span>
                </div>
                {checkoutData.discount > 0 && (
                  <div className="flex justify-between text-green-600 dark:text-green-400">
                    <span>Discount</span>
                    <span>-${((checkoutData.subtotal * checkoutData.discount) / 100).toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-charcoal-700 dark:text-cool-gray-300">
                  <div>
                    <span>Delivery</span>
                    <div className="text-xs text-charcoal-400 dark:text-cool-gray-500 mt-0.5">{selectedCourier.icon} {selectedCourier.name}</div>
                  </div>
                  <span className={selectedCourier.price === 0 ? 'text-green-600 dark:text-green-400 font-semibold' : ''}>
                    {selectedCourier.price === 0 ? 'FREE' : `$${selectedCourier.price.toFixed(2)}`}
                  </span>
                </div>
              </div>
              <div className="flex justify-between text-lg font-bold text-charcoal-900 dark:text-white mb-6">
                <span>Total</span>
                <span className="text-gold-600">
                  ${(checkoutData.subtotal - (checkoutData.subtotal * checkoutData.discount / 100) + selectedCourier.price).toFixed(2)}
                </span>
              </div>
              {!showNewAddressForm && (
                <>
                  {addressError && (
                    <div className="mb-2 px-4 py-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm">
                      {addressError}
                    </div>
                  )}
                  <button
                    onClick={handleContinue}
                    className="w-full py-4 bg-gold-600 text-white rounded-lg hover:bg-gold-700 transition-colors font-semibold"
                  >
                    Continue to Payment
                  </button>
                </>
              )}
              <button
                onClick={() => router.push('/checkout/cart-review')}
                className="w-full mt-3 py-2 text-charcoal-600 dark:text-cool-gray-400 hover:text-gold-600 text-sm"
              >
                ← Back to Cart
              </button>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
