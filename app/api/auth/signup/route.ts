import { NextRequest } from 'next/server';
import { User, UserRole } from '@/backend/models/User';
import { generateToken } from '@/backend/utils/jwt';
import { validateSignupInput, sanitizeInput } from '@/backend/utils/validation';
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

    const validation = validateSignupInput(body);
    if (!validation.isValid) {
      return sendValidationError('Validation failed', validation.errors);
    }

    const firstName = sanitizeInput(body.firstName);
    const lastName = sanitizeInput(body.lastName);
    const email: string = body.email.toLowerCase().trim();
    const password: string = body.password;
    const role: UserRole = body.role || UserRole.CUSTOMER;
    const storeName: string | undefined = body.storeName ? sanitizeInput(body.storeName) : undefined;
    const businessDescription: string | undefined = body.businessDescription ? sanitizeInput(body.businessDescription) : undefined;
    const website: string | undefined = body.website || undefined;
    const taxId: string | undefined = body.taxId || undefined;
    const socialLinks: Record<string, string> | undefined = body.socialLinks || undefined;
    const businessCity: string | undefined = body.businessCity || undefined;
    const businessState: string | undefined = body.businessState || undefined;

    // Check if email already exists
    const existing = await User.findOne({ email });
    if (existing) {
      return sendError('User with this email already exists', 409, { email: 'Email is already registered' });
    }

    // Create user
    const newUser = await User.create({
      firstName,
      lastName,
      email,
      password,
      role,
      phoneNumber: body.phoneNumber || undefined,
      ...(storeName ? { storeName } : {}),
      ...(businessDescription ? { businessDescription } : {}),
      ...(website ? { website } : {}),
      ...(taxId ? { taxId } : {}),
      ...(socialLinks ? { socialLinks } : {}),
      ...(businessCity ? { businessCity } : {}),
      ...(businessState ? { businessState } : {}),
      applicationStatus: (role === UserRole.CUSTOMER || role === UserRole.ADMIN) ? 'approved' : 'pending',
      isEmailVerified: false,
      isPhoneVerified: false,
      isActive: true,
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
      const emailResult = await sendVerificationEmail(newUser.email, newUser.firstName, otp, newUser.role as UserRole);
      emailSent = emailResult.sent;
      emailError = emailResult.error;
    } catch (emailErr) {
      console.error('[Signup] Unexpected email error:', emailErr);
    }

    const token = generateToken(newUser.id!, newUser.email, newUser.role);

    return sendSuccess(
      {
        user: {
          id: newUser.id,
          firstName: newUser.firstName,
          lastName: newUser.lastName,
          email: newUser.email,
          role: newUser.role,
          avatar: newUser.avatar || null,
          isEmailVerified: false,
        },
        token,
        requiresEmailVerification: true,
        emailSent,
        ...(emailSent ? {} : { emailWarning: emailError || 'Verification email could not be sent.' }),
      },
      emailSent
        ? 'Account created successfully. Please check your email for a verification code.'
        : 'Account created. We could not send the verification email — use the resend button.',
      201
    );
  } catch (error: unknown) {
    const err = error as Error;
    console.error('[Signup] Route error:', err?.message || error);
    return sendServerError(`Signup error: ${err?.message || 'Unknown error'}`);
  }
}
