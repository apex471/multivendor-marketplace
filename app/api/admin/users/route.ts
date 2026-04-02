import { NextRequest } from 'next/server';
import { connectDB } from '@/backend/config/database';
import { User } from '@/backend/models/User';
import { verifyAdminAuth } from '@/backend/utils/adminAuth';
import { sendSuccess, sendError, sendServerError } from '@/backend/utils/responseAppRouter';

// GET /api/admin/users - Paginated user list with filters
export async function GET(request: NextRequest) {
  const { error } = await verifyAdminAuth(request);
  if (error) return sendError(error, 401);

  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(50, parseInt(searchParams.get('limit') || '20'));
    const role = searchParams.get('role') || 'all';
    const status = searchParams.get('status') || 'all'; // active | suspended | all
    const search = searchParams.get('search') || '';
    const applicationStatus = searchParams.get('applicationStatus') || 'all';

    // Build filter
    const filter: Record<string, unknown> = {};

    if (role !== 'all') filter.role = role;

    if (status === 'active') filter.isActive = true;
    else if (status === 'suspended') filter.isActive = false;

    if (applicationStatus !== 'all') filter.applicationStatus = applicationStatus;

    if (search) {
      filter.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (page - 1) * limit;
    const [users, total] = await Promise.all([
      User.find(filter)
        .select('-password -googleId')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      User.countDocuments(filter),
    ]);

    return sendSuccess({
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    console.error('Admin users GET error:', error);
    return sendServerError('Failed to fetch users');
  }
}
