import { db } from '@/backend/config/firebase';
import { FieldValue } from 'firebase-admin/firestore';
import { Transaction } from '@/backend/models/Transaction';
import { Order } from '@/backend/models/Order';
import { ReferralCode } from '@/backend/models/ReferralCode';
import { calculateFees, FEES } from '@/lib/fees';

export async function releaseEscrow(orderId: string, reason?: string) {
  const now = new Date();

  // Find order
  const order = await Order.findByOrderId(orderId);
  if (!order) throw new Error('Order not found');

  // Find pending order_payment transaction
  const txns = await Transaction.find({ orderId, type: 'order_payment', status: 'pending' });
  if (txns.length === 0) return; // already released or not found

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
            // The affiliate user is identified by the code's createdByAdmin field
            // which stores the userId of whoever owns this code's earnings.
            // (Admin-generated codes credit earnings to the code's "owner" userId)
            affiliateUserId = (refCodeDoc as any).affiliateUserId || refCodeDoc.createdByAdmin || null;
          }
        }
      }
    } catch (err) {
      console.warn('[Escrow] Failed to resolve affiliate for buyer', order.customerId, err);
    }
  }

  const hasAffiliate = !!affiliateCode && !!affiliateUserId;

  // 2. Reconstruct fee breakdown (with affiliate flag)
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
        // Compute affiliate fields fresh even if feeBreakdown exists (may be legacy record)
        affiliateFee:    hasAffiliate ? Math.round(fb.subtotal * FEES.AFFILIATE_RATE * 100) / 100 : 0,
        adminNet:        0, // filled below
      }
    : calculateFees(subtotal, shipping, hasAffiliate);

  // Fill adminNet if we reconstructed from legacy feeBreakdown
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
  let vendorUserDoc: any = null;
  if (vendorId) {
    const vSnap = await db.collection('users').doc(vendorId).get();
    if (vSnap.exists) vendorUserDoc = vSnap.data();
  }

  // Check and process direct Flutterwave payout if bank details are set
  const flwSecretKey = process.env.FLUTTERWAVE_SECRET_KEY;
  const bankCode = vendorUserDoc?.bankCode || null;
  const accountNumber = vendorUserDoc?.accountNumber || null;

  let flutterwaveTransfer = null;
  let payoutStatus: 'wallet' | 'bank_transfer_initiated' | 'bank_transfer_failed' = 'wallet';

  if (flwSecretKey && bankCode && accountNumber) {
    const NGN_RATE = Number(process.env.USD_TO_NGN_RATE ?? 1600);
    const payoutAmountNGN = Math.round(fees.vendorPayout * NGN_RATE);

    try {
      const transferRes = await fetch('https://api.flutterwave.com/v3/transfers', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${flwSecretKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          account_bank: bankCode,
          account_number: accountNumber,
          amount: payoutAmountNGN,
          currency: 'NGN',
          narration: `Escrow Release for Order ${orderId} - Multivendor Marketplace`,
          reference: `ESC-REL-${orderId}-${Date.now()}`,
          debit_currency: 'NGN',
        }),
      });

      const transferData = await transferRes.json();
      if (transferData.status === 'success') {
        payoutStatus = 'bank_transfer_initiated';
        flutterwaveTransfer = {
          transferId: transferData.data?.id || null,
          status: transferData.data?.status || 'unknown',
          fee: transferData.data?.fee || 0,
          rawResponse: transferData,
        };
      } else {
        console.error('[Escrow Release Flutterwave Error]', transferData);
        payoutStatus = 'bank_transfer_failed';
        flutterwaveTransfer = {
          error: transferData.message || 'Unknown error',
          rawResponse: transferData,
        };
      }
    } catch (err: any) {
      console.error('[Escrow Release Flutterwave Exception]', err);
      payoutStatus = 'bank_transfer_failed';
      flutterwaveTransfer = {
        error: err.message || 'Network error',
      };
    }
  }

  // 3. Create Vendor Payout Transaction(s) — one per vendor
  if (vendorItemsMap.size > 0) {
    for (const [vId, { items: vItems }] of vendorItemsMap.entries()) {
      const vSubtotal = vItems.reduce((s: number, i: any) => s + (i.price ?? 0) * (i.quantity ?? 1), 0);
      const vPayout = Number((vSubtotal * (1 - FEES.SELLER_FEE_RATE)).toFixed(2));

      await Transaction.create({
        transactionId: `REL-${txn.transactionId}-${vId.slice(-6)}`,
        type:          'escrow_release',
        amount:        vPayout,
        currency:      'USD',
        status:        'completed',
        toUser:        vId,
        orderId,
        description:   `Vendor payout for order ${orderId} (subtotal $${vSubtotal.toFixed(2)} − ${FEES.SELLER_FEE_RATE * 100}% seller fee)`,
        metadata: {
          sellerFee:     Number((vSubtotal * FEES.SELLER_FEE_RATE).toFixed(2)),
          sellerFeeRate: FEES.SELLER_FEE_RATE * 100,
          payoutStatus,
          ...(vId === vendorId && flutterwaveTransfer ? { flutterwaveTransfer } : {}),
          bankName:      vendorUserDoc?.bankName || null,
          accountNumber: vendorUserDoc?.accountNumber || null,
          accountName:   vendorUserDoc?.accountName || null,
        },
      });
    }
  } else {
    await Transaction.create({
      transactionId: `REL-${txn.transactionId}`,
      type:          'escrow_release',
      amount:        fees.vendorPayout,
      currency:      'USD',
      status:        'completed',
      ...(vendorId ? { toUser: vendorId } : {}),
      orderId,
      description:   `Vendor payout for order ${orderId} (subtotal $${fees.subtotal.toFixed(2)} − ${FEES.SELLER_FEE_RATE * 100}% seller fee $${fees.sellerFee.toFixed(2)}) [vendor unresolved]`,
      metadata: { sellerFee: fees.sellerFee, sellerFeeRate: FEES.SELLER_FEE_RATE * 100, payoutStatus, vendorUnresolved: true },
    });
  }

  // 4. Create Logistics Payout Transaction (logistics_release)
  if (order.assignedDriverId && fees.shipping > 0) {
    await Transaction.create({
      transactionId: `LOG-${txn.transactionId}`,
      type:          'logistics_release',
      amount:        fees.shipping,
      currency:      'USD',
      status:        'completed',
      toUser:        order.assignedDriverId,
      orderId,
      description:   `Logistics payout for order ${orderId} (delivery fee to driver)`,
      metadata:      { isLogistics: true },
    });
  }

  // 5. Create Affiliate Payout Transaction (if applicable) ──────────────────
  if (hasAffiliate && affiliateUserId && fees.affiliateFee > 0) {
    // Create affiliate_payout record (wallet credit)
    await Transaction.create({
      transactionId:  `AFF-${txn.transactionId}`,
      type:           'affiliate_payout',
      amount:         fees.affiliateFee,
      currency:       'USD',
      status:         'completed',
      toUser:         affiliateUserId,
      orderId,
      affiliateCode:  affiliateCode!,
      affiliateUserId: affiliateUserId,
      description:    `Affiliate commission for order ${orderId}: 5% of $${fees.subtotal.toFixed(2)} = $${fees.affiliateFee.toFixed(2)} (code: ${affiliateCode})`,
      metadata: {
        affiliateCode,
        affiliateRate: FEES.AFFILIATE_RATE * 100,
        subtotal:      fees.subtotal,
      },
    });

    // Credit the affiliate's wallet balance (Firestore atomic increment)
    try {
      await db.collection('users').doc(affiliateUserId).update({
        affiliateEarnings: FieldValue.increment(fees.affiliateFee),
        updatedAt: now,
      });
    } catch (err) {
      console.error('[Escrow] Failed to update affiliate wallet for', affiliateUserId, err);
    }

    // Update referral code stats
    if (affiliateDocId) {
      try {
        await ReferralCode.incrementEarnings(affiliateDocId, fees.affiliateFee);
      } catch (err) {
        console.error('[Escrow] Failed to update referral code earnings for', affiliateDocId, err);
      }
    }
  }

  // 6. Create Platform Fee Transaction (platform_fee) ────────────────────────
  const affiliateLine = hasAffiliate
    ? ` | Affiliate (${affiliateCode}) −$${fees.affiliateFee.toFixed(2)}`
    : '';

  await Transaction.create({
    transactionId: `FEE-${txn.transactionId}`,
    type:          'platform_fee',
    amount:        fees.adminNet,          // admin keeps the net after affiliate deduction
    currency:      'USD',
    status:        'completed',
    orderId,
    ...(affiliateCode ? { affiliateCode } : {}),
    ...(affiliateUserId ? { affiliateUserId } : {}),
    description:   `Platform fee for order ${orderId}: buyer 10% ($${fees.buyerServiceFee.toFixed(2)}) + seller 10% ($${fees.sellerFee.toFixed(2)}) = $${fees.platformGross.toFixed(2)} gross${affiliateLine} → admin net $${fees.adminNet.toFixed(2)}`,
    metadata: {
      buyerServiceFee:  fees.buyerServiceFee,
      sellerFee:        fees.sellerFee,
      platformGross:    fees.platformGross,
      affiliateFee:     fees.affiliateFee,
      affiliateCode:    affiliateCode,
      affiliateUserId:  affiliateUserId,
      adminNet:         fees.adminNet,
      platformNet:      fees.platformNet,
      stripeFee:        fees.stripeFee,
      buyerFeeRate:     FEES.BUYER_SERVICE_FEE_RATE * 100,
      sellerFeeRate:    FEES.SELLER_FEE_RATE * 100,
      affiliateRate:    hasAffiliate ? FEES.AFFILIATE_RATE * 100 : 0,
    },
  });

  // 7. Create Stripe/Payment Fee Transaction (stripe_fee) ───────────────────
  await Transaction.create({
    transactionId: `STRIPE-${txn.transactionId}`,
    type:          'stripe_fee',
    amount:        fees.stripeFee,
    currency:      'USD',
    status:        'completed',
    orderId,
    description:   `Payment processing fee for order ${orderId}: ~1.4% of $${txn.amount.toFixed(2)} = $${fees.stripeFee.toFixed(2)} (absorbed by platform)`,
    metadata: { stripeRate: FEES.STRIPE_RATE * 100 },
  });
}
