import { db, docToObject } from '@/backend/config/firebase';

export interface IWishlist {
  id?: string;
  userId: string;
  productId: string;
  createdAt?: Date;
}

const WISHLIST = 'wishlists';

export const Wishlist = {
  async create(data: Omit<IWishlist, 'id' | 'createdAt'>): Promise<IWishlist & { id: string }> {
    const now = new Date();
    const doc = { ...data, createdAt: now };
    const ref = await db.collection(WISHLIST).add(doc);
    return { id: ref.id, ...doc };
  },

  async findOne(filter: Record<string, unknown>): Promise<(IWishlist & { id: string }) | null> {
    let query = db.collection(WISHLIST) as FirebaseFirestore.Query;
    for (const [k, v] of Object.entries(filter)) {
      if (v !== undefined && v !== null) query = query.where(k, '==', v);
    }
    const snap = await query.limit(1).get();
    return snap.empty ? null : docToObject<IWishlist>(snap.docs[0]);
  },

  async find(filter: Record<string, unknown> = {}, opts?: { orderBy?: string; orderDir?: 'asc' | 'desc' }): Promise<(IWishlist & { id: string })[]> {
    let query = db.collection(WISHLIST) as FirebaseFirestore.Query;
    for (const [k, v] of Object.entries(filter)) {
      if (v !== undefined && v !== null) query = query.where(k, '==', v);
    }

    const snap = await query.get();
    return snap.docs.map(d => docToObject<IWishlist>(d)!);
  },

  // Upsert: create if not exists
  async upsert(userId: string, productId: string): Promise<IWishlist & { id: string }> {
    const existing = await this.findOne({ userId, productId });
    if (existing) return existing;
    return this.create({ userId, productId });
  },

  async findOneAndDelete(filter: Record<string, unknown>): Promise<void> {
    let query = db.collection(WISHLIST) as FirebaseFirestore.Query;
    for (const [k, v] of Object.entries(filter)) {
      if (v !== undefined && v !== null) query = query.where(k, '==', v);
    }
    const snap = await query.limit(1).get();
    if (!snap.empty) await snap.docs[0].ref.delete();
  },

  async deleteMany(filter: Record<string, unknown>): Promise<void> {
    let query = db.collection(WISHLIST) as FirebaseFirestore.Query;
    for (const [k, v] of Object.entries(filter)) {
      if (v !== undefined && v !== null) query = query.where(k, '==', v);
    }
    const snap = await query.get();
    const batch = db.batch();
    snap.docs.forEach(d => batch.delete(d.ref));
    await batch.commit();
  },
};
