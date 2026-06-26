'use client';

import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';

// ── Types ─────────────────────────────────────────────────────────────────────
type ToastVariant = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  message: string;
  variant: ToastVariant;
  duration?: number;
}

interface ToastContextValue {
  toast: (message: string, variant?: ToastVariant, duration?: number) => void;
  success: (message: string, duration?: number) => void;
  error:   (message: string, duration?: number) => void;
  warning: (message: string, duration?: number) => void;
  info:    (message: string, duration?: number) => void;
}

// ── Context ───────────────────────────────────────────────────────────────────
const ToastContext = createContext<ToastContextValue | null>(null);

// ── Hook ─────────────────────────────────────────────────────────────────────
export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within <ToastProvider>');
  return ctx;
}

// ── Icons ─────────────────────────────────────────────────────────────────────
const ICONS: Record<ToastVariant, string> = {
  success: '✓',
  error:   '✕',
  warning: '⚠',
  info:    'ℹ',
};

const STYLES: Record<ToastVariant, { bg: string; border: string; icon: string; text: string }> = {
  success: {
    bg:     'bg-emerald-900/95',
    border: 'border-emerald-500/50',
    icon:   'bg-emerald-500 text-white',
    text:   'text-emerald-100',
  },
  error: {
    bg:     'bg-red-900/95',
    border: 'border-red-500/50',
    icon:   'bg-red-500 text-white',
    text:   'text-red-100',
  },
  warning: {
    bg:     'bg-amber-900/95',
    border: 'border-amber-500/50',
    icon:   'bg-amber-500 text-white',
    text:   'text-amber-100',
  },
  info: {
    bg:     'bg-charcoal-800/95',
    border: 'border-gold-500/50',
    icon:   'bg-gold-500 text-charcoal-900',
    text:   'text-cool-gray-100',
  },
};

// ── Single Toast Item ──────────────────────────────────────────────────────────
function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: (id: string) => void }) {
  const s = STYLES[toast.variant];
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Animate in
    const raf = requestAnimationFrame(() => setVisible(true));

    // Auto-dismiss
    timerRef.current = setTimeout(() => {
      setVisible(false);
      setTimeout(() => onRemove(toast.id), 300);
    }, toast.duration ?? 4000);

    return () => {
      cancelAnimationFrame(raf);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [toast.id, toast.duration, onRemove]);

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={`
        flex items-start gap-3 px-4 py-3.5 rounded-xl shadow-2xl border backdrop-blur-sm
        min-w-[280px] max-w-[420px] cursor-pointer select-none
        transition-all duration-300 ease-out
        ${s.bg} ${s.border}
        ${visible ? 'translate-x-0 opacity-100' : 'translate-x-8 opacity-0'}
      `}
      onClick={() => {
        setVisible(false);
        setTimeout(() => onRemove(toast.id), 300);
      }}
    >
      {/* Icon */}
      <span className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold mt-0.5 ${s.icon}`}>
        {ICONS[toast.variant]}
      </span>

      {/* Message */}
      <p className={`flex-1 text-sm font-medium leading-snug ${s.text}`}>
        {toast.message}
      </p>

      {/* Dismiss */}
      <button
        className="shrink-0 text-white/40 hover:text-white/80 transition-colors text-lg leading-none mt-0.5"
        aria-label="Dismiss notification"
      >
        ×
      </button>
    </div>
  );
}

// ── Provider ──────────────────────────────────────────────────────────────────
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const remove = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const addToast = useCallback((message: string, variant: ToastVariant = 'info', duration = 4000) => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    setToasts(prev => {
      // Cap at 5 toasts at once
      const capped = prev.length >= 5 ? prev.slice(1) : prev;
      return [...capped, { id, message, variant, duration }];
    });
  }, []);

  const ctx: ToastContextValue = {
    toast:   addToast,
    success: (msg, dur) => addToast(msg, 'success', dur),
    error:   (msg, dur) => addToast(msg, 'error',   dur),
    warning: (msg, dur) => addToast(msg, 'warning', dur),
    info:    (msg, dur) => addToast(msg, 'info',    dur),
  };

  return (
    <ToastContext.Provider value={ctx}>
      {children}

      {/* Toast Container — fixed bottom-right */}
      <div
        aria-label="Notifications"
        className="fixed bottom-6 right-4 sm:right-6 z-[9999] flex flex-col gap-3 pointer-events-none"
      >
        {toasts.map(t => (
          <div key={t.id} className="pointer-events-auto">
            <ToastItem toast={t} onRemove={remove} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
