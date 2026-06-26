import { db, docToObject } from '@/backend/config/firebase';

export interface ISettings {
  id?: string;
  platformName: string;
  platformEmail: string;
  supportEmail: string;
  maintenanceMode: boolean;
  allowNewVendors: boolean;
  allowNewBrands: boolean;
  requireEmailVerification: boolean;
  // ── Fee model ────────────────────────────────────────────────────────────────
  /** DEPRECATED — kept for backward compat, mirrors (buyerFeeRate + sellerFeeRate) × 100 */
  commissionRate: number;
  /** Buyer-side service fee in % (default: 5) */
  buyerFeeRate: number;
  /** Seller-side commission in % (default: 5) */
  sellerFeeRate: number;
  /** Stripe processing rate in % (default: 2.9) — absorbed by platform */
  stripeFeeRate: number;
  // ── Escrow & withdrawals ─────────────────────────────────────────────────────
  escrowDuration: number;
  minWithdrawal: number;
  // ── Shipping ─────────────────────────────────────────────────────────────────
  freeShippingThreshold: number;
  defaultShippingCost: number;
  internationalShipping: boolean;
  updatedAt?: Date;
}

const SETTINGS_DOC = 'settings/singleton';

const DEFAULTS: Omit<ISettings, 'id' | 'updatedAt'> = {
  platformName: 'CLW Marketplace',
  platformEmail: 'platform@clwmarketplace.com',
  supportEmail: 'support@clwmarketplace.com',
  maintenanceMode: false,
  allowNewVendors: true,
  allowNewBrands: true,
  requireEmailVerification: true,
  commissionRate: 10,  // legacy total (5+5)
  buyerFeeRate: 5,
  sellerFeeRate: 5,
  stripeFeeRate: 2.9,
  escrowDuration: 7,
  minWithdrawal: 50,
  freeShippingThreshold: 100,
  defaultShippingCost: 9.99,
  internationalShipping: false,
};

export const Settings = {
  async findOne(): Promise<ISettings & { id: string }> {
    const snap = await db.doc(SETTINGS_DOC).get();
    if (!snap.exists) {
      // Create singleton on first access
      const data = { ...DEFAULTS, updatedAt: new Date() };
      await db.doc(SETTINGS_DOC).set(data);
      return { id: 'singleton', ...data };
    }
    const s = docToObject<ISettings>(snap)!;
    // Backfill missing fields for existing documents
    if (s.buyerFeeRate == null) s.buyerFeeRate = 5;
    if (s.sellerFeeRate == null) s.sellerFeeRate = 5;
    if (s.stripeFeeRate == null) s.stripeFeeRate = 2.9;
    return s;
  },

  async updateOne(updates: Partial<ISettings>): Promise<ISettings & { id: string }> {
    // Keep commissionRate in sync with buyer+seller for backward compat
    if (updates.buyerFeeRate != null || updates.sellerFeeRate != null) {
      const current = await this.findOne();
      updates.commissionRate =
        (updates.buyerFeeRate  ?? current.buyerFeeRate)  +
        (updates.sellerFeeRate ?? current.sellerFeeRate);
    }
    const data = { ...updates, updatedAt: new Date() };
    await db.doc(SETTINGS_DOC).set(data, { merge: true });
    return this.findOne();
  },
};
