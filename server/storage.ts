import {
  products,
  liveSessions,
  invoices,
  orders,
  vendorConfigs,
  clients,
  type Product,
  type InsertProduct,
  type LiveSession,
  type InsertLiveSession,
  type Invoice,
  type InsertInvoice,
  type Order,
  type InsertOrder,
  type VendorConfig,
  type InsertVendorConfig,
  type Client,
  type InsertClient,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, sql, ilike } from "drizzle-orm";
import { randomBytes } from "crypto";

export interface IStorage {
  getProductsByVendor(vendorId: string): Promise<Product[]>;
  getProduct(id: string): Promise<Product | undefined>;
  createProduct(vendorId: string, data: InsertProduct): Promise<Product>;
  updateProduct(id: string, vendorId: string, data: Partial<InsertProduct>): Promise<Product | undefined>;
  deleteProduct(id: string, vendorId: string): Promise<void>;

  getSessionsByVendor(vendorId: string): Promise<LiveSession[]>;
  getSession(id: string, vendorId?: string): Promise<LiveSession | undefined>;
  createSession(vendorId: string, data: InsertLiveSession): Promise<LiveSession>;
  endSession(id: string, vendorId: string): Promise<LiveSession | undefined>;

  getInvoicesByVendor(vendorId: string, sessionId?: string): Promise<Invoice[]>;
  getInvoiceById(id: string): Promise<Invoice | undefined>;
  getInvoiceByToken(token: string): Promise<Invoice | undefined>;
  getInvoiceByChargeId(chargeId: string): Promise<Invoice | undefined>;
  createInvoice(vendorId: string, data: InsertInvoice): Promise<Invoice>;
  updateInvoiceStatus(id: string, status: string, paymentMethod?: string, providerRef?: string): Promise<Invoice | undefined>;
  updateInvoiceBictorys(id: string, chargeId: string, checkoutUrl: string, paymentMethod: string, providerRef: string): Promise<Invoice | undefined>;
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

  async updateProduct(id: string, vendorId: string, data: Partial<InsertProduct>): Promise<Product | undefined> {
    const [product] = await db.update(products).set(data).where(and(eq(products.id, id), eq(products.vendorId, vendorId))).returning();
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

  async getInvoiceById(id: string): Promise<Invoice | undefined> {
    const [invoice] = await db.select().from(invoices).where(eq(invoices.id, id));
    return invoice;
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

  async updateInvoiceStatus(id: string, status: string, paymentMethod?: string, providerRef?: string): Promise<Invoice | undefined> {
    const updateData: Record<string, any> = { status };
    if (status === "paid") {
      updateData.paidAt = new Date();
    }
    if (paymentMethod) {
      updateData.paymentMethod = paymentMethod;
    }
    if (providerRef) {
      updateData.paymentProviderRef = providerRef;
    }
    const [invoice] = await db.update(invoices).set(updateData).where(eq(invoices.id, id)).returning();
    return invoice;
  }

  async getInvoiceByChargeId(chargeId: string): Promise<Invoice | undefined> {
    const [invoice] = await db.select().from(invoices).where(eq(invoices.bictorysChargeId, chargeId));
    return invoice;
  }

  async updateInvoiceBictorys(id: string, chargeId: string, checkoutUrl: string, paymentMethod: string, providerRef: string): Promise<Invoice | undefined> {
    const [invoice] = await db
      .update(invoices)
      .set({ bictorysChargeId: chargeId, bictorysCheckoutUrl: checkoutUrl, paymentMethod: paymentMethod as any, paymentProviderRef: providerRef })
      .where(eq(invoices.id, id))
      .returning();
    return invoice;
  }

  // ========== VENDOR CONFIG ==========
  
  async getVendorConfig(vendorId: string): Promise<VendorConfig | undefined> {
    const [config] = await db.select().from(vendorConfigs).where(eq(vendorConfigs.vendorId, vendorId));
    return config;
  }

  async getVendorConfigByWhatsAppPhoneId(phoneNumberId: string): Promise<VendorConfig | undefined> {
    const [config] = await db.select().from(vendorConfigs).where(eq(vendorConfigs.whatsappPhoneNumberId, phoneNumberId));
    return config;
  }

  async createVendorConfig(data: InsertVendorConfig): Promise<VendorConfig> {
    const [config] = await db.insert(vendorConfigs).values(data).returning();
    return config;
  }

  async updateVendorConfig(vendorId: string, data: Partial<InsertVendorConfig>): Promise<VendorConfig | undefined> {
    const [config] = await db
      .update(vendorConfigs)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(vendorConfigs.vendorId, vendorId))
      .returning();
    return config;
  }

  async setLiveMode(vendorId: string, liveMode: boolean): Promise<VendorConfig | undefined> {
    const [config] = await db
      .update(vendorConfigs)
      .set({ liveMode, updatedAt: new Date() })
      .where(eq(vendorConfigs.vendorId, vendorId))
      .returning();
    return config;
  }

  // ========== PRODUCTS WITH STOCK & KEYWORDS ==========

  async getProductByKeyword(vendorId: string, keyword: string): Promise<Product | undefined> {
    const [product] = await db
      .select()
      .from(products)
      .where(and(
        eq(products.vendorId, vendorId),
        ilike(products.keyword, keyword),
        eq(products.active, true)
      ));
    return product;
  }

  async getAvailableStock(productId: string): Promise<number> {
    const [product] = await db.select().from(products).where(eq(products.id, productId));
    if (!product) return 0;
    return Math.max(0, product.stock - product.reservedStock);
  }

  async reserveStock(productId: string, quantity: number): Promise<boolean> {
    const available = await this.getAvailableStock(productId);
    if (available < quantity) return false;

    await db
      .update(products)
      .set({ reservedStock: sql`${products.reservedStock} + ${quantity}` })
      .where(eq(products.id, productId));
    return true;
  }

  async releaseStock(productId: string, quantity: number): Promise<void> {
    await db
      .update(products)
      .set({ reservedStock: sql`GREATEST(0, ${products.reservedStock} - ${quantity})` })
      .where(eq(products.id, productId));
  }

  async confirmStock(productId: string, quantity: number): Promise<void> {
    // Décrémenter le stock réel et le stock réservé
    await db
      .update(products)
      .set({ 
        stock: sql`GREATEST(0, ${products.stock} - ${quantity})`,
        reservedStock: sql`GREATEST(0, ${products.reservedStock} - ${quantity})`
      })
      .where(eq(products.id, productId));
  }

  async updateStock(productId: string, vendorId: string, newStock: number): Promise<Product | undefined> {
    const [product] = await db
      .update(products)
      .set({ stock: newStock })
      .where(and(eq(products.id, productId), eq(products.vendorId, vendorId)))
      .returning();
    return product;
  }

  // ========== ORDERS ==========

  async getOrdersByVendor(vendorId: string, status?: string): Promise<Order[]> {
    if (status) {
      return db
        .select()
        .from(orders)
        .where(and(eq(orders.vendorId, vendorId), eq(orders.status, status as any)))
        .orderBy(desc(orders.createdAt));
    }
    return db.select().from(orders).where(eq(orders.vendorId, vendorId)).orderBy(desc(orders.createdAt));
  }

  async getOrdersBySession(sessionId: string): Promise<Order[]> {
    return db.select().from(orders).where(eq(orders.sessionId, sessionId)).orderBy(desc(orders.createdAt));
  }

  async getOrderByToken(token: string): Promise<Order | undefined> {
    const [order] = await db.select().from(orders).where(eq(orders.paymentToken, token));
    return order;
  }

  async getOrderById(id: string): Promise<Order | undefined> {
    const [order] = await db.select().from(orders).where(eq(orders.id, id));
    return order;
  }

  async getOrdersByClientPhone(vendorId: string, clientPhone: string): Promise<Order[]> {
    return db
      .select()
      .from(orders)
      .where(and(eq(orders.vendorId, vendorId), eq(orders.clientPhone, clientPhone)))
      .orderBy(desc(orders.createdAt));
  }

  async createOrder(vendorId: string, data: InsertOrder & { expiresAt: Date }): Promise<Order> {
    const paymentToken = randomBytes(16).toString("hex");
    
    const [order] = await db
      .insert(orders)
      .values({
        ...data,
        vendorId,
        paymentToken,
        status: "reserved",
        reservedAt: new Date(),
      })
      .returning();
    return order;
  }

  async updateOrderStatus(id: string, status: string, pspReference?: string): Promise<Order | undefined> {
    const updateData: Record<string, any> = { status };
    if (status === "paid") {
      updateData.paidAt = new Date();
    }
    if (pspReference) {
      updateData.pspReference = pspReference;
    }
    const [order] = await db.update(orders).set(updateData).where(eq(orders.id, id)).returning();
    return order;
  }

  async updateOrderPaymentInfo(id: string, paymentUrl: string, paymentMethod: string): Promise<Order | undefined> {
    const [order] = await db
      .update(orders)
      .set({ paymentUrl, paymentMethod: paymentMethod as any })
      .where(eq(orders.id, id))
      .returning();
    return order;
  }

  async getExpiredOrders(): Promise<Order[]> {
    return db
      .select()
      .from(orders)
      .where(and(
        eq(orders.status, "reserved"),
        sql`${orders.expiresAt} < NOW()`
      ));
  }

  async expireOrder(id: string): Promise<Order | undefined> {
    const [order] = await db
      .update(orders)
      .set({ status: "expired" })
      .where(eq(orders.id, id))
      .returning();
    return order;
  }

  // Stats pour le dashboard
  async getOrderStats(vendorId: string, sessionId?: string): Promise<{
    pending: number;
    reserved: number;
    paid: number;
    expired: number;
    totalRevenue: number;
  }> {
    const baseCondition = sessionId 
      ? and(eq(orders.vendorId, vendorId), eq(orders.sessionId, sessionId))
      : eq(orders.vendorId, vendorId);

    const allOrders = await db.select().from(orders).where(baseCondition);
    
    const stats = {
      pending: 0,
      reserved: 0,
      paid: 0,
      expired: 0,
      totalRevenue: 0,
    };

    for (const order of allOrders) {
      if (order.status === "pending") stats.pending++;
      else if (order.status === "reserved") stats.reserved++;
      else if (order.status === "paid") {
        stats.paid++;
        stats.totalRevenue += order.totalAmount;
      }
      else if (order.status === "expired") stats.expired++;
    }

    return stats;
  }

  // ========== CLIENTS (V2 - Scoring & Fidélité) ==========

  async getClient(vendorId: string, phone: string): Promise<Client | undefined> {
    const [client] = await db
      .select()
      .from(clients)
      .where(and(eq(clients.vendorId, vendorId), eq(clients.phone, phone)));
    return client;
  }

  async getClientById(id: string): Promise<Client | undefined> {
    const [client] = await db.select().from(clients).where(eq(clients.id, id));
    return client;
  }

  async getOrCreateClient(vendorId: string, phone: string, name?: string): Promise<Client> {
    let client = await this.getClient(vendorId, phone);
    
    if (!client) {
      [client] = await db
        .insert(clients)
        .values({
          vendorId,
          phone,
          name: name || null,
        })
        .returning();
    } else if (name && !client.name) {
      // Update name if we have one now
      [client] = await db
        .update(clients)
        .set({ name, updatedAt: new Date() })
        .where(eq(clients.id, client.id))
        .returning();
    }
    
    return client;
  }

  async updateClient(id: string, data: Partial<Client>): Promise<Client | undefined> {
    const [client] = await db
      .update(clients)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(clients.id, id))
      .returning();
    return client;
  }

  async getClientsByVendor(vendorId: string, options?: { 
    minScore?: number; 
    tier?: string;
    limit?: number;
  }): Promise<Client[]> {
    let query = db.select().from(clients).where(eq(clients.vendorId, vendorId));
    
    // Note: Additional filters would require more complex query building
    // For MVP, we filter in memory
    const allClients = await query.orderBy(desc(clients.trustScore));
    
    let filtered = allClients;
    
    if (options?.minScore !== undefined) {
      filtered = filtered.filter(c => c.trustScore >= options.minScore!);
    }
    
    if (options?.tier) {
      filtered = filtered.filter(c => c.tier === options.tier);
    }
    
    if (options?.limit) {
      filtered = filtered.slice(0, options.limit);
    }
    
    return filtered;
  }

  async incrementClientOrderCount(clientId: string): Promise<void> {
    await db
      .update(clients)
      .set({
        totalOrders: sql`${clients.totalOrders} + 1`,
        updatedAt: new Date()
      })
      .where(eq(clients.id, clientId));
  }

  async recordClientPayment(
    clientId: string, 
    amount: number, 
    paymentTimeSeconds?: number
  ): Promise<Client | undefined> {
    const client = await this.getClientById(clientId);
    if (!client) return undefined;

    // Calculer nouvelle moyenne de temps de paiement
    let newAvgTime = paymentTimeSeconds;
    if (paymentTimeSeconds && client.avgPaymentTimeSeconds) {
      const totalPayments = client.successfulPayments;
      newAvgTime = Math.round(
        (client.avgPaymentTimeSeconds * totalPayments + paymentTimeSeconds) / (totalPayments + 1)
      );
    }

    const [updated] = await db
      .update(clients)
      .set({
        successfulPayments: sql`${clients.successfulPayments} + 1`,
        totalSpent: sql`${clients.totalSpent} + ${amount}`,
        lastOrderAt: new Date(),
        avgPaymentTimeSeconds: newAvgTime || client.avgPaymentTimeSeconds,
        updatedAt: new Date()
      })
      .where(eq(clients.id, clientId))
      .returning();

    return updated;
  }

  async recordClientExpiration(clientId: string): Promise<void> {
    await db
      .update(clients)
      .set({
        expiredReservations: sql`${clients.expiredReservations} + 1`,
        updatedAt: new Date()
      })
      .where(eq(clients.id, clientId));
  }

  async updateClientScore(clientId: string, score: number, tier: string): Promise<void> {
    await db
      .update(clients)
      .set({
        trustScore: score,
        tier: tier as any,
        updatedAt: new Date()
      })
      .where(eq(clients.id, clientId));
  }

  async updateClientTags(clientId: string, tags: string[]): Promise<void> {
    await db
      .update(clients)
      .set({
        tags,
        updatedAt: new Date()
      })
      .where(eq(clients.id, clientId));
  }

  // ========== ORDER EXTENSIONS (V2) ==========

  async markReminderSent(orderId: string): Promise<void> {
    await db
      .update(orders)
      .set({ reminderSent: true })
      .where(eq(orders.id, orderId));
  }

  async updateOrderPaymentTime(orderId: string, paymentTimeSeconds: number): Promise<void> {
    await db
      .update(orders)
      .set({ paymentTimeSeconds })
      .where(eq(orders.id, orderId));
  }

  async linkOrderToClient(orderId: string, clientId: string, trustScore: number): Promise<void> {
    await db
      .update(orders)
      .set({ 
        clientId, 
        clientTrustScore: trustScore 
      })
      .where(eq(orders.id, orderId));
  }
}

export const storage = new DatabaseStorage();
