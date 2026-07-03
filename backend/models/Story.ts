import { db, docToObject } from '@/backend/config/firebase';

export interface IStoryTextOverlay {
  text: string;
  x?: number;
  y?: number;
  fontSize?: number;
  color?: string;
  fontFamily?: string;
}

export interface IStory {
  id?: string;
  authorId: string;
  mediaUrls: string[];
  mediaTypes: string[];
  filter: string;
  duration: number;
  textOverlays: IStoryTextOverlay[];
  viewedBy: string[];
  expiresAt: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

const STORIES = 'stories';

export const Story = {
  async create(data: Omit<IStory, 'id' | 'createdAt' | 'updatedAt'>): Promise<IStory & { id: string }> {
    const now = new Date();
    const doc = {
      ...data,
      filter: data.filter ?? 'none',
      duration: data.duration ?? 5,
      textOverlays: data.textOverlays ?? [],
      viewedBy: data.viewedBy ?? [],
      createdAt: now,
      updatedAt: now,
    };
    const ref = await db.collection(STORIES).add(doc);
    return { id: ref.id, ...doc };
  },

  async findById(id: string): Promise<(IStory & { id: string }) | null> {
    const snap = await db.collection(STORIES).doc(id).get();
    return snap.exists ? docToObject<IStory>(snap) : null;
  },

  async find(filter: Record<string, unknown> = {}, opts?: { limit?: number; orderBy?: string; orderDir?: 'asc' | 'desc' }): Promise<(IStory & { id: string })[]> {
    let query = db.collection(STORIES) as FirebaseFirestore.Query;
    for (const [k, v] of Object.entries(filter)) {
      if (v !== undefined && v !== null) query = query.where(k, '==', v);
    }

    if (opts?.limit)   query = query.limit(opts.limit);
    const snap = await query.get();
    return snap.docs.map(d => docToObject<IStory>(d)!);
  },

  // Find non-expired stories
  async findActive(limit = 20): Promise<(IStory & { id: string })[]> {
    const snap = await db.collection(STORIES)
      .where('expiresAt', '>', new Date())
      .limit(limit * 2)
      .get();
    const results = snap.docs.map(d => docToObject<IStory>(d)!);
    results.sort((a, b) => {
      const ad = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bd = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return bd - ad;
    });
    return results.slice(0, limit);
  },

  async updateOne(id: string, updates: Partial<IStory>): Promise<void> {
    await db.collection(STORIES).doc(id).update({ ...updates, updatedAt: new Date() });
  },

  async addViewer(id: string, userId: string): Promise<void> {
    const { FieldValue } = await import('firebase-admin/firestore');
    await db.collection(STORIES).doc(id).update({
      viewedBy: FieldValue.arrayUnion(userId),
    });
  },
};
