import { NextRequest } from 'next/server';
import { connectDB } from '@/backend/config/database';
import { User } from '@/backend/models/User';
import { generateToken } from '@/backend/utils/jwt';
import { sendSuccess, sendError, sendServerError } from '@/backend/utils/responseAppRouter';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const email: string = (body.email || '').toLowerCase().trim();
    const code: string = (body.code || '').trim();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return sendError('A valid email address is required.', 400);
    }

    if (!code || !/^\d{6}$/.test(code)) {
      return sendError('Please enter a valid 6-digit code.', 400);
    }

    await connectDB();

    const user = await User.findOne({ email }).select(
      '+emailVerificationToken +emailVerificationExpires'
    );

    if (!user) {
      return sendError('Invalid verification code.', 400);
    }

    if ((user as { emailVerificationToken?: string }).emailVerificationToken !== code) {
      return sendError('Incorrect code. Please check and try again.', 400);
    }

    if (!user.emailVerificationExpires || user.emailVerificationExpires < new Date()) {
      return sendError('This code has expired. Please request a new one.', 400);
    }

    // Mark as verified and clear code
    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    await user.save();

    const authToken = generateToken(user._id.toString(), user.email, user.role);

    return sendSuccess(
      {
        user: {
          id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          role: user.role,
          avatar: user.avatar || null,
          isEmailVerified: true,
        },
        token: authToken,
      },
      'Email verified successfully!'
    );
  } catch (error) {
    console.error('Verify email error:', error);
    return sendServerError('An error occurred during email verification.');
  }
}
