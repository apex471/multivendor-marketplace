import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/backend/config/database';
import { verifyToken } from '@/backend/utils/jwt';

/**
 * GET /api/health
 * Diagnostic endpoint — checks env vars and DB connectivity.
 * In production this requires a valid admin Bearer token to prevent
 * information disclosure to unauthenticated parties.
 */
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
  checks.MONGODB_URI = process.env.MONGODB_URI ? '✅ set' : '❌ MISSING';
  checks.JWT_SECRET = process.env.JWT_SECRET ? '✅ set' : '❌ MISSING';
  checks.JWT_EXPIRE = process.env.JWT_EXPIRE || '⚠️ not set (default: 7d)';
  checks.RESEND_API_KEY = process.env.RESEND_API_KEY ? '✅ set' : '⚠️ not set (emails go to console only)';
  checks.SMTP_HOST = process.env.SMTP_HOST ? `✅ ${process.env.SMTP_HOST}` : '⚠️ not set';
  checks.NODE_ENV = process.env.NODE_ENV || 'not set';

  // ── DB connectivity check ──────────────────────────────────────────────────
  let dbStatus = '';
  let dbError = '';
  try {
    await connectDB();
    dbStatus = '✅ connected';
  } catch (err: unknown) {
    dbStatus = '❌ failed';
    dbError = (err as Error)?.message || 'Unknown error';
  }

  const allCriticalOk =
    checks.MONGODB_URI.startsWith('✅') &&
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
