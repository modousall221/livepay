import {
  products,
  liveSessions,
  invoices,
  type Product,
  type InsertProduct,
  type LiveSession,
  type InsertLiveSession,
  type Invoice,
  type InsertInvoice,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc } from "drizzle-orm";
import { randomBytes } from "crypto";

export interface IStorage {
  getProductsByVendor(vendorId: string): Promise<Product[]>;
  getProduct(id: string): Promise<Product | undefined>;
  createProduct(vendorId: string, data: InsertProduct): Promise<Product>;
  deleteProduct(id: string, vendorId: string): Promise<void>;

  getSessionsByVendor(vendorId: string): Promise<LiveSession[]>;
  getSession(id: string, vendorId?: string): Promise<LiveSession | undefined>;
  createSession(vendorId: string, data: InsertLiveSession): Promise<LiveSession>;
  endSession(id: string, vendorId: string): Promise<LiveSession | undefined>;

  getInvoicesByVendor(vendorId: string, sessionId?: string): Promise<Invoice[]>;
  getInvoiceByToken(token: string): Promise<Invoice | undefined>;
  createInvoice(vendorId: string, data: InsertInvoice): Promise<Invoice>;
  updateInvoiceStatus(id: string, status: string): Promise<Invoice | undefined>;
}

export class DatabaseStorage implements IStorage {
  async getProductsByVendor(vendorId: string): Promise<Product[]> {
    return db.select().from(products).where(eq(products.vendorId, vendorId)).orderBy(desc(products.createdAt));
  }

  async getProduct(id: string): Promise<Product | undefined> {
    const [product] = await db.select().from(products).where(eq(products.id, id));
    return product;
  }

  async createProduct(vendorId: string, data: InsertProduct): Promise<Product> {
    const [product] = await db.insert(products).values({ ...data, vendorId }).returning();
    return product;
  }

  async deleteProduct(id: string, vendorId: string): Promise<void> {
    await db.delete(products).where(and(eq(products.id, id), eq(products.vendorId, vendorId)));
  }

  async getSessionsByVendor(vendorId: string): Promise<LiveSession[]> {
    return db.select().from(liveSessions).where(eq(liveSessions.vendorId, vendorId)).orderBy(desc(liveSessions.createdAt));
  }

  async getSession(id: string, vendorId?: string): Promise<LiveSession | undefined> {
    if (vendorId) {
      const [session] = await db.select().from(liveSessions).where(and(eq(liveSessions.id, id), eq(liveSessions.vendorId, vendorId)));
      return session;
    }
    const [session] = await db.select().from(liveSessions).where(eq(liveSessions.id, id));
    return session;
  }

  async createSession(vendorId: string, data: InsertLiveSession): Promise<LiveSession> {
    const [session] = await db.insert(liveSessions).values({ ...data, vendorId, active: true }).returning();
    return session;
  }

  async endSession(id: string, vendorId: string): Promise<LiveSession | undefined> {
    const [session] = await db
      .update(liveSessions)
      .set({ active: false, endedAt: new Date() })
      .where(and(eq(liveSessions.id, id), eq(liveSessions.vendorId, vendorId)))
      .returning();
    return session;
  }

  async getInvoicesByVendor(vendorId: string, sessionId?: string): Promise<Invoice[]> {
    if (sessionId) {
      return db
        .select()
        .from(invoices)
        .where(and(eq(invoices.vendorId, vendorId), eq(invoices.sessionId, sessionId)))
        .orderBy(desc(invoices.createdAt));
    }
    return db.select().from(invoices).where(eq(invoices.vendorId, vendorId)).orderBy(desc(invoices.createdAt));
  }

  async getInvoiceByToken(token: string): Promise<Invoice | undefined> {
    const [invoice] = await db.select().from(invoices).where(eq(invoices.token, token));
    return invoice;
  }

  async createInvoice(vendorId: string, data: InsertInvoice): Promise<Invoice> {
    const token = randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    const [invoice] = await db
      .insert(invoices)
      .values({
        ...data,
        vendorId,
        token,
        status: "pending",
        expiresAt,
      })
      .returning();
    return invoice;
  }

  async updateInvoiceStatus(id: string, status: string): Promise<Invoice | undefined> {
    const updateData: Record<string, any> = { status };
    if (status === "paid") {
      updateData.paidAt = new Date();
    }
    const [invoice] = await db.update(invoices).set(updateData).where(eq(invoices.id, id)).returning();
    return invoice;
  }
}

export const storage = new DatabaseStorage();
