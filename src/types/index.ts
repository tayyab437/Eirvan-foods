export interface ShahiMixPortion {
  id: string;
  weight: string; // e.g. "100g", "250g", "500g", "1kg"
  weightGrams: number;
  price: number; // PKR
}

export interface ShahiMixIngredient {
  id: string;
  name: string;
  urduName?: string;
  image: string;
  inStock: boolean;
  portions: ShahiMixPortion[];
  nutritionFacts?: {
    calories: number; // per 100g
    protein: number; // per 100g
    fat: number; // per 100g
    carbs: number; // per 100g
  };
}

export interface ShahiMixBox {
  id: string;
  name: string;
  urduName?: string;
  capacity: number; // compartments count
  basePrice: number; // PKR
  image: string;
  description: string;
}

export interface UnboxingReview {
  id: string;
  customerName: string;
  city: string;
  rating: number;
  productName: string;
  unboxingPhoto: string;
  comment: string;
  date: string;
  verifiedBuyer: boolean;
  boxStyle?: string;
}

export interface ProductVariant {
  id: string;
  weight: string; // e.g. "250g", "500g", "1kg"
  sku: string;
  price: number; // in PKR
  salePrice?: number;
  stock: number;
}

export interface CategoryItem {
  id: string;
  name: string;
  image?: string;
  description?: string;
  isSystem?: boolean;
}

export interface Product {
  id: string;
  name: string;
  urduName?: string;
  slug: string;
  category: string;
  categoryLabel: string;
  shortDescription: string;
  description: string;
  origin: string; // e.g. "Hunza, Gilgit-Baltistan", "Madinah Munawwarah", "Kashmir"
  packaging: string; // e.g. "Vacuum Sealed Luxury Tin", "Airtight Food-Grade Glass Jar"
  shelfLife: string; // e.g. "12 Months in cool dry place"
  imageUrl: string;
  galleryImages: string[];
  variants: ProductVariant[];
  featured: boolean;
  bestSeller: boolean;
  rating: number;
  reviewCount: number;
  nutritionFacts: {
    servingSize: string;
    calories: number;
    protein: string;
    healthyFats: string;
    carbs: string;
    fiber: string;
    minerals: string;
  };
  healthBenefits: string[];
  inStock: boolean;
  viewCount?: number;
}

export interface CustomBuildEntry {
  ingredientId: string;
  weightLabel?: string;
  portionId?: string;
  multiplier?: number;
}

export interface CustomBuildSpec {
  kind: 'custom-mix' | 'shahi-box';
  title?: string;
  boxId?: string;
  items: CustomBuildEntry[];
}

export interface CartItem {
  productId: string;
  productName: string;
  imageUrl: string;
  variantId: string;
  weight: string;
  price: number;
  quantity: number;
  sku: string;
  maxStock: number;
  customGiftNote?: string;
  boxStyle?: string;
  customBuild?: CustomBuildSpec;
}

export type OrderStatus =
  | 'Pending'
  | 'Confirmed'
  | 'Processing'
  | 'Packed'
  | 'Shipped'
  | 'Delivered'
  | 'Cancelled'
  | 'Returned';

export type PaymentMethod = 'COD' | 'BankTransfer' | 'Raast';
export type PaymentStatus = 'Pending' | 'Paid' | 'Failed' | 'Refunded';

export interface OrderItem {
  productId: string;
  productName: string;
  variantId?: string;
  variantWeight: string;
  sku: string;
  price: number;
  quantity: number;
  subtotal: number;
  imageUrl: string;
}

export interface Order {
  id: string;
  orderNumber: string; // e.g. "ZDS-2026-9812"
  createdAt: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  city: string;
  province: string;
  address: string;
  postalCode?: string;
  specialInstructions?: string;
  items: OrderItem[];
  subtotal: number;
  shippingFee: number;
  discountAmount: number;
  couponCode?: string;
  totalAmount: number;
  paymentMethod: PaymentMethod;
  paymentReference?: string;
  paymentStatus: PaymentStatus;
  orderStatus: OrderStatus;
  trackingNumber?: string;
  trackingToken?: string;
  courier?: string; // "TCS", "Leopard Courier", "M&P", "Trax"
  stockRestored?: boolean;
  internalNotes?: string[];
}

export interface Coupon {
  code: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  minOrderAmount: number;
  isActive: boolean;
  expiryDate?: string;
  usageCount: number;
}

export interface CustomerReview {
  id: string;
  productId: string;
  productName: string;
  customerName: string;
  city: string;
  rating: number; // 1 to 5
  date: string;
  comment: string;
  verifiedPurchase: boolean;
  status: 'approved' | 'pending' | 'rejected';
}

export interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  category: string;
  author: string;
  readTime: string;
  date: string;
  imageUrl: string;
  tags: string[];
}

export interface StoreSettings {
  storeName: string;
  tagline: string;
  contactPhone: string;
  whatsappNumber: string;
  contactEmail: string;
  freeShippingThreshold: number; // in PKR
  standardShippingRate: number; // in PKR
  codEnabled: boolean;
  bankDetails: {
    bankName: string;
    accountTitle: string;
    accountNumber: string;
    iban: string;
    raastId: string;
  };
  announcementBarMessage: string;
  announcementActive: boolean;
}
export interface WholesaleInquiry {
  id: string;
  createdAt: string;
  companyName: string;
  contactName: string;
  phone: string;
  email: string;
  inquiryType: 'Corporate Gifting' | 'Wholesale Purchase' | 'Wedding Favors' | 'Other';
  estimatedQuantity: string;
  eventDate?: string;
  message: string;
  status: 'New' | 'Contacted' | 'Quoted' | 'Converted' | 'Closed';
}
