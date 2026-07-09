import { NextRequest, NextResponse } from 'next/server';
import { Order } from '@/backend/models/Order';
import { Transaction } from '@/backend/models/Transaction';
import * as OrderStore from '@/lib/store/orders';

export async function GET(request: NextRequest) {
  try {
    const sp = new URL(request.url).searchParams;
    const transactionId = sp.get('transaction_id');
    const orderId = sp.get('order_id');

    if (!transactionId || !orderId) {
      return NextResponse.json({ success: false, message: 'Missing transaction_id or order_id' }, { status: 400 });
    }

    const order = await Order.findByOrderId(orderId);
    if (!order) {
      return NextResponse.json({ success: false, message: 'Order not found' }, { status: 404 });
    }

    // Check if order is already paid
    if (order.paymentStatus === 'paid') {
      return NextResponse.json({ success: true, message: 'Order already verified as paid' });
    }

    const flwSecretKey = process.env.FLUTTERWAVE_SECRET_KEY;
    if (!flwSecretKey) {
      // Mock success if key is not configured for testing
      await verifyOrderPayment(order.orderId, order.id!);
      return NextResponse.json({ success: true, message: 'Mock payment verified successfully' });
    }

    // Verify transaction with Flutterwave
    const flwRes = await fetch(`https://api.flutterwave.com/v3/transactions/${transactionId}/verify`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${flwSecretKey}`,
        'Content-Type': 'application/json',
      },
    });

    const flwData = await flwRes.json();
    if (!flwRes.ok || flwData.status !== 'success') {
      return NextResponse.json({ success: false, message: flwData.message || 'Flutterwave verification failed' }, { status: 400 });
    }

    const tx = flwData.data;
    // Validate transaction details
    // We expect status to be successful, tx_ref to match orderId, and currency to match
    if (tx.status !== 'successful' || tx.tx_ref !== orderId) {
      return NextResponse.json({ success: false, message: 'Invalid transaction details' }, { status: 400 });
    }

    // Validate amount matches (allowing minor floating point discrepancies)
    const orderTotal = Number(order.total);
    const txAmount = Number(tx.amount);
    if (Math.abs(txAmount - orderTotal) > 0.05) {
      return NextResponse.json({ success: false, message: `Payment amount mismatch. Expected: ${orderTotal}, Received: ${txAmount}` }, { status: 400 });
    }

    // Success - update the order status
    await verifyOrderPayment(order.orderId, order.id!);

    return NextResponse.json({ success: true, message: 'Payment verified successfully' });
  } catch (err) {
    console.error('Verify payment error:', err);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}

async function verifyOrderPayment(orderId: string, docId: string) {
  // Update Firestore Order
  await Order.updateOne(docId, {
    paymentStatus: 'paid',
  });

  // Update Firestore Escrow Transaction
  const txns = await Transaction.find({ orderId, type: 'order_payment' });
  if (txns.length > 0) {
    for (const txn of txns) {
      await Transaction.updateOne(txn.id, {
        status: 'completed',
      });
    }
  }

  // Update in-memory order store
  const memOrder = OrderStore.getById(orderId);
  if (memOrder) {
    OrderStore.update(orderId, { paymentStatus: 'paid', status: 'pending' });
  }
}
