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
  // Seed data removed — all orders now come from MongoDB or live order placement
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
