import { NextRequest } from 'next/server';
import { connectDB } from '@/backend/config/database';
import { User } from '@/backend/models/User';
import { verifyAdminAuth } from '@/backend/utils/adminAuth';
import { sendSuccess, sendError, sendServerError } from '@/backend/utils/responseAppRouter';

// GET /api/admin/approvals - List pending applications
export async function GET(request: NextRequest) {
  const { error } = await verifyAdminAuth(request);
  if (error) return sendError(error, 401);

  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'all'; // vendor | brand | logistics | all
    const status = searchParams.get('status') || 'pending';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(50, parseInt(searchParams.get('limit') || '20'));

    const filter: Record<string, unknown> = {
      role: { $in: ['vendor', 'brand', 'logistics'] },
    };
    if (status !== 'all') filter.applicationStatus = status;
    if (type !== 'all') filter.role = type;

    const skip = (page - 1) * limit;
    const [applications, total] = await Promise.all([
      User.find(filter)
        .select('-password -googleId')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      User.countDocuments(filter),
    ]);

    // Count by role for tab badges
    const [pendingVendors, pendingBrands, pendingLogistics] = await Promise.all([
      User.countDocuments({ role: 'vendor', applicationStatus: 'pending' }),
      User.countDocuments({ role: 'brand', applicationStatus: 'pending' }),
      User.countDocuments({ role: 'logistics', applicationStatus: 'pending' }),
    ]);

    return sendSuccess({
      applications,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
      counts: {
        vendors: pendingVendors,
        brands: pendingBrands,
        logistics: pendingLogistics,
        total: pendingVendors + pendingBrands + pendingLogistics,
      },
    });
  } catch (error) {
    console.error('Admin approvals GET error:', error);
    return sendServerError('Failed to fetch applications');
  }
}

// POST /api/admin/approvals - Approve or reject an application
export async function POST(request: NextRequest) {
  const { error: authError } = await verifyAdminAuth(request);
  if (authError) return sendError(authError, 401);

  try {
    await connectDB();
    const body = await request.json().catch(() => ({}));
    const { userId, action, notes } = body;

    if (!userId) return sendError('userId is required', 400);
    if (!['approve', 'reject'].includes(action)) {
      return sendError('action must be "approve" or "reject"', 400);
    }

    const user = await User.findById(userId);
    if (!user) return sendError('User not found', 404);
    if (!['vendor', 'brand', 'logistics'].includes(user.role)) {
      return sendError('Only vendor, brand, or logistics accounts can be approved', 400);
    }

    user.applicationStatus = action === 'approve' ? 'approved' : 'rejected';
    user.applicationNotes = notes || (action === 'reject' ? 'Application rejected by administrator' : undefined);
    if (action === 'approve') user.isActive = true;

    await user.save();

    return sendSuccess(
      {
        userId: user._id,
        role: user.role,
        applicationStatus: user.applicationStatus,
        applicationNotes: user.applicationNotes,
      },
      `Application ${action === 'approve' ? 'approved' : 'rejected'} successfully`
    );
  } catch (error) {
    console.error('Admin approvals POST error:', error);
    return sendServerError('Failed to process application');
  }
}
