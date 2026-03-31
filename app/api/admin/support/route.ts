import { NextRequest } from 'next/server';
import { connectDB } from '@/backend/config/database';
import { SupportTicket } from '@/backend/models/SupportTicket';
import { verifyAdminAuth } from '@/backend/utils/adminAuth';
import { sendSuccess, sendError, sendServerError } from '@/backend/utils/responseAppRouter';

// GET /api/admin/support
export async function GET(request: NextRequest) {
  const { error } = await verifyAdminAuth(request);
  if (error) return sendError(error, 401);

  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'open';
    const priority = searchParams.get('priority');
    const search = searchParams.get('search');
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(50, parseInt(searchParams.get('limit') || '20'));

    const filter: Record<string, any> = {};
    if (status !== 'all') filter.status = status;
    if (priority && priority !== 'all') filter.priority = priority;
    if (search) {
      filter.$or = [
        { ticketNumber: { $regex: search, $options: 'i' } },
        { subject: { $regex: search, $options: 'i' } },
        { customerName: { $regex: search, $options: 'i' } },
        { customerEmail: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (page - 1) * limit;

    const [tickets, total, openCount, inProgressCount, resolvedCount, closedCount] =
      await Promise.all([
        SupportTicket.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
        SupportTicket.countDocuments(filter),
        SupportTicket.countDocuments({ status: 'open' }),
        SupportTicket.countDocuments({ status: 'in-progress' }),
        SupportTicket.countDocuments({ status: 'resolved' }),
        SupportTicket.countDocuments({ status: 'closed' }),
      ]);

    return sendSuccess({
      tickets,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      counts: { open: openCount, inProgress: inProgressCount, resolved: resolvedCount, closed: closedCount },
    });
  } catch (err) {
    console.error('Admin support GET error:', err);
    return sendServerError('Failed to load tickets');
  }
}

// PATCH /api/admin/support — update ticket status and/or add reply
export async function PATCH(request: NextRequest) {
  const { error: authError } = await verifyAdminAuth(request);
  if (authError) return sendError(authError, 401);

  try {
    await connectDB();
    const body = await request.json().catch(() => ({}));
    const { ticketId, status, reply } = body;

    if (!ticketId) return sendError('ticketId is required', 400);

    const ticket = await SupportTicket.findById(ticketId);
    if (!ticket) return sendError('Ticket not found', 404);

    if (status && ['open', 'in-progress', 'resolved', 'closed'].includes(status)) {
      ticket.status = status;
    }
    if (reply?.trim()) {
      ticket.responses.push({
        from: 'admin',
        authorName: 'Admin Support',
        message: reply.trim(),
        timestamp: new Date(),
      });
    }

    await ticket.save();

    return sendSuccess(
      { ticketId: ticket._id, status: ticket.status },
      'Ticket updated successfully'
    );
  } catch (err) {
    console.error('Admin support PATCH error:', err);
    return sendServerError('Failed to update ticket');
  }
}
