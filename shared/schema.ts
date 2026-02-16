import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, boolean, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export * from "./models/auth";
import { users } from "./models/auth";

export const invoiceStatusEnum = pgEnum("invoice_status", ["pending", "paid", "expired", "cancelled"]);
export const paymentMethodEnum = pgEnum("payment_method", ["wave", "orange_money", "card", "cash"]);
export const orderStatusEnum = pgEnum("order_status", ["pending", "reserved", "paid", "expired", "cancelled"]);
export const vendorStatusEnum = pgEnum("vendor_status", ["active", "inactive", "suspended"]);
export const clientTierEnum = pgEnum("client_tier", ["bronze", "silver", "gold", "diamond"]);
export const vendorSegmentEnum = pgEnum("vendor_segment", ["live_seller", "shop", "events", "services", "b2b"]);

// Configuration vendeur pour WhatsApp Business API
export const vendorConfigs = pgTable("vendor_configs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  vendorId: varchar("vendor_id").notNull().references(() => users.id).unique(),
  businessName: text("business_name").notNull(),
  // Numéro Mobile Money pour recevoir les paiements (Wave, Orange Money)
  mobileMoneyNumber: varchar("mobile_money_number", { length: 20 }),
  preferredPaymentMethod: text("preferred_payment_method").default("wave"), // wave, orange_money
  whatsappPhoneNumberId: text("whatsapp_phone_number_id"), // Meta Phone Number ID
  whatsappAccessToken: text("whatsapp_access_token"), // Encrypted
  whatsappVerifyToken: text("whatsapp_verify_token"),
  status: vendorStatusEnum("status").default("active").notNull(),
  liveMode: boolean("live_mode").default(false).notNull(), // Mode Live ON/OFF
  reservationDurationMinutes: integer("reservation_duration_minutes").default(10).notNull(),
  autoReplyEnabled: boolean("auto_reply_enabled").default(true).notNull(),
  welcomeMessage: text("welcome_message"),
  // Multi-segment support (V2)
  segment: vendorSegmentEnum("segment").default("live_seller").notNull(),
  allowQuantitySelection: boolean("allow_quantity_selection").default(false),
  requireDeliveryAddress: boolean("require_delivery_address").default(false),
  autoReminderEnabled: boolean("auto_reminder_enabled").default(true),
  upsellEnabled: boolean("upsell_enabled").default(false),
  minTrustScoreRequired: integer("min_trust_score_required").default(0),
  // Custom message templates (JSON)
  messageTemplates: text("message_templates"), // JSON string for custom templates
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Clients avec scoring (V2 - Anti-fraude & fidélité)
export const clients = pgTable("clients", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  vendorId: varchar("vendor_id").notNull().references(() => users.id),
  phone: varchar("phone").notNull(),
  name: varchar("name"),
  // Scoring
  trustScore: integer("trust_score").default(50).notNull(), // 0-100
  totalOrders: integer("total_orders").default(0).notNull(),
  successfulPayments: integer("successful_payments").default(0).notNull(),
  expiredReservations: integer("expired_reservations").default(0).notNull(),
  totalSpent: integer("total_spent").default(0).notNull(),
  // Classification
  tier: clientTierEnum("tier").default("bronze").notNull(),
  preferredPayment: paymentMethodEnum("preferred_payment"),
  // Comportement
  avgPaymentTimeSeconds: integer("avg_payment_time_seconds"),
  lastOrderAt: timestamp("last_order_at"),
  firstOrderAt: timestamp("first_order_at"),
  // Metadata
  tags: text("tags").array(), // ['vip', 'payeur_rapide', 'risque']
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const products = pgTable("products", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  vendorId: varchar("vendor_id").notNull().references(() => users.id),
  keyword: text("keyword").notNull(), // Mot-clé pour chatbot (ROBE1, CHAUSSURE2, etc.)
  shareCode: varchar("share_code", { length: 8 }).unique(), // Code court pour partage (ex: A1B2C3)
  name: text("name").notNull(),
  price: integer("price").notNull(),
  originalPrice: integer("original_price"), // Prix barré (promotion)
  description: text("description"),
  imageUrl: text("image_url"), // Image principale
  images: text("images"), // JSON array d'URLs d'images supplémentaires
  category: varchar("category", { length: 50 }), // Catégorie du produit
  stock: integer("stock").default(0).notNull(), // Stock disponible
  reservedStock: integer("reserved_stock").default(0).notNull(), // Stock réservé (pending orders)
  active: boolean("active").default(true).notNull(),
  featured: boolean("featured").default(false), // Produit mis en avant
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const liveSessions = pgTable("live_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  vendorId: varchar("vendor_id").notNull().references(() => users.id),
  title: text("title").notNull(),
  platform: text("platform").notNull(),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  endedAt: timestamp("ended_at"),
});

// Table orders simplifiée pour le chatbot
export const orders = pgTable("orders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  vendorId: varchar("vendor_id").notNull().references(() => users.id),
  sessionId: varchar("session_id").references(() => liveSessions.id),
  productId: varchar("product_id").notNull().references(() => products.id),
  clientId: varchar("client_id").references(() => clients.id), // V2: Link to client scoring
  clientPhone: text("client_phone").notNull(),
  clientName: text("client_name"),
  clientTrustScore: integer("client_trust_score"), // Score at order time
  productName: text("product_name").notNull(),
  quantity: integer("quantity").default(1).notNull(),
  unitPrice: integer("unit_price").notNull(),
  totalAmount: integer("total_amount").notNull(),
  status: orderStatusEnum("status").default("pending").notNull(),
  paymentToken: text("payment_token").notNull().unique(),
  paymentUrl: text("payment_url"),
  paymentMethod: paymentMethodEnum("payment_method"),
  pspReference: text("psp_reference"),
  reservedAt: timestamp("reserved_at"), // Quand le stock a été réservé
  expiresAt: timestamp("expires_at").notNull(), // Expiration du lien de paiement
  paidAt: timestamp("paid_at"),
  reminderSent: boolean("reminder_sent").default(false), // V2: Auto-reminder
  paymentTimeSeconds: integer("payment_time_seconds"), // V2: Time to pay (for scoring)
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const invoices = pgTable("invoices", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  vendorId: varchar("vendor_id").notNull().references(() => users.id),
  sessionId: varchar("session_id").references(() => liveSessions.id),
  productId: varchar("product_id").references(() => products.id),
  clientName: text("client_name").notNull(),
  clientPhone: text("client_phone").notNull(),
  productName: text("product_name").notNull(),
  amount: integer("amount").notNull(),
  status: invoiceStatusEnum("status").default("pending").notNull(),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  paymentMethod: paymentMethodEnum("payment_method"),
  paymentProviderRef: text("payment_provider_ref"),
  bictorysChargeId: text("bictorys_charge_id"),
  bictorysCheckoutUrl: text("bictorys_checkout_url"),
  paidAt: timestamp("paid_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Relations
export const vendorConfigsRelations = relations(vendorConfigs, ({ one }) => ({
  vendor: one(users, { fields: [vendorConfigs.vendorId], references: [users.id] }),
}));

export const clientsRelations = relations(clients, ({ one, many }) => ({
  vendor: one(users, { fields: [clients.vendorId], references: [users.id] }),
  orders: many(orders),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  vendor: one(users, { fields: [products.vendorId], references: [users.id] }),
  orders: many(orders),
}));

export const liveSessionsRelations = relations(liveSessions, ({ one, many }) => ({
  vendor: one(users, { fields: [liveSessions.vendorId], references: [users.id] }),
  invoices: many(invoices),
  orders: many(orders),
}));

export const ordersRelations = relations(orders, ({ one }) => ({
  vendor: one(users, { fields: [orders.vendorId], references: [users.id] }),
  session: one(liveSessions, { fields: [orders.sessionId], references: [liveSessions.id] }),
  product: one(products, { fields: [orders.productId], references: [products.id] }),
  client: one(clients, { fields: [orders.clientId], references: [clients.id] }),
}));

export const invoicesRelations = relations(invoices, ({ one }) => ({
  vendor: one(users, { fields: [invoices.vendorId], references: [users.id] }),
  session: one(liveSessions, { fields: [invoices.sessionId], references: [liveSessions.id] }),
  product: one(products, { fields: [invoices.productId], references: [products.id] }),
}));

// Schemas d'insertion
export const insertVendorConfigSchema = createInsertSchema(vendorConfigs).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertProductSchema = createInsertSchema(products).omit({
  id: true,
  vendorId: true,
  reservedStock: true,
  createdAt: true,
});

export const insertLiveSessionSchema = createInsertSchema(liveSessions).omit({
  id: true,
  vendorId: true,
  createdAt: true,
  endedAt: true,
  active: true,
});

export const insertOrderSchema = createInsertSchema(orders).omit({
  id: true,
  vendorId: true,
  paymentToken: true,
  status: true,
  pspReference: true,
  reservedAt: true,
  paidAt: true,
  reminderSent: true,
  paymentTimeSeconds: true,
  createdAt: true,
});

export const insertClientSchema = createInsertSchema(clients).omit({
  id: true,
  trustScore: true,
  totalOrders: true,
  successfulPayments: true,
  expiredReservations: true,
  totalSpent: true,
  tier: true,
  avgPaymentTimeSeconds: true,
  lastOrderAt: true,
  firstOrderAt: true,
  createdAt: true,
  updatedAt: true,
});

export const insertInvoiceSchema = createInsertSchema(invoices).omit({
  id: true,
  vendorId: true,
  token: true,
  status: true,
  paymentMethod: true,
  paymentProviderRef: true,
  bictorysChargeId: true,
  bictorysCheckoutUrl: true,
  paidAt: true,
  createdAt: true,
  expiresAt: true,
});

// Types exportés
export type VendorConfig = typeof vendorConfigs.$inferSelect;
export type InsertVendorConfig = z.infer<typeof insertVendorConfigSchema>;
export type Product = typeof products.$inferSelect;
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type LiveSession = typeof liveSessions.$inferSelect;
export type InsertLiveSession = z.infer<typeof insertLiveSessionSchema>;
export type Order = typeof orders.$inferSelect;
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type Invoice = typeof invoices.$inferSelect;
export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;
export type Client = typeof clients.$inferSelect;
export type InsertClient = z.infer<typeof insertClientSchema>;
export type ClientTier = 'bronze' | 'silver' | 'gold' | 'diamond';
export type VendorSegment = 'live_seller' | 'shop' | 'events' | 'services' | 'b2b';
