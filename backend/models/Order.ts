import { db, docToObject } from '@/backend/config/firebase';

export interface IOrderItem {
  productId?: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
  vendor?: string;
  size?: string;
  color?: string;
}

export interface IShippingAddress {
  fullName: string;
  phone?: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

export interface IOrderCourier {
  id: string;
  name: string;
  icon?: string;
  price: number;
  eta?: string;
  carrier?: string;
  tracking?: string;
}

export type OrderStatus = 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded';

export interface IOrder {
  id?: string;
  orderId: string;
  customerId?: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  items: IOrderItem[];
  shippingAddress: IShippingAddress;
  paymentMethod: { type: string; cardLast4?: string; cardHolder?: string };
  courier: IOrderCourier;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  subtotal: number;
  shippingCost: number;
  tax: number;
  discount: number;
  total: number;
  couponCode?: string;
  trackingNumber?: string;
  assignedDriverId?: string;
  assignedDriverName?: string;
  acceptedAt?: Date;
  pickedUpAt?: Date;
  deliveredAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

const ORDERS = 'orders';

export const Order = {
  async create(data: Omit<IOrder, 'id' | 'createdAt' | 'updatedAt'>): Promise<IOrder & { id: string }> {
    const now = new Date();
    const doc = {
      ...data,
      status: data.status ?? 'pending',
      paymentStatus: data.paymentStatus ?? 'pending',
      createdAt: now,
      updatedAt: now,
    };
    const ref = await db.collection(ORDERS).add(doc);
    return { id: ref.id, ...doc };
  },

  async findById(id: string): Promise<(IOrder & { id: string }) | null> {
    // Try Firestore doc ID first
    const snap = await db.collection(ORDERS).doc(id).get();
    if (snap.exists) return docToObject<IOrder>(snap);
    // Fall back to orderId field
    return this.findOne({ orderId: id });
  },

  async findOne(filter: Record<string, unknown>): Promise<(IOrder & { id: string }) | null> {
    let query = db.collection(ORDERS) as FirebaseFirestore.Query;
    for (const [k, v] of Object.entries(filter)) {
      if (v !== undefined && v !== null) query = query.where(k, '==', v);
    }
    const snap = await query.limit(1).get();
    if (snap.empty) return null;
    return docToObject<IOrder>(snap.docs[0]);
  },

  async find(filter: Record<string, unknown> = {}, opts?: { limit?: number; skip?: number; orderBy?: string; orderDir?: 'asc' | 'desc' }): Promise<(IOrder & { id: string })[]> {
    let query = db.collection(ORDERS) as FirebaseFirestore.Query;
    for (const [k, v] of Object.entries(filter)) {
      if (v !== undefined && v !== null) query = query.where(k, '==', v);
    }

    if (opts?.limit)   query = query.limit(opts.limit);
    const snap = await query.get();
    let results = snap.docs.map(d => docToObject<IOrder>(d)!);
    if (opts?.skip) results = results.slice(opts.skip);
    return results;
  },

  async countDocuments(filter: Record<string, unknown> = {}): Promise<number> {
    let query = db.collection(ORDERS) as FirebaseFirestore.Query;
    for (const [k, v] of Object.entries(filter)) {
      if (v !== undefined && v !== null) query = query.where(k, '==', v);
    }
    const snap = await query.count().get();
    return snap.data().count;
  },

  async updateOne(id: string, updates: Partial<IOrder>): Promise<void> {
    // Try Firestore doc ID first
    const snap = await db.collection(ORDERS).doc(id).get();
    if (snap.exists) {
      await db.collection(ORDERS).doc(id).update({ ...updates, updatedAt: new Date() });
      return;
    }
    // Fall back to orderId field
    const q = await db.collection(ORDERS).where('orderId', '==', id).limit(1).get();
    if (!q.empty) {
      await q.docs[0].ref.update({ ...updates, updatedAt: new Date() });
    }
  },

  async findByOrderId(orderId: string): Promise<(IOrder & { id: string }) | null> {
    return this.findOne({ orderId });
  },

  // Alias for updateOne — accepts Firestore doc ID directly
  async updateById(id: string, updates: Partial<IOrder> & Record<string, unknown>): Promise<void> {
    await db.collection(ORDERS).doc(id).update({ ...updates, updatedAt: new Date() });
  },
};
