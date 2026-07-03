import { db, docToObject } from '@/backend/config/firebase';

export interface INotification {
  id?: string;
  recipientId: string;
  type: 'follow' | 'like' | 'comment' | 'share' | 'order' | 'system' | 'approval';
  actorId?: string;
  actorName?: string;
  actorAvatar?: string;
  text: string;
  link?: string;
  image?: string;
  isRead: boolean;
  createdAt?: Date;
}

const NOTIFICATIONS = 'notifications';

export const Notification = {
  async create(data: Omit<INotification, 'id' | 'createdAt'>): Promise<INotification & { id: string }> {
    const now = new Date();
    const doc = { ...data, isRead: data.isRead ?? false, createdAt: now };
    const ref = await db.collection(NOTIFICATIONS).add(doc);
    return { id: ref.id, ...doc };
  },

  async find(
    filter: Record<string, unknown> = {},
    opts?: { limit?: number; skip?: number; orderBy?: string; orderDir?: 'asc' | 'desc' }
  ): Promise<(INotification & { id: string })[]> {
    let query = db.collection(NOTIFICATIONS) as FirebaseFirestore.Query;

    // Apply only non-boolean equality filters to Firestore
    // (boolean filters like isRead==false require composite indexes)
    for (const [k, v] of Object.entries(filter)) {
      if (v !== undefined && v !== null && typeof v !== 'boolean') {
        query = query.where(k, '==', v);
      }
    }

    const snap = await query.get();
    let results = snap.docs.map(d => docToObject<INotification>(d)!);

    // Apply boolean filters in-memory (avoids composite index requirement)
    for (const [k, v] of Object.entries(filter)) {
      if (typeof v === 'boolean') {
        results = results.filter(r => (r as unknown as Record<string, unknown>)[k] === v);
      }
    }

    // Sort in-memory (orderBy on different field requires composite index)
    results.sort((a, b) => {
      const at = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bt = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return opts?.orderDir === 'asc' ? at - bt : bt - at; // default newest first
    });

    // Paginate in-memory
    if (opts?.skip)  results = results.slice(opts.skip);
    if (opts?.limit) results = results.slice(0, opts.limit);

    return results;
  },

  async countDocuments(filter: Record<string, unknown> = {}): Promise<number> {
    let query = db.collection(NOTIFICATIONS) as FirebaseFirestore.Query;
    for (const [k, v] of Object.entries(filter)) {
      if (v !== undefined && v !== null && typeof v !== 'boolean') {
        query = query.where(k, '==', v);
      }
    }
    const snap = await query.get();
    // Apply boolean filters in-memory
    let count = 0;
    for (const doc of snap.docs) {
      const data = doc.data();
      const passes = Object.entries(filter).every(([k, v]) =>
        typeof v === 'boolean' ? data[k] === v : true
      );
      if (passes) count++;
    }
    return count;
  },

  async updateOne(id: string, updates: Partial<INotification>): Promise<void> {
    await db.collection(NOTIFICATIONS).doc(id).update(updates as Record<string, unknown>);
  },

  async updateMany(filter: Record<string, unknown>, updates: Partial<INotification>): Promise<void> {
    let query = db.collection(NOTIFICATIONS) as FirebaseFirestore.Query;
    for (const [k, v] of Object.entries(filter)) {
      if (v !== undefined && typeof v !== 'boolean') query = query.where(k, '==', v);
    }
    const snap = await query.get();
    if (snap.empty) return;
    const batch = db.batch();
    snap.docs.forEach(d => {
      const data = d.data();
      const matches = Object.entries(filter).every(([k, v]) =>
        typeof v === 'boolean' ? data[k] === v : true
      );
      if (matches) batch.update(d.ref, updates as Record<string, unknown>);
    });
    await batch.commit();
  },
};
