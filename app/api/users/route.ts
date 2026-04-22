import { NextRequest } from 'next/server';
import { connectDB } from '@/backend/config/database';
import { User } from '@/backend/models/User';
import { Follow } from '@/backend/models/Follow';
import { verifyToken } from '@/backend/utils/jwt';
import { sendSuccess, sendServerError } from '@/backend/utils/responseAppRouter';

// GET /api/users — search/suggest users
// Query: ?q=search&limit=20&page=1
// When no q is provided, returns suggested users (by follower count desc)
export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const sp    = new URL(req.url).searchParams;
    const q     = sp.get('q')?.trim() ?? '';
    const page  = Math.max(1,  parseInt(sp.get('page')  || '1'));
    const limit = Math.min(50, parseInt(sp.get('limit') || '20'));
    const skip  = (page - 1) * limit;

    // Identify requesting user for isFollowing state
    const authHeader = req.headers.get('authorization') ?? '';
    let currentUserId: string | null = null;
    if (authHeader.startsWith('Bearer ')) {
      const tok = verifyToken(authHeader.slice(7));
      if (tok) currentUserId = tok.userId;
    }

    const filter: Record<string, unknown> = { isActive: true };
    if (q) {
      filter['$or'] = [
        { firstName: { $regex: q, $options: 'i' } },
        { lastName:  { $regex: q, $options: 'i' } },
      ];
    }

    // Exclude self
    if (currentUserId) {
      filter['_id'] = { $ne: currentUserId };
    }

    const [users, total] = await Promise.all([
      User.find(filter)
        .select('firstName lastName avatar bio applicationStatus createdAt')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      User.countDocuments(filter),
    ]);

    // Bulk follower counts
    const userIds = users.map(u => u._id);
    const followerCounts = await Follow.aggregate([
      { $match: { followingId: { $in: userIds } } },
      { $group: { _id: '$followingId', count: { $sum: 1 } } },
    ]);
    const followerMap = new Map(followerCounts.map(f => [String(f._id), f.count as number]));

    // Bulk isFollowing for current user
    let followingSet = new Set<string>();
    if (currentUserId) {
      const follows = await Follow.find({
        followerId: currentUserId,
        followingId: { $in: userIds },
      }).select('followingId').lean();
      followingSet = new Set(follows.map(f => String(f.followingId)));
    }

    const mapped = users.map(u => ({
      id:          String(u._id),
      username:    `${u.firstName}${u.lastName ?? ''}`.toLowerCase(),
      fullName:    `${u.firstName} ${u.lastName ?? ''}`.trim(),
      avatar:      u.avatar ?? null,
      bio:         u.bio ?? '',
      verified:    u.applicationStatus === 'approved',
      followers:   followerMap.get(String(u._id)) ?? 0,
      isFollowing: followingSet.has(String(u._id)),
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
