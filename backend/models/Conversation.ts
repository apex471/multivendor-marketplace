import mongoose, { Schema, Document } from 'mongoose';

export interface IConversation extends Document {
  participants:  mongoose.Types.ObjectId[];
  lastMessage:   string;
  lastMessageAt: Date;
  lastSenderId:  mongoose.Types.ObjectId;
  unreadCounts:  Map<string, number>;
  createdAt:     Date;
  updatedAt:     Date;
}

const conversationSchema = new Schema<IConversation>(
  {
    participants:  [{ type: Schema.Types.ObjectId, ref: 'User', required: true }],
    lastMessage:   { type: String, default: '' },
    lastMessageAt: { type: Date, default: Date.now },
    lastSenderId:  { type: Schema.Types.ObjectId, ref: 'User' },
    unreadCounts:  { type: Map, of: Number, default: {} },
  },
  { timestamps: true }
);

conversationSchema.index({ participants: 1 });
conversationSchema.index({ lastMessageAt: -1 });

export const Conversation =
  mongoose.models.Conversation || mongoose.model<IConversation>('Conversation', conversationSchema);
