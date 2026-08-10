import { NextRequest } from 'next/server';
import { verifyToken } from '@/backend/utils/jwt';
import { sendSuccess, sendError, sendServerError } from '@/backend/utils/responseAppRouter';
import { SupportTicket } from '@/backend/models/SupportTicket';

export async function GET(
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

    if (payload.role === 'customer' && payload.userId !== ticket.customerId) {
       return sendError('Unauthorized', 403);
    }
    if ((payload.role === 'vendor' || payload.role === 'brand') && payload.userId !== ticket.vendorId) {
       return sendError('Unauthorized', 403);
    }

    return sendSuccess({ ticket });
  } catch (err) {
    return sendServerError(err instanceof Error ? err.message : String(err));
  }
}

export async function PATCH(
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

    const { status } = await request.json();
    if (status && !['open', 'in-progress', 'resolved', 'closed'].includes(status)) {
       return sendError('Invalid status', 400);
    }

    if (status) {
       await SupportTicket.updateOne(id, { status });
    }

    return sendSuccess({}, 'Ticket updated');
  } catch (err) {
    return sendServerError(err instanceof Error ? err.message : String(err));
  }
}
