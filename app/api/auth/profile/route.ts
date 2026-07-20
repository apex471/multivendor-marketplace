import { NextRequest } from 'next/server';
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

    const allowedFields = ['firstName', 'lastName', 'phoneNumber', 'bio', 'avatar', 'banner', 'storeName', 'businessCity', 'businessState', 'businessDescription', 'website'];
    const updateData: Record<string, unknown> = {};

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] =
          field === 'firstName' || field === 'lastName'
            ? sanitizeInput(String(body[field]))
            : body[field];
      }
    }

    const user = await User.findById(decoded.userId);
    if (!user) return sendNotFound('User not found');

    await User.updateOne(decoded.userId, updateData);
    const updated = await User.findById(decoded.userId);

    return sendSuccess({
      user: {
        id: updated!.id,
        firstName: updated!.firstName,
        lastName: updated!.lastName,
        email: updated!.email,
        role: updated!.role,
        avatar: updated!.avatar || null,
        banner: updated!.banner || null,
        bio: updated!.bio || null,
        phoneNumber: updated!.phoneNumber || null,
      },
    }, 'Profile updated successfully');
  } catch (error) {
    console.error('Profile route error:', error);
    return sendServerError('An error occurred while updating profile');
  }
}
