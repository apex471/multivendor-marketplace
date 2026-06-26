import { NextRequest } from 'next/server';
import { User } from '@/backend/models/User';
import { Follow } from '@/backend/models/Follow';
import { verifyToken } from '@/backend/utils/jwt';
import { sendSuccess, sendServerError } from '@/backend/utils/responseAppRouter';

// GET /api/users — search/suggest users
// Query: ?q=search&limit=20&page=1
// When no q is provided, returns suggested users (by follower count desc)
export async function GET(req: NextRequest) {
  try {
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

    let allUsers = await User.find({ isActive: true });
    
    // Exclude self
    if (currentUserId) {
      allUsers = allUsers.filter(u => u.id !== currentUserId);
    }

    // Filter by search query if provided
    if (q) {
      const queryLower = q.toLowerCase();
      allUsers = allUsers.filter(u => 
        u.firstName.toLowerCase().includes(queryLower) || 
        (u.lastName && u.lastName.toLowerCase().includes(queryLower))
      );
    }

    const userIds = allUsers.map(u => u.id!).filter(Boolean);
    const followerMap = await Follow.getFollowerCounts(userIds);

    if (!q) {
      // Suggested users: sort by follower count desc
      allUsers.sort((a, b) => {
        const aCount = followerMap.get(a.id!) ?? 0;
        const bCount = followerMap.get(b.id!) ?? 0;
        return bCount - aCount;
      });
    } else {
      // Search results: sort by createdAt desc
      allUsers.sort((a, b) => {
        const ad = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bd = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return bd - ad;
      });
    }

    const total = allUsers.length;
    const paginatedUsers = allUsers.slice(skip, skip + limit);

    // Bulk isFollowing for current user
    let followingSet = new Set<string>();
    if (currentUserId && paginatedUsers.length > 0) {
      const paginatedUserIds = paginatedUsers.map(u => u.id!).filter(Boolean);
      followingSet = await Follow.getFollowingSet(currentUserId, paginatedUserIds);
    }

    const mapped = paginatedUsers.map(u => ({
      id:          String(u.id),
      username:    `${u.firstName}${u.lastName ?? ''}`.toLowerCase().replace(/\s/g, ''),
      fullName:    `${u.firstName} ${u.lastName ?? ''}`.trim(),
      avatar:      u.avatar ?? null,
      bio:         u.bio ?? '',
      verified:    u.applicationStatus === 'approved',
      followers:   followerMap.get(String(u.id)) ?? 0,
      isFollowing: followingSet.has(String(u.id)),
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
