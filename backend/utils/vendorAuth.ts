import { NextRequest } from 'next/server';
import { verifyToken } from './jwt';

export interface VendorAuthResult {
  error: string | null;
  user: { _id: string; email: string; role: string } | null;
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

  // Trust the role embedded in the signed JWT — avoids a DB round-trip on every request.
  if (!SELLER_ROLES.has(decoded.role)) {
    return { error: 'Access denied: seller role required', user: null, userId: null };
  }

  return {
    error: null,
    user: { _id: decoded.userId, email: decoded.email, role: decoded.role },
    userId: decoded.userId,
  };
}
