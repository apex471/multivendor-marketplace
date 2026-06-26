import { NextRequest } from 'next/server';
import { Settings } from '@/backend/models/Settings';
import { verifyAdminAuth } from '@/backend/utils/adminAuth';
import { sendSuccess, sendError, sendServerError } from '@/backend/utils/responseAppRouter';

const ALLOWED_FIELDS = [
  'platformName', 'platformEmail', 'supportEmail',
  'maintenanceMode', 'allowNewVendors', 'allowNewBrands', 'requireEmailVerification',
  'commissionRate', 'buyerFeeRate', 'sellerFeeRate', 'stripeFeeRate',
  'escrowDuration', 'minWithdrawal',
  'freeShippingThreshold', 'defaultShippingCost', 'internationalShipping',
] as const;

// GET /api/admin/settings
export async function GET(request: NextRequest) {
  const { error } = await verifyAdminAuth(request);
  if (error) return sendError(error, 401);

  try {
    const settings = await Settings.findOne();
    return sendSuccess(settings);
  } catch (err) {
    console.error('Admin settings GET error:', err);
    return sendServerError('Failed to load settings');
  }
}

// PUT /api/admin/settings
export async function PUT(request: NextRequest) {
  const { error: authError } = await verifyAdminAuth(request);
  if (authError) return sendError(authError, 401);

  try {
    const body = await request.json().catch(() => ({}));

    const update: Record<string, unknown> = {};
    for (const key of ALLOWED_FIELDS) {
      if (key in body) update[key] = body[key];
    }

    if (Object.keys(update).length === 0) {
      return sendError('No valid fields provided', 400);
    }

    const settings = await Settings.updateOne(update);

    return sendSuccess(settings, 'Settings saved successfully');
  } catch (err) {
    console.error('Admin settings PUT error:', err);
    return sendServerError('Failed to save settings');
  }
}
