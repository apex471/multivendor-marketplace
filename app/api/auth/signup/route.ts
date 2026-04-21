import { NextRequest } from 'next/server';
import { connectDB } from '@/backend/config/database';
import { User, UserRole } from '@/backend/models/User';
import { generateToken } from '@/backend/utils/jwt';
import { validateSignupInput, sanitizeInput } from '@/backend/utils/validation';
import {
  sendSuccess,
  sendError,
  sendValidationError,
  sendServerError,
} from '@/backend/utils/responseAppRouter';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));

    // Validate input
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

    await connectDB();

    // Check for existing account
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return sendError('User with this email already exists', 409, {
        email: 'Email is already registered',
      });
    }

    // Create and persist user. Password is hashed by the pre-save hook.
    // OTP email verification is disabled until a custom domain is configured
    // in Resend (free plan restricts delivery to arbitrary recipients).
    const newUser = new User({
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
    });

    await newUser.save();

    const token = generateToken(newUser._id.toString(), newUser.email, newUser.role);

    return sendSuccess(
      {
        user: {
          id: newUser._id,
          firstName: newUser.firstName,
          lastName: newUser.lastName,
          email: newUser.email,
          role: newUser.role,
          avatar: newUser.avatar || null,
          isEmailVerified: false,
        },
        token,
        requiresEmailVerification: true,
      },
      'Account created successfully',
      201
    );
  } catch (error: unknown) {
    const err = error as Error;
    console.error('[Signup] Route error:', err?.message || error);

    if (err?.message?.includes('MONGODB_URI')) {
      return sendError('Database not configured. Set MONGODB_URI in environment variables.', 503);
    }
    if (err?.message?.includes('connect') || err?.message?.includes('ENOTFOUND') || err?.message?.includes('timed out')) {
      return sendError('Cannot connect to database. Check MONGODB_URI in environment variables.', 503);
    }
    if (err?.message?.includes('duplicate key') || err?.message?.includes('E11000')) {
      return sendError('User with this email already exists', 409, { email: 'Email is already registered' });
    }

    return sendServerError(`Signup error: ${err?.message || 'Unknown error'}`);
  }
}
