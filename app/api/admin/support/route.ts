import { NextRequest } from 'next/server';
import { SupportTicket } from '@/backend/models/SupportTicket';
import { verifyAdminAuth } from '@/backend/utils/adminAuth';
import { sendSuccess, sendError, sendServerError } from '@/backend/utils/responseAppRouter';

// GET /api/admin/support
export async function GET(request: NextRequest) {
  const { error } = await verifyAdminAuth(request);
  if (error) return sendError(error, 401);

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'open';
    const priority = searchParams.get('priority');
    const search = searchParams.get('search');
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(50, parseInt(searchParams.get('limit') || '20'));
    const skip = (page - 1) * limit;

    const allTicketsTotal = await SupportTicket.find({});

    let filtered = [...allTicketsTotal];
    if (status !== 'all') {
      filtered = filtered.filter(t => t.status === status);
    }
    if (priority && priority !== 'all') {
      filtered = filtered.filter(t => t.priority === priority);
    }
    if (search) {
      const lower = search.toLowerCase();
      filtered = filtered.filter(t =>
        t.ticketNumber.toLowerCase().includes(lower) ||
        t.subject.toLowerCase().includes(lower) ||
        t.customerName.toLowerCase().includes(lower) ||
        t.customerEmail.toLowerCase().includes(lower)
      );
    }

    filtered.sort((a, b) => (b.createdAt ? new Date(b.createdAt).getTime() : 0) - (a.createdAt ? new Date(a.createdAt).getTime() : 0));

    const total = filtered.length;
    const paginated = filtered.slice(skip, skip + limit);

    const openCount = allTicketsTotal.filter(t => t.status === 'open').length;
    const inProgressCount = allTicketsTotal.filter(t => t.status === 'in-progress').length;
    const resolvedCount = allTicketsTotal.filter(t => t.status === 'resolved').length;
    const closedCount = allTicketsTotal.filter(t => t.status === 'closed').length;

    return sendSuccess({
      tickets: paginated,
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
    const body = await request.json().catch(() => ({}));
    const { ticketId, status, reply } = body;

    if (!ticketId) return sendError('ticketId is required', 400);

    const ticket = await SupportTicket.findById(ticketId);
    if (!ticket) return sendError('Ticket not found', 404);

    const updates: Partial<any> = {};
    if (status && ['open', 'in-progress', 'resolved', 'closed'].includes(status)) {
      updates.status = status;
    }

    if (reply?.trim()) {
      const newResponse = {
        from: 'admin' as const,
        authorName: 'Admin Support',
        message: reply.trim(),
        timestamp: new Date(),
      };
      await SupportTicket.addResponse(ticketId, newResponse);
    }

    if (Object.keys(updates).length > 0) {
      await SupportTicket.updateOne(ticketId, updates);
    }

    return sendSuccess(
      { ticketId, status: updates.status ?? ticket.status },
      'Ticket updated successfully'
    );
  } catch (err) {
    console.error('Admin support PATCH error:', err);
    return sendServerError('Failed to update ticket');
  }
}
