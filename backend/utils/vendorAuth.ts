import { NextRequest } from 'next/server';
import { verifyToken } from './jwt';
import { connectDB } from '../config/database';
import { User } from '../models/User';

export interface VendorAuthResult {
  error: string | null;
  user: any;
  userId: string | null;
}

const SELLER_ROLES = new Set(['vendor', 'brand', 'admin']);

/**
 * Verifies that the request carries a valid JWT for a vendor/brand/admin whose
 * account is active and (for non-admins) approved.
 */
export async function verifyVendorAuth(
  request: NextRequest
): Promise<VendorAuthResult> {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return { error: 'No authentication token provided', user: null, userId: null };
  }

  const token = authHeader.split(' ')[1];
  const decoded = verifyToken(token);
  if (!decoded) {
    return { error: 'Invalid or expired token', user: null, userId: null };
  }

  // Fast-path role check — skip DB hit for clearly wrong roles
  if (!SELLER_ROLES.has(decoded.role)) {
    return { error: 'Access denied: seller role required', user: null, userId: null };
  }

  await connectDB();
  const user = await User.findById(decoded.userId).lean();
  if (!user) {
    return { error: 'User not found', user: null, userId: null };
  }
  if (!(user as any).isActive) {
    return { error: 'Account is suspended', user: null, userId: null };
  }
  if (
    (user as any).role !== 'admin' &&
    (user as any).applicationStatus !== 'approved'
  ) {
    return { error: 'Account not yet approved by admin', user: null, userId: null };
  }

  return { error: null, user, userId: decoded.userId };
}
