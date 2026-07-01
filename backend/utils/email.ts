import { Resend } from 'resend';
import nodemailer from 'nodemailer';

const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || 'CLW Marketplace';

/**
 * Returned by every public send function so callers can surface
 * delivery failures to the user instead of silently swallowing them.
 */
export interface EmailResult {
  sent: boolean;
  provider: 'resend' | 'smtp' | 'none';
  error?: string;
}

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

// ─── Priority 1: Resend SDK ───────────────────────────────────────────────────
// IMPORTANT: onboarding@resend.dev (the default from) can ONLY deliver to
// the Resend account owner's email.  For arbitrary recipients you must:
//   1. Verify your domain at https://resend.com/domains
//   2. Set RESEND_FROM_EMAIL=noreply@yourdomain.com in Netlify env vars
async function sendViaResend(opts: EmailOptions): Promise<EmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return { sent: false, provider: 'none', error: 'RESEND_API_KEY not set' };
  }

  const fromEmail = process.env.RESEND_FROM_EMAIL;

  // Fail fast — onboarding@resend.dev will 403 for any non-owner recipient.
  if (!fromEmail || fromEmail === 'onboarding@resend.dev') {
    return {
      sent: false,
      provider: 'none',
      error:
        'RESEND_FROM_EMAIL is not set. ' +
        'Add RESEND_FROM_EMAIL=noreply@yourdomain.com to Netlify env vars ' +
        'after verifying your domain at https://resend.com/domains',
    };
  }

  try {
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from: `${APP_NAME} <${fromEmail}>`,
      to: [opts.to],
      subject: opts.subject,
      html: opts.html,
      text: opts.text || '',
    });

    if (error) {
      const msg = `Resend API error: ${
        (error as { message?: string }).message || JSON.stringify(error)
      }`;
      console.error(`[Email] ${msg}`);
      return { sent: false, provider: 'none', error: msg };
    }

    console.info(`[Email] ✅ Delivered via Resend to ${opts.to}`);
    return { sent: true, provider: 'resend' };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[Email] Resend SDK threw:', msg);
    return { sent: false, provider: 'none', error: `Resend SDK: ${msg}` };
  }
}

// ─── Priority 2: SMTP / nodemailer ───────────────────────────────────────────
// Works with Gmail App Password, SendGrid SMTP, Mailgun SMTP, etc.
// Required: SMTP_HOST, SMTP_USER, SMTP_PASSWORD
// Optional: SMTP_PORT (default 587), SMTP_FROM_EMAIL
async function sendViaSmtp(opts: EmailOptions): Promise<EmailResult> {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASSWORD;

  const isPlaceholder = (v?: string) =>
    !v || v.startsWith('your_') || v === 'your_app_password';

  if (!host || isPlaceholder(user) || isPlaceholder(pass)) {
    return {
      sent: false,
      provider: 'none',
      error:
        'SMTP not configured. Set SMTP_HOST, SMTP_USER, SMTP_PASSWORD ' +
        'in Netlify env vars (use a Gmail App Password for SMTP_PASSWORD).',
    };
  }

  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const fromEmail = process.env.SMTP_FROM_EMAIL || user;

  try {
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
      tls: { rejectUnauthorized: false },
    });
    await transporter.sendMail({
      from: `"${APP_NAME}" <${fromEmail}>`,
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
      text: opts.text,
    });
    console.info(`[Email] ✅ Delivered via SMTP to ${opts.to}`);
    return { sent: true, provider: 'smtp' };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[Email] SMTP error:', msg);
    return { sent: false, provider: 'none', error: `SMTP: ${msg}` };
  }
}

async function sendEmail(opts: EmailOptions): Promise<EmailResult> {
  // ── Path 1: Resend SDK ──
  if (process.env.RESEND_API_KEY) {
    const result = await sendViaResend(opts);
    if (result.sent) return result;
    console.warn(`[Email] Resend failed (${result.error}) — trying SMTP fallback…`);
  }

  // ── Path 2: SMTP ──
  const smtpResult = await sendViaSmtp(opts);
  if (smtpResult.sent) return smtpResult;

  // ── Path 3: Console fallback — last resort ──
  // OTP is printed clearly so it can be found in Netlify function logs.
  const otpMatch = opts.text?.match(/\b(\d{6})\b/);
  console.warn('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.warn('  ❌  EMAIL NOT DELIVERED — all providers failed');
  console.warn(`  TO:      ${opts.to}`);
  console.warn(`  SUBJECT: ${opts.subject}`);
  if (otpMatch) {
    console.warn(`\n  🔑  OTP CODE: ${otpMatch[1]}  ← copy from Netlify function logs`);
  }
  console.warn('');
  console.warn('  Fix → add ONE of these to Netlify Site Settings → Env Vars:');
  console.warn('  OPTION A — Resend (recommended):');
  console.warn('    RESEND_API_KEY    = re_xxxxxxxxxxxx');
  console.warn('    RESEND_FROM_EMAIL = noreply@yourdomain.com  ← verified domain');
  console.warn('  OPTION B — Gmail App Password:');
  console.warn('    SMTP_HOST         = smtp.gmail.com');
  console.warn('    SMTP_PORT         = 587');
  console.warn('    SMTP_USER         = you@gmail.com');
  console.warn('    SMTP_PASSWORD     = xxxx xxxx xxxx xxxx  ← 16-char App Password');
  console.warn('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const isDev = process.env.NODE_ENV !== 'production';
  return {
    sent: isDev,
    provider: 'none',
    error: isDev ? undefined : (smtpResult.error || 'All email providers failed — check Netlify env vars'),
  };
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
): Promise<EmailResult> {
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

  return sendEmail({
    to: email,
    subject: `${code} — your ${APP_NAME} verification code`,
    html,
    text,
  });
}

/**
 * Diagnostic: send a test email and return the full result.
 * Used by POST /api/health/email so you can verify delivery config
 * without going through the full signup flow.
 */
export async function sendTestEmail(to: string): Promise<EmailResult> {
  return sendEmail({
    to,
    subject: `[Test] ${APP_NAME} email delivery check`,
    html: `<div style="font-family:sans-serif;padding:24px"><h2>✅ Email delivery is working</h2><p>If you received this, <strong>${APP_NAME}</strong> can send emails successfully.</p></div>`,
    text: `If you received this, email delivery is working correctly for ${APP_NAME}.`,
  });
}

/**
 * Send an application approval or rejection notification to a vendor,
 * brand owner, or logistics provider after an admin takes action.
 */
export async function sendApplicationStatusEmail(opts: {
  email: string;
  firstName: string;
  role: 'vendor' | 'brand' | 'logistics';
  action: 'approve' | 'reject';
  notes?: string;
}): Promise<EmailResult> {
  const { email, firstName, role, action, notes } = opts;
  const approved = action === 'approve';

  const roleMeta: Record<string, { label: string; icon: string; portal: string; loginPath: string }> = {
    logistics: { label: 'Logistics Provider', icon: '🚚', portal: 'Dispatch Portal', loginPath: '/auth/logistics/login' },
    vendor:    { label: 'Vendor',             icon: '🏪', portal: 'Vendor Portal',   loginPath: '/auth/vendor/login' },
    brand:     { label: 'Brand',              icon: '👑', portal: 'Brand Portal',     loginPath: '/auth/brand/login' },
  };

  const meta     = roleMeta[role] ?? roleMeta.vendor;
  const siteUrl  = process.env.NEXT_PUBLIC_SITE_URL || 'https://certifiedluxuryworld.com';
  const loginUrl = `${siteUrl}${meta.loginPath}`;
  const year     = new Date().getFullYear();

  const subject = approved
    ? `${meta.icon} Your ${meta.label} application has been approved — ${APP_NAME}`
    : `Your ${meta.label} application status update — ${APP_NAME}`;

  const badgeStyle = approved
    ? 'background:#d1fae5;color:#065f46'
    : 'background:#fee2e2;color:#991b1b';

  const approvedBody = `
    <p>Great news! Your <strong>${meta.label}</strong> application on <strong>${APP_NAME}</strong>
    has been <strong>approved</strong>. Your account is now fully active and you can start
    using the ${meta.portal} immediately.</p>
    <div style="text-align:center;margin:28px 0 8px">
      <a href="${loginUrl}" style="display:inline-block;background:linear-gradient(135deg,#b8962e,#d4af37);color:#fff;text-decoration:none;padding:14px 32px;border-radius:10px;font-weight:700;font-size:15px">
        Access Your ${meta.portal} &rarr;
      </a>
    </div>
    ${notes ? `<div style="background:#fdf9ec;border-left:4px solid #d4af37;border-radius:0 8px 8px 0;padding:14px 18px;margin:20px 0"><p style="margin:0;color:#374151;font-size:14px"><strong>Note from admin:</strong> ${notes}</p></div>` : ''}
    <p style="margin-top:20px;font-size:13px;color:#6b7280">
      Login URL: <a href="${loginUrl}" style="color:#b8962e">${loginUrl}</a>
    </p>`;

  const rejectedBody = `
    <p>Thank you for applying to join <strong>${APP_NAME}</strong> as a
    <strong>${meta.label}</strong>. After careful review, we were unable to approve
    your application at this time.</p>
    ${notes ? `<div style="background:#fef3c7;border-radius:8px;padding:14px 18px;margin-top:20px"><p style="margin:0;font-size:13px;color:#92400e"><strong>Reason:</strong> ${notes}</p></div>` : ''}
    <p style="margin-top:20px">If you believe this is an error or would like to re-apply with
    updated information, please contact our support team at
    <a href="mailto:support@certifiedluxuryworld.com" style="color:#b8962e">
    support@certifiedluxuryworld.com</a>.</p>`;

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <div style="max-width:560px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08)">
    <div style="background:linear-gradient(135deg,#b8962e,#d4af37);padding:36px 40px;text-align:center">
      <h1 style="margin:0;color:#fff;font-size:26px;font-weight:700">${meta.icon} ${APP_NAME}</h1>
      <p style="margin:8px 0 0;color:rgba(255,255,255,.8);font-size:14px">${meta.label} Application Update</p>
      <div style="display:inline-block;margin:16px auto 0;padding:7px 22px;border-radius:999px;font-size:13px;font-weight:700;${badgeStyle}">
        ${approved ? '✅ APPROVED' : '❌ NOT APPROVED'}
      </div>
    </div>
    <div style="padding:36px 40px">
      <p style="margin:0 0 16px;color:#374151;font-size:15px;line-height:1.6">Hi <strong>${firstName}</strong>,</p>
      ${approved ? approvedBody : rejectedBody}
    </div>
    <div style="padding:20px 40px;background:#f9fafb;text-align:center">
      <p style="margin:0;font-size:12px;color:#9ca3af">&copy; ${year} ${APP_NAME}. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`;

  const text = approved
    ? `Hi ${firstName},\n\nYour ${meta.label} application on ${APP_NAME} has been APPROVED!\n\nLog in at: ${loginUrl}\n${notes ? `\nNote from admin: ${notes}\n` : ''}\n${APP_NAME}`
    : `Hi ${firstName},\n\nYour ${meta.label} application on ${APP_NAME} was not approved at this time.\n${notes ? `\nReason: ${notes}\n` : ''}\nContact support@certifiedluxuryworld.com for help.\n\n${APP_NAME}`;

  return sendEmail({ to: email, subject, html, text });
}
