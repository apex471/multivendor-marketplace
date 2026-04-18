import mongoose, { Schema, Document } from 'mongoose';

export interface IFollow extends Document {
  followerId:  mongoose.Types.ObjectId;
  followingId: mongoose.Types.ObjectId;
  createdAt: Date;
}

const followSchema = new Schema<IFollow>(
  {
    followerId:  { type: Schema.Types.ObjectId, ref: 'User', required: true },
    followingId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

followSchema.index({ followerId: 1, followingId: 1 }, { unique: true });
followSchema.index({ followingId: 1 });

export const Follow =
  mongoose.models.Follow || mongoose.model<IFollow>('Follow', followSchema);
