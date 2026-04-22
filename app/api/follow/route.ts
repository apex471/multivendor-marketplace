import { NextRequest } from 'next/server';
import { connectDB } from '@/backend/config/database';
import { Follow } from '@/backend/models/Follow';
import { User } from '@/backend/models/User';
import { Notification } from '@/backend/models/Notification';
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

// GET /api/follow — list followers or following for a user
// Query: ?userId=xxx&type=followers|following&page=1&limit=20
export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const sp      = new URL(req.url).searchParams;
    const userId  = sp.get('userId');
    const type    = sp.get('type') ?? 'followers'; // 'followers' | 'following'
    const page    = Math.max(1,  parseInt(sp.get('page')  || '1'));
    const limit   = Math.min(50, parseInt(sp.get('limit') || '20'));

    if (!userId) return sendError('userId is required');

    const skip = (page - 1) * limit;
    let userIds: string[];
    let total: number;

    if (type === 'following') {
      // People this user follows
      const [rows, count] = await Promise.all([
        Follow.find({ followerId: userId }).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
        Follow.countDocuments({ followerId: userId }),
      ]);
      userIds = rows.map(r => String(r.followingId));
      total   = count;
    } else {
      // People who follow this user
      const [rows, count] = await Promise.all([
        Follow.find({ followingId: userId }).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
        Follow.countDocuments({ followingId: userId }),
      ]);
      userIds = rows.map(r => String(r.followerId));
      total   = count;
    }

    const users = await User.find({ _id: { $in: userIds } })
      .select('firstName lastName avatar bio applicationStatus')
      .lean();

    // Determine if the requesting user follows each returned user
    const payload = getPayload(req);
    let currentFollowingSet = new Set<string>();
    if (payload) {
      const myFollows = await Follow.find({
        followerId: payload.userId,
        followingId: { $in: userIds },
      }).select('followingId').lean();
      currentFollowingSet = new Set(myFollows.map(f => String(f.followingId)));
    }

    const mapped = users.map(u => ({
      id:          String(u._id),
      username:    `${u.firstName}${u.lastName ?? ''}`.toLowerCase(),
      fullName:    `${u.firstName} ${u.lastName ?? ''}`.trim(),
      avatar:      u.avatar ?? null,
      bio:         u.bio ?? '',
      verified:    u.applicationStatus === 'approved',
      isFollowing: currentFollowingSet.has(String(u._id)),
    }));

    return sendSuccess({
      users: mapped,
      pagination: {
        page, limit, total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
      },
    });
  } catch (err) {
    return sendServerError(err instanceof Error ? err.message : String(err));
  }
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

    const [actor, target] = await Promise.all([
      User.findById(payload.userId).select('firstName lastName avatar').lean(),
      User.findById(followingId).select('_id').lean(),
    ]);
    if (!target) return sendError('User not found', 404);

    await Follow.findOneAndUpdate(
      { followerId: payload.userId, followingId },
      { followerId: payload.userId, followingId },
      { upsert: true, new: true }
    );

    const followerCount = await Follow.countDocuments({ followingId });

    // Notify the followed user (non-blocking)
    if (actor) {
      const actorName = `${actor.firstName} ${actor.lastName ?? ''}`.trim();
      Notification.create({
        recipientId: followingId,
        type:        'follow',
        actorId:     payload.userId,
        actorName,
        actorAvatar: actor.avatar,
        text:        `${actorName} started following you`,
        link:        `/profile/${actorName.toLowerCase().replace(/\s+/g, '')}`,
      }).catch(() => {});
    }

    return sendSuccess({ following: true, followerCount }, 'Now following', 201);
  } catch (err) {
    return sendServerError(err instanceof Error ? err.message : String(err));
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
    return sendServerError(err instanceof Error ? err.message : String(err));
  }
}
