import { db, docToObject } from '@/backend/config/firebase';
import { FieldValue } from 'firebase-admin/firestore';

export interface IReferralCode {
  id?: string;
  /** Short unique code, e.g. "REF-ABC123" */
  code: string;
  /** Human-readable label set by admin */
  label: string;
  /** Admin user ID that generated this code */
  createdByAdmin: string;
  /** Whether the code is still accepting new signups */
  isActive: boolean;
  /** Total users who signed up with this code */
  totalSignups: number;
  /** Cumulative affiliate commissions earned across all referred users' orders */
  totalEarnings: number;
  /** Total successful transactions that triggered a commission */
  totalTransactions: number;
  createdAt?: Date;
  updatedAt?: Date;
}

const COLLECTION = 'referral_codes';

export const ReferralCode = {
  // ── Create ────────────────────────────────────────────────────────────────
  async create(
    data: Pick<IReferralCode, 'code' | 'label' | 'createdByAdmin'>
  ): Promise<IReferralCode & { id: string }> {
    const now = new Date();
    const doc: Omit<IReferralCode, 'id'> = {
      ...data,
      isActive: true,
      totalSignups: 0,
      totalEarnings: 0,
      totalTransactions: 0,
      createdAt: now,
      updatedAt: now,
    };
    const ref = await db.collection(COLLECTION).add(doc);
    return { id: ref.id, ...doc };
  },

  // ── Find by code string ───────────────────────────────────────────────────
  async findByCode(code: string): Promise<(IReferralCode & { id: string }) | null> {
    const snap = await db.collection(COLLECTION).where('code', '==', code).limit(1).get();
    if (snap.empty) return null;
    return docToObject<IReferralCode>(snap.docs[0])!;
  },

  // ── Find by Firestore doc ID ───────────────────────────────────────────────
  async findById(id: string): Promise<(IReferralCode & { id: string }) | null> {
    const snap = await db.collection(COLLECTION).doc(id).get();
    if (!snap.exists) return null;
    return docToObject<IReferralCode>(snap)!;
  },

  // ── List all ──────────────────────────────────────────────────────────────
  async find(
    filter: Partial<IReferralCode> = {},
    opts?: { limit?: number; skip?: number }
  ): Promise<(IReferralCode & { id: string })[]> {
    let query = db.collection(COLLECTION) as FirebaseFirestore.Query;
    for (const [k, v] of Object.entries(filter)) {
      if (v !== undefined && v !== null) query = query.where(k, '==', v);
    }
    if (opts?.limit) query = query.limit(opts.limit);
    const snap = await query.get();
    let results = snap.docs.map((d) => docToObject<IReferralCode>(d)!);
    if (opts?.skip) results = results.slice(opts.skip);
    return results;
  },

  // ── Update ────────────────────────────────────────────────────────────────
  async updateOne(id: string, updates: Partial<IReferralCode>): Promise<void> {
    await db.collection(COLLECTION).doc(id).update({ ...updates, updatedAt: new Date() });
  },

  // ── Delete ────────────────────────────────────────────────────────────────
  async deleteOne(id: string): Promise<void> {
    await db.collection(COLLECTION).doc(id).delete();
  },

  // ── Atomic increments (called at escrow release / signup) ─────────────────
  async incrementSignups(id: string): Promise<void> {
    await db.collection(COLLECTION).doc(id).update({
      totalSignups: FieldValue.increment(1),
      updatedAt: new Date(),
    });
  },

  async incrementEarnings(id: string, amount: number): Promise<void> {
    await db.collection(COLLECTION).doc(id).update({
      totalEarnings: FieldValue.increment(amount),
      totalTransactions: FieldValue.increment(1),
      updatedAt: new Date(),
    });
  },

  // ── Code existence check ──────────────────────────────────────────────────
  async codeExists(code: string): Promise<boolean> {
    const snap = await db.collection(COLLECTION).where('code', '==', code).limit(1).get();
    return !snap.empty;
  },
};

/** Generate a random referral code, e.g. "REF-X7K2P9" */
export function generateReferralCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let suffix = '';
  for (let i = 0; i < 6; i++) {
    suffix += chars[Math.floor(Math.random() * chars.length)];
  }
  return `REF-${suffix}`;
}
