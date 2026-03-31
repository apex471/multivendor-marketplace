import { NextRequest } from 'next/server';
import { connectDB } from '@/backend/config/database';
import { User } from '@/backend/models/User';
import { verifyAdminAuth } from '@/backend/utils/adminAuth';
import { sendSuccess, sendError, sendServerError } from '@/backend/utils/responseAppRouter';

// GET /api/admin/brands
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

    const filter: Record<string, any> = { role: 'brand' };
    if (status !== 'all') filter.applicationStatus = status;
    if (search) {
      filter.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (page - 1) * limit;
    const [brands, total, pendingCount, approvedCount, rejectedCount] = await Promise.all([
      User.find(filter).select('-password -googleId').sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      User.countDocuments(filter),
      User.countDocuments({ role: 'brand', applicationStatus: 'pending' }),
      User.countDocuments({ role: 'brand', applicationStatus: 'approved' }),
      User.countDocuments({ role: 'brand', applicationStatus: 'rejected' }),
    ]);

    return sendSuccess({
      brands,
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
    await connectDB();
    const { brandId, action, notes } = await request.json().catch(() => ({}));
    if (!brandId) return sendError('brandId is required', 400);
    if (!['suspend', 'unsuspend', 'approve', 'reject'].includes(action)) {
      return sendError('Invalid action', 400);
    }

    const brand = await User.findOne({ _id: brandId, role: 'brand' });
    if (!brand) return sendError('Brand not found', 404);

    if (action === 'suspend') {
      brand.isActive = false;
      brand.suspensionReason = notes || 'Suspended by administrator';
    } else if (action === 'unsuspend') {
      brand.isActive = true;
      brand.suspensionReason = undefined;
    } else if (action === 'approve') {
      brand.applicationStatus = 'approved';
      brand.isActive = true;
      if (notes) brand.applicationNotes = notes;
    } else if (action === 'reject') {
      brand.applicationStatus = 'rejected';
      brand.applicationNotes = notes || 'Application rejected by administrator';
    }

    await brand.save();
    return sendSuccess(
      { brandId: brand._id, isActive: brand.isActive, applicationStatus: brand.applicationStatus },
      `Brand ${action}ed successfully`
    );
  } catch (err) {
    console.error('Admin brands PATCH error:', err);
    return sendServerError('Failed to update brand');
  }
}
