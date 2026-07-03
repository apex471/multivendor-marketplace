import { db, docToObject, snapToObject } from '@/backend/config/firebase';
import { FieldValue } from 'firebase-admin/firestore';

export interface IProductVariant {
  size: string;
  color: string;
  stock: number;
  sku?: string;
}

export interface IProduct {
  id?: string;
  name: string;
  description: string;
  vendorId: string;
  vendorName: string;
  category: string;
  price: number;
  salePrice?: number;
  costPrice?: number;
  stock: number;
  sku?: string;
  tags: string[];
  variants: IProductVariant[];
  lowStockAlert: number;
  status: 'pending' | 'active' | 'rejected' | 'suspended';
  featured: boolean;
  salesCount: number;
  rating: number;
  reviewCount: number;
  rejectionReason?: string;
  images: string[];
  videos: string[];
  createdAt?: Date;
  updatedAt?: Date;
}

const PRODUCTS = 'products';

export const Product = {
  async create(data: Omit<IProduct, 'id' | 'createdAt' | 'updatedAt'>): Promise<IProduct & { id: string }> {
    const now = new Date();
    const doc = {
      ...data,
      status: data.status ?? 'pending',
      featured: data.featured ?? false,
      salesCount: data.salesCount ?? 0,
      rating: data.rating ?? 0,
      reviewCount: data.reviewCount ?? 0,
      tags: data.tags ?? [],
      variants: data.variants ?? [],
      images: data.images ?? [],
      videos: data.videos ?? [],
      lowStockAlert: data.lowStockAlert ?? 5,
      stock: data.stock ?? 0,
      createdAt: now,
      updatedAt: now,
    };
    const ref = await db.collection(PRODUCTS).add(doc);
    return { id: ref.id, ...doc };
  },

  async findById(id: string, opts?: { includesCostPrice?: boolean }): Promise<(IProduct & { id: string }) | null> {
    const snap = await db.collection(PRODUCTS).doc(id).get();
    if (!snap.exists) return null;
    const p = docToObject<IProduct>(snap)!;
    if (!opts?.includesCostPrice) delete (p as any).costPrice;
    return p;
  },

  async findOne(filter: Record<string, unknown>): Promise<(IProduct & { id: string }) | null> {
    let query = db.collection(PRODUCTS) as FirebaseFirestore.Query;
    for (const [k, v] of Object.entries(filter)) {
      if (v !== undefined && v !== null) query = query.where(k, '==', v);
    }
    const snap = await query.limit(1).get();
    if (snap.empty) return null;
    return docToObject<IProduct>(snap.docs[0]);
  },

  async find(filter: Record<string, unknown> = {}, opts?: { limit?: number; skip?: number; orderBy?: string; orderDir?: 'asc' | 'desc'; hideCostPrice?: boolean }): Promise<(IProduct & { id: string })[]> {
    let query = db.collection(PRODUCTS) as FirebaseFirestore.Query;

    for (const [k, v] of Object.entries(filter)) {
      if (v !== undefined && v !== null) query = query.where(k, '==', v);
    }

    // NOTE: Do NOT add .orderBy() here when a .where() filter is active —
    // Firestore requires a composite index for where+orderBy on different fields.
    // We sort in-memory below instead, which is safe for our page sizes (<=2000).
    // Only apply a Firestore-level limit when there are no filters (full scan).
    const hasFilter = Object.keys(filter).some(k => filter[k] !== undefined && filter[k] !== null);
    if (!hasFilter && opts?.limit) {
      query = query.limit(opts.limit);
    }

    const snap = await query.get();
    let results = snap.docs.map(d => docToObject<IProduct>(d)!);

    // In-memory sort (avoids composite index requirement)
    if (opts?.orderBy) {
      const field = opts.orderBy as keyof IProduct;
      const dir   = opts.orderDir ?? 'desc';
      results.sort((a, b) => {
        const av = a[field] as unknown;
        const bv = b[field] as unknown;
        if (av == null && bv == null) return 0;
        if (av == null) return 1;
        if (bv == null) return -1;
        if (av instanceof Date && bv instanceof Date) {
          return dir === 'asc' ? av.getTime() - bv.getTime() : bv.getTime() - av.getTime();
        }
        if (typeof av === 'number' && typeof bv === 'number') {
          return dir === 'asc' ? av - bv : bv - av;
        }
        const as = String(av);
        const bs = String(bv);
        return dir === 'asc' ? as.localeCompare(bs) : bs.localeCompare(as);
      });
    }

    if (opts?.skip) results = results.slice(opts.skip);
    if (opts?.limit && (hasFilter || opts.skip)) results = results.slice(0, opts.limit);
    if (opts?.hideCostPrice !== false) results.forEach(p => delete (p as any).costPrice);
    return results;
  },

  async countDocuments(filter: Record<string, unknown> = {}): Promise<number> {
    let query = db.collection(PRODUCTS) as FirebaseFirestore.Query;
    for (const [k, v] of Object.entries(filter)) {
      if (v !== undefined && v !== null) query = query.where(k, '==', v);
    }
    const snap = await query.count().get();
    return snap.data().count;
  },

  async distinct(field: string, filter: Record<string, unknown> = {}): Promise<string[]> {
    let query = db.collection(PRODUCTS) as FirebaseFirestore.Query;
    for (const [k, v] of Object.entries(filter)) {
      if (v !== undefined && v !== null) query = query.where(k, '==', v);
    }
    const snap = await query.get();
    const vals = new Set<string>();
    snap.docs.forEach(d => {
      const val = d.data()[field];
      if (val) vals.add(String(val));
    });
    return Array.from(vals).sort();
  },

  async updateOne(id: string, updates: Partial<IProduct>): Promise<void> {
    await db.collection(PRODUCTS).doc(id).update({ ...updates, updatedAt: new Date() });
  },

  async updateMany(filter: Record<string, unknown>, updates: Partial<IProduct>): Promise<void> {
    let query = db.collection(PRODUCTS) as FirebaseFirestore.Query;
    for (const [k, v] of Object.entries(filter)) {
      if (v !== undefined) query = query.where(k, '==', v);
    }
    const snap = await query.get();
    const batch = db.batch();
    snap.docs.forEach(d => batch.update(d.ref, { ...updates, updatedAt: new Date() }));
    await batch.commit();
  },

  async findByIdAndDelete(id: string): Promise<(IProduct & { id: string }) | null> {
    const snap = await db.collection(PRODUCTS).doc(id).get();
    if (!snap.exists) return null;
    const product = docToObject<IProduct>(snap)!;
    await db.collection(PRODUCTS).doc(id).delete();
    return product;
  },

  async increment(id: string, field: string, amount = 1): Promise<void> {
    await db.collection(PRODUCTS).doc(id).update({
      [field]: FieldValue.increment(amount),
      updatedAt: new Date(),
    });
  },
};
