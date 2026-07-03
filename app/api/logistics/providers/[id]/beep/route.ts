import { NextRequest } from 'next/server';
import { verifyToken } from '@/backend/utils/jwt';
import { User } from '@/backend/models/User';
import { Notification } from '@/backend/models/Notification';
import { sendSuccess, sendError, sendServerError } from '@/backend/utils/responseAppRouter';
import { db } from '@/backend/config/firebase';

function getAuth(req: NextRequest) {
  const h = req.headers.get('Authorization') ?? req.headers.get('authorization') ?? '';
  const tok = h.startsWith('Bearer ') ? h.slice(7) : null;
  return tok ? verifyToken(tok) : null;
}

// ── Simple in-memory rate limiter: max 2 beeps per sender→provider per 10 min ──
const beepCooldown = new Map<string, number>();

// POST /api/logistics/providers/[id]/beep
// Body: { orderId?, message? }
// Sends a notification to the logistics provider asking them to come online.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: providerId } = await params;

  const payload = getAuth(req);
  if (!payload) return sendError('Authentication required', 401);
  if (!['vendor', 'brand', 'admin'].includes(payload.role ?? '')) {
    return sendError('Only vendors and brand owners can send beeps', 403);
  }

  // Rate limit: 1 beep every 10 minutes per sender→provider pair
  const cooldownKey = `${payload.userId}:${providerId}`;
  const lastBeep    = beepCooldown.get(cooldownKey) ?? 0;
  const COOLDOWN_MS = 10 * 60 * 1000; // 10 minutes
  if (Date.now() - lastBeep < COOLDOWN_MS) {
    const waitSec = Math.ceil((COOLDOWN_MS - (Date.now() - lastBeep)) / 1000);
    return sendError(`Please wait ${waitSec}s before beeping this provider again`, 429);
  }
  beepCooldown.set(cooldownKey, Date.now());

  try {
    // Verify provider exists and is a logistics user
    const provider = await User.findById(providerId);
    if (!provider || provider.role !== 'logistics') {
      return sendError('Logistics provider not found', 404);
    }

    // Fetch sender info for the notification
    const sender = await User.findById(payload.userId);
    const senderName = sender
      ? (sender.storeName ?? `${sender.firstName} ${sender.lastName ?? ''}`.trim())
      : 'A vendor';

    let body: Record<string, string> = {};
    try { body = await req.json(); } catch { /* optional body */ }

    const orderRef  = body.orderId  ? ` for order #${body.orderId.slice(-6).toUpperCase()}` : '';
    const extraMsg  = body.message  ? `: "${body.message}"` : '';
    const notifText = `🔔 ${senderName} needs you online${orderRef}${extraMsg}`;

    // Create in-app notification for the provider
    await Notification.create({
      recipientId: providerId,
      type:        'system',
      actorId:     payload.userId,
      actorName:   senderName,
      actorAvatar: sender?.avatar ?? undefined,
      text:        notifText,
      link:        '/logistics/dashboard',
      isRead:      false,
    });

    // Store a beep record in Firestore for audit/history
    await db.collection('providerBeeps').add({
      providerId,
      senderId:   payload.userId,
      senderName,
      senderRole: payload.role,
      orderId:    body.orderId ?? null,
      message:    body.message ?? null,
      createdAt:  new Date(),
    });

    return sendSuccess({
      beeped: true,
      providerName: provider.storeName ?? `${provider.firstName} ${provider.lastName ?? ''}`.trim(),
    }, `${senderName} beeped the provider. They will be notified to come online.`);

  } catch (err) {
    console.error('[Beep] error:', err);
    return sendServerError(err instanceof Error ? err.message : 'Failed to send beep');
  }
}

// GET /api/logistics/providers/[id]/beep
// Returns recent beep history for this provider (admin + logistics only)
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: providerId } = await params;

  const payload = getAuth(req);
  if (!payload) return sendError('Authentication required', 401);
  if (payload.userId !== providerId && payload.role !== 'admin') {
    return sendError('Access denied', 403);
  }

  try {
    const snap = await db.collection('providerBeeps')
      .where('providerId', '==', providerId)
      .limit(20)
      .get();

    const beeps = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    return sendSuccess({ beeps });
  } catch (err) {
    return sendServerError(err instanceof Error ? err.message : 'Failed to load beeps');
  }
}
