import mongoose, { Schema, Document } from 'mongoose';

export interface IComment extends Document {
  postId:       mongoose.Types.ObjectId;
  authorId:     mongoose.Types.ObjectId;
  authorName:   string;
  authorAvatar?: string;
  text:         string;
  parentId?:    mongoose.Types.ObjectId;
  likes:        number;
  createdAt:    Date;
  updatedAt:    Date;
}

const commentSchema = new Schema<IComment>(
  {
    postId:       { type: Schema.Types.ObjectId, ref: 'Post',    required: true, index: true },
    authorId:     { type: Schema.Types.ObjectId, ref: 'User',    required: true },
    authorName:   { type: String, required: true, trim: true },
    authorAvatar: { type: String },
    text:         { type: String, required: true, maxlength: 1000, trim: true },
    parentId:     { type: Schema.Types.ObjectId, ref: 'Comment' },
    likes:        { type: Number, default: 0 },
  },
  { timestamps: true }
);

commentSchema.index({ postId: 1, createdAt: -1 });

export const Comment =
  mongoose.models.Comment || mongoose.model<IComment>('Comment', commentSchema);
