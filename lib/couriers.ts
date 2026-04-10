// ─── Shared courier definitions ───────────────────────────────────────────────
// Used by: app/checkout/page.tsx, app/checkout/shipping/page.tsx, contexts/CheckoutContext.tsx

export interface Courier {
  id: string;
  name: string;
  carrier: string;
  tagline: string;
  icon: string;
  price: number;
  deliveryDays: string;
  estimatedDate: string;
  features: string[];
  badge?: string;
  badgeVariant?: 'gold' | 'green' | 'orange' | 'red';
  tracking: 'basic' | 'standard' | 'realtime';
  insurance: boolean;
  signature: boolean;
  available: boolean;
}

export const COURIERS: Courier[] = [
  {
    id: 'ecopost',
    name: 'EcoPost Free',
    carrier: 'EcoPost Logistics',
    tagline: 'Budget-friendly & carbon-neutral',
    icon: '🌿',
    price: 0,
    deliveryDays: '7–14 business days',
    estimatedDate: 'Apr 28 – May 8',
    features: ['Basic tracking', 'Eco-packaging', 'Carbon neutral delivery'],
    badge: 'Free',
    badgeVariant: 'green',
    tracking: 'basic',
    insurance: false,
    signature: false,
    available: true,
  },
  {
    id: 'swiftship',
    name: 'SwiftShip Standard',
    carrier: 'SwiftShip Express',
    tagline: 'Reliable everyday delivery',
    icon: '📦',
    price: 5.99,
    deliveryDays: '5–7 business days',
    estimatedDate: 'Apr 17–21',
    features: ['Full tracking', 'SMS updates', 'Secure packaging', 'Drop-safe handling'],
    tracking: 'standard',
    insurance: false,
    signature: false,
    available: true,
  },
  {
    id: 'quickbox',
    name: 'QuickBox Express',
    carrier: 'QuickBox Courier',
    tagline: 'Fast, tracked & fully insured',
    icon: '🚀',
    price: 12.99,
    deliveryDays: '2–3 business days',
    estimatedDate: 'Apr 14–15',
    features: ['Real-time GPS tracking', 'SMS & Email updates', 'Up to $200 insurance', 'Priority handling', 'Delivery photo'],
    badge: 'Most Popular',
    badgeVariant: 'gold',
    tracking: 'realtime',
    insurance: true,
    signature: false,
    available: true,
  },
  {
    id: 'flashrun',
    name: 'FlashRunner Next Day',
    carrier: 'FlashRunner Logistics',
    tagline: 'In your hands by tomorrow',
    icon: '⚡',
    price: 24.99,
    deliveryDays: '1 business day',
    estimatedDate: 'Apr 11',
    features: ['Live GPS tracking', 'Dedicated courier', 'Signature required', 'Up to $500 insurance', 'Saturday delivery', 'Priority packaging'],
    badge: 'Fastest',
    badgeVariant: 'orange',
    tracking: 'realtime',
    insurance: true,
    signature: true,
    available: true,
  },
  {
    id: 'zerowait',
    name: 'ZeroWait Same Day',
    carrier: 'ZeroWait Urban Delivery',
    tagline: 'Order now, receive today',
    icon: '🏎️',
    price: 34.99,
    deliveryDays: 'Same day',
    estimatedDate: 'Today by 9 pm',
    features: ['Minute-by-minute tracking', 'Photo on delivery', 'Premium packaging', 'Up to $1000 insurance', 'Signature required'],
    badge: 'Ultra Fast',
    badgeVariant: 'red',
    tracking: 'realtime',
    insurance: true,
    signature: true,
    available: false, // geo-limited — not available in all areas
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

/** Look up shipping cost by courier ID (defaults to QuickBox if not found) */
export function getCourierById(id: string): Courier {
  return COURIERS.find(c => c.id === id) ?? COURIERS[2];
}
