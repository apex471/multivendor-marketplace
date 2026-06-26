import { NextRequest } from 'next/server';
import { User } from '@/backend/models/User';
import { Post } from '@/backend/models/Post';
import { Follow } from '@/backend/models/Follow';
import { verifyToken } from '@/backend/utils/jwt';
import {
  sendSuccess,
  sendNotFound,
  sendServerError,
} from '@/backend/utils/responseAppRouter';

// GET /api/users/[username] — public profile
// username is treated as firstName+lastName concatenated (lowercase, no spaces)
// or falls back to _id lookup
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  try {
    const { username } = await params;

    // Try _id first
    let user = await User.findById(username);

    // Fall back: search by username comparison in memory
    if (!user) {
      const allUsers = await User.find({ isActive: true });
      user = allUsers.find(u => {
        const uName = `${u.firstName}${u.lastName ?? ''}`.toLowerCase().replace(/\s/g, '');
        return uName === username.toLowerCase() || u.firstName.toLowerCase() === username.toLowerCase();
      }) || null;
    }

    if (!user || !user.isActive) return sendNotFound('User not found');

    const userId = user.id!;

    const [posts, followerCount, followingCount] = await Promise.all([
      Post.find({ authorId: userId, status: 'published', privacy: 'public' }, { limit: 12, orderBy: 'createdAt', orderDir: 'desc' }),
      Follow.countDocuments({ followingId: userId }),
      Follow.countDocuments({ followerId: userId }),
    ]);

    // Check if current user follows this profile
    let isFollowing = false;
    const auth = req.headers.get('authorization') ?? '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
    if (token) {
      const payload = verifyToken(token);
      if (payload) {
        const follow = await Follow.findOne({
          followerId: payload.userId,
          followingId: userId,
        });
        isFollowing = !!follow;
      }
    }

    return sendSuccess({
      user: {
        id:          userId,
        username:    `${user.firstName}${user.lastName ?? ''}`.toLowerCase().replace(/\s/g, ''),
        fullName:    `${user.firstName} ${user.lastName ?? ''}`.trim(),
        firstName:   user.firstName,
        lastName:    user.lastName,
        avatar:      user.avatar ?? null,
        bio:         user.bio ?? '',
        role:        user.role,
        verified:    user.applicationStatus === 'approved',
        joinedAt:    user.createdAt,
        stats: {
          posts:     posts.length,
          followers: followerCount,
          following: followingCount,
        },
        isFollowing,
      },
      posts: posts.map(p => ({
        id:       p.id,
        image:    p.images?.[0] ?? null,
        content:  p.content,
        likes:    p.likes,
        comments: p.comments,
        createdAt: p.createdAt,
      })),
    });
  } catch (err) {
    return sendServerError(err instanceof Error ? err.message : String(err));
  }
}
