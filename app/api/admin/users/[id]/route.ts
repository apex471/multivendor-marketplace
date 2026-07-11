import { NextRequest } from 'next/server';
import { User } from '@/backend/models/User';
import { verifyAdminAuth } from '@/backend/utils/adminAuth';
import { sendSuccess, sendError, sendNotFound, sendServerError } from '@/backend/utils/responseAppRouter';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { error } = await verifyAdminAuth(request);
  if (error) return sendError(error, 401);

  try {
    const user = await User.findById(id);
    if (!user) return sendNotFound('User not found');
    return sendSuccess({ user });
  } catch (err) {
    return sendServerError(err instanceof Error ? err.message : String(err));
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { error } = await verifyAdminAuth(request);
  if (error) return sendError(error, 401);

  try {
    const body = await request.json().catch(() => ({}));
    const allowed = ['role', 'isActive', 'applicationStatus', 'applicationNotes', 'suspensionReason'];
    const updates: Record<string, unknown> = {};
    for (const f of allowed) {
      if (body[f] !== undefined) updates[f] = body[f];
    }

    if (updates.applicationStatus === 'approved') {
      updates.isEmailVerified = true;
      updates.isActive = true;
    }

    const user = await User.findById(id);
    if (!user) return sendNotFound('User not found');

    await User.updateOne(id, updates);
    const updated = await User.findById(id);
    return sendSuccess({ user: updated }, 'User updated successfully');
  } catch (err) {
    return sendServerError(err instanceof Error ? err.message : String(err));
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { error } = await verifyAdminAuth(request);
  if (error) return sendError(error, 401);

  try {
    const user = await User.findByIdAndDelete(id);
    if (!user) return sendNotFound('User not found');
    return sendSuccess(null, 'User deleted successfully');
  } catch (err) {
    return sendServerError(err instanceof Error ? err.message : String(err));
  }
}
