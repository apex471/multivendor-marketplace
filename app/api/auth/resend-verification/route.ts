import { NextRequest } from 'next/server';
import { User, UserRole } from '@/backend/models/User';
import { sendVerificationEmail } from '@/backend/utils/email';
import { sendSuccess, sendError, sendServerError } from '@/backend/utils/responseAppRouter';

const RESEND_COOLDOWN_MS = 60 * 1000;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const email: string = (body.email || '').toLowerCase().trim();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return sendError('A valid email address is required.', 400);
    }

    const user = await User.findOne({ email }, { includeVerification: true });

    if (!user) {
      return sendSuccess({}, 'If that email exists, a new verification code has been sent.');
    }
    if (user.isEmailVerified) {
      return sendError('This email address is already verified.', 400);
    }

    const rolesRequiringVerification = [UserRole.CUSTOMER, UserRole.VENDOR, UserRole.BRAND, UserRole.LOGISTICS];
    if (!rolesRequiringVerification.includes(user.role as UserRole)) {
      return sendError('Email verification is not required for this account type.', 400);
    }

    const verificationExpires = user.emailVerificationExpires;
    if (verificationExpires && verificationExpires > new Date(Date.now() + 10 * 60 * 1000 - RESEND_COOLDOWN_MS)) {
      return sendError('Please wait 1 minute before requesting another code.', 429);
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    await User.updateOne(user.id!, {
      emailVerificationToken: otp,
      emailVerificationExpires: new Date(Date.now() + 10 * 60 * 1000),
    });

    const emailResult = await sendVerificationEmail(email, user.firstName, otp, user.role as UserRole);
    if (!emailResult.sent) {
      return sendError('We could not send the verification email right now. Please try again.', 503);
    }

    return sendSuccess({}, 'A new verification code has been sent to your inbox.');
  } catch (error) {
    console.error('Resend verification error:', error);
    return sendServerError('An error occurred. Please try again.');
  }
}
