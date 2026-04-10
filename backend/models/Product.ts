import mongoose, { Schema, Document } from 'mongoose';

export interface IProductVariant {
  size: string;
  color: string;
  stock: number;
  sku?: string;
}

export interface IProduct extends Document {
  name: string;
  description: string;
  vendorId: mongoose.Types.ObjectId;
  vendorName: string;
  category: string;
  price: number;
  salePrice?: number;
  costPrice?: number;
  stock: number;
  sku?: string;
  tags: string[];
  variants: IProductVariant[];
  lowStockAlert: number;
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

const variantSchema = new Schema<IProductVariant>(
  {
    size:  { type: String, required: true, trim: true },
    color: { type: String, required: true, trim: true },
    stock: { type: Number, default: 0, min: 0 },
    sku:   { type: String, trim: true },
  },
  { _id: false }
);

const productSchema = new Schema<IProduct>(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    vendorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    vendorName: { type: String, required: true },
    category: { type: String, required: true, default: 'Uncategorized' },
    price: { type: Number, required: true, min: 0 },
    salePrice: { type: Number, min: 0 },
    costPrice: { type: Number, min: 0, select: false }, // hidden from public API
    stock: { type: Number, default: 0, min: 0 },
    sku: { type: String, trim: true },
    tags: [{ type: String, trim: true }],
    variants: [variantSchema],
    lowStockAlert: { type: Number, default: 5, min: 0 },
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
productSchema.index({ featured: 1, status: 1 });
productSchema.index({ salesCount: -1, status: 1 });
productSchema.index({ tags: 1, status: 1 });
productSchema.index({ name: 'text', description: 'text', vendorName: 'text' });

export const Product =
  mongoose.models.Product || mongoose.model<IProduct>('Product', productSchema);
