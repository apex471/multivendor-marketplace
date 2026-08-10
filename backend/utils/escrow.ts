import { db, docToObject } from '@/backend/config/firebase';
import { FieldValue } from 'firebase-admin/firestore';
import { Transaction, ITransaction } from '@/backend/models/Transaction';
import { Order } from '@/backend/models/Order';
import { ReferralCode } from '@/backend/models/ReferralCode';
import { Notification } from '@/backend/models/Notification';
import { calculateFees, FEES } from '@/lib/fees';

const ESCROW_HOLD_HOURS = 36;

/**
 * Step 1: Initiate Escrow (Called when order is marked as delivered)
 * Creates the payout transactions but in a 'pending' state to hold funds.
 */
export async function initiateEscrow(orderId: string, reason?: string) {
  const now = new Date();

  const order = await Order.findByOrderId(orderId);
  if (!order) throw new Error('Order not found');

  const txns = await Transaction.find({ orderId, type: 'order_payment', status: 'pending' });
  if (txns.length === 0) return; // already processed or not found

  const txn = txns[0];

  // 1. Mark original escrow transaction as completed
  const updatePayload: Record<string, any> = {
    status: 'completed',
    updatedAt: now,
  };
  if (reason) {
    updatePayload.metadata = { ...(txn.metadata || {}), adminNote: reason };
  }
  await Transaction.updateOne(txn.id!, updatePayload);

  // ── Resolve affiliate info from the buyer ──────────────────────────────────
  let affiliateCode: string | null = null;
  let affiliateUserId: string | null = null;
  let affiliateDocId: string | null = null;

  if (order.customerId) {
    try {
      const buyerSnap = await db.collection('users').doc(order.customerId).get();
      if (buyerSnap.exists) {
        const buyerData = buyerSnap.data()!;
        const referredByCode: string | undefined = buyerData.referredByCode;
        if (referredByCode) {
          const refCodeDoc = await ReferralCode.findByCode(referredByCode);
          if (refCodeDoc && refCodeDoc.isActive) {
            affiliateCode = referredByCode;
            affiliateDocId = refCodeDoc.id!;
            affiliateUserId = (refCodeDoc as any).affiliateUserId || refCodeDoc.createdByAdmin || null;
          }
        }
      }
    } catch (err) {
      console.warn('[Escrow] Failed to resolve affiliate for buyer', order.customerId, err);
    }
  }

  const hasAffiliate = !!affiliateCode && !!affiliateUserId;

  // 2. Reconstruct fee breakdown
  const fb = txn.feeBreakdown as any;
  const subtotal = fb?.subtotal ?? order.subtotal;
  const shipping = fb?.shipping ?? order.shippingCost;
  const fees = fb
    ? {
        subtotal:        fb.subtotal,
        shipping:        fb.shipping ?? 0,
        buyerServiceFee: fb.buyerServiceFee,
        sellerFee:       fb.sellerFee,
        stripeFee:       fb.stripeFee ?? fb.paymentFee ?? 0,
        paymentFee:      fb.stripeFee ?? fb.paymentFee ?? 0,
        vendorPayout:    fb.vendorPayout,
        platformGross:   fb.platformGross,
        platformNet:     fb.platformNet,
        tax:             fb.tax ?? 0,
        buyerTotal:      txn.amount,
        affiliateFee:    hasAffiliate ? Math.round(fb.subtotal * FEES.AFFILIATE_RATE * 100) / 100 : 0,
        adminNet:        0,
      }
    : calculateFees(subtotal, shipping, hasAffiliate);

  if (fb) {
    fees.adminNet = Math.round(
      (fees.platformGross - fees.affiliateFee - (fees.stripeFee ?? 0)) * 100
    ) / 100;
  }

  // ── Resolve vendor IDs from order items ─────────────────────────────────
  const vendorItemsMap = new Map<string, { items: typeof order.items; vendorId: string }>();

  for (const item of order.items ?? []) {
    let resolvedVendorId: string | null = (item as any).vendorId || null;
    if (!resolvedVendorId) {
      const vendorName = (item as any).vendor ?? null;
      if (vendorName) {
        const byName = await db.collection('users').where('storeName', '==', vendorName).limit(1).get();
        if (!byName.empty) resolvedVendorId = byName.docs[0].id;
      }
    }
    if (!resolvedVendorId) continue;

    if (!vendorItemsMap.has(resolvedVendorId)) {
      vendorItemsMap.set(resolvedVendorId, { items: [], vendorId: resolvedVendorId });
    }
    vendorItemsMap.get(resolvedVendorId)!.items.push(item);
  }

  let vendorId: string | null = vendorItemsMap.size > 0 ? [...vendorItemsMap.keys()][0] : null;

  // Set the clearance time to 36 hours from now
  const clearAt = new Date(now.getTime() + ESCROW_HOLD_HOURS * 60 * 60 * 1000);

  // 3. Create Vendor Payout Transaction(s) — one per vendor as PENDING
  if (vendorItemsMap.size > 0) {
    for (const [vId, { items: vItems }] of vendorItemsMap.entries()) {
      const vSubtotal = vItems.reduce((s: number, i: any) => s + (i.price ?? 0) * (i.quantity ?? 1), 0);
      const vPayout = Number((vSubtotal * (1 - FEES.SELLER_FEE_RATE)).toFixed(2));

      await Transaction.create({
        transactionId: `REL-${txn.transactionId}-${vId.slice(-6)}`,
        type:          'escrow_release',
        amount:        vPayout,
        currency:      'USD',
        status:        'pending', // HOLD FUNDS for 36 hours
        toUser:        vId,
        orderId,
        description:   `Pending vendor payout for order ${orderId} (subtotal $${vSubtotal.toFixed(2)} − ${FEES.SELLER_FEE_RATE * 100}% seller fee)`,
        metadata: {
          sellerFee:     Number((vSubtotal * FEES.SELLER_FEE_RATE).toFixed(2)),
          sellerFeeRate: FEES.SELLER_FEE_RATE * 100,
          clearAt:       clearAt.toISOString(),
        },
      });

      // Send a notification to the vendor
      await Notification.create({
        recipientId: vId,
        type: 'order',
        text: `Order #${orderId.slice(-8)} has been delivered! $${vPayout.toFixed(2)} is now in pending clearing. Funds will be available in 36 hours.`,
        link: `/dashboard/vendor?tab=orders&order=${orderId}`,
        isRead: false,
      });
    }
  } else {
    await Transaction.create({
      transactionId: `REL-${txn.transactionId}`,
      type:          'escrow_release',
      amount:        fees.vendorPayout,
      currency:      'USD',
      status:        'pending', // HOLD FUNDS
      ...(vendorId ? { toUser: vendorId } : {}),
      orderId,
      description:   `Pending vendor payout for order ${orderId} [vendor unresolved]`,
      metadata: { sellerFee: fees.sellerFee, sellerFeeRate: FEES.SELLER_FEE_RATE * 100, clearAt: clearAt.toISOString(), vendorUnresolved: true },
    });
  }

  // 4. Create Logistics Payout Transaction as PENDING
  if (order.assignedDriverId && fees.shipping > 0) {
    await Transaction.create({
      transactionId: `LOG-${txn.transactionId}`,
      type:          'logistics_release',
      amount:        fees.shipping,
      currency:      'USD',
      status:        'pending', // HOLD FUNDS
      toUser:        order.assignedDriverId,
      orderId,
      description:   `Pending logistics payout for order ${orderId}`,
      metadata:      { isLogistics: true, clearAt: clearAt.toISOString() },
    });
  }

  // 5. Create Affiliate Payout Transaction as PENDING
  if (hasAffiliate && affiliateUserId && fees.affiliateFee > 0) {
    await Transaction.create({
      transactionId:  `AFF-${txn.transactionId}`,
      type:           'affiliate_payout',
      amount:         fees.affiliateFee,
      currency:       'USD',
      status:         'pending', // HOLD FUNDS
      toUser:         affiliateUserId,
      orderId,
      affiliateCode:  affiliateCode!,
      affiliateUserId: affiliateUserId,
      description:    `Pending affiliate commission for order ${orderId}`,
      metadata: {
        affiliateCode,
        affiliateRate: FEES.AFFILIATE_RATE * 100,
        subtotal:      fees.subtotal,
        clearAt:       clearAt.toISOString(),
        affiliateDocId: affiliateDocId,
      },
    });
  }

  // 6. Create Platform Fee Transaction (completed immediately as it's our revenue)
  await Transaction.create({
    transactionId: `FEE-${txn.transactionId}`,
    type:          'platform_fee',
    amount:        fees.adminNet,
    currency:      'USD',
    status:        'completed',
    orderId,
    ...(affiliateCode ? { affiliateCode } : {}),
    ...(affiliateUserId ? { affiliateUserId } : {}),
    description:   `Platform fee for order ${orderId}`,
    metadata: {
      buyerServiceFee:  fees.buyerServiceFee,
      sellerFee:        fees.sellerFee,
      platformGross:    fees.platformGross,
      affiliateFee:     fees.affiliateFee,
      adminNet:         fees.adminNet,
    },
  });

  // 7. Create Stripe/Payment Fee Transaction (completed)
  await Transaction.create({
    transactionId: `STRIPE-${txn.transactionId}`,
    type:          'stripe_fee',
    amount:        fees.stripeFee,
    currency:      'USD',
    status:        'completed',
    orderId,
    description:   `Payment processing fee for order ${orderId}`,
    metadata: { stripeRate: FEES.STRIPE_RATE * 100 },
  });
}

/**
 * Step 2: Clear Mature Escrows (Called lazily on dashboard load / withdrawal attempt)
 * Finds pending payouts older than 36 hours and clears them if no tickets exist.
 */
export async function clearMatureEscrows(userId: string) {
  const now = new Date();
  
  // Find all pending payouts for this user
  const pendingTxs = await Transaction.find({ toUser: userId, status: 'pending' });
  
  for (const tx of pendingTxs) {
    if (!['escrow_release', 'logistics_release', 'affiliate_payout'].includes(tx.type)) continue;
    
    const clearAtStr = tx.metadata?.clearAt as string | undefined;
    if (!clearAtStr) continue;

    const clearAt = new Date(clearAtStr);
    if (now >= clearAt) {
      // 36 hours have passed. Check for active tickets for this order.
      if (tx.orderId) {
        const order = await Order.findByOrderId(tx.orderId);
        if (order) {
           let hasDispute = false;
           try {
             // For simplicity, let's assume if the order status was changed to 'cancelled' or 'refunded', it's disputed.
             if (['cancelled', 'refunded'].includes(order.status)) {
                 hasDispute = true;
             }
             
             // Also check support tickets directly referencing this order
             const query = db.collection('supportTickets')
                .where('orderId', '==', tx.orderId)
                .where('status', 'in', ['open', 'in-progress']);
             const ticketSnap = await query.get();
             if (!ticketSnap.empty) {
                 hasDispute = true;
             }
           } catch (err) {
             console.error('[Escrow] Dispute check failed for order', tx.orderId, err);
           }

           if (hasDispute) {
             // Leave as pending if there is a dispute. The admin will resolve it manually.
             continue;
           }
        }
      }

      // No dispute! Move from Pending to Available by marking as completed.
      await Transaction.updateOne(tx.id!, {
        status: 'completed',
        updatedAt: now,
        description: tx.description.replace('Pending ', ''),
      });

      // If it's an affiliate payout, credit their wallet in the User document and ReferralCode stats
      if (tx.type === 'affiliate_payout') {
        try {
          await db.collection('users').doc(userId).update({
            affiliateEarnings: FieldValue.increment(tx.amount),
            updatedAt: now,
          });
          const affiliateDocId = tx.metadata?.affiliateDocId as string | undefined;
          if (affiliateDocId) {
            await ReferralCode.incrementEarnings(affiliateDocId, tx.amount);
          }
        } catch (err) {
          console.error('[Escrow] Failed to update affiliate wallet for', userId, err);
        }
      }
    }
  }
}
