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
    if (opts?.limit) query = query.limit(opts.limit);
    const snap = await query.get();
    const results = snap.docs.map(d => docToObject<IConversation>(d)!);

    // Sort in-memory — orderBy on 'lastMessageAt' combined with array-contains would need a composite index
    results.sort((a, b) => {
      const at = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
      const bt = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
      return bt - at; // newest first
    });

    return results;
  },

  async updateOne(id: string, updates: Partial<IConversation>): Promise<void> {
    await db.collection(CONVERSATIONS).doc(id).update({ ...updates, updatedAt: new Date() });
  },
};
