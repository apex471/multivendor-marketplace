import { NextRequest } from 'next/server';
import { connectDB } from '@/backend/config/database';
import { User, UserRole } from '@/backend/models/User';
import { sendVerificationEmail } from '@/backend/utils/email';
import { sendSuccess, sendError, sendServerError } from '@/backend/utils/responseAppRouter';

const RESEND_COOLDOWN_MS = 60 * 1000; // 1 minute between resends

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const email: string = (body.email || '').toLowerCase().trim();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return sendError('A valid email address is required.', 400);
    }

    await connectDB();

    const user = await User.findOne({ email }).select(
      '+emailVerificationToken +emailVerificationExpires'
    );

    // Always return success to prevent email enumeration
    if (!user) {
      return sendSuccess({}, 'If that email exists, a new verification code has been sent.');
    }

    if (user.isEmailVerified) {
      return sendError('This email address is already verified.', 400);
    }

    const rolesRequiringVerification = [UserRole.VENDOR, UserRole.BRAND, UserRole.LOGISTICS];
    if (!rolesRequiringVerification.includes(user.role)) {
      return sendError('Email verification is not required for this account type.', 400);
    }

    // Enforce cooldown: if a code exists and was issued less than 1 min ago, reject
    if (
      (user as any).emailVerificationExpires &&
      (user as any).emailVerificationExpires > new Date(Date.now() + 10 * 60 * 1000 - RESEND_COOLDOWN_MS)
    ) {
      return sendError('Please wait 1 minute before requesting another code.', 429);
    }

    // Generate fresh 6-digit OTP
    const verifyToken = Math.floor(100000 + Math.random() * 900000).toString();
    user.emailVerificationToken = verifyToken;
    user.emailVerificationExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    await user.save();

    await sendVerificationEmail(email, user.firstName, verifyToken, user.role);

    return sendSuccess({}, 'A new verification code has been sent to your inbox.');
  } catch (error) {
    console.error('Resend verification error:', error);
    return sendServerError('An error occurred. Please try again.');
  }
}
