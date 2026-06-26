import { NextRequest } from 'next/server';
import { Follow } from '@/backend/models/Follow';
import { User } from '@/backend/models/User';
import { Notification } from '@/backend/models/Notification';
import { verifyToken } from '@/backend/utils/jwt';
import { db, FieldPath, docToObject } from '@/backend/config/firebase';
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
    const sp      = new URL(req.url).searchParams;
    const userId  = sp.get('userId');
    const type    = sp.get('type') ?? 'followers'; // 'followers' | 'following'
    const page    = Math.max(1,  parseInt(sp.get('page')  || '1'));
    const limit   = Math.min(50, parseInt(sp.get('limit') || '20'));

    if (!userId) return sendError('userId is required');

    const skip = (page - 1) * limit;
    let userIds: string[] = [];
    let total = 0;

    if (type === 'following') {
      const allFollows = await Follow.find({ followerId: userId });
      allFollows.sort((a, b) => {
        const ad = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bd = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return bd - ad;
      });
      total = allFollows.length;
      userIds = allFollows.slice(skip, skip + limit).map(r => r.followingId);
    } else {
      const allFollows = await Follow.find({ followingId: userId });
      allFollows.sort((a, b) => {
        const ad = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bd = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return bd - ad;
      });
      total = allFollows.length;
      userIds = allFollows.slice(skip, skip + limit).map(r => r.followerId);
    }

    const users: any[] = [];
    if (userIds.length > 0) {
      const chunks: string[][] = [];
      for (let i = 0; i < userIds.length; i += 30) {
        chunks.push(userIds.slice(i, i + 30));
      }
      for (const chunk of chunks) {
        const snap = await db.collection('users')
          .where(FieldPath.documentId(), 'in', chunk)
          .get();
        snap.docs.forEach(d => {
          const u = docToObject<any>(d);
          if (u) users.push(u);
        });
      }
    }

    // Determine if the requesting user follows each returned user
    const payload = getPayload(req);
    let currentFollowingSet = new Set<string>();
    if (payload && userIds.length > 0) {
      currentFollowingSet = await Follow.getFollowingSet(payload.userId, userIds);
    }

    const mapped = users.map(u => ({
      id:          String(u.id),
      username:    `${u.firstName}${u.lastName ?? ''}`.toLowerCase().replace(/\s/g, ''),
      fullName:    `${u.firstName} ${u.lastName ?? ''}`.trim(),
      avatar:      u.avatar ?? null,
      bio:         u.bio ?? '',
      verified:    u.applicationStatus === 'approved',
      isFollowing: currentFollowingSet.has(String(u.id)),
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

    const [actor, target] = await Promise.all([
      User.findById(payload.userId),
      User.findById(followingId),
    ]);
    if (!target) return sendError('User not found', 404);

    const existing = await Follow.findOne({ followerId: payload.userId, followingId });
    if (!existing) {
      await Follow.create({ followerId: payload.userId, followingId });
    }

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
        isRead:      false,
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

    await Follow.findOneAndDelete({ followerId: payload.userId, followingId });

    const followerCount = await Follow.countDocuments({ followingId });

    return sendSuccess({ following: false, followerCount }, 'Unfollowed');
  } catch (err) {
    return sendServerError(err instanceof Error ? err.message : String(err));
  }
}
