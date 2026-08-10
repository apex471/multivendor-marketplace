import { NextRequest } from 'next/server';
import { verifyToken } from '@/backend/utils/jwt';
import { sendSuccess, sendError, sendServerError } from '@/backend/utils/responseAppRouter';
import { SupportTicket, TicketResponse } from '@/backend/models/SupportTicket';
import { User } from '@/backend/models/User';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const auth = request.headers.get('Authorization');
  if (!auth?.startsWith('Bearer ')) return sendError('Authentication required', 401);
  const payload = verifyToken(auth.slice(7));
  if (!payload) return sendError('Invalid or expired token', 401);

  try {
    const ticket = await SupportTicket.findById(id);
    if (!ticket) return sendError('Ticket not found', 404);

    if (payload.role === 'customer' && payload.userId !== ticket.customerId) return sendError('Unauthorized', 403);
    if ((payload.role === 'vendor' || payload.role === 'brand') && payload.userId !== ticket.vendorId) return sendError('Unauthorized', 403);

    const { message } = await request.json();
    if (!message) return sendError('Message is required', 400);

    const user = await User.findById(payload.userId);
    const authorName = user ? `${user.firstName} ${user.lastName}` : payload.email;

    const fromRole = payload.role === 'customer' ? 'customer' : (payload.role === 'admin' ? 'admin' : 'vendor');

    const newResponse: TicketResponse = {
       from: fromRole as 'customer' | 'admin' | 'vendor',
       authorName,
       message,
       timestamp: new Date()
    };

    await SupportTicket.addResponse(id, newResponse);
    if (ticket.status === 'closed' || ticket.status === 'resolved') {
      await SupportTicket.updateOne(id, { status: 'open' });
    }

    return sendSuccess({ response: newResponse }, 'Message added');
  } catch (err) {
    return sendServerError(err instanceof Error ? err.message : String(err));
  }
}
