import { db, docToObject } from '@/backend/config/firebase';

export interface IMessage {
  id?: string;
  conversationId: string;
  senderId: string;
  senderName?: string;
  text: string;
  read: boolean;
  createdAt?: Date;
}

const MESSAGES = 'messages';

export const Message = {
  async create(data: Omit<IMessage, 'id' | 'createdAt'>): Promise<IMessage & { id: string }> {
    const now = new Date();
    const doc = { ...data, read: data.read ?? false, createdAt: now };
    const ref = await db.collection(MESSAGES).add(doc);
    return { id: ref.id, ...doc };
  },

  async find(filter: Record<string, unknown> = {}, opts?: { limit?: number; orderBy?: string; orderDir?: 'asc' | 'desc' }): Promise<(IMessage & { id: string })[]> {
    let query = db.collection(MESSAGES) as FirebaseFirestore.Query;
    for (const [k, v] of Object.entries(filter)) {
      if (v !== undefined && v !== null) query = query.where(k, '==', v);
    }

    if (opts?.limit)   query = query.limit(opts.limit);
    const snap = await query.get();
    return snap.docs.map(d => docToObject<IMessage>(d)!);
  },

  async updateMany(filter: Record<string, unknown>, updates: Partial<IMessage>): Promise<void> {
    let query = db.collection(MESSAGES) as FirebaseFirestore.Query;
    for (const [k, v] of Object.entries(filter)) {
      if (v !== undefined) query = query.where(k, '==', v);
    }
    const snap = await query.get();
    const batch = db.batch();
    snap.docs.forEach(d => batch.update(d.ref, updates as Record<string, unknown>));
    await batch.commit();
  },

  async countDocuments(filter: Record<string, unknown> = {}): Promise<number> {
    let query = db.collection(MESSAGES) as FirebaseFirestore.Query;
    for (const [k, v] of Object.entries(filter)) {
      if (v !== undefined && v !== null) query = query.where(k, '==', v);
    }
    const snap = await query.count().get();
    return snap.data().count;
  },
};
