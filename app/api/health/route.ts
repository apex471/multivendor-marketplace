import { NextResponse } from 'next/server';
import { connectDB } from '@/backend/config/database';

/**
 * GET /api/health
 * Diagnostic endpoint — checks env vars and DB connectivity.
 * Useful for debugging Netlify deployment issues without reading logs.
 */
export async function GET() {
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
