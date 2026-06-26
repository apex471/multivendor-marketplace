import { NextRequest } from 'next/server';
import { User, UserRole } from '@/backend/models/User';
import { generateToken } from '@/backend/utils/jwt';
import { verifyGoogleToken, getGoogleUserInfo } from '@/backend/utils/google';
import {
  sendSuccess,
  sendError,
  sendValidationError,
  sendServerError,
} from '@/backend/utils/responseAppRouter';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { token } = body;

    if (!token) {
      return sendValidationError('Google token is required', { token: 'Google credential token is required' });
    }

    const payload = await verifyGoogleToken(token);
    if (!payload) return sendError('Invalid or expired Google token. Please try again.', 401);

    const googleUserInfo = getGoogleUserInfo(payload);

    // Try find by email first, then by googleId
    let user = await User.findOne({ email: googleUserInfo.email });
    if (!user) {
      user = await User.findOne({ googleId: googleUserInfo.googleId });
    }

    if (user) {
      const updates: Record<string, unknown> = { lastLogin: new Date() };
      if (!user.googleId) {
        updates.googleId = googleUserInfo.googleId;
        updates.oauthProvider = 'google';
      }
      if (!user.isEmailVerified && googleUserInfo.isEmailVerified) {
        updates.isEmailVerified = true;
      }
      if (googleUserInfo.avatar) updates.avatar = googleUserInfo.avatar;
      await User.updateOne(user.id!, updates);

      const jwtToken = generateToken(user.id!, user.email, user.role);
      return sendSuccess({
        token: jwtToken,
        user: {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          role: user.role,
          avatar: googleUserInfo.avatar || user.avatar || null,
          isEmailVerified: true,
        },
      }, 'Google authentication successful');
    }

    // New user — create from Google profile
    const randomPassword =
      Math.random().toString(36).slice(-8) +
      Math.random().toString(36).toUpperCase().slice(-4) +
      '1!';

    const newUser = await User.create({
      firstName: googleUserInfo.firstName,
      lastName: googleUserInfo.lastName,
      email: googleUserInfo.email,
      password: randomPassword,
      googleId: googleUserInfo.googleId,
      oauthProvider: 'google',
      avatar: googleUserInfo.avatar,
      isEmailVerified: googleUserInfo.isEmailVerified,
      isPhoneVerified: false,
      isActive: true,
      role: UserRole.CUSTOMER,
      applicationStatus: 'approved',
      lastLogin: new Date(),
    });

    const jwtToken = generateToken(newUser.id!, newUser.email, newUser.role);

    return sendSuccess({
      token: jwtToken,
      user: {
        id: newUser.id,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        email: newUser.email,
        role: newUser.role,
        avatar: newUser.avatar || null,
        isEmailVerified: newUser.isEmailVerified,
      },
    }, 'Google authentication successful');
  } catch (error) {
    console.error('Google auth route error:', error);
    return sendServerError(error instanceof Error ? error.message : 'Google authentication failed');
  }
}
