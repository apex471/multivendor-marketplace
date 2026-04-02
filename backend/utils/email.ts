import nodemailer from 'nodemailer';

const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || 'CLW Marketplace';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

// ─── Priority 1: Resend API ───────────────────────────────────────────────────
// Free tier: 3 000 emails/month. No SMTP config needed — just set RESEND_API_KEY.
// Get your key at https://resend.com → free account → API Keys.
// Set in Netlify: Site Settings → Environment Variables → RESEND_API_KEY
async function sendViaResend(opts: EmailOptions): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY!;
  // On the free Resend plan, `from` must be: "Name <onboarding@resend.dev>"
  // OR a verified custom domain. Use RESEND_FROM_EMAIL to override.
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';

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
    const errText = await res.text();
    throw new Error(`Resend API error (${res.status}): ${errText}`);
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

async function sendEmail(opts: EmailOptions): Promise<void> {
  // ── Path 1: Resend ──
  if (process.env.RESEND_API_KEY) {
    await sendViaResend(opts);
    return;
  }

  // ── Path 2: SMTP ──
  const transporter = createSmtpTransporter();
  if (transporter) {
    const fromEmail = process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER;
    await transporter.sendMail({
      from: `"${APP_NAME}" <${fromEmail}>`,
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
      text: opts.text,
    });
    return;
  }

  // ── Path 3: Dev console fallback ──
  console.warn('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.warn('  📮  EMAIL NOT DELIVERED (no email service configured)');
  console.warn(`  TO:      ${opts.to}`);
  console.warn(`  SUBJECT: ${opts.subject}`);
  console.warn(`  BODY:    ${opts.text || '(html only)'}`);
  console.warn('  ▸ Set RESEND_API_KEY in Netlify env vars for production email.');
  console.warn('  ▸ Get a free key at https://resend.com');
  console.warn('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

/**
 * Send OTP verification code after signup.
 *
 * Email delivery priority:
 *   1. Resend API  (set RESEND_API_KEY in Netlify env vars)
 *   2. SMTP        (set SMTP_HOST / SMTP_USER / SMTP_PASSWORD)
 *   3. Console log (dev fallback — code visible in server logs only)
 */
export async function sendVerificationEmail(
  email: string,
  firstName: string,
  code: string,
  role: string
) {
  const roleLabel = role.charAt(0).toUpperCase() + role.slice(1);

  // ── Dev / no-email-service fallback ──────────────────────────────────────
  const hasEmailService = !!process.env.RESEND_API_KEY || !!createSmtpTransporter();
  if (!hasEmailService) {
    console.warn('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.warn('  📮  VERIFICATION CODE (no email service — dev mode)');
    console.warn(`  EMAIL  : ${email}`);
    console.warn(`  CODE   : ${code}`);
    console.warn(`  ROLE   : ${roleLabel}`);
    console.warn('  Expires: 10 minutes');
    console.warn('  ▸ Set RESEND_API_KEY in Netlify env vars to deliver real emails.');
    console.warn('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    return;
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
        .header { background: linear-gradient(135deg, #7c3aed, #9333ea); padding: 36px 40px; text-align: center; }
        .header h1 { margin: 0; color: #fff; font-size: 24px; font-weight: 700; }
        .header p { margin: 6px 0 0; color: rgba(255,255,255,.75); font-size: 14px; }
        .body { padding: 36px 40px; }
        .body p { margin: 0 0 16px; color: #374151; font-size: 15px; line-height: 1.6; }
        .code-box { background: #f5f3ff; border: 2px dashed #7c3aed; border-radius: 12px; padding: 28px 20px; text-align: center; margin: 24px 0; }
        .code-label { margin: 0 0 10px; font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 2px; }
        .code { margin: 0; font-size: 52px; font-weight: 800; letter-spacing: 14px; color: #7c3aed; font-family: 'Courier New', monospace; }
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
          <h1>🏪 ${APP_NAME}</h1>
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
