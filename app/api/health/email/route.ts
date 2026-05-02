/**
 * POST /api/health/email
 * Admin-only diagnostic endpoint — sends a real test email and reports the result.
 * Use this to verify your email provider config without going through signup.
 *
 * Request body: { "to": "you@example.com" }
 * Authorization: Bearer <admin JWT>
 */
import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/backend/utils/jwt';
import { sendTestEmail } from '@/backend/utils/email';

export async function POST(req: NextRequest) {
  // Always require admin auth — we don't want this callable by anyone
  const auth = req.headers.get('Authorization') ?? '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  const payload = token ? verifyToken(token) : null;

  if (!payload || payload.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const to: string = (body.to || '').trim();

  if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
    return NextResponse.json(
      { error: 'Provide a valid "to" email address in the request body.' },
      { status: 400 }
    );
  }

  // Collect config state for the report
  const config = {
    RESEND_API_KEY: process.env.RESEND_API_KEY ? '✅ set' : '❌ MISSING',
    RESEND_FROM_EMAIL: process.env.RESEND_FROM_EMAIL || '❌ MISSING (set to noreply@yourdomain.com)',
    SMTP_HOST: process.env.SMTP_HOST || '❌ not set',
    SMTP_USER: process.env.SMTP_USER?.startsWith('your_') ? '❌ placeholder' : (process.env.SMTP_USER ? '✅ set' : '❌ not set'),
    SMTP_PASSWORD: process.env.SMTP_PASSWORD === 'your_app_password' ? '❌ placeholder' : (process.env.SMTP_PASSWORD ? '✅ set' : '❌ not set'),
  };

  const result = await sendTestEmail(to);

  return NextResponse.json(
    {
      sent: result.sent,
      provider: result.provider,
      to,
      ...(result.error ? { error: result.error } : {}),
      config,
      instructions: result.sent
        ? 'Email delivered successfully.'
        : 'Delivery failed. Set one of the following in Netlify Site Settings → Environment Variables:\n' +
          'OPTION A (Resend): RESEND_API_KEY + RESEND_FROM_EMAIL=noreply@yourdomain.com\n' +
          'OPTION B (Gmail): SMTP_HOST=smtp.gmail.com, SMTP_PORT=587, SMTP_USER=you@gmail.com, SMTP_PASSWORD=<16-char App Password>',
    },
    { status: result.sent ? 200 : 503 }
  );
}
