import { NextRequest } from 'next/server';
import { User } from '@/backend/models/User';
import { verifyAdminAuth } from '@/backend/utils/adminAuth';
import { sendSuccess, sendError, sendServerError } from '@/backend/utils/responseAppRouter';

// GET /api/admin/logistics
export async function GET(request: NextRequest) {
  const { error } = await verifyAdminAuth(request);
  if (error) return sendError(error, 401);

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'all';
    const search = searchParams.get('search');
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(50, parseInt(searchParams.get('limit') || '20'));
    const skip = (page - 1) * limit;

    let allProviders = await User.find({ role: 'logistics' });

    if (status !== 'all') {
      allProviders = allProviders.filter(b => b.applicationStatus === status);
    }

    if (search) {
      const lower = search.toLowerCase();
      allProviders = allProviders.filter(b =>
        b.firstName.toLowerCase().includes(lower) ||
        (b.lastName && b.lastName.toLowerCase().includes(lower)) ||
        b.email.toLowerCase().includes(lower)
      );
    }

    allProviders.sort((a, b) => (b.createdAt ? new Date(b.createdAt).getTime() : 0) - (a.createdAt ? new Date(a.createdAt).getTime() : 0));
    
    const total = allProviders.length;
    const paginated = allProviders.slice(skip, skip + limit);

    const pendingCount = await User.countDocuments({ role: 'logistics', applicationStatus: 'pending' });
    const approvedCount = await User.countDocuments({ role: 'logistics', applicationStatus: 'approved' });
    const rejectedCount = await User.countDocuments({ role: 'logistics', applicationStatus: 'rejected' });

    return sendSuccess({
      providers: paginated,
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
    const { providerId, action, notes } = await request.json().catch(() => ({}));
    if (!providerId) return sendError('providerId is required', 400);
    if (!['suspend', 'unsuspend', 'approve', 'reject'].includes(action)) {
      return sendError('Invalid action', 400);
    }

    const provider = await User.findById(providerId);
    if (!provider || provider.role !== 'logistics') return sendError('Logistics provider not found', 404);

    const updates: Partial<any> = {};
    if (action === 'suspend') {
      updates.isActive = false;
      updates.suspensionReason = notes || 'Suspended by administrator';
    } else if (action === 'unsuspend') {
      updates.isActive = true;
      updates.suspensionReason = null;
    } else if (action === 'approve') {
      updates.applicationStatus = 'approved';
      updates.isActive = true;
      if (notes) updates.applicationNotes = notes;
    } else if (action === 'reject') {
      updates.applicationStatus = 'rejected';
      updates.applicationNotes = notes || 'Application rejected by administrator';
    }

    await User.updateOne(providerId, updates);

    return sendSuccess(
      { providerId, isActive: updates.isActive ?? provider.isActive, applicationStatus: updates.applicationStatus ?? provider.applicationStatus },
      `Provider ${action}ed successfully`
    );
  } catch (err) {
    console.error('Admin logistics PATCH error:', err);
    return sendServerError('Failed to update logistics provider');
  }
}
