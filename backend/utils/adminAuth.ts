import { NextRequest } from 'next/server';
import { verifyToken } from './jwt';
import { connectDB } from '../config/database';
import { User } from '../models/User';

export interface AdminAuthResult {
  error: string | null;
  adminUser: any;
}

/**
 * Verifies that the request has a valid JWT belonging to an admin user.
 * Returns the admin user document or an error string.
 */
export async function verifyAdminAuth(request: NextRequest): Promise<AdminAuthResult> {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return { error: 'No authentication token provided', adminUser: null };
  }

  const token = authHeader.split(' ')[1];
  const decoded = verifyToken(token);
  if (!decoded) {
    return { error: 'Invalid or expired token', adminUser: null };
  }

  // Trust the role embedded in the signed JWT — avoids a DB round-trip on every request.
  // A compromised account will lose access once its JWT expires (default 7 days).
  if (decoded.role !== 'admin') {
    return { error: 'Access denied: admin role required', adminUser: null };
  }

  return { error: null, adminUser: { _id: decoded.userId, email: decoded.email, role: decoded.role } };
}
