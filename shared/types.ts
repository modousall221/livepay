/**
 * LivePay Type Definitions
 * Pure TypeScript types for Firebase Firestore
 */

// ========== USER TYPES ==========
export type UserRole = "vendor" | "admin";

export interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  businessName?: string;
  phone?: string;
  role: UserRole;
  profileImageUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type PublicUser = User; // No password in Firebase client SDK

// ========== VENDOR CONFIG ==========
export type VendorStatus = "active" | "inactive" | "suspended";
export type VendorSegment = "live_seller" | "shop" | "events" | "services" | "b2b";

export interface VendorConfig {
  id: string;
  vendorId: string;
  businessName: string;
  mobileMoneyNumber?: string;
  preferredPaymentMethod: string;
  whatsappPhoneNumberId?: string;
  whatsappAccessToken?: string;
  whatsappVerifyToken?: string;
  status: VendorStatus;
  liveMode: boolean;
  reservationDurationMinutes: number;
  autoReplyEnabled: boolean;
  welcomeMessage?: string;
  segment: VendorSegment;
  allowQuantitySelection: boolean;
  requireDeliveryAddress: boolean;
  autoReminderEnabled: boolean;
  upsellEnabled: boolean;
  minTrustScoreRequired: number;
  messageTemplates?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type InsertVendorConfig = Omit<VendorConfig, "id" | "createdAt" | "updatedAt">;

// ========== PRODUCT ==========
export interface Product {
  id: string;
  vendorId: string;
  keyword: string;
  shareCode?: string;
  name: string;
  price: number;
  originalPrice?: number;
  description?: string;
  imageUrl?: string;
  images?: string;
  category?: string;
  stock: number;
  reservedStock: number;
  active: boolean;
  featured?: boolean;
  createdAt: Date;
}

export type InsertProduct = Omit<Product, "id" | "createdAt" | "shareCode" | "reservedStock" | "vendorId">;

// ========== ORDER ==========
export type OrderStatus = "pending" | "reserved" | "paid" | "expired" | "cancelled";
export type PaymentMethod = "wave" | "orange_money" | "card" | "cash";

export interface Order {
  id: string;
  vendorId: string;
  sessionId?: string;
  productId: string;
  clientId?: string;
  clientPhone: string;
  clientName?: string;
  clientTrustScore?: number;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  status: OrderStatus;
  paymentToken: string;
  paymentUrl?: string;
  paymentMethod?: PaymentMethod;
  pspReference?: string;
  reservedAt?: Date;
  expiresAt: Date;
  paidAt?: Date;
  reminderSent: boolean;
  paymentTimeSeconds?: number;
  createdAt: Date;
}

export type InsertOrder = Omit<Order, "id" | "createdAt">;

// ========== LIVE SESSION ==========
export interface LiveSession {
  id: string;
  vendorId: string;
  title: string;
  platform: string;
  active: boolean;
  createdAt: Date;
  endedAt?: Date;
}

export type InsertLiveSession = Omit<LiveSession, "id" | "createdAt" | "endedAt" | "active" | "vendorId">;

// ========== INVOICE ==========
export type InvoiceStatus = "pending" | "paid" | "expired" | "cancelled";

export interface Invoice {
  id: string;
  vendorId: string;
  sessionId?: string;
  productId?: string;
  clientName: string;
  clientPhone: string;
  productName: string;
  amount: number;
  status: InvoiceStatus;
  token: string;
  expiresAt: Date;
  paymentMethod?: PaymentMethod;
  paymentProviderRef?: string;
  paidAt?: Date;
  createdAt: Date;
}

export type InsertInvoice = Omit<Invoice, "id" | "createdAt">;

// ========== CLIENT (CRM) ==========
export type ClientTier = "bronze" | "silver" | "gold" | "diamond";

export interface Client {
  id: string;
  vendorId: string;
  phone: string;
  name?: string;
  trustScore: number;
  totalOrders: number;
  successfulPayments: number;
  expiredReservations: number;
  totalSpent: number;
  tier: ClientTier;
  preferredPayment?: PaymentMethod;
  avgPaymentTimeSeconds?: number;
  lastOrderAt?: Date;
  firstOrderAt?: Date;
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
}

export type InsertClient = Omit<Client, "id" | "createdAt" | "updatedAt">;
