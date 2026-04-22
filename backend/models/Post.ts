import mongoose, { Schema, Document } from 'mongoose';

export interface IPostProduct {
  id: string;
  name: string;
  price: number;
  image: string;
  vendorId: string;
  vendor: string;
}

export interface IPost extends Document {
  authorId: mongoose.Types.ObjectId;
  authorName: string;
  authorAvatar?: string;
  authorRole: 'vendor' | 'brand' | 'customer';
  content: string;
  images: string[];
  product?: IPostProduct;
  hashtags: string[];
  likes: number;
  comments: number;
  shares: number;
  privacy: 'public' | 'followers' | 'private';
  status: 'published' | 'draft';
  createdAt: Date;
  updatedAt: Date;
}

const postProductSchema = new Schema<IPostProduct>(
  {
    id:       { type: String, required: true },
    name:     { type: String, required: true },
    price:    { type: Number, required: true },
    image:    { type: String, required: true },
    vendorId: { type: String, required: true },
    vendor:   { type: String, required: true },
  },
  { _id: false }
);

const postSchema = new Schema<IPost>(
  {
    authorId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    authorName:   { type: String, required: true, trim: true },
    authorAvatar: { type: String, default: null },
    authorRole: {
      type: String,
      enum: ['vendor', 'brand', 'customer'],
      required: true,
    },
    content: {
      type: String,
      required: [true, 'Post content is required'],
      maxlength: [2200, 'Post content must not exceed 2200 characters'],
    },
    images: [{ type: String }],
    product: { type: postProductSchema, default: undefined },
    hashtags: [{ type: String, lowercase: true, trim: true }],
    likes:    { type: Number, default: 0 },
    comments: { type: Number, default: 0 },
    shares:   { type: Number, default: 0 },
    privacy: {
      type: String,
      enum: ['public', 'followers', 'private'],
      default: 'public',
    },
    status: {
      type: String,
      enum: ['published', 'draft'],
      default: 'published',
    },
  },
  { timestamps: true }
);

// Index to quickly fetch published public feed posts, newest first
postSchema.index({ status: 1, privacy: 1, createdAt: -1 });
// Index to fetch posts by a specific author
postSchema.index({ authorId: 1, createdAt: -1 });

export const Post =
  mongoose.models.Post || mongoose.model<IPost>('Post', postSchema);
