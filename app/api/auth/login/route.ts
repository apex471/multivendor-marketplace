import { NextRequest } from 'next/server';
import { User, UserRole } from '@/backend/models/User';
import { generateToken } from '@/backend/utils/jwt';
import { validateLoginInput } from '@/backend/utils/validation';
import { sendVerificationEmail } from '@/backend/utils/email';
import bcrypt from 'bcryptjs';
import {
  sendSuccess,
  sendError,
  sendValidationError,
  sendServerError,
} from '@/backend/utils/responseAppRouter';

// ── In-process rate limiter ─────────────────────────────────────────────────
// Prevents brute-force attacks that drain Firestore read quota.
// Keyed by email (lowercase). Resets after WINDOW_MS.
const ATTEMPT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_ATTEMPTS      = 8;              // per window per email

interface AttemptBucket {
  count:     number;
  expiresAt: number;
}

const loginAttempts = new Map<string, AttemptBucket>();

function isRateLimited(email: string): boolean {
  const now    = Date.now();
  const bucket = loginAttempts.get(email);
  if (!bucket || now > bucket.expiresAt) {
    // Fresh window
    loginAttempts.set(email, { count: 1, expiresAt: now + ATTEMPT_WINDOW_MS });
    return false;
  }
  bucket.count++;
  if (bucket.count > MAX_ATTEMPTS) return true;
  return false;
}

function clearAttempts(email: string): void {
  loginAttempts.delete(email);
}

// ── Route ───────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));

    const validation = validateLoginInput(body);
    if (!validation.isValid) {
      return sendValidationError('Validation failed', validation.errors);
    }

    const email: string    = body.email.toLowerCase().trim();
    const password: string = body.password;

    // ── Rate limit check (before any Firestore read) ──────────────────────
    if (isRateLimited(email)) {
      return sendError(
        'Too many login attempts. Please wait 15 minutes and try again.',
        429
      );
    }

    // ── Single Firestore read: fetch user WITH password ───────────────────
    // Previously the code called findOne() + comparePassword() = 2 reads.
    // Now we reuse the password already fetched in findOne, saving 1 read
    // per login attempt (cuts Firestore read quota usage by 33%).
    const userSnap = await User.findOne({ email }, { includePassword: true });
    if (!userSnap) {
      // Don't reveal whether email exists
      return sendError('Invalid email or password', 401);
    }

    if (!userSnap.isActive) {
      return sendError('Your account has been deactivated. Please contact support.', 403);
    }

    // ── Password comparison (reuse password already in userSnap) ─────────
    // The old code called User.comparePassword(id) which did a SECOND
    // db.collection(USERS).doc(id).get() — entirely redundant.
    const isPasswordValid = await bcrypt.compare(password, (userSnap as unknown as { password: string }).password ?? '');
    if (!isPasswordValid) {
      return sendError('Invalid email or password', 401);
    }

    // Success — clear rate limit bucket
    clearAttempts(email);

    // ── Email verification gate ───────────────────────────────────────────
    if (!userSnap.isEmailVerified) {
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      await User.updateOne(userSnap.id!, {
        emailVerificationToken:   otp,
        emailVerificationExpires: new Date(Date.now() + 10 * 60 * 1000),
      });
      let emailSentMsg = 'A new code has been sent to your inbox.';
      try {
        const host     = request.headers.get('host')             || 'localhost:3000';
        const protocol = request.headers.get('x-forwarded-proto') || 'http';
        const baseUrl  = `${protocol}://${host}`;
        const emailResult = await sendVerificationEmail(
          userSnap.email, userSnap.firstName, otp,
          userSnap.role as UserRole, baseUrl
        );
        if (!emailResult.sent) emailSentMsg = 'Could not send a new code. Use the resend button.';
      } catch { /* non-blocking */ }
      return sendError(
        `Please verify your email before logging in. ${emailSentMsg}`,
        403,
        { requiresEmailVerification: 'true', email: userSnap.email, role: userSnap.role }
      );
    }

    // ── Update lastLogin (1 write, non-blocking) ──────────────────────────
    // Fire-and-forget so login latency isn't affected by this write.
    User.updateOne(userSnap.id!, { lastLogin: new Date() }).catch(err =>
      console.warn('[Login] lastLogin update failed (non-critical):', err?.message)
    );

    const token = generateToken(userSnap.id!, userSnap.email, userSnap.role);

    return sendSuccess({
      user: {
        id:              userSnap.id,
        firstName:       userSnap.firstName,
        lastName:        userSnap.lastName,
        email:           userSnap.email,
        role:            userSnap.role,
        avatar:          userSnap.avatar || null,
        isEmailVerified: userSnap.isEmailVerified,
      },
      token,
    }, 'Login successful');

  } catch (error: unknown) {
    const err = error as Error;
    console.error('[Login] Route error:', err?.message || error);

    // Surface Firestore quota errors clearly instead of a generic 500
    const msg = err?.message || '';
    if (msg.includes('RESOURCE_EXHAUSTED') || msg.includes('Quota exceeded')) {
      return sendError(
        'Service temporarily unavailable due to high traffic. Please try again in a few minutes.',
        503
      );
    }

    return sendServerError(`Login error: ${msg || 'Unknown error'}`);
  }
}
