import mongoose, { Schema, Document } from 'mongoose';

export interface ISettings extends Document {
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
}

const settingsSchema = new Schema<ISettings>(
  {
    platformName: { type: String, default: 'CLW Marketplace' },
    platformEmail: { type: String, default: 'admin@clw.com' },
    supportEmail: { type: String, default: 'support@clw.com' },
    maintenanceMode: { type: Boolean, default: false },
    allowNewVendors: { type: Boolean, default: true },
    allowNewBrands: { type: Boolean, default: true },
    requireEmailVerification: { type: Boolean, default: false },
    commissionRate: { type: Number, default: 10, min: 0, max: 100 },
    escrowDuration: { type: Number, default: 7, min: 1 },
    minWithdrawal: { type: Number, default: 50, min: 0 },
    freeShippingThreshold: { type: Number, default: 100, min: 0 },
    defaultShippingCost: { type: Number, default: 9.99, min: 0 },
    internationalShipping: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const Settings =
  mongoose.models.Settings || mongoose.model<ISettings>('Settings', settingsSchema);
