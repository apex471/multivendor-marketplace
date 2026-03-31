import { NextRequest } from 'next/server';
import { connectDB } from '@/backend/config/database';
import { User } from '@/backend/models/User';
import { verifyToken } from '@/backend/utils/jwt';
import { sanitizeInput } from '@/backend/utils/validation';
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

export async function PUT(request: NextRequest) {
  try {
    const token = extractBearer(request);
    if (!token) return sendUnauthorized('No authentication token provided');

    const decoded = verifyToken(token);
    if (!decoded) return sendUnauthorized('Invalid or expired token');

    const body = await request.json().catch(() => ({}));
    await connectDB();

    const allowedFields = ['firstName', 'lastName', 'phoneNumber', 'bio', 'avatar'];
    const updateData: Record<string, any> = {};

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] =
          field === 'firstName' || field === 'lastName'
            ? sanitizeInput(String(body[field]))
            : body[field];
      }
    }

    const user = await User.findByIdAndUpdate(decoded.userId, updateData, {
      new: true,
      runValidators: true,
    });

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
        },
      },
      'Profile updated successfully'
    );
  } catch (error) {
    console.error('Profile route error:', error);
    return sendServerError('An error occurred while updating profile');
  }
}
