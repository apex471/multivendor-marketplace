// User & Authentication Types
export type UserRole = 'customer' | 'vendor' | 'brand' | 'admin';

export interface User {
  id: string;
  email: string;
  username: string;
  role: UserRole;
  /** Computed: firstName + lastName — kept for backward compat */
  fullName: string;
  firstName?: string;
  lastName?: string;
  avatar?: string;
  bio?: string;
  phoneNumber?: string;
  isEmailVerified?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Customer extends User {
  role: 'customer';
  shippingAddresses: Address[];
  wishlist: string[]; // Product IDs
  savedPosts: string[]; // Post IDs
  following: string[]; // Vendor/User IDs
}

export interface Vendor extends User {
  role: 'vendor';
  storeName: string;
  storeDescription: string;
  storeLogo?: string;
  storeBanner?: string;
  location: Location;
  categories: string[];
  rating: number;
  totalReviews: number;
  isVerified: boolean;
  socialLinks?: SocialLinks;
  preferredLogisticsId?: string;
  preferredLogisticsName?: string;
}

export interface BrandOwner extends User {
  role: 'brand';
  brandName: string;
  brandDescription: string;
  brandLogo?: string;
  brandBanner?: string;
  registrationNumber: string;
  website?: string;
  categories: string[];
  isVerified: boolean;
  affiliateProgram: {
    commissionRate: number;
    terms: string;
    isActive: boolean;
  };
  totalProducts: number;
  totalAffiliates: number;
  socialLinks?: SocialLinks;
  preferredLogisticsId?: string;
  preferredLogisticsName?: string;
}

// Location Types
export interface Location {
  address: string;
  city: string;
  state: string;
  country: string;
  zipCode: string;
  coordinates: {
    lat: number;
    lng: number;
  };
}

export interface SocialLinks {
  instagram?: string;
  facebook?: string;
  twitter?: string;
  website?: string;
}

// Address Types
export interface Address {
  id: string;
  label: string; // e.g., "Home", "Work"
  fullName: string;
  phoneNumber: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  country: string;
  zipCode: string;
  isDefault: boolean;
}

// Product Types
export interface Product {
  id: string;
  vendorId: string;
  vendor?: Vendor;
  name: string;
  description: string;
  category: string;
  subcategory?: string;
  price: number;
  compareAtPrice?: number;
  images: string[];
  sizes: Size[];
  colors: Color[];
  materials?: string[];
  care_instructions?: string;
  stock: number;
  sku: string;
  rating: number;
  reviewCount: number;
  tags: string[];
  isActive: boolean;
  isFeatured: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Size {
  name: string; // "XS", "S", "M", "L", "XL"
  stock: number;
  measurements?: {
    chest?: number;
    waist?: number;
    hips?: number;
    length?: number;
  };
}

export interface Color {
  name: string;
  hexCode: string;
  stock: number;
}

// Cart & Order Types
export interface CartItem {
  id: string;
  productId: string;
  product: Product;
  size: string;
  color: string;
  quantity: number;
  price: number;
}

export interface Cart {
  items: CartItem[];
  subtotal: number;
  tax: number;
  shipping: number;
  total: number;
}

export interface Order {
  id: string;
  customerId: string;
  customer?: Customer;
  items: OrderItem[];
  subtotal: number;
  tax: number;
  shipping: number;
  total: number;
  status: OrderStatus;
  shippingAddress: Address;
  paymentMethod: string;
  paymentStatus: PaymentStatus;
  trackingNumber?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrderItem {
  id: string;
  productId: string;
  product: Product;
  vendorId: string;
  vendor?: Vendor;
  size: string;
  color: string;
  quantity: number;
  price: number;
  status: OrderStatus;
}

export type OrderStatus = 
  | 'pending' 
  | 'confirmed' 
  | 'processing' 
  | 'shipped' 
  | 'delivered' 
  | 'cancelled' 
  | 'refunded';

export type PaymentStatus = 
  | 'pending' 
  | 'paid' 
  | 'failed' 
  | 'refunded';

// Social Media Types
export interface Post {
  id: string;
  authorId: string;
  author: User;
  caption: string;
  images: string[];
  hashtags: string[];
  mentions: string[];
  likes: number;
  comments: number;
  shares: number;
  isLiked?: boolean; // For current user
  isSaved?: boolean; // For current user
  taggedProducts?: string[]; // Product IDs
  createdAt: Date;
  updatedAt: Date;
}

export interface Story {
  id: string;
  authorId: string;
  author: User;
  mediaUrl: string;
  mediaType: 'image' | 'video';
  caption?: string;
  link?: string;
  taggedProducts?: string[];
  views: number;
  expiresAt: Date;
  createdAt: Date;
}

export interface Comment {
  id: string;
  postId: string;
  authorId: string;
  author: User;
  content: string;
  likes: number;
  replies?: Comment[];
  createdAt: Date;
  updatedAt: Date;
}

// Review Types
export interface Review {
  id: string;
  productId: string;
  customerId: string;
  customer: Customer;
  rating: number;
  title: string;
  content: string;
  images?: string[];
  helpful: number;
  verified: boolean; // Verified purchase
  createdAt: Date;
  updatedAt: Date;
}

// Notification Types
export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: any;
  read: boolean;
  createdAt: Date;
}

export type NotificationType = 
  | 'order_update' 
  | 'new_follower' 
  | 'post_like' 
  | 'comment' 
  | 'mention' 
  | 'product_back_in_stock'
  | 'vendor_new_product';

// Analytics Types (for Vendor Dashboard)
export interface VendorAnalytics {
  totalRevenue: number;
  totalOrders: number;
  totalProducts: number;
  totalCustomers: number;
  revenueByMonth: MonthlyRevenue[];
  topProducts: ProductSales[];
  recentOrders: Order[];
}

export interface MonthlyRevenue {
  month: string;
  revenue: number;
  orders: number;
}

export interface ProductSales {
  product: Product;
  totalSold: number;
  revenue: number;
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// Filter & Search Types
export interface ProductFilters {
  category?: string;
  subcategory?: string;
  minPrice?: number;
  maxPrice?: number;
  sizes?: string[];
  colors?: string[];
  vendors?: string[];
  rating?: number;
  tags?: string[];
  inStock?: boolean;
  sortBy?: 'price_asc' | 'price_desc' | 'newest' | 'popular' | 'rating';
}

export interface VendorFilters {
  category?: string;
  location?: string;
  rating?: number;
  verified?: boolean;
  distance?: number; // in km
  sortBy?: 'distance' | 'rating' | 'popular';
}
