import { NextRequest } from 'next/server';
import { User, UserRole } from '@/backend/models/User';
import { generateToken } from '@/backend/utils/jwt';
import { validateLoginInput } from '@/backend/utils/validation';
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

    const validation = validateLoginInput(body);
    if (!validation.isValid) {
      return sendValidationError('Validation failed', validation.errors);
    }

    const email: string = body.email.toLowerCase().trim();
    const password: string = body.password;

    // Find user by email (include password for comparison)
    const userSnap = await User.findOne({ email }, { includePassword: true });
    if (!userSnap) return sendError('Invalid email or password', 401);

    if (!userSnap.isActive) {
      return sendError('Your account has been deactivated. Please contact support.', 403);
    }

    const isPasswordValid = await User.comparePassword(userSnap.id!, password);
    if (!isPasswordValid) {
      return sendError('Invalid email or password', 401);
    }

    // Logistics providers are approved manually by admin review and never go
    // through the email-OTP flow, so we skip the verification gate for them.
    if (!userSnap.isEmailVerified && userSnap.role !== UserRole.LOGISTICS) {
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      await User.updateOne(userSnap.id!, {
        emailVerificationToken: otp,
        emailVerificationExpires: new Date(Date.now() + 10 * 60 * 1000),
      });
      let emailSentMsg = 'A new code has been sent to your inbox.';
      try {
        const host = request.headers.get('host') || 'localhost:3000';
        const protocol = request.headers.get('x-forwarded-proto') || 'http';
        const baseUrl = `${protocol}://${host}`;
        const emailResult = await sendVerificationEmail(userSnap.email, userSnap.firstName, otp, userSnap.role as UserRole, baseUrl);
        if (!emailResult.sent) emailSentMsg = 'Could not send a new code. Use the resend button.';
      } catch { /* non-blocking */ }
      return sendError(
        `Please verify your email before logging in. ${emailSentMsg}`,
        403,
        { requiresEmailVerification: 'true', email: userSnap.email, role: userSnap.role }
      );
    }

    await User.updateOne(userSnap.id!, { lastLogin: new Date() });

    const token = generateToken(userSnap.id!, userSnap.email, userSnap.role);

    return sendSuccess({
      user: {
        id: userSnap.id,
        firstName: userSnap.firstName,
        lastName: userSnap.lastName,
        email: userSnap.email,
        role: userSnap.role,
        avatar: userSnap.avatar || null,
        isEmailVerified: userSnap.isEmailVerified,
      },
      token,
    }, 'Login successful');
  } catch (error: unknown) {
    const err = error as Error;
    console.error('[Login] Route error:', err?.message || error);
    return sendServerError(`Login error: ${err?.message || 'Unknown error'}`);
  }
}
