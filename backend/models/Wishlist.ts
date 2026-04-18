import mongoose, { Schema, Document } from 'mongoose';

export interface IWishlist extends Document {
  userId:    mongoose.Types.ObjectId;
  productId: mongoose.Types.ObjectId;
  createdAt: Date;
}

const wishlistSchema = new Schema<IWishlist>(
  {
    userId:    { type: Schema.Types.ObjectId, ref: 'User',    required: true },
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  },
  { timestamps: true }
);

wishlistSchema.index({ userId: 1, productId: 1 }, { unique: true });
wishlistSchema.index({ userId: 1, createdAt: -1 });

export const Wishlist =
  mongoose.models.Wishlist || mongoose.model<IWishlist>('Wishlist', wishlistSchema);
