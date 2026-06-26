import { NextRequest } from 'next/server';
import { User } from '@/backend/models/User';
import { verifyAdminAuth } from '@/backend/utils/adminAuth';
import { sendSuccess, sendError, sendServerError } from '@/backend/utils/responseAppRouter';

export async function GET(request: NextRequest) {
  const { error } = await verifyAdminAuth(request);
  if (error) return sendError(error, 401);

  try {
    const sp     = new URL(request.url).searchParams;
    const page   = Math.max(1,  parseInt(sp.get('page')  || '1'));
    const limit  = Math.min(50, parseInt(sp.get('limit') || '20'));
    const role   = sp.get('role')   || '';
    const status = sp.get('status') || '';
    const search = sp.get('search') || '';

    const filter: Record<string, unknown> = {};
    if (role && role !== 'all')   filter.role = role;
    if (status && status !== 'all') filter.isActive = status === 'active';

    let users = await User.find(filter, { orderBy: 'createdAt', orderDir: 'desc', limit: 2000 });

    if (search) {
      const q = search.toLowerCase();
      users = users.filter(u =>
        u.firstName?.toLowerCase().includes(q) ||
        u.lastName?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        `${u.firstName} ${u.lastName}`.toLowerCase().includes(q)
      );
    }

    const total = users.length;
    const paged = users.slice((page - 1) * limit, page * limit);

    return sendSuccess({ users: paged, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (err) {
    return sendServerError(err instanceof Error ? err.message : String(err));
  }
}
