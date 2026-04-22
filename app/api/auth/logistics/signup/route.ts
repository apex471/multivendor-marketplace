import { NextRequest } from 'next/server';
import mongoose from 'mongoose';
import { connectDB } from '@/backend/config/database';
import { User, UserRole } from '@/backend/models/User';
import { LogisticsProfile } from '@/backend/models/LogisticsProfile';
import { generateToken } from '@/backend/utils/jwt';
import {
  sendSuccess,
  sendError,
  sendValidationError,
  sendServerError,
} from '@/backend/utils/responseAppRouter';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));

    // ── Basic field validation ────────────────────────────────────────────
    const required = [
      'contactName', 'email', 'password',
      'companyName', 'phone', 'addressLine1', 'city', 'state', 'zipCode',
      'country', 'licenseNumber', 'yearsInOperation', 'fleetSize',
      'estimatedDelivery', 'baseFee', 'pricePerKg',
    ] as const;

    for (const field of required) {
      if (!body[field] && body[field] !== 0) {
        return sendValidationError('Validation failed', {
          [field]: `${field} is required`,
        });
      }
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) {
      return sendValidationError('Validation failed', { email: 'Invalid email address' });
    }
    if (String(body.password).length < 8) {
      return sendValidationError('Validation failed', { password: 'Password must be at least 8 characters' });
    }
    if (!Array.isArray(body.coverageAreas) || body.coverageAreas.length === 0) {
      return sendValidationError('Validation failed', { coverageAreas: 'At least one coverage area is required' });
    }
    if (!Array.isArray(body.serviceTypes) || body.serviceTypes.length === 0) {
      return sendValidationError('Validation failed', { serviceTypes: 'At least one service type is required' });
    }

    await connectDB();

    // ── Check for duplicate email ─────────────────────────────────────────
    const existingUser = await User.findOne({ email: body.email.toLowerCase().trim() });
    if (existingUser) {
      return sendError('An account with this email already exists', 409, {
        email: 'Email is already registered',
      });
    }

    // ── Split contactName into firstName / lastName ───────────────────────
    const nameParts = String(body.contactName).trim().split(/\s+/);
    const firstName = nameParts[0];
    const lastName  = nameParts.length > 1 ? nameParts.slice(1).join(' ') : 'Provider';

    // ── Create User + LogisticsProfile atomically ─────────────────────────
    const session = await mongoose.startSession();
    let newUser: InstanceType<typeof User> | null = null;

    try {
      await session.withTransaction(async () => {
        const [createdUser] = await User.create(
          [
            {
              firstName,
              lastName,
              email: body.email.toLowerCase().trim(),
              password: body.password,
              phoneNumber: body.phone,
              role: UserRole.LOGISTICS,
              applicationStatus: 'pending',
              isEmailVerified: false,
            },
          ],
          { session }
        );
        newUser = createdUser;

        await LogisticsProfile.create(
          [
            {
              userId: createdUser._id,

              companyName:      body.companyName,
              contactName:      body.contactName,
              phone:            body.phone,
              addressLine1:     body.addressLine1,
              city:             body.city,
              state:            body.state,
              zipCode:          body.zipCode,
              country:          body.country,
              licenseNumber:    body.licenseNumber,
              yearsInOperation: Number(body.yearsInOperation),
              fleetSize:        body.fleetSize,
              websiteUrl:       body.websiteUrl || undefined,

              coverageAreas:       body.coverageAreas,
              serviceTypes:        body.serviceTypes,
              specialCapabilities: body.specialCapabilities || [],
              estimatedDelivery:   body.estimatedDelivery,

              baseFee:           Number(body.baseFee),
              pricePerKg:        Number(body.pricePerKg),
              insuranceCoverage: body.insuranceCoverage ? Number(body.insuranceCoverage) : undefined,

              referredBy:   body.referredBy  || undefined,
              referrerRole: body.referrerRole || undefined,
            },
          ],
          { session }
        );
      });
    } finally {
      await session.endSession();
    }

    if (!newUser) {
      return sendServerError('Failed to create account');
    }

    const token = generateToken(
      (newUser as InstanceType<typeof User> & { _id: mongoose.Types.ObjectId })._id.toString(),
      (newUser as InstanceType<typeof User> & { email: string }).email,
      UserRole.LOGISTICS
    );

    return sendSuccess(
      {
        user: {
          id:    (newUser as InstanceType<typeof User> & { _id: mongoose.Types.ObjectId })._id,
          firstName: (newUser as InstanceType<typeof User> & { firstName: string }).firstName,
          lastName:  (newUser as InstanceType<typeof User> & { lastName: string }).lastName,
          email:     (newUser as InstanceType<typeof User> & { email: string }).email,
          role:      UserRole.LOGISTICS,
          applicationStatus: 'pending',
          isEmailVerified:   false,
        },
        token,
        requiresApproval: true,
      },
      'Logistics provider application submitted successfully',
      201
    );
  } catch (error: unknown) {
    const err = error as Error;
    console.error('[Logistics Signup]', err?.message || error);

    if (err?.message?.includes('duplicate key') || err?.message?.includes('E11000')) {
      return sendError('An account with this email already exists', 409, {
        email: 'Email is already registered',
      });
    }
    if (err?.message?.includes('MONGODB_URI') || err?.message?.includes('connect') || err?.message?.includes('ENOTFOUND')) {
      return sendError('Database connection error. Please try again.', 503);
    }

    return sendServerError(`Signup error: ${err?.message || 'Unknown error'}`);
  }
}
