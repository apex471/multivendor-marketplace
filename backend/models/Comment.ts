import { db, docToObject } from '@/backend/config/firebase';
import { FieldValue } from 'firebase-admin/firestore';

export interface IComment {
  id?: string;
  postId: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  content: string;
  likes: number;
  createdAt?: Date;
  updatedAt?: Date;
}

const COMMENTS = 'comments';

export const Comment = {
  async create(data: Omit<IComment, 'id' | 'createdAt' | 'updatedAt'>): Promise<IComment & { id: string }> {
    const now = new Date();
    const doc = { ...data, likes: data.likes ?? 0, createdAt: now, updatedAt: now };
    const ref = await db.collection(COMMENTS).add(doc);
    return { id: ref.id, ...doc };
  },

  async find(filter: Record<string, unknown> = {}, opts?: { limit?: number; orderBy?: string; orderDir?: 'asc' | 'desc' }): Promise<(IComment & { id: string })[]> {
    let query = db.collection(COMMENTS) as FirebaseFirestore.Query;
    for (const [k, v] of Object.entries(filter)) {
      if (v !== undefined && v !== null) query = query.where(k, '==', v);
    }
    if (opts?.orderBy) query = query.orderBy(opts.orderBy, opts.orderDir ?? 'desc');
    if (opts?.limit)   query = query.limit(opts.limit);
    const snap = await query.get();
    return snap.docs.map(d => docToObject<IComment>(d)!);
  },

  async countDocuments(filter: Record<string, unknown> = {}): Promise<number> {
    let query = db.collection(COMMENTS) as FirebaseFirestore.Query;
    for (const [k, v] of Object.entries(filter)) {
      if (v !== undefined && v !== null) query = query.where(k, '==', v);
    }
    const snap = await query.count().get();
    return snap.data().count;
  },

  async findByIdAndDelete(id: string): Promise<void> {
    await db.collection(COMMENTS).doc(id).delete();
  },

  async increment(id: string, field: string, amount = 1): Promise<void> {
    await db.collection(COMMENTS).doc(id).update({ [field]: FieldValue.increment(amount) });
  },
};
