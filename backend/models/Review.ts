import mongoose, { Schema, Document } from 'mongoose';

export interface IReview extends Document {
  productId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  userName: string;
  userAvatar?: string;
  rating: number;
  title?: string;
  comment: string;
  helpful: number;
  verified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const reviewSchema = new Schema<IReview>(
  {
    productId:  { type: Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
    userId:     { type: Schema.Types.ObjectId, ref: 'User',    required: true },
    userName:   { type: String, required: true },
    userAvatar: { type: String },
    rating:     { type: Number, required: true, min: 1, max: 5 },
    title:      { type: String, maxlength: 120 },
    comment:    { type: String, required: true, maxlength: 2000 },
    helpful:    { type: Number, default: 0 },
    verified:   { type: Boolean, default: false },
  },
  { timestamps: true }
);

// One review per user per product
reviewSchema.index({ productId: 1, userId: 1 }, { unique: true });

export const Review =
  mongoose.models.Review || mongoose.model<IReview>('Review', reviewSchema);
