import { NextRequest } from 'next/server';
import { connectDB } from '@/backend/config/database';
import { User } from '@/backend/models/User';
import { verifyAdminAuth } from '@/backend/utils/adminAuth';
import { sendSuccess, sendError, sendServerError } from '@/backend/utils/responseAppRouter';

// GET /api/admin/logistics
export async function GET(request: NextRequest) {
  const { error } = await verifyAdminAuth(request);
  if (error) return sendError(error, 401);

  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'all';
    const search = searchParams.get('search');
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(50, parseInt(searchParams.get('limit') || '20'));

    const filter: Record<string, any> = { role: 'logistics' };
    if (status !== 'all') filter.applicationStatus = status;
    if (search) {
      filter.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (page - 1) * limit;
    const [providers, total, pendingCount, approvedCount, rejectedCount] = await Promise.all([
      User.find(filter).select('-password -googleId').sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      User.countDocuments(filter),
      User.countDocuments({ role: 'logistics', applicationStatus: 'pending' }),
      User.countDocuments({ role: 'logistics', applicationStatus: 'approved' }),
      User.countDocuments({ role: 'logistics', applicationStatus: 'rejected' }),
    ]);

    return sendSuccess({
      providers,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      counts: { pending: pendingCount, approved: approvedCount, rejected: rejectedCount },
    });
  } catch (err) {
    console.error('Admin logistics GET error:', err);
    return sendServerError('Failed to load logistics providers');
  }
}

// PATCH /api/admin/logistics — suspend, unsuspend, approve, reject
export async function PATCH(request: NextRequest) {
  const { error: authError } = await verifyAdminAuth(request);
  if (authError) return sendError(authError, 401);

  try {
    await connectDB();
    const { providerId, action, notes } = await request.json().catch(() => ({}));
    if (!providerId) return sendError('providerId is required', 400);
    if (!['suspend', 'unsuspend', 'approve', 'reject'].includes(action)) {
      return sendError('Invalid action', 400);
    }

    const provider = await User.findOne({ _id: providerId, role: 'logistics' });
    if (!provider) return sendError('Logistics provider not found', 404);

    if (action === 'suspend') {
      provider.isActive = false;
      provider.suspensionReason = notes || 'Suspended by administrator';
    } else if (action === 'unsuspend') {
      provider.isActive = true;
      provider.suspensionReason = undefined;
    } else if (action === 'approve') {
      provider.applicationStatus = 'approved';
      provider.isActive = true;
      if (notes) provider.applicationNotes = notes;
    } else if (action === 'reject') {
      provider.applicationStatus = 'rejected';
      provider.applicationNotes = notes || 'Application rejected by administrator';
    }

    await provider.save();
    return sendSuccess(
      { providerId: provider._id, isActive: provider.isActive, applicationStatus: provider.applicationStatus },
      `Provider ${action}ed successfully`
    );
  } catch (err) {
    console.error('Admin logistics PATCH error:', err);
    return sendServerError('Failed to update logistics provider');
  }
}
