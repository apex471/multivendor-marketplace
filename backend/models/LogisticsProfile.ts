import { db, docToObject } from '@/backend/config/firebase';

export interface ILogisticsProfile {
  id?: string;
  userId: string;
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
  coverageAreas: string[];
  serviceTypes: string[];
  specialCapabilities: string[];
  estimatedDelivery: string;
  baseFee: number;
  pricePerKg: number;
  insuranceCoverage?: number;
  referredBy?: string;
  referrerRole?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const LOGISTICS = 'logisticsProfiles';

export const LogisticsProfile = {
  async create(data: Omit<ILogisticsProfile, 'id' | 'createdAt' | 'updatedAt'>): Promise<ILogisticsProfile & { id: string }> {
    const now = new Date();
    const doc = {
      ...data,
      coverageAreas: data.coverageAreas ?? [],
      serviceTypes: data.serviceTypes ?? [],
      specialCapabilities: data.specialCapabilities ?? [],
      createdAt: now,
      updatedAt: now,
    };
    const ref = await db.collection(LOGISTICS).add(doc);
    return { id: ref.id, ...doc };
  },

  async findOne(filter: Record<string, unknown>): Promise<(ILogisticsProfile & { id: string }) | null> {
    let query = db.collection(LOGISTICS) as FirebaseFirestore.Query;
    for (const [k, v] of Object.entries(filter)) {
      if (v !== undefined && v !== null) query = query.where(k, '==', v);
    }
    const snap = await query.limit(1).get();
    return snap.empty ? null : docToObject<ILogisticsProfile>(snap.docs[0]);
  },

  async find(filter: Record<string, unknown> = {}, opts?: { limit?: number; orderBy?: string }): Promise<(ILogisticsProfile & { id: string })[]> {
    let query = db.collection(LOGISTICS) as FirebaseFirestore.Query;
    for (const [k, v] of Object.entries(filter)) {
      if (v !== undefined && v !== null) query = query.where(k, '==', v);
    }

    if (opts?.limit)   query = query.limit(opts.limit);
    const snap = await query.get();
    return snap.docs.map(d => docToObject<ILogisticsProfile>(d)!);
  },

  async updateOne(id: string, updates: Partial<ILogisticsProfile>): Promise<void> {
    await db.collection(LOGISTICS).doc(id).update({ ...updates, updatedAt: new Date() });
  },
};
