'use client';

import { createContext, useContext, useState, ReactNode } from 'react';
import { COURIERS } from '../lib/couriers';

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
    selectedCourierId: 'quickbox',
    couponCode: '',
    discount: 0,
    subtotal: 0,
    shippingCost: 0,
    tax: 0,
    total: 0
  });

  const updateCartItems = (items: CartItem[]) => {
    setCheckoutData(prev => ({ ...prev, cartItems: items }));
    calculateTotals();
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
      
      const courier = COURIERS.find(c => c.id === prev.selectedCourierId) ?? COURIERS[2];
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
      selectedCourierId: 'quickbox',
      couponCode: '',
      discount: 0,
      subtotal: 0,
      shippingCost: 0,
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
