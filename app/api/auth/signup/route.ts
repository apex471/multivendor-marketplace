import { NextRequest } from 'next/server';
import { connectDB } from '@/backend/config/database';
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

    await connectDB();

    // Check for existing account
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return sendError('User with this email already exists', 409, {
        email: 'Email is already registered',
      });
    }

    const newUser = new User({
      firstName,
      lastName,
      email,
      password,
      role,
      phoneNumber: body.phoneNumber || undefined,
      // Customers and admins are auto-approved; vendors/brands/logistics require admin review
      applicationStatus: (role === UserRole.CUSTOMER || role === UserRole.ADMIN) ? 'approved' : 'pending',
      // Customers auto-verified; all others must verify their email
      isEmailVerified: (role === UserRole.CUSTOMER || role === UserRole.ADMIN),
    });

    // Generate OTP verification code for roles that need it
    const rolesRequiringVerification = [UserRole.VENDOR, UserRole.BRAND, UserRole.LOGISTICS];
    let verifyToken = '';
    if (rolesRequiringVerification.includes(role)) {
      verifyToken = Math.floor(100000 + Math.random() * 900000).toString();
      newUser.emailVerificationToken = verifyToken;
      newUser.emailVerificationExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    }

    await newUser.save();

    // Send OTP email — non-blocking so signup response isn't delayed
    // verifyToken is used directly (no DB re-fetch needed)
    if (verifyToken) {
      sendVerificationEmail(email, firstName, verifyToken, role).catch(
        (err) => console.error('[Auth] Failed to send verification email:', err)
      );
    }

    const token = generateToken(newUser._id.toString(), newUser.email, newUser.role);
    const requiresVerification = rolesRequiringVerification.includes(role);

    return sendSuccess(
      {
        user: {
          id: newUser._id,
          firstName: newUser.firstName,
          lastName: newUser.lastName,
          email: newUser.email,
          role: newUser.role,
          avatar: newUser.avatar || null,
          isEmailVerified: newUser.isEmailVerified,
        },
        token,
        requiresEmailVerification: requiresVerification,
      },
      'Account created successfully',
      201
    );
  } catch (error: unknown) {
    const err = error as Error;
    console.error('[Signup] Route error:', err?.message || error);

    // Surface specific diagnostic errors instead of a generic message
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
