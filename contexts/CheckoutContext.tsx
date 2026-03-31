'use client';

import { createContext, useContext, useState, ReactNode } from 'react';

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
  shippingMethod: 'standard' | 'express' | 'overnight';
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
  updateShippingMethod: (method: 'standard' | 'express' | 'overnight') => void;
  applyCoupon: (code: string) => void;
  calculateTotals: () => void;
  clearCheckout: () => void;
}

const CheckoutContext = createContext<CheckoutContextType | undefined>(undefined);

export function CheckoutProvider({ children }: { children: ReactNode }) {
  const [checkoutData, setCheckoutData] = useState<CheckoutData>({
    cartItems: [
      {
        id: '1',
        name: 'Designer Silk Dress',
        price: 299.99,
        quantity: 1,
        image: 'https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=300',
        size: 'M',
        color: 'Navy Blue',
        vendor: 'Luxury Fashion Co.'
      },
      {
        id: '2',
        name: 'Evening Clutch',
        price: 149.99,
        quantity: 1,
        image: 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=300',
        color: 'Black',
        vendor: 'Elite Accessories'
      }
    ],
    shippingAddress: null,
    paymentMethod: null,
    shippingMethod: 'standard',
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

  const updateShippingMethod = (method: 'standard' | 'express' | 'overnight') => {
    setCheckoutData(prev => ({ ...prev, shippingMethod: method }));
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
      
      let shippingCost = 0;
      if (prev.shippingMethod === 'standard') shippingCost = 10;
      else if (prev.shippingMethod === 'express') shippingCost = 25;
      else if (prev.shippingMethod === 'overnight') shippingCost = 50;
      
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
      shippingMethod: 'standard',
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
        updateShippingMethod,
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
