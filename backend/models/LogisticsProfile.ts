import mongoose, { Schema, Document } from 'mongoose';

export interface ILogisticsProfile extends Document {
  userId: mongoose.Types.ObjectId;

  // Company
  companyName: string;
  contactName: string;
  phone: string;
  addressLine1: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  licenseNumber: string;
  yearsInOperation: number;
  fleetSize: string;
  websiteUrl?: string;

  // Service capabilities
  coverageAreas: string[];
  serviceTypes: string[];
  specialCapabilities: string[];
  estimatedDelivery: string;

  // Pricing
  baseFee: number;
  pricePerKg: number;
  insuranceCoverage?: number;

  // Referral
  referredBy?: string;
  referrerRole?: string;

  createdAt: Date;
  updatedAt: Date;
}

const LogisticsProfileSchema = new Schema<ILogisticsProfile>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },

    companyName:      { type: String, required: true, trim: true },
    contactName:      { type: String, required: true, trim: true },
    phone:            { type: String, required: true, trim: true },
    addressLine1:     { type: String, required: true, trim: true },
    city:             { type: String, required: true, trim: true },
    state:            { type: String, required: true, trim: true },
    zipCode:          { type: String, required: true, trim: true },
    country:          { type: String, required: true, trim: true },
    licenseNumber:    { type: String, required: true, trim: true },
    yearsInOperation: { type: Number, required: true, min: 0 },
    fleetSize:        { type: String, required: true },
    websiteUrl:       { type: String, trim: true },

    coverageAreas:       { type: [String], default: [] },
    serviceTypes:        { type: [String], default: [] },
    specialCapabilities: { type: [String], default: [] },
    estimatedDelivery:   { type: String, required: true },

    baseFee:           { type: Number, required: true, min: 0 },
    pricePerKg:        { type: Number, required: true, min: 0 },
    insuranceCoverage: { type: Number, min: 0 },

    referredBy:   { type: String },
    referrerRole: { type: String },
  },
  { timestamps: true }
);

export const LogisticsProfile =
  mongoose.models.LogisticsProfile ||
  mongoose.model<ILogisticsProfile>('LogisticsProfile', LogisticsProfileSchema);
