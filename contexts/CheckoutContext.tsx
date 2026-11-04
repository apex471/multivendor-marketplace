'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { calculateParcelSpecs } from '@/lib/parcel';

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
  size?: string;
  color?: string;
  vendor: string;
}

interface ShippingAddress {
  fullName: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  isDefault?: boolean;
}

interface PaymentMethod {
  id: string;
  type: 'card' | 'paypal' | 'bank';
  cardNumber?: string;
  cardHolder?: string;
  expiryDate?: string;
  cvv?: string;
  isDefault?: boolean;
}

interface CheckoutData {
  cartItems: CartItem[];
  shippingAddress: ShippingAddress | null;
  paymentMethod: PaymentMethod | null;
  selectedCourierId: string;
  couponCode: string;
  discount: number;
  subtotal: number;
  shippingCost: number;
  tax: number;
  total: number;
}

interface CheckoutContextType {
  checkoutData: CheckoutData;
  couriers: any[];
  loadingCouriers: boolean;
  refreshingRates: boolean;
  updateCartItems: (items: CartItem[]) => void;
  updateCartItem: (itemId: string, quantity: number) => void;
  removeCartItem: (itemId: string) => void;
  updateShippingAddress: (address: ShippingAddress) => void;
  updatePaymentMethod: (payment: PaymentMethod) => void;
  updateCourierId: (id: string) => void;
  applyCoupon: (code: string) => void;
  calculateTotals: () => void;
  clearCheckout: () => void;
  refreshCourierRates: (destination?: string | { state?: string; city?: string; address?: string } | null, weight?: number) => Promise<void>;
}

const CheckoutContext = createContext<CheckoutContextType | undefined>(undefined);

export function CheckoutProvider({ children }: { children: ReactNode }) {
  const [checkoutData, setCheckoutData] = useState<CheckoutData>({
    cartItems: [],
    shippingAddress: null,
    paymentMethod: null,
    selectedCourierId: '',
    couponCode: '',
    discount: 0,
    subtotal: 0,
    shippingCost: 0,
    tax: 0,
    total: 0
  });

  const [couriers, setCouriers] = useState<any[]>([]);
  const [loadingCouriers, setLoadingCouriers] = useState(false);
  const [refreshingRates, setRefreshingRates] = useState(false);

  // ── CourierPlus fallback options ─────────────────────────────────────────
  // Prices in USD base for standard platform checkout and formatPrice conversion
  const COURIERPLUS_FALLBACKS = [
    {
      id: 'courierplus-standard',
      name: 'CourierPlus Standard Delivery',
      carrier: 'CourierPlus Nigeria',
      tagline: 'Reliable nationwide delivery across all 36 states',
      icon: '🚚',
      price: 2.33,
      priceNgn: 3500,
      currency: 'NGN',
      deliveryDays: '2–4 business days',
      estimatedDate: '2–4 business days',
      features: ['Full live GPS tracking', 'SMS & Email alerts', 'Tamper-evident packaging', 'Doorstep delivery'],
      badge: 'Official Carrier',
      badgeVariant: 'gold',
      tracking: 'realtime',
      insurance: true,
      signature: true,
      available: true,
    },
    {
      id: 'courierplus-express',
      name: 'CourierPlus Express Priority',
      carrier: 'CourierPlus Nigeria',
      tagline: 'Expedited priority dispatch with dedicated courier handling',
      icon: '⚡',
      price: 3.67,
      priceNgn: 5500,
      currency: 'NGN',
      deliveryDays: '1–2 business days',
      estimatedDate: 'Priority / Next day',
      features: ['Minute-by-minute tracking', 'Dedicated courier', 'Signature & photo on delivery', 'Up to ₦500,000 cover'],
      badge: 'Fastest',
      badgeVariant: 'orange',
      tracking: 'realtime',
      insurance: true,
      signature: true,
      available: true,
    },
  ];

  // Helper: map a raw CourierPlus rate to the courier card shape
  const mapRate = (rate: any, idx: number) => {
    // Determine normalized USD price:
    // If incoming price/amount is in raw NGN (> 100), convert to USD so formatPrice doesn't double-multiply
    const rawVal = Number(rate.price ?? rate.amount ?? 2.33);
    const usdPrice = rawVal > 100 ? Math.round((rawVal / 1500) * 100) / 100 : rawVal;

    return {
      id: rate.id || `courierplus-${idx}`,
      name: rate.name || 'CourierPlus Standard Delivery',
      carrier: rate.carrier || 'CourierPlus Nigeria',
      tagline: rate.tagline || 'Official CourierPlus live delivery service',
      icon: rate.icon || (rate.id?.includes('express') ? '⚡' : '🚚'),
      price: usdPrice,
      priceNgn: rate.priceNgn ?? (rawVal > 100 ? rawVal : Math.round(usdPrice * 1500)),
      currency: rate.currency || 'NGN',
      deliveryDays: rate.deliveryDays || rate.estimatedDelivery || '2–4 business days',
      estimatedDate: rate.estimatedDate || rate.estimatedDelivery || rate.deliveryDays || '2–4 business days',
      features: rate.features || ['Full live GPS tracking', 'Doorstep delivery'],
      badge: rate.badge || (rate.id?.includes('express') ? 'Fastest' : 'Official Carrier'),
      badgeVariant: rate.badgeVariant || (rate.id?.includes('express') ? 'orange' : 'gold'),
      tracking: rate.tracking || 'realtime',
      insurance: true,
      signature: true,
      available: rate.available !== false,
      breakdown: rate.breakdown,
    };
  };

  // Helper: apply a new couriers list and set default selection
  const applyCouriers = (mapped: any[]) => {
    setCouriers(mapped);
    setCheckoutData(prev => {
      const defaultId = mapped.some((c: any) => c.id === prev.selectedCourierId)
        ? prev.selectedCourierId
        : (mapped[0]?.id || 'courierplus-standard');
      const courier = mapped.find((c: any) => c.id === defaultId) || mapped[0] || { price: 2.33 };
      const subtotal = prev.cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      const discountAmount = (subtotal * prev.discount) / 100;
      const tax = (subtotal - discountAmount) * 0.08;
      return {
        ...prev,
        selectedCourierId: defaultId,
        shippingCost: courier.price,
        total: subtotal - discountAmount + courier.price + tax,
      };
    });
  };

  /**
   * Fetch live rates from CourierPlus and update the couriers list.
   * Only called when the client provides their delivery location (State / City / Address).
   * Calculates dynamic parcel size & weight from cart items.
   */
  const refreshCourierRates = async (destination?: string | { state?: string; city?: string; address?: string } | null, weight?: number) => {
    if (!destination) {
      setCouriers([]);
      setCheckoutData(prev => {
        const subtotal = prev.cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const discountAmount = (subtotal * prev.discount) / 100;
        const tax = (subtotal - discountAmount) * 0.08;
        return {
          ...prev,
          selectedCourierId: '',
          shippingCost: 0,
          total: subtotal - discountAmount + tax,
        };
      });
      return;
    }

    const stateStr = typeof destination === 'string' ? '' : (destination.state || '');
    const cityStr = typeof destination === 'string' ? destination : (destination.city || destination.address || '');
    const targetDest = typeof destination === 'string' ? destination : (stateStr || cityStr);

    if (!targetDest || !targetDest.trim()) {
      setCouriers([]);
      return;
    }

    // Dynamic parcel size & volumetric weight calculation from cart items
    const parcel = calculateParcelSpecs(checkoutData.cartItems);
    const safeWeight = (weight && weight > 0) ? weight : parcel.billableWeight;

    setRefreshingRates(true);
    setLoadingCouriers(true);
    try {
      const { getAuthToken } = await import('@/lib/api/auth');
      const token = getAuthToken();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const payload = {
        origin: 'Lagos',
        state: stateStr,
        city: cityStr,
        address: typeof destination === 'string' ? destination : destination.address,
        destination: targetDest,
        weight: safeWeight,
        description: parcel.summaryText,
      };

      const res = await fetch('/api/courierplus/rates', {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });
      const json = await res.json();

      if (json.success && Array.isArray(json.data?.rates) && json.data.rates.length > 0) {
        const mapped = json.data.rates.map(mapRate);
        applyCouriers(mapped);
      } else {
        applyCouriers(COURIERPLUS_FALLBACKS);
      }
    } catch {
      applyCouriers(COURIERPLUS_FALLBACKS);
    } finally {
      setRefreshingRates(false);
      setLoadingCouriers(false);
    }
  };

  const updateCartItems = (items: CartItem[]) => {
    setCheckoutData(prev => ({ ...prev, cartItems: items }));
    setTimeout(calculateTotals, 0);
  };

  const updateCartItem = (itemId: string, quantity: number) => {
    setCheckoutData(prev => ({
      ...prev,
      cartItems: prev.cartItems.map(item =>
        item.id === itemId ? { ...item, quantity } : item
      )
    }));
    setTimeout(calculateTotals, 0);
  };

  const removeCartItem = (itemId: string) => {
    setCheckoutData(prev => ({
      ...prev,
      cartItems: prev.cartItems.filter(item => item.id !== itemId)
    }));
    setTimeout(calculateTotals, 0);
  };

  const updateShippingAddress = (address: ShippingAddress) => {
    setCheckoutData(prev => ({ ...prev, shippingAddress: address }));
    if (address && (address.state || address.city)) {
      refreshCourierRates(address);
    }
  };

  const updatePaymentMethod = (payment: PaymentMethod) => {
    setCheckoutData(prev => ({ ...prev, paymentMethod: payment }));
  };

  const updateCourierId = (id: string) => {
    setCheckoutData(prev => ({ ...prev, selectedCourierId: id }));
    setTimeout(calculateTotals, 0);
  };

  const applyCoupon = (code: string) => {
    setCheckoutData(prev => {
      let discount = 0;
      if (code.toUpperCase() === 'SAVE10') {
        discount = 10;
      } else if (code.toUpperCase() === 'WELCOME20') {
        discount = 20;
      }
      return { ...prev, couponCode: code, discount };
    });
    setTimeout(calculateTotals, 0);
  };

  const calculateTotals = () => {
    setCheckoutData(prev => {
      const subtotal = prev.cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      
      const courier = couriers.find(c => c.id === prev.selectedCourierId) || { price: 0 };
      const shippingCost = courier.price;
      
      const discountAmount = (subtotal * prev.discount) / 100;
      const tax = (subtotal - discountAmount) * 0.08; // 8% tax
      const total = subtotal - discountAmount + shippingCost + tax;
      
      return {
        ...prev,
        subtotal,
        shippingCost,
        tax,
        total
      };
    });
  };

  const clearCheckout = () => {
    setCheckoutData({
      cartItems: [],
      shippingAddress: null,
      paymentMethod: null,
      selectedCourierId: couriers[0]?.id || '',
      couponCode: '',
      discount: 0,
      subtotal: 0,
      shippingCost: couriers[0]?.price || 0,
      tax: 0,
      total: 0
    });
  };

  // Calculate totals on mount
  useState(() => {
    calculateTotals();
  });

  return (
    <CheckoutContext.Provider
      value={{
        checkoutData,
        couriers,
        loadingCouriers,
        refreshingRates,
        updateCartItems,
        updateCartItem,
        removeCartItem,
        updateShippingAddress,
        updatePaymentMethod,
        updateCourierId,
        applyCoupon,
        calculateTotals,
        clearCheckout,
        refreshCourierRates,
      }}
    >
      {children}
    </CheckoutContext.Provider>
  );
}

export function useCheckout() {
  const context = useContext(CheckoutContext);
  if (!context) {
    throw new Error('useCheckout must be used within CheckoutProvider');
  }
  return context;
}
