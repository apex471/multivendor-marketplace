import mongoose, { Schema, Document } from 'mongoose';

export interface INotification extends Document {
  recipientId: mongoose.Types.ObjectId;
  type: 'like' | 'comment' | 'follow' | 'mention' | 'order' | 'product' | 'system';
  actorId?: mongoose.Types.ObjectId;
  actorName?: string;
  actorAvatar?: string;
  text: string;
  link?: string;
  image?: string;
  isRead: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const notificationSchema = new Schema<INotification>(
  {
    recipientId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: {
      type: String,
      enum: ['like', 'comment', 'follow', 'mention', 'order', 'product', 'system'],
      required: true,
    },
    actorId:     { type: Schema.Types.ObjectId, ref: 'User' },
    actorName:   { type: String },
    actorAvatar: { type: String },
    text:        { type: String, required: true },
    link:        { type: String },
    image:       { type: String },
    isRead:      { type: Boolean, default: false },
  },
  { timestamps: true }
);

notificationSchema.index({ recipientId: 1, createdAt: -1 });

export const Notification =
  mongoose.models.Notification ||
  mongoose.model<INotification>('Notification', notificationSchema);
