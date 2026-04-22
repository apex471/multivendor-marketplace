import mongoose, { Schema, Document } from 'mongoose';

export interface IPostLike extends Document {
  postId:    mongoose.Types.ObjectId;
  userId:    mongoose.Types.ObjectId;
  createdAt: Date;
}

const postLikeSchema = new Schema<IPostLike>(
  {
    postId: { type: Schema.Types.ObjectId, ref: 'Post', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

// One like per user per post
postLikeSchema.index({ postId: 1, userId: 1 }, { unique: true });

export const PostLike =
  mongoose.models.PostLike || mongoose.model<IPostLike>('PostLike', postLikeSchema);
