import { db, docToObject } from '@/backend/config/firebase';
import { Order, IOrder, IOrderItem } from '@/backend/models/Order';
import { User } from '@/backend/models/User';
import { Notification } from '@/backend/models/Notification';
import {
  sendVendorNewOrderEmail,
  sendVendorOrderUpdateEmail,
  VendorOrderItem,
} from '@/backend/utils/email';

interface ResolvedVendorGroup {
  vendorId: string;
  vendorName: string;
  vendorEmail: string;
  items: VendorOrderItem[];
  subtotal: number;
}

/**
 * Helper to resolve an order object whether an ID string or object was passed.
 */
async function resolveOrder(orderOrId: string | (IOrder & { id?: string })): Promise<(IOrder & { id?: string }) | null> {
  if (typeof orderOrId === 'object' && orderOrId?.orderId) {
    return orderOrId;
  }
  const idStr = String(orderOrId).trim();
  let order = await Order.findByOrderId(idStr);
  if (!order) {
    order = await Order.findById(idStr);
  }
  return order;
}

/**
 * Resolves each unique vendor participating in the order, extracting their items,
 * contact email, and earnings subtotal.
 */
async function resolveVendorsForOrder(order: IOrder): Promise<ResolvedVendorGroup[]> {
  const items = Array.isArray(order.items) ? order.items : [];
  if (items.length === 0) return [];

  // 1. Group items by resolved vendor ID
  const vendorItemsMap = new Map<string, IOrderItem[]>();

  for (const item of items) {
    let vId = (item as any).vendorId || null;

    // Fallback 1: Resolve via productId
    if (!vId && item.productId) {
      try {
        const prodSnap = await db.collection('products').doc(item.productId).get();
        if (prodSnap.exists) {
          vId = prodSnap.data()?.vendorId || null;
        }
      } catch (err) {
        console.warn(`[VendorNotifications] Failed to resolve product vendorId for ${item.productId}:`, err);
      }
    }

    // Fallback 2: Resolve via storeName
    if (!vId && item.vendor) {
      try {
        const userQuery = await db.collection('users').where('storeName', '==', item.vendor).limit(1).get();
        if (!userQuery.empty) {
          vId = userQuery.docs[0].id;
        }
      } catch (err) {
        console.warn(`[VendorNotifications] Failed to resolve storeName for ${item.vendor}:`, err);
      }
    }

    if (!vId) {
      console.warn(`[VendorNotifications] Could not resolve vendor for item: ${item.name}`);
      continue;
    }

    if (!vendorItemsMap.has(vId)) {
      vendorItemsMap.set(vId, []);
    }
    vendorItemsMap.get(vId)!.push(item);
  }

  // 2. Fetch User profiles for all resolved vendor IDs
  const results: ResolvedVendorGroup[] = [];

  for (const [vendorId, vItems] of vendorItemsMap.entries()) {
    try {
      const userDoc = await db.collection('users').doc(vendorId).get();
      if (!userDoc.exists) continue;
      const user = docToObject<any>(userDoc);
      if (!user || !user.email) continue;

      const vendorName = user.storeName || `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || 'Vendor Partner';
      const cleanItems: VendorOrderItem[] = vItems.map(i => ({
        name: i.name,
        quantity: i.quantity ?? 1,
        price: Number(i.price ?? 0),
        size: i.size,
        color: i.color,
        image: i.image,
      }));

      const subtotal = cleanItems.reduce((acc, i) => acc + i.price * i.quantity, 0);

      results.push({
        vendorId,
        vendorName,
        vendorEmail: user.email,
        items: cleanItems,
        subtotal: Number(subtotal.toFixed(2)),
      });
    } catch (err) {
      console.error(`[VendorNotifications] Error resolving user profile for vendor ${vendorId}:`, err);
    }
  }

  return results;
}

/**
 * Dispatches New Order email and in-app dashboard notification to all vendors in the order.
 */
export async function notifyVendorsNewOrder(orderOrId: string | (IOrder & { id?: string })) {
  try {
    const order = await resolveOrder(orderOrId);
    if (!order) {
      console.warn('[VendorNotifications] notifyVendorsNewOrder: Order not found');
      return;
    }

    const vendorGroups = await resolveVendorsForOrder(order);
    if (vendorGroups.length === 0) {
      console.info(`[VendorNotifications] No vendors resolved for order ${order.orderId}`);
      return;
    }

    const addr = order.shippingAddress || ({} as any);
    const shortId = order.orderId.length > 12 ? order.orderId.slice(-8) : order.orderId;

    await Promise.allSettled(
      vendorGroups.map(async group => {
        // 1. Send Rich Email Notification
        await sendVendorNewOrderEmail({
          vendorEmail: group.vendorEmail,
          vendorName: group.vendorName,
          orderId: order.orderId,
          customerName: order.customerName || addr.fullName || 'Valued Client',
          shippingCity: addr.city || 'Standard',
          shippingState: addr.state,
          shippingCountry: addr.country || 'Nigeria',
          items: group.items,
          vendorSubtotal: group.subtotal,
          paymentStatus: order.paymentStatus,
          courierName: order.courier?.name,
        });

        // 2. Dispatch In-App Notification (and Web Push)
        await Notification.create({
          recipientId: group.vendorId,
          type: 'order',
          text: `🛍️ New order received! Order #${shortId} with ${group.items.length} item(s) totaling $${group.subtotal.toFixed(2)}.`,
          link: `/dashboard/vendor?tab=orders&order=${encodeURIComponent(order.orderId)}`,
          isRead: false,
        });
      })
    );

    console.info(`[VendorNotifications] ✅ Successfully notified ${vendorGroups.length} vendor(s) for new order ${order.orderId}`);
  } catch (err) {
    console.error('[VendorNotifications] Failed to notify vendors of new order:', err);
  }
}

export interface OrderUpdateDetails {
  trackingNumber?: string;
  courierName?: string;
  notes?: string;
  oldStatus?: string;
}

/**
 * Dispatches Order Status Update email and in-app dashboard notification to all vendors in the order.
 */
export async function notifyVendorsOrderUpdate(
  orderOrId: string | (IOrder & { id?: string }),
  newStatus: string,
  details?: OrderUpdateDetails
) {
  try {
    const order = await resolveOrder(orderOrId);
    if (!order) {
      console.warn('[VendorNotifications] notifyVendorsOrderUpdate: Order not found');
      return;
    }

    const vendorGroups = await resolveVendorsForOrder(order);
    if (vendorGroups.length === 0) return;

    const shortId = order.orderId.length > 12 ? order.orderId.slice(-8) : order.orderId;
    const tracking = details?.trackingNumber || order.trackingNumber || order.courierPlusTrackingId;
    const courier = details?.courierName || order.courier?.name;

    await Promise.allSettled(
      vendorGroups.map(async group => {
        // 1. Send Rich Email Notification
        await sendVendorOrderUpdateEmail({
          vendorEmail: group.vendorEmail,
          vendorName: group.vendorName,
          orderId: order.orderId,
          oldStatus: details?.oldStatus || order.status,
          newStatus,
          trackingNumber: tracking,
          courierName: courier,
          updateNotes: details?.notes,
          items: group.items.map(i => ({ name: i.name, quantity: i.quantity })),
        });

        // 2. Dispatch In-App Notification (and Web Push)
        const statusClean = newStatus.charAt(0).toUpperCase() + newStatus.slice(1);
        await Notification.create({
          recipientId: group.vendorId,
          type: 'order',
          text: `📦 Order #${shortId} status updated to "${statusClean}"${tracking ? ` (Tracking: ${tracking})` : ''}.`,
          link: `/dashboard/vendor?tab=orders&order=${encodeURIComponent(order.orderId)}`,
          isRead: false,
        });
      })
    );

    console.info(`[VendorNotifications] ✅ Successfully notified ${vendorGroups.length} vendor(s) for update on order ${order.orderId} (${newStatus})`);
  } catch (err) {
    console.error('[VendorNotifications] Failed to notify vendors of order update:', err);
  }
}
