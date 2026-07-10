import { NextRequest } from 'next/server';
import { Transaction } from '@/backend/models/Transaction';
import { Order } from '@/backend/models/Order';
import { verifyAdminAuth } from '@/backend/utils/adminAuth';
import { db, FieldPath, docToObject } from '@/backend/config/firebase';
import { sendSuccess, sendError, sendServerError } from '@/backend/utils/responseAppRouter';
import { calculateFees, FEES } from '@/lib/fees';

const ESCROW_TYPES = ['order_payment', 'escrow_release', 'platform_fee', 'stripe_fee', 'refund', 'logistics_release'];

// GET /api/admin/escrow
export async function GET(request: NextRequest) {
  const { error } = await verifyAdminAuth(request);
  if (error) return sendError(error, 401);

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'pending';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(50, parseInt(searchParams.get('limit') || '20'));
    const skip = (page - 1) * limit;

    let allTxs = await Transaction.find({});
    allTxs = allTxs.filter(t => ESCROW_TYPES.includes(t.type));

    if (status !== 'all') {
      allTxs = allTxs.filter(t => t.status === status);
    }

    allTxs.sort((a, b) => (b.createdAt ? new Date(b.createdAt).getTime() : 0) - (a.createdAt ? new Date(a.createdAt).getTime() : 0));

    const total = allTxs.length;
    const paginated = allTxs.slice(skip, skip + limit);

    // Populate fromUser and toUser in-memory
    const userIds = Array.from(new Set(
      paginated.flatMap(t => [t.fromUser, t.toUser]).filter((id): id is string => !!id)
    ));
    const userMap = new Map<string, any>();
    if (userIds.length > 0) {
      const chunks: string[][] = [];
      for (let i = 0; i < userIds.length; i += 30) {
        chunks.push(userIds.slice(i, i + 30));
      }
      for (const chunk of chunks) {
        const snap = await db.collection('users')
          .where(FieldPath.documentId(), 'in', chunk)
          .get();
        snap.docs.forEach(d => {
          userMap.set(d.id, docToObject<any>(d));
        });
      }
    }

    const populatedTxs = paginated.map(t => {
      const fromU = t.fromUser ? userMap.get(t.fromUser) : null;
      const toU = t.toUser ? userMap.get(t.toUser) : null;
      return {
        ...t,
        fromUser: fromU ? {
          id:        fromU.id,
          firstName: fromU.firstName,
          lastName:  fromU.lastName,
          email:     fromU.email,
        } : null,
        toUser: toU ? {
          id:        toU.id,
          firstName: toU.firstName,
          lastName:  toU.lastName,
          email:     toU.email,
        } : null,
      };
    });

    const allEscrowTxs = (await Transaction.find({})).filter(t => ESCROW_TYPES.includes(t.type));
    const pendingCount   = allEscrowTxs.filter(t => t.status === 'pending').length;
    const completedCount = allEscrowTxs.filter(t => t.status === 'completed').length;
    const refundedCount  = allEscrowTxs.filter(t => t.status === 'refunded').length;

    // Total funds held = sum of pending order_payment amounts
    const totalHeld = allEscrowTxs
      .filter(t => t.type === 'order_payment' && t.status === 'pending')
      .reduce((sum, t) => sum + t.amount, 0);

    // Platform revenue stats (completed platform_fee records)
    const platformFeeRecords = allEscrowTxs.filter(t => t.type === 'platform_fee' && t.status === 'completed');
    const totalPlatformGross = platformFeeRecords.reduce((sum, t) => sum + t.amount, 0);
    const totalStripeFees    = allEscrowTxs
      .filter(t => t.type === 'stripe_fee' && t.status === 'completed')
      .reduce((sum, t) => sum + t.amount, 0);
    const totalPlatformNet   = Math.round((totalPlatformGross - totalStripeFees) * 100) / 100;

    return sendSuccess({
      transactions: populatedTxs,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      counts: { pending: pendingCount, completed: completedCount, refunded: refundedCount },
      totalHeld,
      platformStats: {
        grossRevenue: totalPlatformGross,
        stripeFees:   totalStripeFees,
        netRevenue:   totalPlatformNet,
        buyerFeeRate:  FEES.BUYER_SERVICE_FEE_RATE * 100,
        sellerFeeRate: FEES.SELLER_FEE_RATE * 100,
        stripeFeeRate: FEES.STRIPE_RATE * 100,
      },
    });
  } catch (err) {
    console.error('Admin escrow GET error:', err);
    return sendServerError('Failed to load escrow data');
  }
}

// POST /api/admin/escrow — release or refund a pending transaction
export async function POST(request: NextRequest) {
  const { error: authError } = await verifyAdminAuth(request);
  if (authError) return sendError(authError, 401);

  try {
    const body = await request.json().catch(() => ({}));
    const { transactionId, action, reason } = body;

    if (!transactionId) return sendError('transactionId is required', 400);
    if (!['release', 'refund'].includes(action)) {
      return sendError('action must be "release" or "refund"', 400);
    }

    const docRef = db.collection('transactions').doc(transactionId);
    const snap = await docRef.get();
    if (!snap.exists) return sendError('Transaction not found', 404);
    const data = snap.data()!;
    if (data.status !== 'pending') return sendError('Only pending transactions can be actioned', 400);
    if (data.type !== 'order_payment') return sendError('Only order_payment transactions can be released/refunded', 400);

    const now = new Date();
    const targetStatus = action === 'release' ? 'completed' : 'refunded';

    if (action === 'release') {
      const orderId = data.orderId ?? '';
      const { releaseEscrow } = await import('@/backend/utils/escrow');
      await releaseEscrow(orderId, reason);

      const fb = data.feeBreakdown as Record<string, number> | undefined;
      const subtotal = fb?.subtotal ?? data.amount;
      const shipping = fb?.shipping ?? 0;
      const fees = fb
        ? {
            subtotal:        fb.subtotal,
            shipping:        fb.shipping,
            buyerServiceFee: fb.buyerServiceFee,
            sellerFee:       fb.sellerFee,
            stripeFee:       fb.stripeFee,
            vendorPayout:    fb.vendorPayout,
            platformGross:   fb.platformGross,
            platformNet:     fb.platformNet,
            tax:             fb.tax,
            buyerTotal:      data.amount,
          }
        : calculateFees(subtotal, shipping);

      // Also update order status to completed
      try {
        const order = await Order.findByOrderId(orderId);
        if (order && order.status !== 'completed') {
          await Order.updateOne(order.id!, { status: 'completed', paymentStatus: 'paid' });
          const OrderStore = await import('@/lib/store/orders');
          OrderStore.update(orderId, { status: 'completed', paymentStatus: 'paid' });
        }
      } catch {}

      return sendSuccess(
        {
          transactionId,
          status:       'completed',
          vendorPayout: fees.vendorPayout,
          platformFee:  fees.platformGross,
          stripeFee:    fees.stripeFee,
          platformNet:  fees.platformNet,
        },
        `Escrow released. Vendor receives $${fees.vendorPayout.toFixed(2)}. Platform earns $${fees.platformNet.toFixed(2)} net (after $${fees.stripeFee.toFixed(2)} Stripe fee).`
      );
    }

    // ── Mark original escrow as refunded ──────────────────────────────
    const updatePayload: Record<string, unknown> = {
      status: targetStatus,
      updatedAt: now,
    };
    if (reason) {
      updatePayload.metadata = { ...(data.metadata || {}), adminNote: reason };
    }
    await docRef.update(updatePayload);

    // Refund path
    return sendSuccess(
      { transactionId, status: 'refunded' },
      'Escrow refunded to customer successfully'
    );
  } catch (err) {
    console.error('Admin escrow POST error:', err);
    return sendServerError('Failed to process escrow action');
  }
}
