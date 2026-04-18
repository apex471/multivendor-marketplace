import { NextRequest } from 'next/server';
import { connectDB } from '@/backend/config/database';
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
  { params }: { params: { username: string } }
) {
  try {
    await connectDB();

    const { username } = params;

    // Try _id first (MongoDB ObjectId 24-char hex)
    let user = null;
    if (/^[a-f\d]{24}$/i.test(username)) {
      user = await User.findById(username)
        .select('-password -emailVerificationToken -emailVerificationExpires')
        .lean();
    }

    // Fall back: search by firstName match
    if (!user) {
      user = await User.findOne({ firstName: { $regex: `^${username}`, $options: 'i' } })
        .select('-password -emailVerificationToken -emailVerificationExpires')
        .lean();
    }

    if (!user || !user.isActive) return sendNotFound('User not found');

    const userId = user._id;

    const [posts, followerCount, followingCount] = await Promise.all([
      Post.find({ authorId: userId, status: 'published', privacy: 'public' })
        .sort({ createdAt: -1 })
        .limit(12)
        .lean(),
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
        username:    `${user.firstName}${user.lastName ?? ''}`.toLowerCase(),
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
        id:       p._id,
        image:    p.images?.[0] ?? null,
        content:  p.content,
        likes:    p.likes,
        comments: p.comments,
        createdAt: p.createdAt,
      })),
    });
  } catch (err) {
    return sendServerError(err);
  }
}
