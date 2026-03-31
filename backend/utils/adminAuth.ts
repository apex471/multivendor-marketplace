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

  await connectDB();
  const adminUser = await User.findById(decoded.userId).lean();
  if (!adminUser) {
    return { error: 'User not found', adminUser: null };
  }
  if ((adminUser as any).role !== 'admin') {
    return { error: 'Access denied: admin role required', adminUser: null };
  }
  if (!(adminUser as any).isActive) {
    return { error: 'Account is suspended', adminUser: null };
  }

  return { error: null, adminUser };
}
