import { NextRequest } from 'next/server';
import { db, docToObject } from '@/backend/config/firebase';
import { verifyToken } from '@/backend/utils/jwt';
import { sendSuccess, sendError, sendServerError } from '@/backend/utils/responseAppRouter';

// GET /api/users/search?q=query&limit=10
// ─ Requires auth. Searches active vendors, brands, and customers by name.
// ─ Excludes the caller themselves. Returns minimal profile data safe to expose.
export async function GET(request: NextRequest) {
  const auth  = request.headers.get('Authorization') ?? request.headers.get('authorization') ?? '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return sendError('Authentication required', 401);
  const payload = verifyToken(token);
  if (!payload?.userId) return sendError('Invalid token', 401);

  try {
    const sp    = new URL(request.url).searchParams;
    const q     = (sp.get('q') ?? '').trim().toLowerCase();
    const limit = Math.min(20, parseInt(sp.get('limit') ?? '10'));

    if (!q) return sendSuccess({ users: [] });

    // Fetch all active, approved users — for messenger search
    // We filter in-memory since Firestore doesn't support full-text search
    const snap = await db.collection('users')
      .where('isActive', '==', true)
      .limit(200) // fetch a reasonable sample to search in-memory
      .get();

    const results: Record<string, unknown>[] = [];

    for (const doc of snap.docs) {
      if (doc.id === payload.userId) continue; // exclude self

      const data = doc.data();
      const full = `${data.firstName ?? ''} ${data.lastName ?? ''} ${data.storeName ?? ''} ${data.email ?? ''}`.toLowerCase();
      if (!full.includes(q)) continue;

      results.push({
        id:        doc.id,
        firstName: data.firstName,
        lastName:  data.lastName,
        storeName: data.storeName,
        role:      data.role,
        avatar:    data.avatar ?? null,
      });

      if (results.length >= limit) break;
    }

    return sendSuccess({ users: results });
  } catch (err) {
    console.error('[UserSearch] error:', err);
    return sendServerError(err instanceof Error ? err.message : 'Search failed');
  }
}
