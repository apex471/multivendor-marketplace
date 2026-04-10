'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CartItem {
  id: string;        // unique key: `${productId}-${size}-${color}-${ts}`
  productId: string;
  name: string;
  price: number;
  image: string;
  vendor: string;
  size: string;
  color: string;
  quantity: number;
}

interface CartContextType {
  items: CartItem[];
  addItem: (item: Omit<CartItem, 'id'>) => void;
  removeItem: (itemId: string) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  clearCart: () => void;
  subtotal: number;
  total: number;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const CartContext = createContext<CartContextType | undefined>(undefined);

const STORAGE_KEY = 'marketplace_cart';

// ─── Provider ─────────────────────────────────────────────────────────────────

export function CartProvider({ children }: { children: ReactNode }) {
  // Lazy initializer — runs once on mount, safe for SSR (typeof window guard)
  const [items, setItems] = useState<CartItem[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed: CartItem[] = JSON.parse(stored);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch { /* ignore */ }
    return [];
  });

  // Persist to localStorage whenever items change (client-side effect only)
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch { /* ignore quota errors */ }
  }, [items]);

  // ── Mutations ──────────────────────────────────────────────────────────────

  const addItem = (newItem: Omit<CartItem, 'id'>) => {
    setItems(prev => {
      const existing = prev.find(
        i =>
          i.productId === newItem.productId &&
          i.size === newItem.size &&
          i.color === newItem.color
      );
      if (existing) {
        return prev.map(i =>
          i.id === existing.id
            ? { ...i, quantity: i.quantity + newItem.quantity }
            : i
        );
      }
      const id = `${newItem.productId}-${newItem.size}-${newItem.color}-${Date.now()}`;
      return [...prev, { ...newItem, id }];
    });
  };

  const removeItem = (itemId: string) => {
    setItems(prev => prev.filter(i => i.id !== itemId));
  };

  const updateQuantity = (itemId: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(itemId);
      return;
    }
    setItems(prev =>
      prev.map(i => (i.id === itemId ? { ...i, quantity } : i))
    );
  };

  const clearCart = () => setItems([]);

  // ── Derived values ─────────────────────────────────────────────────────────

  const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const total = subtotal; // tax / shipping added at checkout

  return (
    <CartContext.Provider
      value={{ items, addItem, removeItem, updateQuantity, clearCart, subtotal, total }}
    >
      {children}
    </CartContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within a CartProvider');
  return ctx;
}
