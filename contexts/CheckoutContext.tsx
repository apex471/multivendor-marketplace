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
  type: 'card' | 'paypal';
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
  updateCartItems: (items: CartItem[]) => void;
  updateCartItem: (itemId: string, quantity: number) => void;
  removeCartItem: (itemId: string) => void;
  updateShippingAddress: (address: ShippingAddress) => void;
  updatePaymentMethod: (payment: PaymentMethod) => void;
  updateCourierId: (id: string) => void;
  applyCoupon: (code: string) => void;
  calculateTotals: () => void;
  clearCheckout: () => void;
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

  // Fetch real logistics providers on mount
  useEffect(() => {
    fetch('/api/logistics/providers')
      .then(r => r.json())
      .then(d => {
        if (d.success && d.data?.providers?.length > 0) {
          const mapped = d.data.providers.map((p: any) => ({
            id: p.id,
            name: p.name,
            carrier: p.name,
            tagline: p.description || 'Reliable logistics services',
            icon: p.logo ? '🚚' : '📦',
            price: Number(p.baseFee || 10),
            deliveryDays: p.estimatedDelivery || '3-5 business days',
            estimatedDate: p.estimatedDelivery || '3-5 business days',
            features: p.features || [],
            tracking: 'standard',
            insurance: true,
            signature: true,
            available: p.isActive !== false,
          }));
          setCouriers(mapped);
          
          // Set default selected courier ID
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
              total: subtotal - discountAmount + courier.price + tax
            };
          });
        }
      })
      .catch(() => {})
      .finally(() => setLoadingCouriers(false));
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
        updateCartItems,
        updateCartItem,
        removeCartItem,
        updateShippingAddress,
        updatePaymentMethod,
        updateCourierId,
        applyCoupon,
        calculateTotals,
        clearCheckout
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
