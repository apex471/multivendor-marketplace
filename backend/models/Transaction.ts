import { db, docToObject } from '@/backend/config/firebase';

export type TransactionType =
  | 'order_payment'       // buyer charge — includes subtotal + 10% service fee + shipping + tax
  | 'escrow_release'      // vendor payout after escrow period — subtotal minus 10% seller fee
  | 'platform_fee'        // admin revenue record: 10% buyer + 10% seller = 20% gross
  | 'stripe_fee'          // payment processing fee absorbed by platform (~1.4%)
  | 'affiliate_payout'    // 5% commission credited to affiliate's wallet on escrow release
  | 'refund'
  | 'commission_payout'
  | 'withdrawal'
  | 'logistics_release';

export type TransactionStatus = 'pending' | 'completed' | 'failed' | 'refunded';

export interface ITransaction {
  id?: string;
  transactionId: string;
  type: TransactionType;
  amount: number;
  currency: string;
  status: TransactionStatus;
  fromUser?: string;      // buyer userId for order_payment / vendor userId for escrow_release
  toUser?: string;        // vendor userId for escrow_release / admin for platform_fee / affiliate userId for affiliate_payout
  orderId?: string;
  description: string;
  /** Referral code that was applied (present on affiliate_payout and platform_fee records) */
  affiliateCode?: string;
  /** Firestore userId of the affiliate who owns the referral code */
  affiliateUserId?: string;
  // Fee breakdown fields (present on order_payment records)
  feeBreakdown?: {
    subtotal: number;
    buyerServiceFee: number;  // 10% from buyer
    sellerFee: number;        // 10% from seller (deducted at payout)
    shipping: number;
    tax: number;
    stripeFee: number;        // ~1.4% absorbed by platform
    vendorPayout: number;     // subtotal − sellerFee
    platformGross: number;    // buyerServiceFee + sellerFee (20%)
    affiliateFee: number;     // 5% of subtotal if referred, else 0
    adminNet: number;         // platformGross − affiliateFee − stripeFee
    platformNet: number;      // platformGross − stripeFee (backward compat)
  };
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

    if (opts?.limit)   query = query.limit(opts.limit);
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

  async updateOne(id: string, updates: Partial<ITransaction>): Promise<void> {
    await db.collection(TRANSACTIONS).doc(id).update(updates as any);
  },

  // Compute sum and count for completed transactions
  async aggregate(filter: Record<string, unknown> = {}): Promise<{ total: number; count: number; avg: number }> {
    const txs = await this.find({ ...filter, status: 'completed' });
    const total = txs.reduce((s, t) => s + t.amount, 0);
    return { total, count: txs.length, avg: txs.length ? total / txs.length : 0 };
  },
};
