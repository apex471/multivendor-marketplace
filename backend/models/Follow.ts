import { db, docToObject } from '@/backend/config/firebase';

export interface IFollow {
  id?: string;
  followerId: string;
  followingId: string;
  createdAt?: Date;
}

const FOLLOWS = 'follows';

export const Follow = {
  async create(data: Omit<IFollow, 'id' | 'createdAt'>): Promise<IFollow & { id: string }> {
    const now = new Date();
    const doc = { ...data, createdAt: now };
    const ref = await db.collection(FOLLOWS).add(doc);
    return { id: ref.id, ...doc };
  },

  async findOne(filter: Record<string, unknown>): Promise<(IFollow & { id: string }) | null> {
    let query = db.collection(FOLLOWS) as FirebaseFirestore.Query;
    for (const [k, v] of Object.entries(filter)) {
      if (v !== undefined && v !== null) query = query.where(k, '==', v);
    }
    const snap = await query.limit(1).get();
    return snap.empty ? null : docToObject<IFollow>(snap.docs[0]);
  },

  async find(filter: Record<string, unknown> = {}, opts?: { limit?: number; select?: string[] }): Promise<(IFollow & { id: string })[]> {
    let query = db.collection(FOLLOWS) as FirebaseFirestore.Query;
    for (const [k, v] of Object.entries(filter)) {
      if (v !== undefined && v !== null) query = query.where(k, '==', v);
    }
    if (opts?.limit) query = query.limit(opts.limit);
    const snap = await query.get();
    return snap.docs.map(d => docToObject<IFollow>(d)!);
  },

  async countDocuments(filter: Record<string, unknown> = {}): Promise<number> {
    let query = db.collection(FOLLOWS) as FirebaseFirestore.Query;
    for (const [k, v] of Object.entries(filter)) {
      if (v !== undefined && v !== null) query = query.where(k, '==', v);
    }
    const snap = await query.count().get();
    return snap.data().count;
  },

  async findOneAndDelete(filter: Record<string, unknown>): Promise<void> {
    let query = db.collection(FOLLOWS) as FirebaseFirestore.Query;
    for (const [k, v] of Object.entries(filter)) {
      if (v !== undefined && v !== null) query = query.where(k, '==', v);
    }
    const snap = await query.limit(1).get();
    if (!snap.empty) await snap.docs[0].ref.delete();
  },

  // Get follower counts for a list of user IDs
  async getFollowerCounts(userIds: string[]): Promise<Map<string, number>> {
    const map = new Map<string, number>();
    if (!userIds.length) return map;
    // Firestore 'in' supports up to 30 items
    const chunks: string[][] = [];
    for (let i = 0; i < userIds.length; i += 30) chunks.push(userIds.slice(i, i + 30));
    for (const chunk of chunks) {
      const snap = await db.collection(FOLLOWS).where('followingId', 'in', chunk).get();
      snap.docs.forEach(d => {
        const fId = d.data().followingId as string;
        map.set(fId, (map.get(fId) ?? 0) + 1);
      });
    }
    return map;
  },

  // Get IDs that currentUser follows from a list
  async getFollowingSet(currentUserId: string, userIds: string[]): Promise<Set<string>> {
    const set = new Set<string>();
    if (!userIds.length) return set;
    const snap = await db.collection(FOLLOWS)
      .where('followerId', '==', currentUserId)
      .where('followingId', 'in', userIds.slice(0, 30))
      .get();
    snap.docs.forEach(d => set.add(d.data().followingId as string));
    return set;
  },
};
