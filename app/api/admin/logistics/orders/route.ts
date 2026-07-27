import { NextRequest } from 'next/server';
import { verifyAdminAuth } from '@/backend/utils/adminAuth';
import { sendSuccess, sendError, sendServerError } from '@/backend/utils/responseAppRouter';
import { db, docToObject } from '@/backend/config/firebase';
import { IOrder } from '@/backend/models/Order';
import { COURIERS } from '@/lib/couriers';

/**
 * GET /api/admin/logistics/orders
 * Admin only — view all logistics order data for monitoring + courier analytics.
 * Reads from Firestore — no in-memory store.
 *
 * ?type=active  → orders currently in-flight (processing | shipped)
 * ?type=queue   → unassigned pending orders
 * ?type=all     → every order
 */
export async function GET(request: NextRequest) {
  const { error } = await verifyAdminAuth(request);
  if (error) return sendError(error, 401);

  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') ?? 'active';

    // Fetch orders from Firestore based on type
    let snap: FirebaseFirestore.QuerySnapshot;

    if (type === 'active') {
      // Both 'processing' and 'shipped' statuses — Firestore can't OR, so fetch both
      const [procSnap, shipSnap] = await Promise.all([
        db.collection('orders').where('status', '==', 'processing').limit(100).get(),
        db.collection('orders').where('status', '==', 'shipped').limit(100).get(),
      ]);
      const allDocs = [...procSnap.docs, ...shipSnap.docs];
      // de-dup by id
      const seen = new Set<string>();
      const uniqueDocs = allDocs.filter(d => { if (seen.has(d.id)) return false; seen.add(d.id); return true; });
      const orders = uniqueDocs.map(d => docToObject<IOrder>(d)!).filter(Boolean);

      const formattedOrders = orders.map(o => formatLiveOrder(o));
      const courierStats    = buildCourierStats(orders);
      const summary = buildSummary(orders, 'active');

      return sendSuccess({ orders: formattedOrders, total: formattedOrders.length, courierStats, summary });
    }

    if (type === 'queue') {
      snap = await db.collection('orders').where('status', '==', 'pending').limit(100).get();
      const orders = snap.docs
        .map(d => docToObject<IOrder>(d)!)
        .filter(o => o && !o.assignedDriverId);
      const formattedOrders = orders.map(o => formatLiveOrder(o));
      const courierStats    = buildCourierStats(orders);
      const summary = buildSummary(orders, 'queue');
      return sendSuccess({ orders: formattedOrders, total: formattedOrders.length, courierStats, summary });
    }

    // type === 'all' or fallback — get a reasonable recent window
    snap = await db.collection('orders')
      .orderBy('createdAt', 'desc')
      .limit(500)
      .get();
    const orders = snap.docs.map(d => docToObject<IOrder>(d)!).filter(Boolean);
    const formattedOrders = orders.map(o => formatLiveOrder(o));
    const courierStats    = buildCourierStats(orders);
    const summary = buildSummary(orders, 'all');

    return sendSuccess({ orders: formattedOrders, total: formattedOrders.length, courierStats, summary });

  } catch (err) {
    console.error('[Admin Logistics Orders] GET error:', err);
    return sendServerError('Failed to load logistics orders');
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatAddress(addr?: IOrder['shippingAddress']) {
  if (!addr) return 'N/A';
  return [addr.addressLine1, addr.addressLine2, addr.city, addr.state, addr.zipCode]
    .filter(Boolean).join(', ');
}

function formatLiveOrder(o: IOrder & { id: string }) {
  return {
    id:               o.orderId ?? o.id,
    customerName:     o.customerName ?? 'Customer',
    shippingAddress:  formatAddress(o.shippingAddress),
    products:         o.items?.map(i => i.name) ?? [],
    total:            o.total ?? 0,
    status:           o.status,
    assignedDriverId:   o.assignedDriverId ?? null,
    assignedDriverName: o.assignedDriverName ?? null,
    acceptedAt:       o.acceptedAt  ? new Date(o.acceptedAt).toISOString()  : null,
    pickedUpAt:       o.pickedUpAt  ? new Date(o.pickedUpAt).toISOString()  : null,
    courier: {
      id:    o.courier?.id    ?? 'standard',
      name:  o.courier?.name  ?? 'Courier',
      icon:  o.courier?.icon  ?? '🚚',
      price: o.shippingCost   ?? 0,
    },
    orderDate: o.createdAt ? new Date(o.createdAt).toISOString() : new Date().toISOString(),
  };
}

function buildCourierStats(orders: IOrder[]) {
  // Build a baseline from COURIERS so every tier shows up (even if 0 orders)
  const stats: Record<string, { orders: number; revenue: number }> = {};
  for (const c of COURIERS) {
    stats[c.id] = { orders: 0, revenue: 0 };
  }
  for (const o of orders) {
    const cid = o.courier?.id ?? 'standard';
    if (!stats[cid]) stats[cid] = { orders: 0, revenue: 0 };
    stats[cid].orders++;
    stats[cid].revenue += o.shippingCost ?? 0;
  }
  return stats;
}

function buildSummary(orders: IOrder[], type: string) {
  const active    = orders.filter(o => o.status === 'processing' || o.status === 'shipped').length;
  const queue     = orders.filter(o => o.status === 'pending' && !o.assignedDriverId).length;
  const delivered = orders.filter(o => o.status === 'delivered').length;

  return {
    total:     orders.length,
    active:    type === 'active' ? orders.length : active,
    queue:     type === 'queue'  ? orders.length : queue,
    delivered,
  };
}
