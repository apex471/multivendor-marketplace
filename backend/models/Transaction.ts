import mongoose, { Schema, Document } from 'mongoose';

export type TransactionType =
  | 'order_payment'
  | 'escrow_release'
  | 'refund'
  | 'commission_payout'
  | 'withdrawal';

export type TransactionStatus = 'pending' | 'completed' | 'failed' | 'refunded';

export interface ITransaction extends Document {
  transactionId: string;
  type: TransactionType;
  amount: number;
  currency: string;
  status: TransactionStatus;
  fromUser?: mongoose.Types.ObjectId;
  toUser?: mongoose.Types.ObjectId;
  orderId?: string;
  description: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const transactionSchema = new Schema<ITransaction>(
  {
    transactionId: {
      type: String,
      required: true,
      unique: true,
    },
    type: {
      type: String,
      enum: ['order_payment', 'escrow_release', 'refund', 'commission_payout', 'withdrawal'],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      default: 'USD',
    },
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed', 'refunded'],
      default: 'pending',
    },
    fromUser: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    toUser: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    orderId: {
      type: String,
    },
    description: {
      type: String,
      required: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
    },
  },
  { timestamps: true }
);

// Index for fast lookups
transactionSchema.index({ status: 1, createdAt: -1 });
transactionSchema.index({ type: 1, createdAt: -1 });
transactionSchema.index({ fromUser: 1 });
transactionSchema.index({ toUser: 1 });

export const Transaction =
  mongoose.models.Transaction ||
  mongoose.model<ITransaction>('Transaction', transactionSchema);
