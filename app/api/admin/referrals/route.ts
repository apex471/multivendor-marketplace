import { NextRequest } from 'next/server';
import { verifyAdminAuth } from '@/backend/utils/adminAuth';
import { ReferralCode, generateReferralCode } from '@/backend/models/ReferralCode';
import { sendSuccess, sendError, sendServerError } from '@/backend/utils/responseAppRouter';
import { sanitizeInput } from '@/backend/utils/validation';

// GET /api/admin/referrals — list all referral codes with stats
export async function GET(request: NextRequest) {
  const { error } = await verifyAdminAuth(request);
  if (error) return sendError(error, 401);

  try {
    const sp         = new URL(request.url).searchParams;
    const activeOnly = sp.get('active') === 'true';
    const page       = Math.max(1, parseInt(sp.get('page') || '1'));
    const limit      = Math.min(100, parseInt(sp.get('limit') || '50'));

    const filter = activeOnly ? { isActive: true } : {};
    const all    = await ReferralCode.find(filter);

    // Sort newest first
    all.sort((a, b) =>
      (b.createdAt ? new Date(b.createdAt).getTime() : 0) -
      (a.createdAt ? new Date(a.createdAt).getTime() : 0)
    );

    const total    = all.length;
    const paginated = all.slice((page - 1) * limit, page * limit);

    const totalSignups      = all.reduce((s, r) => s + (r.totalSignups || 0), 0);
    const totalEarnings     = Math.round(all.reduce((s, r) => s + (r.totalEarnings || 0), 0) * 100) / 100;
    const totalTransactions = all.reduce((s, r) => s + (r.totalTransactions || 0), 0);

    return sendSuccess({
      codes: paginated,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      summary: { totalCodes: total, totalSignups, totalEarnings, totalTransactions },
    });
  } catch (err) {
    console.error('[Admin Referrals GET]', err);
    return sendServerError('Failed to load referral codes');
  }
}

// POST /api/admin/referrals — create a new referral code
export async function POST(request: NextRequest) {
  const { error, adminUser } = await verifyAdminAuth(request);
  if (error) return sendError(error, 401);

  try {
    const body  = await request.json().catch(() => ({}));
    const label = body.label ? sanitizeInput(String(body.label)).trim() : '';
    if (!label) return sendError('label is required', 400);

    // Optionally accept a specific affiliateUserId to credit earnings to
    // (defaults to the admin's own userId if not supplied)
    const affiliateUserId: string = body.affiliateUserId || adminUser._id || '';

    // Generate a unique code
    let code = body.code ? String(body.code).toUpperCase().trim() : generateReferralCode();
    // Ensure uniqueness
    let attempts = 0;
    while (await ReferralCode.codeExists(code)) {
      if (attempts++ > 10) return sendServerError('Could not generate a unique code, please try again');
      code = generateReferralCode();
    }

    const created = await ReferralCode.create({
      code,
      label,
      createdByAdmin: adminUser._id || '',
    });

    // Store affiliateUserId in the doc (update immediately after creation)
    if (affiliateUserId) {
      await ReferralCode.updateOne(created.id!, { ...(created as any), affiliateUserId });
    }

    return sendSuccess({ ...created, affiliateUserId }, 'Referral code created successfully', 201);
  } catch (err) {
    console.error('[Admin Referrals POST]', err);
    return sendServerError('Failed to create referral code');
  }
}

// PATCH /api/admin/referrals — update label or toggle active status
export async function PATCH(request: NextRequest) {
  const { error } = await verifyAdminAuth(request);
  if (error) return sendError(error, 401);

  try {
    const body = await request.json().catch(() => ({}));
    const { id, isActive, label } = body;
    if (!id) return sendError('id is required', 400);

    const existing = await ReferralCode.findById(id);
    if (!existing) return sendError('Referral code not found', 404);

    const updates: Record<string, unknown> = {};
    if (typeof isActive === 'boolean') updates.isActive = isActive;
    if (label) updates.label = sanitizeInput(String(label)).trim();

    await ReferralCode.updateOne(id, updates as any);
    return sendSuccess({ id, ...updates }, 'Referral code updated');
  } catch (err) {
    console.error('[Admin Referrals PATCH]', err);
    return sendServerError('Failed to update referral code');
  }
}

// DELETE /api/admin/referrals — delete a referral code
export async function DELETE(request: NextRequest) {
  const { error } = await verifyAdminAuth(request);
  if (error) return sendError(error, 401);

  try {
    const { id } = await request.json().catch(() => ({}));
    if (!id) return sendError('id is required', 400);

    const existing = await ReferralCode.findById(id);
    if (!existing) return sendError('Referral code not found', 404);

    await ReferralCode.deleteOne(id);
    return sendSuccess({ id }, 'Referral code deleted');
  } catch (err) {
    console.error('[Admin Referrals DELETE]', err);
    return sendServerError('Failed to delete referral code');
  }
}
