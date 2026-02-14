import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, boolean, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export * from "./models/auth";
import { users } from "./models/auth";

export const invoiceStatusEnum = pgEnum("invoice_status", ["pending", "paid", "expired", "cancelled"]);
export const paymentMethodEnum = pgEnum("payment_method", ["wave", "orange_money", "card", "cash"]);

export const products = pgTable("products", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  vendorId: varchar("vendor_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  price: integer("price").notNull(),
  description: text("description"),
  imageUrl: text("image_url"),
  active: boolean("active").default(true).notNull(),
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
  paydunyaToken: text("paydunya_token"),
  paydunyaUrl: text("paydunya_url"),
  paidAt: timestamp("paid_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const productsRelations = relations(products, ({ one }) => ({
  vendor: one(users, { fields: [products.vendorId], references: [users.id] }),
}));

export const liveSessionsRelations = relations(liveSessions, ({ one, many }) => ({
  vendor: one(users, { fields: [liveSessions.vendorId], references: [users.id] }),
  invoices: many(invoices),
}));

export const invoicesRelations = relations(invoices, ({ one }) => ({
  vendor: one(users, { fields: [invoices.vendorId], references: [users.id] }),
  session: one(liveSessions, { fields: [invoices.sessionId], references: [liveSessions.id] }),
  product: one(products, { fields: [invoices.productId], references: [products.id] }),
}));

export const insertProductSchema = createInsertSchema(products).omit({
  id: true,
  vendorId: true,
  createdAt: true,
});

export const insertLiveSessionSchema = createInsertSchema(liveSessions).omit({
  id: true,
  vendorId: true,
  createdAt: true,
  endedAt: true,
  active: true,
});

export const insertInvoiceSchema = createInsertSchema(invoices).omit({
  id: true,
  vendorId: true,
  token: true,
  status: true,
  paymentMethod: true,
  paymentProviderRef: true,
  paydunyaToken: true,
  paydunyaUrl: true,
  paidAt: true,
  createdAt: true,
  expiresAt: true,
});

export type Product = typeof products.$inferSelect;
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type LiveSession = typeof liveSessions.$inferSelect;
export type InsertLiveSession = z.infer<typeof insertLiveSessionSchema>;
export type Invoice = typeof invoices.$inferSelect;
export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;
