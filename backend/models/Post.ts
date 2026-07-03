import { db, docToObject } from '@/backend/config/firebase';
import { FieldValue } from 'firebase-admin/firestore';

export interface IPostProduct {
  id: string;
  name: string;
  price: number;
  image: string;
  vendorId: string;
  vendor: string;
}

export interface IPost {
  id?: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  authorRole: 'vendor' | 'brand' | 'customer';
  content: string;
  images: string[];
  product?: IPostProduct;
  hashtags: string[];
  likes: number;
  comments: number;
  shares: number;
  privacy: 'public' | 'followers' | 'private';
  status: 'published' | 'draft';
  createdAt?: Date;
  updatedAt?: Date;
}

const POSTS = 'posts';

export const Post = {
  async create(data: Omit<IPost, 'id' | 'createdAt' | 'updatedAt'>): Promise<IPost & { id: string }> {
    const now = new Date();
    const doc = {
      ...data,
      likes: data.likes ?? 0,
      comments: data.comments ?? 0,
      shares: data.shares ?? 0,
      privacy: data.privacy ?? 'public',
      status: data.status ?? 'published',
      images: data.images ?? [],
      hashtags: data.hashtags ?? [],
      createdAt: now,
      updatedAt: now,
    };
    const ref = await db.collection(POSTS).add(doc);
    return { id: ref.id, ...doc };
  },

  async findById(id: string): Promise<(IPost & { id: string }) | null> {
    const snap = await db.collection(POSTS).doc(id).get();
    return snap.exists ? docToObject<IPost>(snap) : null;
  },

  async find(filter: Record<string, unknown> = {}, opts?: { limit?: number; skip?: number; orderBy?: string; orderDir?: 'asc' | 'desc' }): Promise<(IPost & { id: string })[]> {
    let query = db.collection(POSTS) as FirebaseFirestore.Query;
    for (const [k, v] of Object.entries(filter)) {
      if (v !== undefined && v !== null) query = query.where(k, '==', v);
    }
    // NOTE: Do NOT add .orderBy() here — combining .where() filters with .orderBy()
    // on a different field requires a pre-created Firestore composite index.
    // Instead, fetch all matching docs and sort in-memory (performant for feeds < 5k posts).
    const snap = await query.get();
    let results = snap.docs.map(d => docToObject<IPost>(d)!);

    // In-memory sort
    if (opts?.orderBy) {
      const field = opts.orderBy as keyof IPost;
      const dir   = opts.orderDir === 'asc' ? 1 : -1;
      results.sort((a, b) => {
        const av = a[field] as Date | number | string | undefined;
        const bv = b[field] as Date | number | string | undefined;
        if (av == null && bv == null) return 0;
        if (av == null) return dir;
        if (bv == null) return -dir;
        if (av < bv) return -dir;
        if (av > bv) return dir;
        return 0;
      });
    }

    // In-memory pagination
    if (opts?.skip) results = results.slice(opts.skip);
    if (opts?.limit) results = results.slice(0, opts.limit);

    return results;
  },

  async countDocuments(filter: Record<string, unknown> = {}): Promise<number> {
    let query = db.collection(POSTS) as FirebaseFirestore.Query;
    for (const [k, v] of Object.entries(filter)) {
      if (v !== undefined && v !== null) query = query.where(k, '==', v);
    }
    const snap = await query.count().get();
    return snap.data().count;
  },

  async updateOne(id: string, updates: Partial<IPost>): Promise<void> {
    await db.collection(POSTS).doc(id).update({ ...updates, updatedAt: new Date() });
  },

  async findByIdAndDelete(id: string): Promise<(IPost & { id: string }) | null> {
    const snap = await db.collection(POSTS).doc(id).get();
    if (!snap.exists) return null;
    const post = docToObject<IPost>(snap)!;
    await db.collection(POSTS).doc(id).delete();
    return post;
  },

  async increment(id: string, field: string, amount = 1): Promise<void> {
    await db.collection(POSTS).doc(id).update({
      [field]: FieldValue.increment(amount),
      updatedAt: new Date(),
    });
  },

  // Get distinct hashtags for trending
  async distinctHashtags(filter: Record<string, unknown> = {}): Promise<Record<string, number>> {
    let query = db.collection(POSTS) as FirebaseFirestore.Query;
    for (const [k, v] of Object.entries(filter)) {
      if (v !== undefined && v !== null) query = query.where(k, '==', v);
    }
    const snap = await query.get();
    const counts: Record<string, number> = {};
    snap.docs.forEach(d => {
      const tags = d.data().hashtags as string[] ?? [];
      tags.forEach(t => { counts[t] = (counts[t] ?? 0) + 1; });
    });
    return counts;
  },
};
