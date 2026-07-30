import { NextRequest } from 'next/server';
import { Conversation } from '@/backend/models/Conversation';
import { Message } from '@/backend/models/Message';
import { User } from '@/backend/models/User';
import { Notification } from '@/backend/models/Notification';
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
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return sendError('Unauthorized', 401);
  const payload = verifyToken(authHeader.slice(7));
  if (!payload) return sendError('Invalid token', 401);

  try {
    const convo = await Conversation.findById(id);
    if (!convo) return sendNotFound('Conversation not found');

    const isParticipant = convo.participants.some((p) => String(p) === payload.userId);
    if (!isParticipant) return sendError('Access denied', 403);

    const sp     = new URL(request.url).searchParams;
    const page   = Math.max(1, parseInt(sp.get('page') ?? '1'));
    const limit  = Math.min(50, parseInt(sp.get('limit') ?? '30'));
    const skip   = (page - 1) * limit;

    const allMessages = await Message.find({ conversationId: id });
    allMessages.sort((a, b) => {
      const ad = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bd = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return bd - ad; // desc
    });

    const paginated = allMessages.slice(skip, skip + limit);

    // Mark messages as read (senderId is the other participant)
    const otherId = convo.participants.find((p) => p !== payload.userId);
    if (otherId) {
      await Message.updateMany(
        { conversationId: id, senderId: otherId, read: false },
        { read: true }
      );
    }

    // Reset unread count for this user
    const unreadCounts = { ...(convo.unreadCounts || {}) };
    unreadCounts[payload.userId] = 0;
    await Conversation.updateOne(id, { unreadCounts });

    // Return in chronological order
    const list = [...paginated].reverse();

    return sendSuccess({
      messages: list.map(m => ({
        id:            m.id,
        text:          m.text,
        senderId:      m.senderId,
        read:          m.read,
        storyId:       m.storyId ?? null,
        storyMediaUrl: m.storyMediaUrl ?? null,
        createdAt:     m.createdAt,
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
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return sendError('Unauthorized', 401);
  const payload = verifyToken(authHeader.slice(7));
  if (!payload) return sendError('Invalid token', 401);

  try {
    const { text, storyId, storyMediaUrl } = await request.json();
    if (!text?.trim()) return sendError('Message text is required', 400);

    const convo = await Conversation.findById(id);
    if (!convo) return sendNotFound('Conversation not found');

    const isParticipant = convo.participants.some((p) => String(p) === payload.userId);
    if (!isParticipant) return sendError('Access denied', 403);

    const message = await Message.create({
      conversationId: id,
      senderId:       payload.userId,
      text:           text.trim(),
      read:           false,
      storyId:        storyId || undefined,
      storyMediaUrl:  storyMediaUrl || undefined,
    });

    // Increment unread counts for other participants
    const unreadCounts = { ...(convo.unreadCounts || {}) };
    convo.participants.forEach((p) => {
      if (p !== payload.userId) {
        unreadCounts[p] = (unreadCounts[p] ?? 0) + 1;
      }
    });

    await Conversation.updateOne(id, {
      lastMessage:   text.trim(),
      lastMessageAt: new Date(),
      lastSenderId:  payload.userId,
      unreadCounts,
    });

    // Fire in-app and push notification to the recipient
    try {
      const recipientId = convo.participants.find((p) => p !== payload.userId);
      if (recipientId) {
        const sender = await User.findById(payload.userId);
        const senderName = sender ? `${sender.firstName} ${sender.lastName ?? ''}`.trim() : 'Someone';
        const senderAvatar = sender?.avatar || '';

        await Notification.create({
          recipientId,
          type: 'comment',
          actorId: payload.userId,
          actorName: senderName,
          actorAvatar: senderAvatar,
          text: storyId ? `Reacted to your story: ${text.trim()}` : text.trim(),
          link: storyId ? `/stories/${storyId}` : `/messages/${id}`,
          image: storyMediaUrl || undefined,
          isRead: false
        });
      }
    } catch (notifErr) {
      console.error('Failed to trigger message notification:', notifErr);
    }

    return sendSuccess({
      message: {
        id:            message.id,
        text:          message.text,
        senderId:      payload.userId,
        read:          false,
        storyId:       message.storyId ?? null,
        storyMediaUrl: message.storyMediaUrl ?? null,
        createdAt:     message.createdAt,
      },
    }, 'Message sent', 201);
  } catch (err) {
    return sendServerError(err instanceof Error ? err.message : String(err));
  }
}
