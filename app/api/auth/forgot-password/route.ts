import { NextRequest } from 'next/server';
import crypto from 'crypto';
import { User } from '@/backend/models/User';
import { sendPasswordResetEmail } from '@/backend/utils/email';
import {
  sendSuccess,
  sendError,
  sendServerError,
} from '@/backend/utils/responseAppRouter';

// ── In-process rate limiter ─────────────────────────────────────────────────
const ATTEMPT_WINDOW_MS = 15 * 60 * 1000; // 15 mins
const MAX_ATTEMPTS      = 5;              // max 5 requests per 15 mins

interface AttemptBucket { count: number; expiresAt: number; }
const forgotAttempts = new Map<string, AttemptBucket>();

function isRateLimited(key: string): boolean {
  const now = Date.now();
  const bucket = forgotAttempts.get(key);
  if (!bucket || now > bucket.expiresAt) {
    forgotAttempts.set(key, { count: 1, expiresAt: now + ATTEMPT_WINDOW_MS });
    return false;
  }
  bucket.count++;
  return bucket.count > MAX_ATTEMPTS;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const email = (body.email || '').trim().toLowerCase();
    const role  = body.role; // optional role hint

    if (!email || !email.includes('@')) {
      return sendError('Please provide a valid email address', 400);
    }

    if (isRateLimited(email)) {
      return sendError('Too many password reset requests. Please try again in 15 minutes.', 429);
    }

    const user = await User.findByEmail(email);

    // If user does not exist, return generic success to prevent account enumeration
    if (!user || !user.id) {
      return sendSuccess(
        { sent: true },
        'If an account exists with that email, a password reset link has been sent.'
      );
    }

    // Generate secure random token and 6-digit backup PIN
    const token = crypto.randomBytes(32).toString('hex');
    const pin = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Save token and expiration in Firestore
    await User.updateOne(user.id, {
      resetPasswordToken: token,
      resetPasswordExpires: expires,
    });

    // Derive root app URL from request or environment
    const origin = req.nextUrl.origin || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const resetLink = `${origin}/auth/reset-password?token=${token}&email=${encodeURIComponent(user.email)}${role ? `&role=${role}` : ''}`;

    await sendPasswordResetEmail({
      to: user.email,
      firstName: user.firstName,
      resetLink,
      code: pin,
    });

    return sendSuccess(
      { sent: true },
      'If an account exists with that email, a password reset link has been sent.'
    );
  } catch (err) {
    console.error('[Forgot Password Error]', err);
    return sendServerError('Failed to process password reset request. Please try again later.');
  }
}
