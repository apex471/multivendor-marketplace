import { NextRequest } from 'next/server';
import { connectDB } from '@/backend/config/database';
import { User } from '@/backend/models/User';
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
      return sendValidationError('Google token is required', {
        token: 'Google credential token is required',
      });
    }

    // Verify the Google ID token with Google's servers
    const payload = await verifyGoogleToken(token);
    if (!payload) {
      return sendError('Invalid or expired Google token. Please try again.', 401);
    }

    await connectDB();

    const googleUserInfo = getGoogleUserInfo(payload);

    // Find existing user by email OR googleId
    let user = await User.findOne({
      $or: [{ email: googleUserInfo.email }, { googleId: googleUserInfo.googleId }],
    });

    if (user) {
      // Link Google ID if account was created via email/password
      if (!user.googleId) {
        user.googleId = googleUserInfo.googleId;
        user.oauthProvider = 'google';
      }
      // Mark email as verified since Google verified it
      if (!user.isEmailVerified && googleUserInfo.isEmailVerified) {
        user.isEmailVerified = true;
      }
      // Refresh avatar from Google
      if (googleUserInfo.avatar) {
        user.avatar = googleUserInfo.avatar;
      }
      user.lastLogin = new Date();
      await user.save();
    } else {
      // New user — create from Google profile
      // Random password for OAuth-only accounts (they won't use it unless they set one)
      const randomPassword =
        Math.random().toString(36).slice(-8) +
        Math.random().toString(36).toUpperCase().slice(-4) +
        '1!';

      user = new User({
        firstName: googleUserInfo.firstName,
        lastName: googleUserInfo.lastName,
        email: googleUserInfo.email,
        password: randomPassword,
        googleId: googleUserInfo.googleId,
        oauthProvider: 'google',
        avatar: googleUserInfo.avatar,
        isEmailVerified: googleUserInfo.isEmailVerified,
        role: 'customer',
        lastLogin: new Date(),
      });

      await user.save();
    }

    const jwtToken = generateToken(user._id.toString(), user.email, user.role);

    return sendSuccess(
      {
        token: jwtToken,
        user: {
          id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          role: user.role,
          avatar: user.avatar || null,
          isEmailVerified: user.isEmailVerified,
        },
      },
      'Google authentication successful'
    );
  } catch (error) {
    console.error('Google auth route error:', error);
    return sendServerError(
      error instanceof Error ? error.message : 'Google authentication failed'
    );
  }
}
