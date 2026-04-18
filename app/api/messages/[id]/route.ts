import { NextRequest } from 'next/server';
import { connectDB } from '@/backend/config/database';
import { Conversation } from '@/backend/models/Conversation';
import { Message } from '@/backend/models/Message';
import { verifyToken } from '@/backend/utils/jwt';
import {
  sendSuccess,
  sendError,
  sendNotFound,
  sendServerError,
} from '@/backend/utils/responseAppRouter';

// GET /api/messages/[id] — fetch messages in a conversation
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return sendError('Unauthorized', 401);
  const payload = verifyToken(authHeader.slice(7));
  if (!payload) return sendError('Invalid token', 401);

  try {
    await connectDB();
    const convo = await Conversation.findById(params.id).lean() as any;
    if (!convo) return sendNotFound('Conversation not found');

    const isParticipant = convo.participants.some((p: any) => String(p) === payload.userId);
    if (!isParticipant) return sendError('Access denied', 403);

    const sp     = new URL(request.url).searchParams;
    const page   = Math.max(1, parseInt(sp.get('page') ?? '1'));
    const limit  = Math.min(50, parseInt(sp.get('limit') ?? '30'));
    const skip   = (page - 1) * limit;

    const messages = await Message.find({ conversationId: params.id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean() as any[];

    // Mark messages as read
    await Message.updateMany(
      { conversationId: params.id, senderId: { $ne: payload.userId }, read: false },
      { $set: { read: true } }
    );

    // Reset unread count for this user
    await Conversation.updateOne(
      { _id: params.id },
      { $set: { [`unreadCounts.${payload.userId}`]: 0 } }
    );

    return sendSuccess({
      messages: messages.reverse().map(m => ({
        id:        String(m._id),
        text:      m.text,
        senderId:  String(m.senderId),
        read:      m.read,
        createdAt: m.createdAt,
      })),
      page,
    });
  } catch (err) {
    return sendServerError(err instanceof Error ? err.message : String(err));
  }
}

// POST /api/messages/[id] — send a message in a conversation
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return sendError('Unauthorized', 401);
  const payload = verifyToken(authHeader.slice(7));
  if (!payload) return sendError('Invalid token', 401);

  try {
    const { text } = await request.json();
    if (!text?.trim()) return sendError('Message text is required', 400);

    await connectDB();
    const convo = await Conversation.findById(params.id).lean() as any;
    if (!convo) return sendNotFound('Conversation not found');

    const isParticipant = convo.participants.some((p: any) => String(p) === payload.userId);
    if (!isParticipant) return sendError('Access denied', 403);

    const message = await Message.create({
      conversationId: params.id,
      senderId:       payload.userId,
      text:           text.trim(),
    });

    // Update conversation's last message + increment unread counts for others
    const unreadUpdates: Record<string, any> = {};
    convo.participants.forEach((p: any) => {
      if (String(p) !== payload.userId) {
        unreadUpdates[`unreadCounts.${String(p)}`] = { $add: [{ $ifNull: [`$unreadCounts.${String(p)}`, 0] }, 1] };
      }
    });

    await Conversation.updateOne(
      { _id: params.id },
      {
        lastMessage:   text.trim(),
        lastMessageAt: new Date(),
        lastSenderId:  payload.userId,
        $inc: Object.fromEntries(
          convo.participants
            .filter((p: any) => String(p) !== payload.userId)
            .map((p: any) => [`unreadCounts.${String(p)}`, 1])
        ),
      }
    );

    return sendSuccess({
      message: {
        id:        String(message._id),
        text:      message.text,
        senderId:  payload.userId,
        read:      false,
        createdAt: message.createdAt,
      },
    }, 'Message sent', 201);
  } catch (err) {
    return sendServerError(err instanceof Error ? err.message : String(err));
  }
}
