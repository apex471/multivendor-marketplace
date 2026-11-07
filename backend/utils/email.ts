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
    const randomHex = Math.random().toString(36).substring(2, 15);
    const { error } = await resend.emails.send({
      from: `${APP_NAME} <${fromEmail}>`,
      to: [opts.to],
      subject: opts.subject,
      html: opts.html,
      text: opts.text || '',
      headers: {
        'X-Entity-Ref-ID': randomHex,
        'Precedence': 'bulk',
      },
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
  const fromEmail = process.env.SMTP_FROM_EMAIL || user || 'noreply@certifiedluxuryworld.com';

  const rawDomain = fromEmail.includes('@') ? fromEmail.split('@')[1] : 'certifiedluxuryworld.com';
  const fromDomain = rawDomain.replace(/[<>]/g, '').trim();
  const randomHex = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  const messageId = `<${randomHex}@${fromDomain}>`;

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
      headers: {
        'Message-ID': messageId,
        'X-Entity-Ref-ID': randomHex,
        'Precedence': 'bulk',
        'X-Auto-Response-Suppress': 'OOF, AutoReply',
      },
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
  role: string,
  baseUrl?: string
): Promise<EmailResult> {
  const roleLabel = role.charAt(0).toUpperCase() + role.slice(1);

  // Always log in dev for quick testing without needing email
  if (process.env.NODE_ENV !== 'production') {
    console.info(`\nℹ️  [Dev] OTP for ${email}: ${code}  (role: ${roleLabel})\n`);
  }

  // Build direct verification URL
  const fallbackUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const finalBaseUrl = baseUrl || fallbackUrl;
  const verifyLink = `${finalBaseUrl}/auth/verify-email?email=${encodeURIComponent(email)}&code=${code}&role=${role}`;

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
        .btn-verify { display: block; text-align: center; background: #b8962e; color: #ffffff !important; text-decoration: none; padding: 14px 24px; border-radius: 12px; font-weight: 700; font-size: 14px; margin: 24px 0; transition: background 0.2s; }
        .btn-verify:hover { background: #d4af37; }
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
          <p>Verify your <strong>${roleLabel}</strong> account on ${APP_NAME} by clicking the button below:</p>
          
          <a href="${verifyLink}" class="btn-verify">Click Here to Verify Account</a>

          <p>Or manually enter the verification code on the verification screen:</p>
          
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

  const text = `Hi ${firstName},\n\nYour ${APP_NAME} ${roleLabel} verification link is:\n\n${verifyLink}\n\nAlternatively, use your verification code:\n\n  ${code}\n\nThis link and code expire in 10 minutes. Never share this code with anyone.\n\n${APP_NAME}`;

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

export async function sendWaitlistWelcomeEmail(opts: {
  email: string;
  name: string;
  role: 'vendor' | 'brand';
  tempPassword?: string;
  notes?: string;
}): Promise<EmailResult> {
  const { email, name, role, tempPassword, notes } = opts;
  const roleLabel = role === 'vendor' ? 'Vendor' : 'Brand Owner';
  const roleIcon = role === 'vendor' ? '🏪' : '👑';
  const portalName = role === 'vendor' ? 'Vendor Portal' : 'Brand Portal';
  const loginPath = role === 'vendor' ? '/auth/vendor/login' : '/auth/brand/login';
  
  const siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const loginUrl = `${siteUrl}${loginPath}`;

  if (process.env.NODE_ENV !== 'production') {
    console.info(`\nℹ️  [Dev] Waitlist Welcome Email to ${email}:\n    Login URL: ${loginUrl}\n    Temp Password: ${tempPassword}\n`);
  }

  const subject = `✨ Waitlist Approved: Welcome to ${APP_NAME} as a ${roleLabel}!`;

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <div style="max-width:560px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08)">
    <div style="background:linear-gradient(135deg,#b8962e,#d4af37);padding:36px 40px;text-align:center">
      <h1 style="margin:0;color:#fff;font-size:26px;font-weight:700">${roleIcon} ${APP_NAME}</h1>
      <p style="margin:8px 0 0;color:rgba(255,255,255,.8);font-size:14px">Pre-Launch Waitlist Approval</p>
      <div style="display:inline-block;margin:16px auto 0;padding:7px 22px;border-radius:999px;font-size:13px;font-weight:700;background:#d1fae5;color:#065f46">
        🎉 APPROVED
      </div>
    </div>
    <div style="padding:36px 40px">
      <p style="margin:0 0 16px;color:#374151;font-size:15px;line-height:1.6">Hi <strong>${name || 'there'}</strong>,</p>
      <p>Congratulations! Your waitlist application to join <strong>${APP_NAME}</strong> as a <strong>${roleLabel}</strong> has been reviewed and approved!</p>
      
      <p>We have pre-created your professional account so you're ready for the launch. Here are your credentials:</p>
      
      <div style="background:#f4f4f5;border-radius:12px;padding:20px;margin:24px 0;font-size:14px;color:#1f2937;border:1px solid #e5e7eb">
        <p style="margin:0 0 8px"><strong>Login Email:</strong> ${email}</p>
        ${tempPassword ? `<p style="margin:0"><strong>Temporary Password:</strong> <code style="background:#e5e7eb;padding:3px 6px;border-radius:4px;font-family:monospace;font-size:14px;color:#b8962e">${tempPassword}</code></p>` : ''}
      </div>

      <p style="font-size:13px;color:#ef4444;margin-bottom:24px">⚠️ Please log in and update your password immediately upon your first sign in.</p>

      <div style="text-align:center;margin:28px 0 8px">
        <a href="${loginUrl}" style="display:inline-block;background:linear-gradient(135deg,#b8962e,#d4af37);color:#fff;text-decoration:none;padding:14px 32px;border-radius:10px;font-weight:700;font-size:15px">
          Access Your ${portalName} &rarr;
        </a>
      </div>

      ${notes ? `<div style="background:#fdf9ec;border-left:4px solid #d4af37;border-radius:0 8px 8px 0;padding:14px 18px;margin:20px 0"><p style="margin:0;color:#374151;font-size:14px"><strong>Message from Admin:</strong> ${notes}</p></div>` : ''}

      <p style="margin-top:24px;font-size:13px;color:#6b7280">
        If you have any questions, feel free to contact us at <a href="mailto:support@certifiedluxuryworld.com" style="color:#b8962e">support@certifiedluxuryworld.com</a>.
      </p>
    </div>
    <div style="padding:20px 40px;background:#f9fafb;text-align:center">
      <p style="margin:0;font-size:12px;color:#9ca3af">&copy; ${new Date().getFullYear()} ${APP_NAME}. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`;

  const text = `Hi ${name || 'there'},\n\nYour waitlist application to join ${APP_NAME} as a ${roleLabel} has been approved!\n\nUse your credentials to sign in:\nEmail: ${email}\n${tempPassword ? `Temporary Password: ${tempPassword}\n` : ''}\nLog in here: ${loginUrl}\n\n${notes ? `Admin notes: ${notes}\n` : ''}\n${APP_NAME}`;

  return sendEmail({ to: email, subject, html, text });
}

export async function sendWaitlistSignupLinkEmail(opts: {
  email: string;
  name: string;
  role: 'vendor' | 'brand';
  notes?: string;
}): Promise<EmailResult> {
  const { email, name, role, notes } = opts;
  const roleLabel = role === 'vendor' ? 'Vendor' : 'Brand Owner';
  const signupPath = role === 'vendor' ? '/auth/signup?role=vendor' : '/auth/signup?role=brand';
  
  const siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const signupUrl = `${siteUrl}${signupPath}`;

  if (process.env.NODE_ENV !== 'production') {
    console.info(`\nℹ️  [Dev] Waitlist Signup Link Email to ${email}:\n    Signup URL: ${signupUrl}\n`);
  }

  const subject = `📢 Registration Details for joining ${APP_NAME}`;

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <div style="max-width:560px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08)">
    <div style="background:linear-gradient(135deg,#b8962e,#d4af37);padding:36px 40px;text-align:center">
      <h1 style="margin:0;color:#fff;font-size:26px;font-weight:700">📢 ${APP_NAME}</h1>
      <p style="margin:8px 0 0;color:rgba(255,255,255,.8);font-size:14px">Join Our Luxury Marketplace</p>
    </div>
    <div style="padding:36px 40px">
      <p style="margin:0 0 16px;color:#374151;font-size:15px;line-height:1.6">Hi <strong>${name || 'there'}</strong>,</p>
      <p>Thank you for signing up for our pre-launch waitlist as a prospective <strong>${roleLabel}</strong>.</p>
      
      <p>To help us prepare for the launch or complete your registration details, please use the direct registration link below to sign up and establish your profile details:</p>
      
      <div style="text-align:center;margin:28px 0 8px">
        <a href="${signupUrl}" style="display:inline-block;background:linear-gradient(135deg,#b8962e,#d4af37);color:#fff;text-decoration:none;padding:14px 32px;border-radius:10px;font-weight:700;font-size:15px">
          Register Your Account &rarr;
        </a>
      </div>

      ${notes ? `<div style="background:#fdf9ec;border-left:4px solid #d4af37;border-radius:0 8px 8px 0;padding:14px 18px;margin:20px 0"><p style="margin:0;color:#374151;font-size:14px"><strong>Message from Admin:</strong> ${notes}</p></div>` : ''}

      <p style="margin-top:24px;font-size:13px;color:#6b7280">
        Link: <a href="${signupUrl}" style="color:#b8962e">${signupUrl}</a>
      </p>
    </div>
    <div style="padding:20px 40px;background:#f9fafb;text-align:center">
      <p style="margin:0;font-size:12px;color:#9ca3af">&copy; ${new Date().getFullYear()} ${APP_NAME}. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`;

  const text = `Hi ${name || 'there'},\n\nThank you for signing up for our waitlist! Please complete your registration details here:\n\n${signupUrl}\n\n${notes ? `Message from admin: ${notes}\n` : ''}\n${APP_NAME}`;

  return sendEmail({ to: email, subject, html, text });
}

export async function sendWaitlistRejectionEmail(opts: {
  email: string;
  name: string;
  role: 'vendor' | 'brand';
  notes?: string;
}): Promise<EmailResult> {
  const { email, name, role, notes } = opts;
  const roleLabel = role === 'vendor' ? 'Vendor' : 'Brand Owner';

  if (process.env.NODE_ENV !== 'production') {
    console.info(`\nℹ️  [Dev] Waitlist Rejection Email to ${email}\n`);
  }
  
  const subject = `Update regarding your waitlist request — ${APP_NAME}`;

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <div style="max-width:560px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08)">
    <div style="background:linear-gradient(135deg,#b8962e,#d4af37);padding:36px 40px;text-align:center">
      <h1 style="margin:0;color:#fff;font-size:26px;font-weight:700">📢 ${APP_NAME}</h1>
      <p style="margin:8px 0 0;color:rgba(255,255,255,.8);font-size:14px">Waitlist Status Update</p>
    </div>
    <div style="padding:36px 40px">
      <p style="margin:0 0 16px;color:#374151;font-size:15px;line-height:1.6">Hi <strong>${name || 'there'}</strong>,</p>
      <p>Thank you for your interest in joining <strong>${APP_NAME}</strong> as a <strong>${roleLabel}</strong>.</p>
      <p>After careful review of your waitlist details, we regret to inform you that we are unable to approve your application at this time.</p>
      
      ${notes ? `<div style="background:#fee2e2;border-radius:8px;padding:14px 18px;margin-top:20px"><p style="margin:0;font-size:13px;color:#991b1b"><strong>Reason:</strong> ${notes}</p></div>` : ''}
      
      <p style="margin-top:20px">If you have any questions or want to provide updated details, please reach out to us at <a href="mailto:support@certifiedluxuryworld.com" style="color:#b8962e">support@certifiedluxuryworld.com</a>.</p>
    </div>
    <div style="padding:20px 40px;background:#f9fafb;text-align:center">
      <p style="margin:0;font-size:12px;color:#9ca3af">&copy; ${new Date().getFullYear()} ${APP_NAME}. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`;

  const text = `Hi ${name || 'there'},\n\nThank you for your interest in ${APP_NAME}. We regret to inform you that your waitlist application was not approved at this time.\n\n${notes ? `Reason: ${notes}\n` : ''}\nFeel free to contact support@certifiedluxuryworld.com for details.\n\n${APP_NAME}`;

  return sendEmail({ to: email, subject, html, text });
}

export async function sendAdminNotificationEmail(opts: {
  subject: string;
  title: string;
  message: string;
  details?: Record<string, string>;
}): Promise<EmailResult> {
  const { subject, title, message, details } = opts;
  const adminEmail = 'certifiedluxuryworld@gmail.com';
  
  let detailsHtml = '';
  if (details && Object.keys(details).length > 0) {
    detailsHtml = `
      <div style="background:#f4f4f5;border-radius:12px;padding:20px;margin:24px 0;font-size:13px;color:#1f2937;border:1px solid #e5e7eb">
        <h4 style="margin:0 0 12px;color:#111;text-transform:uppercase;font-size:11px;letter-spacing:1px">Event Details</h4>
        <table style="width:100%;border-collapse:collapse">
          ${Object.entries(details).map(([key, val]) => `
            <tr>
              <td style="padding:4px 0;font-weight:600;color:#4b5563;width:120px;vertical-align:top">${key}:</td>
              <td style="padding:4px 0;color:#111;vertical-align:top">${val}</td>
            </tr>
          `).join('')}
        </table>
      </div>
    `;
  }

  const siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const adminDashboardUrl = `${siteUrl}/admin/dashboard`;

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <div style="max-width:560px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08)">
    <div style="background:#111;padding:36px 40px;text-align:center;border-bottom:3px solid #c6a45e">
      <h1 style="margin:0;color:#fff;font-size:24px;font-weight:700">⚡ CLW Admin Dispatch</h1>
      <p style="margin:8px 0 0;color:#c6a45e;font-size:13px;text-transform:uppercase;letter-spacing:2px;font-weight:600">Platform Action Alert</p>
    </div>
    <div style="padding:36px 40px">
      <h2 style="margin:0 0 16px;color:#111;font-size:20px;font-weight:700">${title}</h2>
      <p style="margin:0 0 16px;color:#4b5563;font-size:15px;line-height:1.6">${message}</p>
      
      ${detailsHtml}

      <div style="text-align:center;margin:32px 0 8px">
        <a href="${adminDashboardUrl}" style="display:inline-block;background:#111;color:#fff;text-decoration:none;padding:14px 32px;border-radius:10px;font-weight:700;font-size:14px;border:1px solid #c6a45e">
          Launch Admin Dashboard &rarr;
        </a>
      </div>
    </div>
    <div style="padding:20px 40px;background:#f9fafb;text-align:center">
      <p style="margin:0;font-size:12px;color:#9ca3af">&copy; ${new Date().getFullYear()} Certified Luxury World. System Automation Alert.</p>
    </div>
  </div>
</body>
</html>`;

  const detailsText = details ? Object.entries(details).map(([k, v]) => `${k}: ${v}`).join('\n') : '';
  const text = `CLW Admin Dispatch: ${title}\n\n${message}\n\n${detailsText}\n\nLaunch Admin Dashboard here: ${adminDashboardUrl}`;

  // Log to console in dev mode
  if (process.env.NODE_ENV !== 'production') {
    console.info(`\nℹ️  [Dev Admin Dispatch] Alert Email to ${adminEmail}:\n    Subject: ${subject}\n    Title: ${title}\n    Message: ${message}\n    Details: ${JSON.stringify(details)}\n`);
  }

  return sendEmail({ to: adminEmail, subject, html, text });
}

/**
 * Send password reset email with secure token link.
 */
export async function sendPasswordResetEmail(opts: {
  to: string;
  firstName?: string;
  resetLink: string;
  code?: string;
}): Promise<EmailResult> {
  const { to, firstName = 'there', resetLink, code } = opts;
  const subject = `Reset Your Password | ${APP_NAME}`;

  // Log in dev mode for immediate test access without waiting for email
  if (process.env.NODE_ENV !== 'production') {
    console.info(`\n🔑 [Dev Password Reset] Link for ${to}:\n    ${resetLink}\n    Code: ${code ?? 'N/A'}\n`);
  }

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    body { margin: 0; padding: 0; background: #0f1012; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1f2937; }
    .wrapper { max-width: 540px; margin: 40px auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.3); }
    .header { background: #16181d; padding: 36px 40px; text-align: center; border-bottom: 2px solid #d4af37; }
    .header h1 { margin: 0; color: #ffffff; font-size: 24px; font-weight: 700; letter-spacing: 0.5px; }
    .header p { margin: 6px 0 0; color: #d4af37; font-size: 13px; text-transform: uppercase; letter-spacing: 2px; font-weight: 600; }
    .body { padding: 36px 40px; }
    .body p { margin: 0 0 16px; color: #374151; font-size: 15px; line-height: 1.6; }
    .btn { display: inline-block; background: linear-gradient(135deg, #d4af37, #b8962e); color: #ffffff !important; text-decoration: none; padding: 14px 32px; border-radius: 10px; font-weight: 700; font-size: 15px; margin: 20px 0; box-shadow: 0 4px 14px rgba(212,175,55,0.35); text-align: center; }
    .code-box { background: #fdfaf3; border: 1px dashed #d4af37; border-radius: 10px; padding: 18px 24px; text-align: center; margin: 24px 0; }
    .code { font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #b8962e; font-family: 'Courier New', monospace; margin: 0; }
    .footer { padding: 24px 40px; background: #f9fafb; border-top: 1px solid #e5e7eb; text-align: center; }
    .footer p { margin: 0; font-size: 12px; color: #9ca3af; line-height: 1.5; }
    .security-note { font-size: 12px; color: #6b7280; background: #f3f4f6; padding: 12px 16px; border-radius: 8px; margin-top: 24px; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <h1>✨ ${APP_NAME}</h1>
      <p>Password Reset Request</p>
    </div>
    <div class="body">
      <p>Hello <strong>${firstName}</strong>,</p>
      <p>We received a request to reset the password for your ${APP_NAME} account. Click the secure button below to set a new password:</p>
      
      <div style="text-align: center;">
        <a href="${resetLink}" class="btn">Reset My Password &rarr;</a>
      </div>

      ${code ? `
      <p style="text-align:center; font-size: 13px; color: #6b7280; margin-top: 20px;">Or use this verification code:</p>
      <div class="code-box">
        <p class="code">${code}</p>
      </div>` : ''}

      <div class="security-note">
        <strong>🔒 Security Notice:</strong> This link is valid for <strong>1 hour</strong>. If you did not request a password reset, you can safely ignore this email — your account remains completely secure.
      </div>
    </div>
    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} ${APP_NAME}. All rights reserved.</p>
      <p style="margin-top: 6px;">Questions? Contact our client concierge support team.</p>
    </div>
  </div>
</body>
</html>`;

  const text = `Hello ${firstName},\n\nWe received a request to reset your password for ${APP_NAME}.\n\nReset your password here: ${resetLink}\n\n${code ? `Your verification code is: ${code}\n\n` : ''}This link will expire in 1 hour.\n\nIf you did not request this, please ignore this email.`;

  return sendEmail({ to, subject, html, text });
}

// ─── Vendor Order Notifications ───────────────────────────────────────────────

export interface VendorOrderItem {
  name: string;
  quantity: number;
  price: number;
  size?: string;
  color?: string;
  image?: string;
}

export interface VendorNewOrderEmailOpts {
  vendorEmail: string;
  vendorName: string;
  orderId: string;
  orderDate?: string;
  customerName: string;
  shippingCity: string;
  shippingState?: string;
  shippingCountry: string;
  items: VendorOrderItem[];
  vendorSubtotal: number;
  paymentStatus: string;
  courierName?: string;
}

/**
 * Send an email notification to a vendor/brand owner when a new order is placed.
 */
export async function sendVendorNewOrderEmail(opts: VendorNewOrderEmailOpts): Promise<EmailResult> {
  const {
    vendorEmail,
    vendorName,
    orderId,
    customerName,
    shippingCity,
    shippingState,
    shippingCountry,
    items,
    vendorSubtotal,
    paymentStatus,
    courierName,
  } = opts;

  const siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const orderUrl = `${siteUrl}/dashboard/vendor?tab=orders&order=${encodeURIComponent(orderId)}`;
  const year = new Date().getFullYear();
  const shortId = orderId.length > 12 ? orderId.slice(-8) : orderId;
  const isPaid = paymentStatus === 'paid';

  const destination = [shippingCity, shippingState, shippingCountry].filter(Boolean).join(', ');

  const itemsHtml = items.map(item => {
    const variantParts = [item.size ? `Size: ${item.size}` : '', item.color ? `Color: ${item.color}` : ''].filter(Boolean);
    const variantStr = variantParts.length > 0 ? `<div style="font-size:12px;color:#6b7280;margin-top:2px">${variantParts.join(' &bull; ')}</div>` : '';
    const lineTotal = (item.price * item.quantity).toFixed(2);
    return `
      <tr>
        <td style="padding:12px 0;border-bottom:1px solid #f3f4f6;vertical-align:top">
          <strong style="color:#111827;font-size:14px">${item.name}</strong>
          ${variantStr}
        </td>
        <td style="padding:12px 10px;border-bottom:1px solid #f3f4f6;text-align:center;color:#4b5563;font-size:14px;vertical-align:top">
          &times;${item.quantity}
        </td>
        <td style="padding:12px 0;border-bottom:1px solid #f3f4f6;text-align:right;color:#111827;font-weight:600;font-size:14px;vertical-align:top">
          $${lineTotal}
        </td>
      </tr>
    `;
  }).join('');

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    body { margin: 0; padding: 0; background: #0f1012; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1f2937; }
    .wrapper { max-width: 580px; margin: 40px auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.3); }
    .header { background: #16181d; padding: 36px 40px; text-align: center; border-bottom: 3px solid #d4af37; }
    .header h1 { margin: 0; color: #ffffff; font-size: 24px; font-weight: 700; }
    .header p { margin: 6px 0 0; color: #d4af37; font-size: 13px; text-transform: uppercase; letter-spacing: 2px; font-weight: 600; }
    .badge { display: inline-block; margin-top: 14px; padding: 6px 18px; border-radius: 999px; font-size: 12px; font-weight: 700; background: #d1fae5; color: #065f46; }
    .body { padding: 36px 40px; }
    .body p { margin: 0 0 16px; color: #374151; font-size: 15px; line-height: 1.6; }
    .card { background: #fdfaf3; border: 1px solid #e8dfc8; border-radius: 12px; padding: 20px; margin: 24px 0; }
    .card-row { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 13px; }
    .btn { display: inline-block; background: linear-gradient(135deg, #d4af37, #b8962e); color: #ffffff !important; text-decoration: none; padding: 14px 32px; border-radius: 10px; font-weight: 700; font-size: 15px; margin: 24px 0 12px; text-align: center; box-shadow: 0 4px 14px rgba(212,175,55,0.35); }
    .footer { padding: 24px 40px; background: #f9fafb; border-top: 1px solid #e5e7eb; text-align: center; }
    .footer p { margin: 0; font-size: 12px; color: #9ca3af; line-height: 1.5; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <h1>✨ ${APP_NAME}</h1>
      <p>Vendor Merchant Dispatch</p>
      <div class="badge">🛍️ NEW ORDER RECEIVED</div>
    </div>
    <div class="body">
      <p>Hi <strong>${vendorName}</strong>,</p>
      <p>Great news! A client has just purchased items from your collection. Here are the order fulfillment details:</p>

      <div class="card">
        <table style="width:100%;border-collapse:collapse;font-size:13px;color:#374151">
          <tr>
            <td style="padding:4px 0;font-weight:600;color:#6b7280;width:120px">Order Number:</td>
            <td style="padding:4px 0;font-weight:700;color:#111827">#${orderId}</td>
          </tr>
          <tr>
            <td style="padding:4px 0;font-weight:600;color:#6b7280">Client:</td>
            <td style="padding:4px 0;color:#111827">${customerName}</td>
          </tr>
          <tr>
            <td style="padding:4px 0;font-weight:600;color:#6b7280">Destination:</td>
            <td style="padding:4px 0;color:#111827">${destination}</td>
          </tr>
          <tr>
            <td style="padding:4px 0;font-weight:600;color:#6b7280">Logistics:</td>
            <td style="padding:4px 0;color:#111827">${courierName || 'CourierPlus Standard Delivery'}</td>
          </tr>
          <tr>
            <td style="padding:4px 0;font-weight:600;color:#6b7280">Payment:</td>
            <td style="padding:4px 0;color:#111827">
              ${isPaid ? '<span style="color:#059669;font-weight:700">✓ Paid (Escrow Protected)</span>' : '<span style="color:#d97706;font-weight:700">⏳ Pending Verification</span>'}
            </td>
          </tr>
        </table>
      </div>

      <h3 style="margin:24px 0 12px;font-size:16px;color:#111827;font-weight:700">Items to Fulfill:</h3>
      <table style="width:100%;border-collapse:collapse">
        <thead>
          <tr style="border-bottom:2px solid #e5e7eb">
            <th style="text-align:left;font-size:12px;font-weight:700;color:#6b7280;text-transform:uppercase;padding-bottom:8px">Item</th>
            <th style="text-align:center;font-size:12px;font-weight:700;color:#6b7280;text-transform:uppercase;padding-bottom:8px">Qty</th>
            <th style="text-align:right;font-size:12px;font-weight:700;color:#6b7280;text-transform:uppercase;padding-bottom:8px">Total</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml}
        </tbody>
        <tfoot>
          <tr>
            <td colspan="2" style="padding:16px 0 0;font-weight:700;font-size:15px;color:#111827">Vendor Subtotal:</td>
            <td style="padding:16px 0 0;text-align:right;font-weight:800;font-size:18px;color:#b8962e">$${vendorSubtotal.toFixed(2)}</td>
          </tr>
        </tfoot>
      </table>

      <div style="text-align:center;margin:32px 0 16px">
        <a href="${orderUrl}" class="btn">View &amp; Fulfill Order &rarr;</a>
      </div>

      <div style="background:#f3f4f6;border-radius:8px;padding:12px 16px;font-size:12px;color:#6b7280;margin-top:24px">
        <strong>🔒 Escrow Protection:</strong> Client funds are securely reserved in escrow and released to your available balance upon confirmed delivery.
      </div>
    </div>
    <div class="footer">
      <p>&copy; ${year} ${APP_NAME}. Vendor Merchant Services.</p>
    </div>
  </div>
</body>
</html>`;

  const textItems = items.map(i => `• ${i.name} (x${i.quantity}) - $${(i.price * i.quantity).toFixed(2)}`).join('\n');
  const text = `Hi ${vendorName},\n\nYou have received a new order #${shortId} on ${APP_NAME}!\n\nOrder Number: ${orderId}\nClient: ${customerName}\nDestination: ${destination}\nPayment: ${paymentStatus}\n\nItems to fulfill:\n${textItems}\n\nVendor Subtotal: $${vendorSubtotal.toFixed(2)}\n\nView and fulfill this order in your portal:\n${orderUrl}\n\n${APP_NAME}`;

  if (process.env.NODE_ENV !== 'production') {
    console.info(`\n🛍️  [Dev Vendor Order Email] To: ${vendorEmail} | Order: ${orderId} | Items: ${items.length}\n`);
  }

  return sendEmail({
    to: vendorEmail,
    subject: `🛍️ New Order Received: #${shortId} — ${APP_NAME}`,
    html,
    text,
  });
}

export interface VendorOrderUpdateEmailOpts {
  vendorEmail: string;
  vendorName: string;
  orderId: string;
  oldStatus?: string;
  newStatus: string;
  trackingNumber?: string;
  courierName?: string;
  updateNotes?: string;
  items?: Array<{ name: string; quantity: number }>;
}

/**
 * Send an email notification to a vendor/brand owner when an order status updates.
 */
export async function sendVendorOrderUpdateEmail(opts: VendorOrderUpdateEmailOpts): Promise<EmailResult> {
  const {
    vendorEmail,
    vendorName,
    orderId,
    newStatus,
    trackingNumber,
    courierName,
    updateNotes,
    items,
  } = opts;

  const siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const orderUrl = `${siteUrl}/dashboard/vendor?tab=orders&order=${encodeURIComponent(orderId)}`;
  const year = new Date().getFullYear();
  const shortId = orderId.length > 12 ? orderId.slice(-8) : orderId;

  const statusLabels: Record<string, { label: string; badgeBg: string; badgeColor: string; icon: string }> = {
    pending:    { label: 'Pending Payment', badgeBg: '#fef3c7', badgeColor: '#92400e', icon: '⏳' },
    processing: { label: 'Processing',      badgeBg: '#dbeafe', badgeColor: '#1e40af', icon: '⚙️' },
    shipped:    { label: 'Shipped / In Transit', badgeBg: '#ede9fe', badgeColor: '#5b21b6', icon: '🚚' },
    delivered:  { label: 'Delivered',       badgeBg: '#d1fae5', badgeColor: '#065f46', icon: '📦' },
    completed:  { label: 'Completed (Funds Released)', badgeBg: '#fdf9ec', badgeColor: '#b8962e', icon: '🎉' },
    cancelled:  { label: 'Cancelled',       badgeBg: '#fee2e2', badgeColor: '#991b1b', icon: '❌' },
  };

  const statusMeta = statusLabels[newStatus.toLowerCase()] ?? {
    label: newStatus.toUpperCase(),
    badgeBg: '#f3f4f6',
    badgeColor: '#374151',
    icon: 'ℹ️',
  };

  const itemsSummary = items && items.length > 0
    ? `<div style="margin-top:16px;font-size:13px;color:#4b5563"><strong>Items:</strong> ${items.map(i => `${i.name} (x${i.quantity})`).join(', ')}</div>`
    : '';

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    body { margin: 0; padding: 0; background: #0f1012; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1f2937; }
    .wrapper { max-width: 580px; margin: 40px auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.3); }
    .header { background: #16181d; padding: 36px 40px; text-align: center; border-bottom: 3px solid #d4af37; }
    .header h1 { margin: 0; color: #ffffff; font-size: 24px; font-weight: 700; }
    .header p { margin: 6px 0 0; color: #d4af37; font-size: 13px; text-transform: uppercase; letter-spacing: 2px; font-weight: 600; }
    .badge { display: inline-block; margin-top: 14px; padding: 7px 22px; border-radius: 999px; font-size: 13px; font-weight: 700; }
    .body { padding: 36px 40px; }
    .body p { margin: 0 0 16px; color: #374151; font-size: 15px; line-height: 1.6; }
    .card { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 12px; padding: 20px; margin: 20px 0; }
    .btn { display: inline-block; background: linear-gradient(135deg, #d4af37, #b8962e); color: #ffffff !important; text-decoration: none; padding: 14px 32px; border-radius: 10px; font-weight: 700; font-size: 15px; margin: 20px 0 8px; text-align: center; }
    .footer { padding: 24px 40px; background: #f9fafb; border-top: 1px solid #e5e7eb; text-align: center; }
    .footer p { margin: 0; font-size: 12px; color: #9ca3af; line-height: 1.5; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <h1>✨ ${APP_NAME}</h1>
      <p>Order Status Dispatch</p>
      <div class="badge" style="background:${statusMeta.badgeBg};color:${statusMeta.badgeColor}">
        ${statusMeta.icon} ${statusMeta.label}
      </div>
    </div>
    <div class="body">
      <p>Hi <strong>${vendorName}</strong>,</p>
      <p>The status of order <strong>#${orderId}</strong> has been updated:</p>

      <div class="card">
        <table style="width:100%;border-collapse:collapse;font-size:13px;color:#374151">
          <tr>
            <td style="padding:4px 0;font-weight:600;color:#6b7280;width:120px">Order Number:</td>
            <td style="padding:4px 0;font-weight:700;color:#111827">#${orderId}</td>
          </tr>
          <tr>
            <td style="padding:4px 0;font-weight:600;color:#6b7280">Current Status:</td>
            <td style="padding:4px 0;font-weight:700;color:${statusMeta.badgeColor}">${statusMeta.label}</td>
          </tr>
          ${trackingNumber ? `
          <tr>
            <td style="padding:4px 0;font-weight:600;color:#6b7280">Tracking Number:</td>
            <td style="padding:4px 0;font-mono;font-weight:700;color:#111827">${trackingNumber}</td>
          </tr>` : ''}
          ${courierName ? `
          <tr>
            <td style="padding:4px 0;font-weight:600;color:#6b7280">Courier Service:</td>
            <td style="padding:4px 0;color:#111827">${courierName}</td>
          </tr>` : ''}
        </table>
        ${itemsSummary}
        ${updateNotes ? `
        <div style="margin-top:14px;padding-top:12px;border-top:1px dashed #e5e7eb;font-size:13px;color:#4b5563">
          <strong>Note:</strong> ${updateNotes}
        </div>` : ''}
      </div>

      <div style="text-align:center;margin:28px 0 8px">
        <a href="${orderUrl}" class="btn">View Order in Portal &rarr;</a>
      </div>
    </div>
    <div class="footer">
      <p>&copy; ${year} ${APP_NAME}. Vendor Merchant Services.</p>
    </div>
  </div>
</body>
</html>`;

  const text = `Hi ${vendorName},\n\nThe status of order #${shortId} on ${APP_NAME} has been updated to: ${statusMeta.label}.\n\nOrder Number: ${orderId}\n${trackingNumber ? `Tracking Number: ${trackingNumber}\n` : ''}${courierName ? `Courier: ${courierName}\n` : ''}${updateNotes ? `Notes: ${updateNotes}\n` : ''}\nView order details:\n${orderUrl}\n\n${APP_NAME}`;

  if (process.env.NODE_ENV !== 'production') {
    console.info(`\n📦  [Dev Vendor Order Update] To: ${vendorEmail} | Order: ${orderId} | Status: ${newStatus}\n`);
  }

  return sendEmail({
    to: vendorEmail,
    subject: `📦 Order #${shortId} Status Update: ${statusMeta.label} — ${APP_NAME}`,
    html,
    text,
  });
}


