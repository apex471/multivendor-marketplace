import { NextRequest } from 'next/server';
import { connectDB } from '@/backend/config/database';
import { User } from '@/backend/models/User';
import { verifyToken } from '@/backend/utils/jwt';
import {
  sendSuccess,
  sendError,
  sendValidationError,
  sendUnauthorized,
  sendNotFound,
  sendServerError,
} from '@/backend/utils/responseAppRouter';

function extractBearer(request: NextRequest): string | null {
  const auth = request.headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  return auth.slice(7);
}

export async function POST(request: NextRequest) {
  try {
    const token = extractBearer(request);
    if (!token) return sendUnauthorized('No authentication token provided');

    const decoded = verifyToken(token);
    if (!decoded) return sendUnauthorized('Invalid or expired token');

    const body = await request.json().catch(() => ({}));

    if (!body.currentPassword || !body.newPassword || !body.confirmPassword) {
      return sendValidationError('All password fields are required', {
        ...(body.currentPassword ? {} : { currentPassword: 'Current password is required' }),
        ...(body.newPassword ? {} : { newPassword: 'New password is required' }),
        ...(body.confirmPassword ? {} : { confirmPassword: 'Confirm password is required' }),
      });
    }

    if (body.newPassword !== body.confirmPassword) {
      return sendValidationError('Passwords do not match', {
        confirmPassword: 'New passwords do not match',
      });
    }

    if (body.newPassword.length < 6) {
      return sendValidationError('Password too short', {
        newPassword: 'Password must be at least 6 characters',
      });
    }

    await connectDB();

    const user = await User.findById(decoded.userId).select('+password');
    if (!user) return sendNotFound('User not found');

    const isPasswordValid = await user.comparePassword(body.currentPassword);
    if (!isPasswordValid) {
      return sendError('Current password is incorrect', 401, {
        currentPassword: 'Current password is incorrect',
      });
    }

    user.password = body.newPassword;
    await user.save();

    return sendSuccess(null, 'Password changed successfully');
  } catch (error) {
    console.error('Change password route error:', error);
    return sendServerError('An error occurred while changing password');
  }
}
