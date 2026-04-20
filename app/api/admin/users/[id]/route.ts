import { NextRequest } from 'next/server';
import { connectDB } from '@/backend/config/database';
import { User } from '@/backend/models/User';
import { verifyAdminAuth } from '@/backend/utils/adminAuth';
import { sendSuccess, sendError, sendServerError } from '@/backend/utils/responseAppRouter';

// PATCH /api/admin/users/[id] - Update user status / approve / suspend
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error: authError, adminUser } = await verifyAdminAuth(request);
  if (authError) return sendError(authError, 401);

  try {
    await connectDB();
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const { action, reason, notes } = body;

    const validActions = ['suspend', 'activate', 'ban', 'verify_email', 'approve', 'reject'];
    if (!action || !validActions.includes(action)) {
      return sendError(`Invalid action. Valid actions: ${validActions.join(', ')}`, 400);
    }

    const user = await User.findById(id);
    if (!user) return sendError('User not found', 404);

    // Prevent admins from modifying other admins (safety)
    if (user.role === 'admin' && (adminUser as { _id: { toString(): string } })._id.toString() !== id) {
      return sendError('Cannot modify another admin account', 403);
    }

    switch (action) {
      case 'suspend':
        user.isActive = false;
        user.suspensionReason = reason || 'Suspended by administrator';
        break;

      case 'activate':
        user.isActive = true;
        user.suspensionReason = undefined;
        break;

      case 'ban':
        user.isActive = false;
        user.suspensionReason = reason || 'Account permanently banned';
        break;

      case 'verify_email':
        user.isEmailVerified = true;
        break;

      case 'approve':
        user.applicationStatus = 'approved';
        user.applicationNotes = notes || undefined;
        user.isActive = true;
        break;

      case 'reject':
        user.applicationStatus = 'rejected';
        user.applicationNotes = notes || 'Application rejected by administrator';
        break;
    }

    await user.save();

    return sendSuccess(
      {
        user: {
          id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          role: user.role,
          isActive: user.isActive,
          applicationStatus: user.applicationStatus,
          suspensionReason: user.suspensionReason,
        },
      },
      `User ${action} successful`
    );
  } catch (error) {
    console.error('Admin user PATCH error:', error);
    return sendServerError('Failed to update user');
  }
}

// GET /api/admin/users/[id] - Single user detail
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await verifyAdminAuth(request);
  if (error) return sendError(error, 401);

  try {
    await connectDB();
    const { id } = await params;
    const user = await User.findById(id).select('-password -googleId').lean();
    if (!user) return sendError('User not found', 404);
    return sendSuccess({ user });
  } catch (error) {
    console.error('Admin user GET error:', error);
    return sendServerError('Failed to fetch user');
  }
}
