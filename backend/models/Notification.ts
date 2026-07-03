import { db, docToObject } from '@/backend/config/firebase';

export interface INotification {
  id?: string;
  recipientId: string;
  type: 'follow' | 'like' | 'comment' | 'order' | 'system' | 'approval';
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

  async find(filter: Record<string, unknown> = {}, opts?: { limit?: number; skip?: number; orderBy?: string; orderDir?: 'asc' | 'desc' }): Promise<(INotification & { id: string })[]> {
    let query = db.collection(NOTIFICATIONS) as FirebaseFirestore.Query;
    for (const [k, v] of Object.entries(filter)) {
      if (v !== undefined && v !== null) query = query.where(k, '==', v);
    }

    if (opts?.limit)   query.limit(opts.limit);
    const snap = await query.get();
    let results = snap.docs.map(d => docToObject<INotification>(d)!);
    if (opts?.skip) results = results.slice(opts.skip);
    return results;
  },

  async countDocuments(filter: Record<string, unknown> = {}): Promise<number> {
    let query = db.collection(NOTIFICATIONS) as FirebaseFirestore.Query;
    for (const [k, v] of Object.entries(filter)) {
      if (v !== undefined && v !== null) query = query.where(k, '==', v);
    }
    const snap = await query.count().get();
    return snap.data().count;
  },

  async updateOne(id: string, updates: Partial<INotification>): Promise<void> {
    await db.collection(NOTIFICATIONS).doc(id).update(updates as Record<string, unknown>);
  },

  async updateMany(filter: Record<string, unknown>, updates: Partial<INotification>): Promise<void> {
    let query = db.collection(NOTIFICATIONS) as FirebaseFirestore.Query;
    for (const [k, v] of Object.entries(filter)) {
      if (v !== undefined) query = query.where(k, '==', v);
    }
    const snap = await query.get();
    const batch = db.batch();
    snap.docs.forEach(d => batch.update(d.ref, updates as Record<string, unknown>));
    await batch.commit();
  },
};
