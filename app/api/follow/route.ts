import { NextRequest } from 'next/server';
import { connectDB } from '@/backend/config/database';
import { Follow } from '@/backend/models/Follow';
import { User } from '@/backend/models/User';
import { verifyToken } from '@/backend/utils/jwt';
import {
  sendSuccess,
  sendError,
  sendUnauthorized,
  sendServerError,
} from '@/backend/utils/responseAppRouter';

function getPayload(req: NextRequest) {
  const auth = req.headers.get('authorization') ?? '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  return token ? verifyToken(token) : null;
}

// POST /api/follow — follow a user
// Body: { followingId }
export async function POST(req: NextRequest) {
  try {
    const payload = getPayload(req);
    if (!payload) return sendUnauthorized('Authentication required');

    const { followingId } = await req.json();
    if (!followingId) return sendError('followingId is required');
    if (followingId === payload.userId) return sendError('Cannot follow yourself');

    await connectDB();

    const target = await User.findById(followingId).select('_id').lean();
    if (!target) return sendError('User not found', 404);

    await Follow.findOneAndUpdate(
      { followerId: payload.userId, followingId },
      { followerId: payload.userId, followingId },
      { upsert: true, new: true }
    );

    const followerCount = await Follow.countDocuments({ followingId });

    return sendSuccess({ following: true, followerCount }, 'Now following', 201);
  } catch (err) {
    return sendServerError(err);
  }
}

// DELETE /api/follow — unfollow a user
// Query: ?followingId=xxx
export async function DELETE(req: NextRequest) {
  try {
    const payload = getPayload(req);
    if (!payload) return sendUnauthorized('Authentication required');

    const followingId = new URL(req.url).searchParams.get('followingId');
    if (!followingId) return sendError('followingId is required');

    await connectDB();

    await Follow.findOneAndDelete({ followerId: payload.userId, followingId });

    const followerCount = await Follow.countDocuments({ followingId });

    return sendSuccess({ following: false, followerCount }, 'Unfollowed');
  } catch (err) {
    return sendServerError(err);
  }
}
