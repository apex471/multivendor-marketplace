import { NextRequest } from 'next/server';
import { connectDB } from '@/backend/config/database';
import { User } from '@/backend/models/User';
import { verifyToken } from '@/backend/utils/jwt';
import {
  sendSuccess,
  sendUnauthorized,
  sendNotFound,
  sendServerError,
} from '@/backend/utils/responseAppRouter';

function extractBearer(request: NextRequest): string | null {
  const auth = request.headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  return auth.slice(7);
}

export async function GET(request: NextRequest) {
  try {
    const token = extractBearer(request);
    if (!token) return sendUnauthorized('No authentication token provided');

    const decoded = verifyToken(token);
    if (!decoded) return sendUnauthorized('Invalid or expired token');

    await connectDB();

    const user = await User.findById(decoded.userId);
    if (!user) return sendNotFound('User not found');

    return sendSuccess(
      {
        user: {
          id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          role: user.role,
          avatar: user.avatar || null,
          bio: user.bio || null,
          phoneNumber: user.phoneNumber || null,
          isEmailVerified: user.isEmailVerified,
          createdAt: user.createdAt,
        },
      },
      'User profile retrieved successfully'
    );
  } catch (error) {
    console.error('Me route error:', error);
    return sendServerError('An error occurred while fetching user profile');
  }
}

// DELETE /api/auth/me — permanently delete the authenticated user's account
export async function DELETE(request: NextRequest) {
  try {
    const token = extractBearer(request);
    if (!token) return sendUnauthorized('Authentication required');

    const decoded = verifyToken(token);
    if (!decoded) return sendUnauthorized('Invalid or expired token');

    await connectDB();

    const user = await User.findByIdAndDelete(decoded.userId);
    if (!user) return sendNotFound('User not found');

    return sendSuccess({}, 'Account deleted successfully');
  } catch (error) {
    console.error('Delete account error:', error);
    return sendServerError('An error occurred while deleting account');
  }
}
