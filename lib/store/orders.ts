/**
 * Shared in-memory order store.
 * In production replace with a real DB (MongoDB Order model).
 * Module-level variable persists across requests in the same Node.js process (dev).
 */

export type OrderStatus =
  | 'pending'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled';

export interface StoredOrderCourier {
  id: string;
  name: string;
  icon: string;
  price: number;
  eta: string;
  carrier: string;
  tracking: string;
}

export interface StoredOrder {
  id: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  vendorName: string;
  vendorAddress: string;
  products: string[];
  items?: Array<{ id: string; name: string; price: number; quantity: number; image: string; vendor: string }>;
  total: number;
  subtotal: number;
  tax: number;
  status: OrderStatus;
  paymentStatus: string;
  orderDate: string;
  shippingAddress: string;
  estimatedDistance: string;
  estimatedTime: string;
  trackingNumber?: string;
  courier: StoredOrderCourier;
  // Driver assignment
  assignedDriverId?: string;
  assignedDriverName?: string;
  acceptedAt?: string;
  pickedUpAt?: string;
  deliveredAt?: string;
}

const STORE: Record<string, StoredOrder> = {
  'ORD-2024-1001': {
    id: 'ORD-2024-1001',
    customerName: 'John Doe',
    customerEmail: 'john@example.com',
    customerPhone: '+1 (555) 234-5678',
    vendorName: 'Luxury Fashion Co.',
    vendorAddress: '120 5th Ave, New York, NY 10011',
    products: ['Designer Jacket', 'Premium Sneakers'],
    total: 549.99, subtotal: 449.99, tax: 36.00,
    status: 'pending', paymentStatus: 'paid',
    orderDate: '2024-12-15T10:30:00',
    shippingAddress: '123 Main St, New York, NY 10001',
    estimatedDistance: '2.4 mi', estimatedTime: '18 min',
    courier: { id: 'quickbox', name: 'QuickBox Express', icon: '🚀', price: 12.99, eta: 'Apr 14–15', carrier: 'QuickBox Courier', tracking: 'realtime' },
  },
  'ORD-2024-1002': {
    id: 'ORD-2024-1002',
    customerName: 'Jane Smith',
    customerEmail: 'jane@example.com',
    customerPhone: '+1 (555) 876-4321',
    vendorName: 'Elite Wear',
    vendorAddress: '890 Madison Ave, New York, NY 10021',
    products: ['Silk Dress', 'Leather Handbag'],
    total: 899.00, subtotal: 820.00, tax: 65.60,
    status: 'pending', paymentStatus: 'paid',
    orderDate: '2024-12-14T15:45:00',
    shippingAddress: '456 Oak Ave, Brooklyn, NY 11201',
    estimatedDistance: '4.1 mi', estimatedTime: '26 min',
    courier: { id: 'swiftship', name: 'SwiftShip Standard', icon: '📦', price: 5.99, eta: 'Apr 17–21', carrier: 'SwiftShip Express', tracking: 'standard' },
  },
  'ORD-2024-1003': {
    id: 'ORD-2024-1003',
    customerName: 'Mike Johnson',
    customerEmail: 'mike@example.com',
    customerPhone: '+1 (555) 345-6789',
    vendorName: 'Gucci Official',
    vendorAddress: '725 5th Ave, New York, NY 10022',
    products: ['Gucci Loafers'],
    total: 1200.00, subtotal: 1100.00, tax: 88.00,
    status: 'shipped', paymentStatus: 'paid',
    orderDate: '2024-12-13T09:20:00',
    trackingNumber: 'TRK987654321',
    shippingAddress: '789 Pine Rd, Chicago, IL 60601',
    estimatedDistance: '5.6 mi', estimatedTime: '32 min',
    courier: { id: 'flashrun', name: 'FlashRunner Next Day', icon: '⚡', price: 24.99, eta: 'Apr 11', carrier: 'FlashRunner Logistics', tracking: 'realtime' },
  },
  'ORD-2024-1004': {
    id: 'ORD-2024-1004',
    customerName: 'Sarah Williams',
    customerEmail: 'sarah@example.com',
    customerPhone: '+1 (555) 500-6000',
    vendorName: 'Luxury Fashion Co.',
    vendorAddress: '120 5th Ave, New York, NY 10011',
    products: ['Winter Coat', 'Cashmere Scarf'],
    total: 1450.00, subtotal: 1340.00, tax: 107.20,
    status: 'delivered', paymentStatus: 'paid',
    orderDate: '2024-12-10T11:15:00',
    trackingNumber: 'TRK555666777',
    shippingAddress: '321 Elm St, Bronx, NY 10451',
    estimatedDistance: '6.3 mi', estimatedTime: '38 min',
    courier: { id: 'flashrun', name: 'FlashRunner Next Day', icon: '⚡', price: 24.99, eta: 'Apr 11', carrier: 'FlashRunner Logistics', tracking: 'realtime' },
    deliveredAt: '2026-04-10T09:51:00',
  },
  'ORD-2024-1005': {
    id: 'ORD-2024-1005',
    customerName: 'Tom Brown',
    customerEmail: 'tom@example.com',
    customerPhone: '+1 (555) 300-4000',
    vendorName: 'Elite Wear',
    vendorAddress: '890 Madison Ave, New York, NY 10021',
    products: ['Sports Watch'],
    total: 299.99, subtotal: 277.00, tax: 22.16,
    status: 'cancelled', paymentStatus: 'refunded',
    orderDate: '2024-12-12T14:00:00',
    shippingAddress: '555 Maple Dr, Queens, NY 11385',
    estimatedDistance: '5.8 mi', estimatedTime: '34 min',
    courier: { id: 'swiftship', name: 'SwiftShip Standard', icon: '📦', price: 5.99, eta: 'Apr 17–21', carrier: 'SwiftShip Express', tracking: 'standard' },
  },
  'ORD-2024-1006': {
    id: 'ORD-2024-1006',
    customerName: 'Emily Davis',
    customerEmail: 'emily@example.com',
    customerPhone: '+1 (555) 100-2000',
    vendorName: 'Gucci Official',
    vendorAddress: '400 Park Ave, New York, NY 10022',
    products: ['Designer Belt', 'Sunglasses'],
    total: 850.00, subtotal: 786.00, tax: 62.88,
    status: 'pending', paymentStatus: 'paid',
    orderDate: '2024-12-16T08:30:00',
    shippingAddress: '777 Birch Ln, Brooklyn, NY 11221',
    estimatedDistance: '3.2 mi', estimatedTime: '22 min',
    courier: { id: 'quickbox', name: 'QuickBox Express', icon: '🚀', price: 12.99, eta: 'Apr 14–15', carrier: 'QuickBox Courier', tracking: 'realtime' },
  },
};

// ── CRUD helpers ─────────────────────────────────────────────────────────────

export function getAll(): StoredOrder[] {
  return Object.values(STORE).sort(
    (a, b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime()
  );
}

export function getById(id: string): StoredOrder | undefined {
  return STORE[id];
}

export function add(order: StoredOrder): void {
  STORE[order.id] = order;
}

export function update(id: string, updates: Partial<StoredOrder>): StoredOrder | undefined {
  if (!STORE[id]) return undefined;
  STORE[id] = { ...STORE[id], ...updates };
  return STORE[id];
}

export function getQueue(): StoredOrder[] {
  return Object.values(STORE)
    .filter(o => o.status === 'pending' && !o.assignedDriverId)
    .sort((a, b) => new Date(a.orderDate).getTime() - new Date(b.orderDate).getTime());
}

export function getDriverHistory(driverId: string): StoredOrder[] {
  return Object.values(STORE)
    .filter(o => o.assignedDriverId === driverId && (o.status === 'delivered' || o.status === 'cancelled'))
    .sort((a, b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime());
}

export function getDriverActive(driverId: string): StoredOrder | undefined {
  return Object.values(STORE).find(
    o => o.assignedDriverId === driverId &&
      (o.status === 'processing' || o.status === 'shipped')
  );
}
