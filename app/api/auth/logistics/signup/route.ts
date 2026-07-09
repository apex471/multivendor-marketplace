import { NextRequest } from 'next/server';
import { User, UserRole } from '@/backend/models/User';
import { LogisticsProfile } from '@/backend/models/LogisticsProfile';
import { generateToken } from '@/backend/utils/jwt';
import { sendVerificationEmail } from '@/backend/utils/email';
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

    // Create user with pending status
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

    // Generate and save OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    await User.updateOne(newUser.id!, {
      emailVerificationToken: otp,
      emailVerificationExpires: new Date(Date.now() + 10 * 60 * 1000),
    });

    let emailSent = false;
    let emailError: string | undefined;
    try {
      const host = request.headers.get('host') || 'localhost:3000';
      const protocol = request.headers.get('x-forwarded-proto') || 'http';
      const baseUrl = `${protocol}://${host}`;
      const emailResult = await sendVerificationEmail(newUser.email, newUser.firstName, otp, newUser.role as UserRole, baseUrl);
      emailSent = emailResult.sent;
      emailError = emailResult.error;
    } catch (emailErr) {
      console.error('[Logistics Signup] Unexpected email error:', emailErr);
    }

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
      requiresEmailVerification: true,
      ...(emailSent ? {} : { emailWarning: emailError || 'Verification email could not be sent.' }),
    }, 'Logistics provider application submitted successfully. Please check your email for a verification code.', 201);
  } catch (error: unknown) {
    const err = error as Error;
    console.error('[Logistics Signup]', err?.message || error);
    return sendServerError(`Signup error: ${err?.message || 'Unknown error'}`);
  }
}
