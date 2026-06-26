import { NextRequest } from 'next/server';
import { User } from '@/backend/models/User';
import { verifyAdminAuth } from '@/backend/utils/adminAuth';
import { sendSuccess, sendError, sendServerError } from '@/backend/utils/responseAppRouter';

export async function GET(request: NextRequest) {
  const { error } = await verifyAdminAuth(request);
  if (error) return sendError(error, 401);

  try {
    const sp     = new URL(request.url).searchParams;
    const type   = sp.get('type')   || 'all';
    const status = sp.get('status') || 'pending';
    const page   = Math.max(1,  parseInt(sp.get('page')  || '1'));
    const limit  = Math.min(50, parseInt(sp.get('limit') || '20'));

    // Fetch all non-customer roles
    const allNonCustomer = await User.find({}, { orderBy: 'createdAt', orderDir: 'desc', limit: 2000 });
    let applications = allNonCustomer.filter(u =>
      ['vendor', 'brand', 'logistics'].includes(u.role)
    );

    if (type !== 'all') applications = applications.filter(u => u.role === type);
    if (status !== 'all') applications = applications.filter(u => u.applicationStatus === status);

    const total = applications.length;
    const paged = applications.slice((page - 1) * limit, page * limit);

    const pendingVendors   = allNonCustomer.filter(u => u.role === 'vendor'    && u.applicationStatus === 'pending').length;
    const pendingBrands    = allNonCustomer.filter(u => u.role === 'brand'     && u.applicationStatus === 'pending').length;
    const pendingLogistics = allNonCustomer.filter(u => u.role === 'logistics' && u.applicationStatus === 'pending').length;

    return sendSuccess({
      applications: paged,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit), hasNext: page * limit < total, hasPrev: page > 1 },
      counts: { vendors: pendingVendors, brands: pendingBrands, logistics: pendingLogistics, total: pendingVendors + pendingBrands + pendingLogistics },
    });
  } catch (err) {
    return sendServerError(err instanceof Error ? err.message : String(err));
  }
}

export async function POST(request: NextRequest) {
  const { error } = await verifyAdminAuth(request);
  if (error) return sendError(error, 401);

  try {
    const { userId, action, notes } = await request.json().catch(() => ({}));
    if (!userId) return sendError('userId is required', 400);
    if (!['approve', 'reject'].includes(action)) return sendError('action must be "approve" or "reject"', 400);

    const user = await User.findById(userId);
    if (!user) return sendError('User not found', 404);
    if (!['vendor', 'brand', 'logistics'].includes(user.role)) {
      return sendError('Only vendor, brand, or logistics accounts can be approved', 400);
    }

    const updates: Record<string, unknown> = {
      applicationStatus: action === 'approve' ? 'approved' : 'rejected',
      applicationNotes: notes || (action === 'reject' ? 'Application rejected by administrator' : undefined),
    };
    if (action === 'approve') updates.isActive = true;

    await User.updateOne(userId, updates);
    return sendSuccess({ userId, role: user.role, ...updates }, `Application ${action === 'approve' ? 'approved' : 'rejected'} successfully`);
  } catch (err) {
    return sendServerError(err instanceof Error ? err.message : String(err));
  }
}
