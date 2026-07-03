import { db, docToObject } from '@/backend/config/firebase';
import { FieldValue } from 'firebase-admin/firestore';

export interface IReview {
  id?: string;
  productId: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  rating: number; // 1-5
  title?: string;
  content: string;
  helpful: number;
  verified: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

const REVIEWS = 'reviews';

export const Review = {
  async create(data: Omit<IReview, 'id' | 'createdAt' | 'updatedAt'>): Promise<IReview & { id: string }> {
    const now = new Date();
    const doc = { ...data, helpful: data.helpful ?? 0, verified: data.verified ?? false, createdAt: now, updatedAt: now };
    const ref = await db.collection(REVIEWS).add(doc);
    return { id: ref.id, ...doc };
  },

  async findOne(filter: Record<string, unknown>): Promise<(IReview & { id: string }) | null> {
    let query = db.collection(REVIEWS) as FirebaseFirestore.Query;
    for (const [k, v] of Object.entries(filter)) {
      if (v !== undefined && v !== null) query = query.where(k, '==', v);
    }
    const snap = await query.limit(1).get();
    return snap.empty ? null : docToObject<IReview>(snap.docs[0]);
  },

  async find(filter: Record<string, unknown> = {}, opts?: { limit?: number; skip?: number; orderBy?: string; orderDir?: 'asc' | 'desc' }): Promise<(IReview & { id: string })[]> {
    let query = db.collection(REVIEWS) as FirebaseFirestore.Query;
    for (const [k, v] of Object.entries(filter)) {
      if (v !== undefined && v !== null) query = query.where(k, '==', v);
    }

    if (opts?.limit)   query.limit(opts.limit);
    const snap = await query.get();
    let results = snap.docs.map(d => docToObject<IReview>(d)!);
    if (opts?.skip) results = results.slice(opts.skip);
    return results;
  },

  async countDocuments(filter: Record<string, unknown> = {}): Promise<number> {
    let query = db.collection(REVIEWS) as FirebaseFirestore.Query;
    for (const [k, v] of Object.entries(filter)) {
      if (v !== undefined && v !== null) query = query.where(k, '==', v);
    }
    const snap = await query.count().get();
    return snap.data().count;
  },

  async averageRating(productId: string): Promise<number> {
    const snap = await db.collection(REVIEWS).where('productId', '==', productId).get();
    if (snap.empty) return 0;
    const total = snap.docs.reduce((sum, d) => sum + (d.data().rating as number), 0);
    return Math.round((total / snap.docs.length) * 10) / 10;
  },

  async increment(id: string, field: string, amount = 1): Promise<void> {
    await db.collection(REVIEWS).doc(id).update({ [field]: FieldValue.increment(amount) });
  },
};
