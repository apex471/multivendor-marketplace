// ─── Shared courier definitions ───────────────────────────────────────────────
// Only CourierPlus is enabled as the official platform logistics provider.

export interface Courier {
  id: string;
  name: string;
  carrier: string;
  tagline: string;
  icon: string;
  price: number; // Base USD price (for platform checkout & currency conversion)
  priceNgn?: number; // Exact Naira price from CourierPlus tariff
  deliveryDays: string;
  estimatedDate: string;
  features: string[];
  badge?: string;
  badgeVariant?: 'gold' | 'green' | 'orange' | 'red';
  tracking: 'basic' | 'standard' | 'realtime';
  insurance: boolean;
  signature: boolean;
  available: boolean;
  breakdown?: {
    baseTariff?: number;
    vat?: number;
    onforwarding?: number;
    amountDue?: number;
    serviceType?: string;
  };
}

export const COURIERS: Courier[] = [
  {
    id: 'courierplus-standard',
    name: 'CourierPlus Standard Delivery',
    carrier: 'CourierPlus Nigeria',
    tagline: 'Reliable nationwide delivery across all 36 states',
    icon: '🚚',
    price: 2.33, // $2.33 USD base (converts to ₦3,500 via formatPrice)
    priceNgn: 3500,
    deliveryDays: '2–4 business days',
    estimatedDate: '2–4 business days',
    features: ['Full live GPS tracking', 'SMS & Email dispatch alerts', 'Secure tamper-evident packaging', 'Doorstep delivery'],
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
    tagline: 'Expedited priority delivery with premium handling',
    icon: '⚡',
    price: 3.67, // $3.67 USD base (converts to ₦5,500 via formatPrice)
    priceNgn: 5500,
    deliveryDays: '1–2 business days',
    estimatedDate: 'Next day / 48 hrs',
    features: ['Minute-by-minute tracking', 'Dedicated dispatch courier', 'Signature & photo on delivery', 'Up to ₦500,000 transit cover', 'Priority dispatch handling'],
    badge: 'Fastest',
    badgeVariant: 'orange',
    tracking: 'realtime',
    insurance: true,
    signature: true,
    available: true,
  },
];

/** Maps badgeVariant → Tailwind classes */
export const BADGE_STYLES: Record<string, string> = {
  gold:   'bg-gold-100 dark:bg-gold-900/30 text-gold-700 dark:text-gold-300',
  green:  'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
  orange: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300',
  red:    'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300',
};

/** Maps tracking level → display label */
export const TRACKING_LABEL: Record<string, string> = {
  basic:    '📍 Basic tracking',
  standard: '📦 Full tracking',
  realtime: '📡 Real-time GPS',
};

/** Look up shipping cost by courier ID (defaults to CourierPlus Standard) */
export function getCourierById(id: string): Courier {
  return COURIERS.find(c => c.id === id) ?? COURIERS[0];
}
