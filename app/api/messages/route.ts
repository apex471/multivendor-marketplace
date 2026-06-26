import { NextRequest } from 'next/server';
import { Conversation } from '@/backend/models/Conversation';
import { verifyToken } from '@/backend/utils/jwt';
import { db, FieldPath, docToObject } from '@/backend/config/firebase';
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
    const conversations = await Conversation.findByParticipant(payload.userId, { orderBy: 'lastMessageAt', orderDir: 'desc', limit: 50 });

    const participantIds = Array.from(new Set(conversations.flatMap(c => c.participants)));
    const userMap = new Map<string, any>();

    if (participantIds.length > 0) {
      const chunks: string[][] = [];
      for (let i = 0; i < participantIds.length; i += 30) {
        chunks.push(participantIds.slice(i, i + 30));
      }
      for (const chunk of chunks) {
        const snap = await db.collection('users')
          .where(FieldPath.documentId(), 'in', chunk)
          .get();
        snap.docs.forEach(d => {
          userMap.set(d.id, docToObject<any>(d));
        });
      }
    }

    return sendSuccess({
      conversations: conversations.map(c => {
        const otherId = c.participants.find(p => p !== payload.userId);
        const other = otherId ? userMap.get(otherId) : null;
        const unread = c.unreadCounts?.[payload.userId] ?? 0;
        return {
          id:            c.id,
          lastMessage:   c.lastMessage,
          lastMessageAt: c.lastMessageAt,
          unread:        unread,
          other: other ? {
            id:       other.id,
            name:     `${other.firstName ?? ''} ${other.lastName ?? ''}`.trim(),
            username: other.storeName || other.firstName || '',
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

    // Find existing conversation between the two users
    let convo = await Conversation.findByParticipants(payload.userId, recipientId);

    if (!convo) {
      convo = await Conversation.create({
        participants:  [payload.userId, recipientId],
        lastMessage:   text ?? '',
        lastMessageAt: new Date(),
        lastSenderId:  payload.userId,
      });
    }

    return sendSuccess({ conversationId: convo.id }, 'Conversation ready', 200);
  } catch (err) {
    return sendServerError(err instanceof Error ? err.message : String(err));
  }
}
