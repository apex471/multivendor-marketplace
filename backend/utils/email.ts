import nodemailer from 'nodemailer';

const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || 'CLW Marketplace';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

// ─── Priority 1: Resend API ───────────────────────────────────────────────────
// Returns true on success, false on any failure (never throws).
// Common failure: free plan requires a verified domain to send to arbitrary
// recipients. Set RESEND_FROM_EMAIL=noreply@yourdomain.com after verifying
// your domain at https://resend.com/domains
async function sendViaResend(opts: EmailOptions): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return false;

  const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `${APP_NAME} <${fromEmail}>`,
        to: [opts.to],
        subject: opts.subject,
        html: opts.html,
        text: opts.text || '',
      }),
    });

    if (!res.ok) {
      const errBody = await res.text();
      // 403 = domain not verified (free plan restriction)
      // 422 = can only send to own email without domain verification
      console.error(
        `[Email] Resend rejected (HTTP ${res.status}): ${errBody}\n` +
        `  Fix: verify a domain at https://resend.com/domains and set\n` +
        `  RESEND_FROM_EMAIL=noreply@yourdomain.com in Netlify env vars.`
      );
      return false;
    }

    return true;
  } catch (err: unknown) {
    console.error('[Email] Resend network error:', err instanceof Error ? err.message : err);
    return false;
  }
}

// ─── Priority 2: SMTP / nodemailer ───────────────────────────────────────────
// Works with Gmail (App Password), SendGrid SMTP, Mailgun SMTP, etc.
// Required env vars: SMTP_HOST, SMTP_USER, SMTP_PASSWORD
// Optional:          SMTP_PORT (default 587), SMTP_FROM_EMAIL
function createSmtpTransporter() {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASSWORD;

  if (!host || !user || !pass || pass === 'your_app_password') {
    return null;
  }

  const port = parseInt(process.env.SMTP_PORT || '587', 10);

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465, // true for port 465 (SSL), false for 587 (STARTTLS)
    auth: { user, pass },
    tls: { rejectUnauthorized: false }, // Required for some hosting providers
  });
}

async function sendViaSmtp(opts: EmailOptions): Promise<boolean> {
  const transporter = createSmtpTransporter();
  if (!transporter) return false;

  try {
    const fromEmail = process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER;
    await transporter.sendMail({
      from: `"${APP_NAME}" <${fromEmail}>`,
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
      text: opts.text,
    });
    return true;
  } catch (err: unknown) {
    console.error('[Email] SMTP error:', err instanceof Error ? err.message : err);
    return false;
  }
}

async function sendEmail(opts: EmailOptions): Promise<void> {
  // ── Path 1: Resend ──
  if (process.env.RESEND_API_KEY) {
    const sent = await sendViaResend(opts);
    if (sent) {
      console.info(`[Email] Delivered via Resend to ${opts.to}`);
      return;
    }
    console.warn('[Email] Resend failed — trying SMTP fallback…');
  }

  // ── Path 2: SMTP ──
  const smtpSent = await sendViaSmtp(opts);
  if (smtpSent) {
    console.info(`[Email] Delivered via SMTP to ${opts.to}`);
    return;
  }

  // ── Path 3: Console fallback — ALWAYS runs if every delivery method fails ──
  // The OTP code is extracted from the plain-text body and printed clearly.
  // Check Netlify function logs to find the code.
  const otpMatch = opts.text?.match(/\b(\d{6})\b/);
  console.warn('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.warn('  📧  OTP NOT DELIVERED — all email providers failed');
  console.warn(`  TO:      ${opts.to}`);
  console.warn(`  SUBJECT: ${opts.subject}`);
  if (otpMatch) {
    console.warn(`  OTP CODE: ${otpMatch[1]}  ←←← USE THIS CODE`);
  } else {
    console.warn(`  BODY:     ${opts.text || '(html only)'}`);
  }
  console.warn('  ▸ To fix: verify a domain at resend.com/domains');
  console.warn('  ▸ Then set RESEND_FROM_EMAIL=noreply@yourdomain.com in Netlify');
  console.warn('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

/**
 * Send OTP verification code after signup.
 *
 * Delivery chain (automatic fallthrough on failure):
 *   1. Resend API  → RESEND_API_KEY required + verified domain for arbitrary recipients
 *   2. SMTP        → SMTP_HOST / SMTP_USER / SMTP_PASSWORD
 *   3. Console log → last resort; OTP visible in Netlify function logs
 */
export async function sendVerificationEmail(
  email: string,
  firstName: string,
  code: string,
  role: string
) {
  const roleLabel = role.charAt(0).toUpperCase() + role.slice(1);

  // Always log in dev for quick testing without needing email
  if (process.env.NODE_ENV !== 'production') {
    console.info(`\nℹ️  [Dev] OTP for ${email}: ${code}  (role: ${roleLabel})\n`);
  }

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <style>
        body { margin: 0; padding: 0; background: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
        .wrapper { max-width: 520px; margin: 40px auto; background: #fff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,.08); }
        .header { background: linear-gradient(135deg, #b8962e, #d4af37); padding: 36px 40px; text-align: center; }
        .header h1 { margin: 0; color: #fff; font-size: 24px; font-weight: 700; }
        .header p { margin: 6px 0 0; color: rgba(255,255,255,.75); font-size: 14px; }
        .body { padding: 36px 40px; }
        .body p { margin: 0 0 16px; color: #374151; font-size: 15px; line-height: 1.6; }
        .code-box { background: #fdf9ec; border: 2px dashed #d4af37; border-radius: 12px; padding: 28px 20px; text-align: center; margin: 24px 0; }
        .code-label { margin: 0 0 10px; font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 2px; }
        .code { margin: 0; font-size: 52px; font-weight: 800; letter-spacing: 14px; color: #b8962e; font-family: 'Courier New', monospace; }
        .code-expiry { margin: 10px 0 0; font-size: 13px; color: #9ca3af; }
        .warning { background: #fef3c7; border-radius: 8px; padding: 12px 16px; margin-top: 20px; }
        .warning p { margin: 0; font-size: 13px; color: #92400e; }
        .footer { padding: 20px 40px; background: #f9fafb; text-align: center; }
        .footer p { margin: 0; font-size: 12px; color: #9ca3af; }
      </style>
    </head>
    <body>
      <div class="wrapper">
        <div class="header">
          <h1>✨ ${APP_NAME}</h1>
          <p>Verify your ${roleLabel} account</p>
        </div>
        <div class="body">
          <p>Hi <strong>${firstName}</strong>,</p>
          <p>Use the code below to verify your <strong>${roleLabel}</strong> account on ${APP_NAME}. Enter it on the verification page to activate your account.</p>
          <div class="code-box">
            <p class="code-label">Your verification code</p>
            <p class="code">${code}</p>
            <p class="code-expiry">⏰ Expires in <strong>10 minutes</strong></p>
          </div>
          <div class="warning">
            <p>🔒 If you didn't create this account, you can safely ignore this email. Never share this code with anyone.</p>
          </div>
        </div>
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} ${APP_NAME}. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `Hi ${firstName},\n\nYour ${APP_NAME} ${roleLabel} verification code is:\n\n  ${code}\n\nThis code expires in 10 minutes. Never share it with anyone.\n\n${APP_NAME}`;

  await sendEmail({
    to: email,
    subject: `${code} — your ${APP_NAME} verification code`,
    html,
    text,
  });
}
