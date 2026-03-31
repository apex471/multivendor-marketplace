import nodemailer from 'nodemailer';

const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || 'CLW Marketplace';

function createTransporter() {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASSWORD;

  // If SMTP is not configured, use Ethereal (dev preview) or console fallback
  if (!host || !user || pass === 'your_app_password' || !pass) {
    return null; // Will log to console in dev
  }

  return nodemailer.createTransport({
    host,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false,
    auth: { user, pass },
  });
}

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

async function sendEmail(opts: EmailOptions) {
  const transporter = createTransporter();

  if (!transporter) {
    // Dev fallback: print to console so developer can manually test
    console.log('\n📧 ─────────────────────────────────────');
    console.log(`   TO:      ${opts.to}`);
    console.log(`   SUBJECT: ${opts.subject}`);
    console.log(`   BODY:    ${opts.text || '(html only)'}`);
    console.log('─────────────────────────────────────\n');
    return;
  }

  await transporter.sendMail({
    from: `"${APP_NAME}" <${process.env.SMTP_USER}>`,
    to: opts.to,
    subject: opts.subject,
    html: opts.html,
    text: opts.text,
  });
}

/**
 * Send OTP verification code after signup.
 * In dev (no SMTP), prints the code to the server console.
 */
export async function sendVerificationEmail(
  email: string,
  firstName: string,
  code: string,
  role: string
) {
  const roleLabel = role.charAt(0).toUpperCase() + role.slice(1);

  // Dev fallback: no real SMTP configured — print code to console in yellow
  if (!createTransporter()) {
    console.warn('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.warn('  📮  VERIFICATION CODE (dev mode)');
    console.warn(`  EMAIL  : ${email}`);
    console.warn(`  CODE   : ${code}`);
    console.warn(`  ROLE   : ${roleLabel}`);
    console.warn('  Expires: 10 minutes');
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
