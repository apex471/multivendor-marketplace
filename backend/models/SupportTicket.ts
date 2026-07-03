import { db, docToObject } from '@/backend/config/firebase';

export interface TicketResponse {
  from: 'customer' | 'admin';
  authorName: string;
  message: string;
  timestamp: Date;
}

export interface ISupportTicket {
  id?: string;
  ticketNumber: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  subject: string;
  message: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'open' | 'in-progress' | 'resolved' | 'closed';
  category: 'payment' | 'order' | 'product' | 'account' | 'other';
  responses: TicketResponse[];
  createdAt?: Date;
  updatedAt?: Date;
}

const TICKETS = 'supportTickets';

export const SupportTicket = {
  async create(data: Omit<ISupportTicket, 'id' | 'createdAt' | 'updatedAt'>): Promise<ISupportTicket & { id: string }> {
    const now = new Date();
    const doc = {
      ...data,
      priority: data.priority ?? 'medium',
      status: data.status ?? 'open',
      category: data.category ?? 'other',
      responses: data.responses ?? [],
      createdAt: now,
      updatedAt: now,
    };
    const ref = await db.collection(TICKETS).add(doc);
    return { id: ref.id, ...doc };
  },

  async findById(id: string): Promise<(ISupportTicket & { id: string }) | null> {
    const snap = await db.collection(TICKETS).doc(id).get();
    return snap.exists ? docToObject<ISupportTicket>(snap) : null;
  },

  async find(filter: Record<string, unknown> = {}, opts?: { limit?: number; skip?: number; orderBy?: string; orderDir?: 'asc' | 'desc' }): Promise<(ISupportTicket & { id: string })[]> {
    let query = db.collection(TICKETS) as FirebaseFirestore.Query;
    for (const [k, v] of Object.entries(filter)) {
      if (v !== undefined && v !== null) query = query.where(k, '==', v);
    }

    if (opts?.limit)   query.limit(opts.limit);
    const snap = await query.get();
    let results = snap.docs.map(d => docToObject<ISupportTicket>(d)!);
    if (opts?.skip) results = results.slice(opts.skip);
    return results;
  },

  async countDocuments(filter: Record<string, unknown> = {}): Promise<number> {
    let query = db.collection(TICKETS) as FirebaseFirestore.Query;
    for (const [k, v] of Object.entries(filter)) {
      if (v !== undefined && v !== null) query = query.where(k, '==', v);
    }
    const snap = await query.count().get();
    return snap.data().count;
  },

  async updateOne(id: string, updates: Partial<ISupportTicket>): Promise<void> {
    await db.collection(TICKETS).doc(id).update({ ...updates, updatedAt: new Date() });
  },

  async addResponse(id: string, response: TicketResponse): Promise<void> {
    const { FieldValue } = await import('firebase-admin/firestore');
    await db.collection(TICKETS).doc(id).update({
      responses: FieldValue.arrayUnion(response),
      updatedAt: new Date(),
    });
  },
};
