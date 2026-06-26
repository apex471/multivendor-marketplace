import { db, docToObject } from '@/backend/config/firebase';

export interface IPostLike {
  id?: string;
  postId: string;
  userId: string;
  createdAt?: Date;
}

const POST_LIKES = 'postLikes';

export const PostLike = {
  async create(data: Omit<IPostLike, 'id' | 'createdAt'>): Promise<IPostLike & { id: string }> {
    const now = new Date();
    const doc = { ...data, createdAt: now };
    const ref = await db.collection(POST_LIKES).add(doc);
    return { id: ref.id, ...doc };
  },

  async findOne(filter: Record<string, unknown>): Promise<(IPostLike & { id: string }) | null> {
    let query = db.collection(POST_LIKES) as FirebaseFirestore.Query;
    for (const [k, v] of Object.entries(filter)) {
      if (v !== undefined && v !== null) query = query.where(k, '==', v);
    }
    const snap = await query.limit(1).get();
    return snap.empty ? null : docToObject<IPostLike>(snap.docs[0]);
  },

  async find(filter: Record<string, unknown> = {}, opts?: { limit?: number }): Promise<(IPostLike & { id: string })[]> {
    let query = db.collection(POST_LIKES) as FirebaseFirestore.Query;
    for (const [k, v] of Object.entries(filter)) {
      if (v !== undefined && v !== null) query = query.where(k, '==', v);
    }
    if (opts?.limit) query = query.limit(opts.limit);
    const snap = await query.get();
    return snap.docs.map(d => docToObject<IPostLike>(d)!);
  },

  // Find liked post IDs for a user from a list of postIds
  async getLikedPostIds(userId: string, postIds: string[]): Promise<Set<string>> {
    const set = new Set<string>();
    if (!postIds.length) return set;
    const chunks: string[][] = [];
    for (let i = 0; i < postIds.length; i += 30) chunks.push(postIds.slice(i, i + 30));
    for (const chunk of chunks) {
      const snap = await db.collection(POST_LIKES)
        .where('userId', '==', userId)
        .where('postId', 'in', chunk)
        .get();
      snap.docs.forEach(d => set.add(d.data().postId as string));
    }
    return set;
  },

  async findOneAndDelete(filter: Record<string, unknown>): Promise<boolean> {
    let query = db.collection(POST_LIKES) as FirebaseFirestore.Query;
    for (const [k, v] of Object.entries(filter)) {
      if (v !== undefined && v !== null) query = query.where(k, '==', v);
    }
    const snap = await query.limit(1).get();
    if (snap.empty) return false;
    await snap.docs[0].ref.delete();
    return true;
  },
};
