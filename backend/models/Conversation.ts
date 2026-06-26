import { db, docToObject } from '@/backend/config/firebase';

export interface IConversation {
  id?: string;
  participants: string[];     // [userId1, userId2]
  lastMessage: string;
  lastMessageAt: Date;
  lastSenderId?: string;
  unreadCounts?: Record<string, number>; // { userId: count }
  createdAt?: Date;
  updatedAt?: Date;
}

const CONVERSATIONS = 'conversations';

export const Conversation = {
  async create(data: Omit<IConversation, 'id' | 'createdAt' | 'updatedAt'>): Promise<IConversation & { id: string }> {
    const now = new Date();
    const doc = { ...data, unreadCounts: data.unreadCounts ?? {}, createdAt: now, updatedAt: now };
    const ref = await db.collection(CONVERSATIONS).add(doc);
    return { id: ref.id, ...doc };
  },

  async findById(id: string): Promise<(IConversation & { id: string }) | null> {
    const snap = await db.collection(CONVERSATIONS).doc(id).get();
    return snap.exists ? docToObject<IConversation>(snap) : null;
  },

  // Find conversation where both participants are present
  async findByParticipants(userId1: string, userId2: string): Promise<(IConversation & { id: string }) | null> {
    // Firestore doesn't support $all natively, so we query by one participant
    // and filter in-memory for the other
    const snap = await db.collection(CONVERSATIONS)
      .where('participants', 'array-contains', userId1)
      .get();
    const match = snap.docs.find(d => {
      const parts = d.data().participants as string[];
      return parts.includes(userId2) && parts.length === 2;
    });
    return match ? docToObject<IConversation>(match) : null;
  },

  async findByParticipant(userId: string, opts?: { limit?: number; orderBy?: string; orderDir?: 'asc' | 'desc' }): Promise<(IConversation & { id: string })[]> {
    let query = db.collection(CONVERSATIONS).where('participants', 'array-contains', userId) as FirebaseFirestore.Query;
    if (opts?.orderBy) query = query.orderBy(opts.orderBy, opts.orderDir ?? 'desc');
    if (opts?.limit)   query = query.limit(opts.limit);
    const snap = await query.get();
    return snap.docs.map(d => docToObject<IConversation>(d)!);
  },

  async updateOne(id: string, updates: Partial<IConversation>): Promise<void> {
    await db.collection(CONVERSATIONS).doc(id).update({ ...updates, updatedAt: new Date() });
  },
};
