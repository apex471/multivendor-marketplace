import { NextRequest } from 'next/server';
import { verifyToken } from '@/backend/utils/jwt';
import { sendSuccess, sendError, sendServerError } from '@/backend/utils/responseAppRouter';
import { SupportTicket } from '@/backend/models/SupportTicket';
import { Order } from '@/backend/models/Order';
import { User } from '@/backend/models/User';
import { db } from '@/backend/config/firebase';

export async function GET(request: NextRequest) {
  const auth = request.headers.get('Authorization');
  if (!auth?.startsWith('Bearer ')) return sendError('Authentication required', 401);
  const payload = verifyToken(auth.slice(7));
  if (!payload) return sendError('Invalid or expired token', 401);

  try {
    let tickets: any[] = [];
    if (payload.role === 'customer') {
      tickets = await SupportTicket.find({ customerId: payload.userId });
    } else if (payload.role === 'vendor' || payload.role === 'brand') {
      tickets = await SupportTicket.find({ vendorId: payload.userId });
    } else if (payload.role === 'admin') {
      tickets = await SupportTicket.find({});
    }
    
    // Sort locally by createdAt desc
    tickets.sort((a, b) => {
       const da = a.createdAt ? new Date(a.createdAt).getTime() : 0;
       const db = b.createdAt ? new Date(b.createdAt).getTime() : 0;
       return db - da;
    });

    return sendSuccess({ tickets });
  } catch (err) {
    return sendServerError(err instanceof Error ? err.message : String(err));
  }
}

export async function POST(request: NextRequest) {
  const auth = request.headers.get('Authorization');
  if (!auth?.startsWith('Bearer ')) return sendError('Authentication required', 401);
  const payload = verifyToken(auth.slice(7));
  if (!payload) return sendError('Invalid or expired token', 401);

  try {
    const { orderId, subject, message, category } = await request.json();
    if (!orderId || !subject || !message) {
      return sendError('orderId, subject, and message are required', 400);
    }

    const order = await Order.findByOrderId(orderId);
    if (!order) return sendError('Order not found', 404);

    let customerId = order.customerId;
    let vendorId: string | null = null;
    
    // Find vendorId from order items
    for (const item of order.items ?? []) {
       let resolvedVendorId: string | null = (item as any).vendorId || null;
       if (!resolvedVendorId) {
         const vendorName = (item as any).vendor ?? null;
         if (vendorName) {
           const byName = await db.collection('users').where('storeName', '==', vendorName).limit(1).get();
           if (!byName.empty) resolvedVendorId = byName.docs[0].id;
         }
       }
       if (resolvedVendorId) {
         vendorId = resolvedVendorId;
         break;
       }
    }

    // Authorization check
    if (payload.role === 'customer' && payload.userId !== customerId) {
       return sendError('Unauthorized to open a ticket for this order', 403);
    }
    if ((payload.role === 'vendor' || payload.role === 'brand') && payload.userId !== vendorId) {
       return sendError('Unauthorized to open a ticket for this order', 403);
    }

    const user = await User.findById(payload.userId);
    const authorName = user ? `${user.firstName} ${user.lastName}` : payload.email;

    const ticketNumber = `TKT-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    const newTicket = await SupportTicket.create({
      ticketNumber,
      orderId,
      customerId: customerId || '',
      customerName: order.customerName || '',
      customerEmail: order.customerEmail || '',
      vendorId: vendorId || '',
      subject,
      message,
      category: category || 'order',
      priority: 'medium',
      status: 'open',
      responses: [{
         from: payload.role === 'customer' ? 'customer' : 'vendor',
         authorName,
         message,
         timestamp: new Date()
      }]
    });

    return sendSuccess({ ticket: newTicket }, 'Ticket created successfully', 201);
  } catch (err) {
    return sendServerError(err instanceof Error ? err.message : String(err));
  }
}
