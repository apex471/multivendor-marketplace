import { NextRequest } from 'next/server';
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

    const required = [
      'contactName', 'email', 'password',
      'companyName', 'phone', 'addressLine1', 'city', 'state', 'zipCode',
      'country', 'licenseNumber', 'yearsInOperation', 'fleetSize',
      'estimatedDelivery', 'baseFee', 'pricePerKg',
    ] as const;

    for (const field of required) {
      if (!body[field] && body[field] !== 0) {
        return sendValidationError('Validation failed', { [field]: `${field} is required` });
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

    const email = body.email.toLowerCase().trim();
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return sendError('An account with this email already exists', 409, { email: 'Email is already registered' });
    }

    const nameParts = String(body.contactName).trim().split(/\s+/);
    const firstName = nameParts[0];
    const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : 'Provider';

    // Create user
    const newUser = await User.create({
      firstName,
      lastName,
      email,
      password: body.password,
      phoneNumber: body.phone,
      role: UserRole.LOGISTICS,
      applicationStatus: 'pending',
      isEmailVerified: false,
      isPhoneVerified: false,
      isActive: true,
    });

    // Create logistics profile
    await LogisticsProfile.create({
      userId: newUser.id!,
      companyName:         body.companyName,
      contactName:         body.contactName,
      phone:               body.phone,
      addressLine1:        body.addressLine1,
      city:                body.city,
      state:               body.state,
      zipCode:             body.zipCode,
      country:             body.country,
      licenseNumber:       body.licenseNumber,
      yearsInOperation:    Number(body.yearsInOperation),
      fleetSize:           body.fleetSize,
      websiteUrl:          body.websiteUrl || undefined,
      coverageAreas:       body.coverageAreas,
      serviceTypes:        body.serviceTypes,
      specialCapabilities: body.specialCapabilities || [],
      estimatedDelivery:   body.estimatedDelivery,
      baseFee:             Number(body.baseFee),
      pricePerKg:          Number(body.pricePerKg),
      insuranceCoverage:   body.insuranceCoverage ? Number(body.insuranceCoverage) : undefined,
      referredBy:          body.referredBy || undefined,
      referrerRole:        body.referrerRole || undefined,
    });

    const token = generateToken(newUser.id!, newUser.email, UserRole.LOGISTICS);

    return sendSuccess({
      user: {
        id: newUser.id,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        email: newUser.email,
        role: UserRole.LOGISTICS,
        applicationStatus: 'pending',
        isEmailVerified: false,
      },
      token,
      requiresApproval: true,
    }, 'Logistics provider application submitted successfully', 201);
  } catch (error: unknown) {
    const err = error as Error;
    console.error('[Logistics Signup]', err?.message || error);
    return sendServerError(`Signup error: ${err?.message || 'Unknown error'}`);
  }
}
