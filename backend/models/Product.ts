import mongoose, { Schema, Document } from 'mongoose';

export interface IProduct extends Document {
  name: string;
  description: string;
  vendorId: mongoose.Types.ObjectId;
  vendorName: string;
  category: string;
  price: number;
  stock: number;
  status: 'pending' | 'active' | 'rejected' | 'suspended';
  featured: boolean;
  salesCount: number;
  rating: number;
  reviewCount: number;
  rejectionReason?: string;
  images: string[];
  createdAt: Date;
  updatedAt: Date;
}

const productSchema = new Schema<IProduct>(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    vendorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    vendorName: { type: String, required: true },
    category: { type: String, required: true, default: 'Uncategorized' },
    price: { type: Number, required: true, min: 0 },
    stock: { type: Number, default: 0, min: 0 },
    status: {
      type: String,
      enum: ['pending', 'active', 'rejected', 'suspended'],
      default: 'pending',
    },
    featured: { type: Boolean, default: false },
    salesCount: { type: Number, default: 0 },
    rating: { type: Number, default: 0, min: 0, max: 5 },
    reviewCount: { type: Number, default: 0 },
    rejectionReason: { type: String },
    images: [{ type: String }],
  },
  { timestamps: true }
);

productSchema.index({ status: 1, createdAt: -1 });
productSchema.index({ vendorId: 1 });
productSchema.index({ category: 1 });
productSchema.index({ name: 'text', description: 'text', vendorName: 'text' });

export const Product =
  mongoose.models.Product || mongoose.model<IProduct>('Product', productSchema);
