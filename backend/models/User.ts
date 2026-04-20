import mongoose, { Schema, Document } from 'mongoose';
import bcrypt from 'bcryptjs';

export enum UserRole {
  CUSTOMER = 'customer',
  VENDOR = 'vendor',
  BRAND = 'brand',
  ADMIN = 'admin',
  LOGISTICS = 'logistics',
}

export interface IUser extends Document {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phoneNumber?: string;
  role: UserRole;
  avatar?: string;
  bio?: string;
  googleId?: string;
  oauthProvider?: 'google' | 'github' | 'facebook';
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  isActive: boolean;
  emailVerificationToken?: string;
  emailVerificationExpires?: Date;
  applicationStatus: 'none' | 'pending' | 'approved' | 'rejected';
  applicationNotes?: string;
  suspensionReason?: string;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
  addresses?: Array<{
    id: string;
    fullName: string;
    phone: string;
    addressLine1: string;
    addressLine2?: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
    isDefault: boolean;
  }>;
  coordinates?: { lat: number; lng: number };
  comparePassword(password: string): Promise<boolean>;
}

const userSchema = new Schema<IUser>(
  {
    firstName: {
      type: String,
      required: [true, 'Please provide a first name'],
      trim: true,
      minlength: [2, 'First name must be at least 2 characters'],
      maxlength: [50, 'First name must not exceed 50 characters'],
    },
    lastName: {
      type: String,
      required: [true, 'Please provide a last name'],
      trim: true,
      minlength: [2, 'Last name must be at least 2 characters'],
      maxlength: [50, 'Last name must not exceed 50 characters'],
    },
    email: {
      type: String,
      required: [true, 'Please provide an email address'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        'Please provide a valid email address',
      ],
    },
    password: {
      type: String,
      required: [true, 'Please provide a password'],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false, // Don't return password by default
    },
    phoneNumber: {
      type: String,
      trim: true,
      match: [
        /^[+]?[(]?[0-9]{3}[)]?[-\s.]?[0-9]{3}[-\s.]?[0-9]{4,6}$/,
        'Please provide a valid phone number',
      ],
    },
    role: {
      type: String,
      enum: Object.values(UserRole),
      default: UserRole.CUSTOMER,
      required: true,
    },
    applicationStatus: {
      type: String,
      enum: ['none', 'pending', 'approved', 'rejected'],
      default: 'pending',
    },
    applicationNotes: {
      type: String,
      maxlength: 500,
    },
    suspensionReason: {
      type: String,
      maxlength: 500,
    },
    avatar: {
      type: String,
    },
    bio: {
      type: String,
      maxlength: [500, 'Bio must not exceed 500 characters'],
    },
    googleId: {
      type: String,
      unique: true,
      sparse: true,
    },
    oauthProvider: {
      type: String,
      enum: ['google', 'github', 'facebook'],
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    isPhoneVerified: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    emailVerificationToken: {
      type: String,
      select: false,
    },
    emailVerificationExpires: {
      type: Date,
      select: false,
    },
    lastLogin: {
      type: Date,
      default: null,
    },
    addresses: [
      {
        id: { type: String },
        fullName: { type: String },
        phone: { type: String },
        addressLine1: { type: String },
        addressLine2: { type: String },
        city: { type: String },
        state: { type: String },
        zipCode: { type: String },
        country: { type: String },
        isDefault: { type: Boolean, default: false },
      }
    ],
    coordinates: {
      lat: { type: Number },
      lng: { type: Number },
    },
  },
  {
    timestamps: true,
  }
);

// Hash password before saving
userSchema.pre('save', async function (this: any) {
  if (!this.isModified('password')) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Method to compare password
userSchema.methods.comparePassword = async function (
  password: string
): Promise<boolean> {
  try {
    return await bcrypt.compare(password, this.password);
  } catch (error) {
    throw new Error('Error comparing passwords');
  }
};

// Auto-set applicationStatus on pre-save based on role
userSchema.pre('save', function (this: any) {
  if (this.isNew && this.applicationStatus === 'pending') {
    // Customers and admins are auto-approved
    if (this.role === 'customer' || this.role === 'admin') {
      this.applicationStatus = 'approved';
    }
  }
});

export const User =
  mongoose.models.User || mongoose.model<IUser>('User', userSchema);
