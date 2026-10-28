'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

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
  refreshCourierRates: (destination: string, weight?: number) => Promise<void>;
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
  const [loadingCouriers, setLoadingCouriers] = useState(true);
  const [refreshingRates, setRefreshingRates] = useState(false);

  // ── CourierPlus fallback option ─────────────────────────────────────────
  const COURIERPLUS_FALLBACK = {
    id: 'courierplus-standard',
    name: 'CourierPlus Standard',
    carrier: 'CourierPlus',
    tagline: 'Reliable nationwide delivery',
    icon: '🚚',
    price: 2500,
    deliveryDays: '3-5 business days',
    estimatedDate: '3-5 business days',
    features: ['Nationwide Coverage', 'Real-time Tracking'],
    tracking: 'standard',
    insurance: true,
    signature: true,
    available: true,
  };

  // Helper: map a raw CourierPlus rate to the courier card shape
  const mapRate = (rate: any, idx: number) => ({
    id: rate.id || `courierplus-${idx}`,
    name: rate.name || 'CourierPlus',
    carrier: rate.carrier || 'CourierPlus',
    tagline: rate.tagline || 'Reliable nationwide delivery',
    icon: '🚚',
    price: Number(rate.price ?? rate.amount ?? 2500),
    deliveryDays: rate.deliveryDays || rate.estimatedDelivery || '3-5 business days',
    estimatedDate: rate.estimatedDelivery || rate.deliveryDays || '3-5 business days',
    features: rate.features || ['Nationwide Coverage', 'Real-time Tracking'],
    tracking: 'standard',
    insurance: true,
    signature: true,
    available: rate.available !== false,
  });

  // Helper: apply a new couriers list and set default selection
  const applyCouriers = (mapped: any[]) => {
    setCouriers(mapped);
    setCheckoutData(prev => {
      const defaultId = mapped[0]?.id || '';
      const courier = mapped.find((c: any) => c.id === defaultId) || { price: 0 };
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
   * Called on mount (with defaults) and again whenever the shipping address changes.
   */
  const refreshCourierRates = async (destination: string, weight = 1) => {
    setRefreshingRates(true);
    try {
      const { getAuthToken } = await import('@/lib/api/auth');
      const token = getAuthToken();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch('/api/courierplus/rates', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          origin: 'Lagos', // default origin hub
          destination,
          weight,
          description: 'Marketplace order',
        }),
      });
      const json = await res.json();

      if (json.success && Array.isArray(json.data?.rates) && json.data.rates.length > 0) {
        const mapped = json.data.rates.map(mapRate);
        applyCouriers(mapped);
      } else {
        applyCouriers([COURIERPLUS_FALLBACK]);
      }
    } catch {
      applyCouriers([COURIERPLUS_FALLBACK]);
    } finally {
      setRefreshingRates(false);
    }
  };

  // Fetch live CourierPlus rates on mount with sensible defaults
  useEffect(() => {
    refreshCourierRates('Lagos', 1).finally(() => setLoadingCouriers(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
