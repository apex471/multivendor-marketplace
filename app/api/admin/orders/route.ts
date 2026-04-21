import { NextRequest } from 'next/server';
import { connectDB } from '@/backend/config/database';
import { Order } from '@/backend/models/Order';
import { verifyAdminAuth } from '@/backend/utils/adminAuth';
import { sendSuccess, sendError, sendServerError } from '@/backend/utils/responseAppRouter';

// GET /api/admin/orders — all orders with pagination and filters
export async function GET(request: NextRequest) {
  const { error } = await verifyAdminAuth(request);
  if (error) return sendError(error, 401);

  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const page   = Math.max(1, parseInt(searchParams.get('page')  || '1'));
    const limit  = Math.min(100, parseInt(searchParams.get('limit') || '20'));
    const status = searchParams.get('status') || 'all';
    const search = searchParams.get('search') || '';

    const filter: Record<string, unknown> = {};
    if (status !== 'all') filter.status = status;
    if (search) {
      filter.$or = [
        { orderId:       { $regex: search, $options: 'i' } },
        { customerName:  { $regex: search, $options: 'i' } },
        { customerEmail: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (page - 1) * limit;
    const [orders, total] = await Promise.all([
      Order.find(filter)
        .sort({ orderDate: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Order.countDocuments(filter),
    ]);

    const mapped = orders.map(o => ({
      id:              o.orderId ?? String(o._id),
      customerName:    o.customerName,
      customerEmail:   o.customerEmail,
      vendorName:      (o.items?.[0] as { vendor?: string } | undefined)?.vendor ?? '—',
      products:        (o.items ?? []).map((i: { name: string }) => i.name),
      total:           o.total,
      status:          o.status,
      paymentStatus:   o.paymentStatus,
      orderDate:       o.orderDate,
      trackingNumber:  o.trackingNumber,
      shippingAddress: [
        (o.shippingAddress as { addressLine1?: string } | undefined)?.addressLine1,
        (o.shippingAddress as { city?: string } | undefined)?.city,
        (o.shippingAddress as { state?: string } | undefined)?.state,
      ].filter(Boolean).join(', '),
      courier:            o.courier,
      assignedDriverName: o.assignedDriverName,
      acceptedAt:         o.acceptedAt,
      pickedUpAt:         o.pickedUpAt,
      deliveredAt:        o.deliveredAt,
    }));

    return sendSuccess({
      orders: mapped,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
    });
  } catch (err) {
    return sendServerError(err instanceof Error ? err.message : String(err));
  }
}

// PATCH /api/admin/orders — update order status
export async function PATCH(request: NextRequest) {
  const { error } = await verifyAdminAuth(request);
  if (error) return sendError(error, 401);

  try {
    await connectDB();
    const { orderId, status, paymentStatus } = await request.json();
    if (!orderId) return sendError('orderId is required', 400);

    const update: Record<string, unknown> = {};
    if (status) update.status = status;
    if (paymentStatus) update.paymentStatus = paymentStatus;

    const order = await Order.findOneAndUpdate(
      { orderId },
      { $set: update },
      { new: true },
    );
    if (!order) return sendError('Order not found', 404);

    return sendSuccess({ order });
  } catch (err) {
    return sendServerError(err instanceof Error ? err.message : String(err));
  }
}
