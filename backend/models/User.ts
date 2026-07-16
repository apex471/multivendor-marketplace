import { db, docToObject, snapToObject } from '@/backend/config/firebase';
import { FieldValue } from 'firebase-admin/firestore';
import bcrypt from 'bcryptjs';

export enum UserRole {
  CUSTOMER  = 'customer',
  VENDOR    = 'vendor',
  BRAND     = 'brand',
  ADMIN     = 'admin',
  LOGISTICS = 'logistics',
}

export interface IUserAddress {
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
}

export interface IUser {
  id?: string;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phoneNumber?: string;
  role: UserRole;
  avatar?: string;
  banner?: string;
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
  addresses?: IUserAddress[];
  coordinates?: { lat: number; lng: number };
  storeName?: string;
  businessDescription?: string;
  website?: string;
  taxId?: string;
  socialLinks?: Record<string, string>;
  businessCity?: string;
  businessState?: string;
  subdomain?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const USERS = 'users';

/** Remove keys with undefined values — Firestore rejects them */
function stripUndefined<T extends Record<string, unknown>>(obj: T): T {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined)
  ) as T;
}

export const User = {
  // ── Create ────────────────────────────────────────────────────────────────
  async create(data: Omit<IUser, 'id' | 'createdAt' | 'updatedAt'>): Promise<IUser & { id: string }> {
    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashed = await bcrypt.hash(data.password, salt);

    // Auto-approve all user roles to ensure no features are blocked after registration
    const applicationStatus = 'approved';

    const now = new Date();
    const doc: Record<string, unknown> = stripUndefined({
      ...data,
      password: hashed,
      applicationStatus,
      isEmailVerified: data.isEmailVerified ?? false,
      isPhoneVerified: data.isPhoneVerified ?? false,
      isActive: data.isActive ?? true,
      createdAt: now,
      updatedAt: now,
    });

    const ref = await db.collection(USERS).add(doc);
    return { id: ref.id, ...doc } as IUser & { id: string };
  },

  // ── Find by ID ────────────────────────────────────────────────────────────
  async findById(id: string, options?: { includePassword?: boolean; includeVerification?: boolean }): Promise<(IUser & { id: string }) | null> {
    const snap = await db.collection(USERS).doc(id).get();
    if (!snap.exists) return null;
        const user = docToObject<IUser>(snap)!;
    if (!options?.includePassword) delete (user as any).password;
    if (!options?.includeVerification) {
      delete (user as any).emailVerificationToken;
      delete (user as any).emailVerificationExpires;
    }
    return user;
  },

  // ── Find one by field ─────────────────────────────────────────────────────
  async findOne(filter: Partial<IUser & { $or?: object[] }>, options?: { includePassword?: boolean; includeVerification?: boolean }): Promise<(IUser & { id: string }) | null> {
    let query = db.collection(USERS) as FirebaseFirestore.Query;

    // Handle simple equality filters
    for (const [key, value] of Object.entries(filter)) {
      if (key === '$or') continue;
      query = query.where(key, '==', value);
    }

    const snap = await query.limit(1).get();
    if (snap.empty) {
      // If we have $or filters, try them one by one
      if ((filter as any).$or) {
        const orFilters = (filter as any).$or as Array<Record<string, unknown>>;
        for (const orFilter of orFilters) {
          for (const [k, v] of Object.entries(orFilter)) {
            const s = await db.collection(USERS).where(k, '==', v).limit(1).get();
            if (!s.empty) {
              const u = docToObject<IUser>(s.docs[0])!;
              if (!options?.includePassword) delete (u as any).password;
              if (!options?.includeVerification) {
                delete (u as any).emailVerificationToken;
                delete (u as any).emailVerificationExpires;
              }
              return u;
            }
          }
        }
      }
      return null;
    }

    const user = docToObject<IUser>(snap.docs[0])!;
    if (!options?.includePassword) delete (user as any).password;
    if (!options?.includeVerification) {
      delete (user as any).emailVerificationToken;
      delete (user as any).emailVerificationExpires;
    }
    return user;
  },

  // ── Find many ────────────────────────────────────────────────────────────
  async find(filter: Record<string, unknown> = {}, opts?: { limit?: number; skip?: number; orderBy?: string; orderDir?: 'asc' | 'desc'; select?: string[] }): Promise<(IUser & { id: string })[]> {
    let query = db.collection(USERS) as FirebaseFirestore.Query;

    for (const [key, value] of Object.entries(filter)) {
      if (value !== undefined && value !== null) {
        query = query.where(key, '==', value);
      }
    }


    if (opts?.limit)   query = query.limit(opts.limit);

    const snap = await query.get();
    let results = snap.docs.map(d => docToObject<IUser>(d)!);

    // Handle skip manually (Firestore doesn't have native skip for security)
    if (opts?.skip) results = results.slice(opts.skip);

    // Remove sensitive fields
    return results.map(u => {
      delete (u as any).password;
      delete (u as any).emailVerificationToken;
      delete (u as any).emailVerificationExpires;
      return u;
    });
  },

  // ── Count ────────────────────────────────────────────────────────────────
  async countDocuments(filter: Record<string, unknown> = {}): Promise<number> {
    let query = db.collection(USERS) as FirebaseFirestore.Query;
    for (const [key, value] of Object.entries(filter)) {
      if (value !== undefined && value !== null) {
        query = query.where(key, '==', value);
      }
    }
    const snap = await query.count().get();
    return snap.data().count;
  },

  // ── Update one ────────────────────────────────────────────────────────────
  async updateOne(id: string, updates: Partial<IUser>): Promise<void> {
    const data: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(updates)) {
      if (value === undefined) {
        data[key] = FieldValue.delete();
      } else {
        data[key] = value;
      }
    }
    data.updatedAt = new Date();

    // Hash password if being updated
    if (data.password) {
      const salt = await bcrypt.genSalt(10);
      data.password = await bcrypt.hash(data.password as string, salt);
    }
    await db.collection(USERS).doc(id).update(data);
  },

  // ── Update many ─────────────────────────────────────────────────────────
  async updateMany(filter: Record<string, unknown>, updates: Partial<IUser>): Promise<number> {
    let query = db.collection(USERS) as FirebaseFirestore.Query;
    for (const [key, value] of Object.entries(filter)) {
      if (value !== undefined) query = query.where(key, '==', value);
    }
    const snap = await query.get();
    const batch = db.batch();
    const data = { ...updates, updatedAt: new Date() };
    snap.docs.forEach(d => batch.update(d.ref, data as Record<string, unknown>));
    await batch.commit();
    return snap.docs.length;
  },

  // ── Delete ────────────────────────────────────────────────────────────────
  async findByIdAndDelete(id: string): Promise<(IUser & { id: string }) | null> {
    const snap = await db.collection(USERS).doc(id).get();
    if (!snap.exists) return null;
    const user = docToObject<IUser>(snap)!;
    await db.collection(USERS).doc(id).delete();
    return user;
  },

  // ── Compare password ──────────────────────────────────────────────────────
  async comparePassword(userId: string, plainPassword: string): Promise<boolean> {
    const snap = await db.collection(USERS).doc(userId).get();
    if (!snap.exists) return false;
    const data = snap.data()!;
    return bcrypt.compare(plainPassword, data.password as string);
  },

  // ── Increment field ───────────────────────────────────────────────────────
  async increment(id: string, field: string, amount = 1): Promise<void> {
    await db.collection(USERS).doc(id).update({
      [field]: FieldValue.increment(amount),
      updatedAt: new Date(),
    });
  },
};
