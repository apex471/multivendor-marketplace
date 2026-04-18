import { NextRequest } from 'next/server';
import { connectDB } from '@/backend/config/database';
import { Conversation } from '@/backend/models/Conversation';
import { verifyToken } from '@/backend/utils/jwt';
import {
  sendSuccess,
  sendError,
  sendServerError,
} from '@/backend/utils/responseAppRouter';

// GET /api/messages — list all conversations for authenticated user
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return sendError('Unauthorized', 401);
  const payload = verifyToken(authHeader.slice(7));
  if (!payload) return sendError('Invalid token', 401);

  try {
    await connectDB();

    const conversations = await Conversation.find({ participants: payload.userId })
      .sort({ lastMessageAt: -1 })
      .limit(50)
      .populate('participants', 'firstName lastName avatar username role')
      .lean() as any[];

    return sendSuccess({
      conversations: conversations.map(c => {
        const other = c.participants.find((p: any) => String(p._id) !== payload.userId);
        const unread = c.unreadCounts instanceof Map
          ? (c.unreadCounts.get(payload.userId) ?? 0)
          : (c.unreadCounts?.[payload.userId] ?? 0);
        return {
          id:            String(c._id),
          lastMessage:   c.lastMessage,
          lastMessageAt: c.lastMessageAt,
          unread:        unread,
          other: other ? {
            id:       String(other._id),
            name:     `${other.firstName ?? ''} ${other.lastName ?? ''}`.trim(),
            username: other.username ?? other.firstName ?? '',
            avatar:   other.avatar ?? null,
            role:     other.role,
          } : null,
        };
      }),
    });
  } catch (err) {
    return sendServerError(err instanceof Error ? err.message : String(err));
  }
}

// POST /api/messages — find or create a conversation with another user
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return sendError('Unauthorized', 401);
  const payload = verifyToken(authHeader.slice(7));
  if (!payload) return sendError('Invalid token', 401);

  try {
    const { recipientId, text } = await request.json();
    if (!recipientId) return sendError('recipientId is required', 400);
    if (recipientId === payload.userId) return sendError('Cannot message yourself', 400);

    await connectDB();

    // Find existing conversation between the two users
    let convo = await Conversation.findOne({
      participants: { $all: [payload.userId, recipientId], $size: 2 },
    }).lean() as any;

    if (!convo) {
      convo = await Conversation.create({
        participants:  [payload.userId, recipientId],
        lastMessage:   text ?? '',
        lastMessageAt: new Date(),
        lastSenderId:  payload.userId,
      });
    }

    return sendSuccess({ conversationId: String(convo._id) }, 'Conversation ready', 200);
  } catch (err) {
    return sendServerError(err instanceof Error ? err.message : String(err));
  }
}
