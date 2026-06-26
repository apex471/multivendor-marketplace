import { db, docToObject } from '@/backend/config/firebase';

export type TransactionType =
  | 'order_payment'
  | 'escrow_release'
  | 'refund'
  | 'commission_payout'
  | 'withdrawal';

export type TransactionStatus = 'pending' | 'completed' | 'failed' | 'refunded';

export interface ITransaction {
  id?: string;
  transactionId: string;
  type: TransactionType;
  amount: number;
  currency: string;
  status: TransactionStatus;
  fromUser?: string;
  toUser?: string;
  orderId?: string;
  description: string;
  metadata?: Record<string, unknown>;
  createdAt?: Date;
  updatedAt?: Date;
}

const TRANSACTIONS = 'transactions';

export const Transaction = {
  async create(data: Omit<ITransaction, 'id' | 'createdAt' | 'updatedAt'>): Promise<ITransaction & { id: string }> {
    const now = new Date();
    const doc = {
      ...data,
      currency: data.currency ?? 'USD',
      status: data.status ?? 'pending',
      createdAt: now,
      updatedAt: now,
    };
    const ref = await db.collection(TRANSACTIONS).add(doc);
    return { id: ref.id, ...doc };
  },

  async find(filter: Record<string, unknown> = {}, opts?: { limit?: number; skip?: number; orderBy?: string; orderDir?: 'asc' | 'desc' }): Promise<(ITransaction & { id: string })[]> {
    let query = db.collection(TRANSACTIONS) as FirebaseFirestore.Query;
    for (const [k, v] of Object.entries(filter)) {
      if (v !== undefined && v !== null) query = query.where(k, '==', v);
    }
    if (opts?.orderBy) query = query.orderBy(opts.orderBy, opts.orderDir ?? 'desc');
    if (opts?.limit)   query = query.limit((opts.skip ?? 0) + opts.limit);
    const snap = await query.get();
    let results = snap.docs.map(d => docToObject<ITransaction>(d)!);
    if (opts?.skip) results = results.slice(opts.skip);
    return results;
  },

  async countDocuments(filter: Record<string, unknown> = {}): Promise<number> {
    let query = db.collection(TRANSACTIONS) as FirebaseFirestore.Query;
    for (const [k, v] of Object.entries(filter)) {
      if (v !== undefined && v !== null) query = query.where(k, '==', v);
    }
    const snap = await query.count().get();
    return snap.data().count;
  },

  // Compute sum and count for completed transactions
  async aggregate(filter: Record<string, unknown> = {}): Promise<{ total: number; count: number; avg: number }> {
    const txs = await this.find({ ...filter, status: 'completed' });
    const total = txs.reduce((s, t) => s + t.amount, 0);
    return { total, count: txs.length, avg: txs.length ? total / txs.length : 0 };
  },
};
