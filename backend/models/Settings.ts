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
  commissionRate: number;
  escrowDuration: number;
  minWithdrawal: number;
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
  commissionRate: 10,
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
    return docToObject<ISettings>(snap)!;
  },

  async updateOne(updates: Partial<ISettings>): Promise<ISettings & { id: string }> {
    const data = { ...updates, updatedAt: new Date() };
    await db.doc(SETTINGS_DOC).set(data, { merge: true });
    return this.findOne();
  },
};
