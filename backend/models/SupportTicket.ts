import mongoose, { Schema, Document } from 'mongoose';

export interface TicketResponse {
  from: 'customer' | 'admin';
  authorName: string;
  message: string;
  timestamp: Date;
}

export interface ISupportTicket extends Document {
  ticketNumber: string;
  customerId: mongoose.Types.ObjectId;
  customerName: string;
  customerEmail: string;
  subject: string;
  message: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'open' | 'in-progress' | 'resolved' | 'closed';
  category: 'payment' | 'order' | 'product' | 'account' | 'other';
  responses: TicketResponse[];
  createdAt: Date;
  updatedAt: Date;
}

const responseSchema = new Schema<TicketResponse>(
  {
    from: { type: String, enum: ['customer', 'admin'], required: true },
    authorName: { type: String, required: true },
    message: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
  },
  { _id: false }
);

const supportTicketSchema = new Schema<ISupportTicket>(
  {
    ticketNumber: { type: String, required: true, unique: true },
    customerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    customerName: { type: String, required: true },
    customerEmail: { type: String, required: true },
    subject: { type: String, required: true },
    message: { type: String, required: true },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium',
    },
    status: {
      type: String,
      enum: ['open', 'in-progress', 'resolved', 'closed'],
      default: 'open',
    },
    category: {
      type: String,
      enum: ['payment', 'order', 'product', 'account', 'other'],
      default: 'other',
    },
    responses: [responseSchema],
  },
  { timestamps: true }
);

supportTicketSchema.index({ status: 1, createdAt: -1 });
supportTicketSchema.index({ priority: 1 });
supportTicketSchema.index({ customerId: 1 });
supportTicketSchema.index({ ticketNumber: 1 }, { unique: true });

export const SupportTicket =
  mongoose.models.SupportTicket ||
  mongoose.model<ISupportTicket>('SupportTicket', supportTicketSchema);
