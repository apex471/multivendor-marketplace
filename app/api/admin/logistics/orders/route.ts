import { NextRequest } from 'next/server';
import { verifyAdminAuth } from '@/backend/utils/adminAuth';
import { sendSuccess, sendError, sendServerError } from '@/backend/utils/responseAppRouter';
import * as OrderStore from '@/lib/store/orders';

/**
 * GET /api/admin/logistics/orders
 * Admin only — view all logistics order data for monitoring + courier analytics.
 *
 * ?type=active  → orders currently in-flight (processing | shipped)
 * ?type=queue   → unassigned pending orders
 * ?type=all     → every order in the store
 *
 * Always returns courierStats: per-courier order count + revenue.
 */
export async function GET(request: NextRequest) {
  const { error } = await verifyAdminAuth(request);
  if (error) return sendError(error, 401);

  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') ?? 'active';

    const allOrders = OrderStore.getAll();

    const orders =
      type === 'active'
        ? allOrders.filter(o => o.status === 'processing' || o.status === 'shipped')
        : type === 'queue'
        ? OrderStore.getQueue()
        : allOrders;

    // Per-courier stats across ALL orders
    const courierStats = allOrders.reduce<Record<string, { orders: number; revenue: number }>>(
      (acc, o) => {
        const cid = o.courier.id;
        if (!acc[cid]) acc[cid] = { orders: 0, revenue: 0 };
        acc[cid].orders++;
        acc[cid].revenue += o.courier.price;
        return acc;
      },
      {}
    );

    // Summary counts
    const summary = {
      total:     allOrders.length,
      pending:   allOrders.filter(o => o.status === 'pending').length,
      active:    allOrders.filter(o => o.status === 'processing' || o.status === 'shipped').length,
      delivered: allOrders.filter(o => o.status === 'delivered').length,
      cancelled: allOrders.filter(o => o.status === 'cancelled').length,
      queue:     OrderStore.getQueue().length,
    };

    return sendSuccess({ orders, total: orders.length, courierStats, summary });
  } catch (err) {
    console.error('[Admin Logistics Orders] GET error:', err);
    return sendServerError('Failed to load logistics orders');
  }
}
