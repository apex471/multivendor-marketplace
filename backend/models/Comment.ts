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
    // NOTE: Do NOT use .orderBy() + .where() together without a composite index.
    // Fetch all matching docs and sort in-memory instead.
    if (opts?.limit) query = query.limit(opts.limit);
    const snap = await query.get();
    let results = snap.docs.map(d => docToObject<IComment>(d)!);

    // In-memory sort
    if (opts?.orderBy) {
      const field = opts.orderBy as keyof IComment;
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

    return results;
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
