import { NextRequest } from 'next/server';
import bcrypt from 'bcryptjs';
import { User, IUser } from '@/backend/models/User';
import { db, docToObject } from '@/backend/config/firebase';
import {
  sendSuccess,
  sendError,
  sendServerError,
} from '@/backend/utils/responseAppRouter';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const token = (body.token || '').trim();
    const email = (body.email || '').trim().toLowerCase();
    const password = body.password || '';

    if (!token) {
      return sendError('Invalid or missing password reset token.', 400);
    }

    if (!password || password.length < 8) {
      return sendError('Password must be at least 8 characters long.', 400);
    }

    // Look up user by email or token
    let user: (IUser & { id: string }) | null = null;
    if (email) {
      user = await User.findByEmail(email);
    }

    if (!user || user.resetPasswordToken !== token) {
      // Fallback search across users collection by token
      const snap = await db.collection('users')
        .where('resetPasswordToken', '==', token)
        .limit(1)
        .get();
      if (!snap.empty) {
        user = docToObject<IUser>(snap.docs[0]);
      }
    }

    if (!user || !user.id || user.resetPasswordToken !== token) {
      return sendError('This password reset link is invalid or has already been used.', 400);
    }

    // Check expiration
    if (!user.resetPasswordExpires) {
      return sendError('Reset token has expired. Please request a new link.', 400);
    }

    const expiresAt = new Date(user.resetPasswordExpires).getTime();
    if (Date.now() > expiresAt) {
      return sendError('This password reset link has expired. Please request a new one.', 400);
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Update user in Firestore and clear reset tokens
    await User.updateOne(user.id, {
      password: hashedPassword,
      resetPasswordToken: undefined,
      resetPasswordExpires: undefined,
      updatedAt: new Date(),
    });

    return sendSuccess(
      { updated: true },
      'Your password has been successfully reset! You can now log in.'
    );
  } catch (err) {
    console.error('[Reset Password Error]', err);
    return sendServerError('Failed to reset password. Please try again.');
  }
}
