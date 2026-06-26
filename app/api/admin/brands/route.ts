import { NextRequest } from 'next/server';
import { User } from '@/backend/models/User';
import { verifyAdminAuth } from '@/backend/utils/adminAuth';
import { sendSuccess, sendError, sendServerError } from '@/backend/utils/responseAppRouter';

// GET /api/admin/brands
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

    let allBrands = await User.find({ role: 'brand' });

    if (status !== 'all') {
      allBrands = allBrands.filter(b => b.applicationStatus === status);
    }

    if (search) {
      const lower = search.toLowerCase();
      allBrands = allBrands.filter(b =>
        b.firstName.toLowerCase().includes(lower) ||
        (b.lastName && b.lastName.toLowerCase().includes(lower)) ||
        b.email.toLowerCase().includes(lower)
      );
    }

    allBrands.sort((a, b) => (b.createdAt ? new Date(b.createdAt).getTime() : 0) - (a.createdAt ? new Date(a.createdAt).getTime() : 0));
    
    const total = allBrands.length;
    const paginated = allBrands.slice(skip, skip + limit);

    const pendingCount = await User.countDocuments({ role: 'brand', applicationStatus: 'pending' });
    const approvedCount = await User.countDocuments({ role: 'brand', applicationStatus: 'approved' });
    const rejectedCount = await User.countDocuments({ role: 'brand', applicationStatus: 'rejected' });

    return sendSuccess({
      brands: paginated,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      counts: { pending: pendingCount, approved: approvedCount, rejected: rejectedCount },
    });
  } catch (err) {
    console.error('Admin brands GET error:', err);
    return sendServerError('Failed to load brands');
  }
}

// PATCH /api/admin/brands — suspend or unsuspend a brand
export async function PATCH(request: NextRequest) {
  const { error: authError } = await verifyAdminAuth(request);
  if (authError) return sendError(authError, 401);

  try {
    const { brandId, action, notes } = await request.json().catch(() => ({}));
    if (!brandId) return sendError('brandId is required', 400);
    if (!['suspend', 'unsuspend', 'approve', 'reject'].includes(action)) {
      return sendError('Invalid action', 400);
    }

    const brand = await User.findById(brandId);
    if (!brand || brand.role !== 'brand') return sendError('Brand not found', 404);

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

    await User.updateOne(brandId, updates);

    return sendSuccess(
      { brandId, isActive: updates.isActive ?? brand.isActive, applicationStatus: updates.applicationStatus ?? brand.applicationStatus },
      `Brand ${action}ed successfully`
    );
  } catch (err) {
    console.error('Admin brands PATCH error:', err);
    return sendServerError('Failed to update brand');
  }
}
