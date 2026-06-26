import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/backend/utils/jwt';
import { db } from '@/backend/config/firebase';

// GET /api/health
// Diagnostic endpoint — checks env vars and DB connectivity.
export async function GET(req: NextRequest) {
  // In production, require admin auth to prevent info leakage
  if (process.env.NODE_ENV === 'production') {
    const auth = req.headers.get('Authorization') ?? '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
    const payload = token ? verifyToken(token) : null;
    if (!payload || payload.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  }
  const checks: Record<string, string> = {};

  // ── Env var checks ─────────────────────────────────────────────────────────
  checks.FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID ? '✅ set' : '❌ MISSING';
  checks.FIREBASE_CLIENT_EMAIL = process.env.FIREBASE_CLIENT_EMAIL ? '✅ set' : '❌ MISSING';
  checks.FIREBASE_PRIVATE_KEY = process.env.FIREBASE_PRIVATE_KEY ? '✅ set' : '❌ MISSING';
  checks.JWT_SECRET = process.env.JWT_SECRET ? '✅ set' : '❌ MISSING';
  checks.JWT_EXPIRE = process.env.JWT_EXPIRE || '⚠️ not set (default: 7d)';
  checks.RESEND_API_KEY = process.env.RESEND_API_KEY ? '✅ set' : '⚠️ not set (emails go to console only)';
  checks.NODE_ENV = process.env.NODE_ENV || 'not set';

  // ── DB connectivity check ──────────────────────────────────────────────────
  let dbStatus = '';
  let dbError = '';
  try {
    // Try querying a dummy collection to verify connection to Firestore
    await db.collection('_health_check').limit(1).get();
    dbStatus = '✅ connected';
  } catch (err: unknown) {
    dbStatus = '❌ failed';
    dbError = (err as Error)?.message || 'Unknown error';
  }

  const allCriticalOk =
    checks.FIREBASE_PROJECT_ID.startsWith('✅') &&
    checks.FIREBASE_CLIENT_EMAIL.startsWith('✅') &&
    checks.FIREBASE_PRIVATE_KEY.startsWith('✅') &&
    checks.JWT_SECRET.startsWith('✅') &&
    dbStatus.startsWith('✅');

  return NextResponse.json(
    {
      status: allCriticalOk ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      environment: checks,
      database: { status: dbStatus, ...(dbError ? { error: dbError } : {}) },
    },
    { status: allCriticalOk ? 200 : 503 }
  );
}
