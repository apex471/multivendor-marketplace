import { db, docToObject } from '@/backend/config/firebase';

export interface IWaitlistEntry {
  id?: string;
  name?: string;
  email: string;
  role: 'vendor' | 'brand' | 'both';
  
  // Vendor Info
  storeName?: string;
  businessCategory?: string;
  website?: string;
  instagram?: string;
  experienceYears?: string;
  inventorySize?: string;
  city?: string;
  country?: string;

  // Brand Owner Info
  brandName?: string;
  trademarkNumber?: string;
  brandDescription?: string;
  targetAudience?: string;
  yearEstablished?: string;

  // Administrative
  status: 'pending' | 'approved' | 'rejected' | 'link_sent';
  adminNotes?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const WAITLIST = 'waitlist';

export const Waitlist = {
  async create(data: Omit<IWaitlistEntry, 'id' | 'createdAt' | 'updatedAt'>): Promise<IWaitlistEntry & { id: string }> {
    const now = new Date();
    const doc = {
      ...data,
      status: data.status ?? 'pending',
      createdAt: now,
      updatedAt: now,
    };
    const ref = await db.collection(WAITLIST).add(doc);
    return { id: ref.id, ...doc };
  },

  async findById(id: string): Promise<(IWaitlistEntry & { id: string }) | null> {
    const snap = await db.collection(WAITLIST).doc(id).get();
    return snap.exists ? docToObject<IWaitlistEntry>(snap) : null;
  },

  async find(
    filter: Record<string, unknown> = {},
    opts?: { limit?: number; skip?: number; orderBy?: string; orderDir?: 'asc' | 'desc' }
  ): Promise<(IWaitlistEntry & { id: string })[]> {
    let query = db.collection(WAITLIST) as FirebaseFirestore.Query;
    
    for (const [k, v] of Object.entries(filter)) {
      if (v !== undefined && v !== null) {
        query = query.where(k, '==', v);
      }
    }

    if (opts?.orderBy) {
      query = query.orderBy(opts.orderBy, opts.orderDir || 'asc');
    } else {
      // Default ordering by createdAt desc
      query = query.orderBy('createdAt', 'desc');
    }

    if (opts?.limit) {
      query = query.limit(opts.limit);
    }

    const snap = await query.get();
    let results = snap.docs.map(d => docToObject<IWaitlistEntry>(d)!);
    
    if (opts?.skip) {
      results = results.slice(opts.skip);
    }
    
    return results;
  },

  async countDocuments(filter: Record<string, unknown> = {}): Promise<number> {
    let query = db.collection(WAITLIST) as FirebaseFirestore.Query;
    for (const [k, v] of Object.entries(filter)) {
      if (v !== undefined && v !== null) {
        query = query.where(k, '==', v);
      }
    }
    const snap = await query.count().get();
    return snap.data().count;
  },

  async updateOne(id: string, updates: Partial<IWaitlistEntry>): Promise<void> {
    await db.collection(WAITLIST).doc(id).update({
      ...updates,
      updatedAt: new Date(),
    });
  },

  async findByIdAndDelete(id: string): Promise<(IWaitlistEntry & { id: string }) | null> {
    const snap = await db.collection(WAITLIST).doc(id).get();
    if (!snap.exists) return null;
    const entry = docToObject<IWaitlistEntry>(snap)!;
    await db.collection(WAITLIST).doc(id).delete();
    return entry;
  },
};
