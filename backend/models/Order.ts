import mongoose, { Schema, Document } from 'mongoose';

// ─── Sub-document interfaces ─────────────────────────────────────────────────

export interface IOrderItem {
  productId?: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
  vendor?: string;
  size?: string;
  color?: string;
}

export interface IShippingAddress {
  fullName: string;
  phone?: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

export interface IOrderCourier {
  id: string;
  name: string;
  icon?: string;
  price: number;
  eta?: string;
  carrier?: string;
  tracking?: string;
}

// ─── Main document interface ─────────────────────────────────────────────────

export type OrderStatus = 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded';

export interface IOrder extends Document {
  orderId: string;
  customerId?: mongoose.Types.ObjectId;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  items: IOrderItem[];
  shippingAddress: IShippingAddress;
  paymentMethod: {
    type: string;
    cardLast4?: string;
    cardHolder?: string;
  };
  courier: IOrderCourier;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  subtotal: number;
  shippingCost: number;
  tax: number;
  discount: number;
  total: number;
  couponCode?: string;
  trackingNumber?: string;
  // Logistics driver fields (mirrored from in-memory store)
  assignedDriverId?: string;
  assignedDriverName?: string;
  acceptedAt?: Date;
  pickedUpAt?: Date;
  deliveredAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Sub-document schemas ─────────────────────────────────────────────────────

const orderItemSchema = new Schema<IOrderItem>(
  {
    productId: { type: String },
    name:      { type: String, required: true },
    price:     { type: Number, required: true, min: 0 },
    quantity:  { type: Number, required: true, min: 1 },
    image:     { type: String, default: '' },
    vendor:    { type: String, default: '' },
    size:      { type: String },
    color:     { type: String },
  },
  { _id: false }
);

const shippingAddressSchema = new Schema<IShippingAddress>(
  {
    fullName:     { type: String, required: true },
    phone:        { type: String },
    addressLine1: { type: String, required: true },
    addressLine2: { type: String },
    city:         { type: String, required: true },
    state:        { type: String, required: true },
    zipCode:      { type: String, required: true },
    country:      { type: String, default: 'United States' },
  },
  { _id: false }
);

// ─── Main schema ──────────────────────────────────────────────────────────────

const orderSchema = new Schema<IOrder>(
  {
    orderId: {
      type:     String,
      required: true,
      unique:   true,
      index:    true,
    },
    customerId: {
      type: Schema.Types.ObjectId,
      ref:  'User',
    },
    customerName:  { type: String, required: true },
    customerEmail: { type: String, required: true, lowercase: true, trim: true },
    customerPhone: { type: String },
    items:         { type: [orderItemSchema], required: true },
    shippingAddress: { type: shippingAddressSchema, required: true },
    paymentMethod: {
      type:      { type: String, default: 'mock' },
      cardLast4: { type: String },
      cardHolder: { type: String },
    },
    courier: {
      id:       { type: String, required: true },
      name:     { type: String, required: true },
      icon:     { type: String, default: '📦' },
      price:    { type: Number, default: 0 },
      eta:      { type: String },
      carrier:  { type: String },
      tracking: { type: String },
    },
    status: {
      type:    String,
      enum:    ['pending', 'processing', 'shipped', 'delivered', 'cancelled'],
      default: 'pending',
    },
    paymentStatus: {
      type:    String,
      enum:    ['pending', 'paid', 'failed', 'refunded'],
      default: 'paid',
    },
    subtotal:     { type: Number, required: true, min: 0 },
    shippingCost: { type: Number, default: 0, min: 0 },
    tax:          { type: Number, default: 0, min: 0 },
    discount:     { type: Number, default: 0, min: 0 },
    total:        { type: Number, required: true, min: 0 },
    couponCode:   { type: String },
    trackingNumber: { type: String },
    assignedDriverId:   { type: String },
    assignedDriverName: { type: String },
    acceptedAt:   { type: Date },
    pickedUpAt:   { type: Date },
    deliveredAt:  { type: Date },
  },
  { timestamps: true }
);

// Indexes for common query patterns
orderSchema.index({ customerEmail: 1, createdAt: -1 });
orderSchema.index({ customerId: 1, createdAt: -1 });
orderSchema.index({ status: 1, createdAt: -1 });

export const Order =
  mongoose.models.Order ?? mongoose.model<IOrder>('Order', orderSchema);
