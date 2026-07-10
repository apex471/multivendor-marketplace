import { db } from '@/backend/config/firebase';
import { Transaction } from '@/backend/models/Transaction';
import { Order } from '@/backend/models/Order';
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

  // 2. Reconstruct fee breakdown
  const fb = txn.feeBreakdown as any;
  const subtotal = fb?.subtotal ?? order.subtotal;
  const shipping = fb?.shipping ?? order.shippingCost;
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
        buyerTotal:      txn.amount,
      }
    : calculateFees(subtotal, shipping);

  // Find vendor ID
  const vendorName = order.items?.[0]?.vendor ?? null;
  let vendorId: string | null = null;
  if (vendorName) {
    const vendorUser = await db.collection('users').where('storeName', '==', vendorName).limit(1).get();
    if (!vendorUser.empty) {
      vendorId = vendorUser.docs[0].id;
    }
  }

  // 3. Create Vendor Payout Transaction (escrow_release)
  await Transaction.create({
    transactionId: `REL-${txn.transactionId}`,
    type:          'escrow_release',
    amount:        fees.vendorPayout,
    currency:      'USD',
    status:        'completed',
    ...(vendorId ? { toUser: vendorId } : {}),
    orderId,
    description:   `Vendor payout for order ${orderId} (subtotal $${fees.subtotal.toFixed(2)} − 10% seller fee $${fees.sellerFee.toFixed(2)})`,
    metadata: { sellerFee: fees.sellerFee, sellerFeeRate: FEES.SELLER_FEE_RATE * 100 },
  });

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

  // 5. Create Platform Fee Transaction (platform_fee)
  await Transaction.create({
    transactionId: `FEE-${txn.transactionId}`,
    type:          'platform_fee',
    amount:        fees.platformGross,
    currency:      'USD',
    status:        'completed',
    orderId,
    description:   `Platform fee for order ${orderId}: buyer 10% ($${fees.buyerServiceFee.toFixed(2)}) + seller 10% ($${fees.sellerFee.toFixed(2)}) = $${fees.platformGross.toFixed(2)}`,
    metadata: {
      buyerServiceFee:  fees.buyerServiceFee,
      sellerFee:        fees.sellerFee,
      platformGross:    fees.platformGross,
      platformNet:      fees.platformNet,
      stripeFee:        fees.stripeFee,
      buyerFeeRate:     FEES.BUYER_SERVICE_FEE_RATE * 100,
      sellerFeeRate:    FEES.SELLER_FEE_RATE * 100,
    },
  });

  // 6. Create Stripe Fee Transaction (stripe_fee)
  await Transaction.create({
    transactionId: `STRIPE-${txn.transactionId}`,
    type:          'stripe_fee',
    amount:        fees.stripeFee,
    currency:      'USD',
    status:        'completed',
    orderId,
    description:   `Stripe processing fee for order ${orderId}: 2.9% + $0.30 = $${fees.stripeFee.toFixed(2)} (absorbed by platform)`,
    metadata: { stripeRate: FEES.STRIPE_RATE * 100 },
  });
}
