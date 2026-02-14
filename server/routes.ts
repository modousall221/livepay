import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, registerAuthRoutes, isAuthenticated } from "./replit_integrations/auth";
import { authStorage } from "./replit_integrations/auth/storage";
import { insertProductSchema, insertLiveSessionSchema, insertInvoiceSchema } from "@shared/schema";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  await setupAuth(app);
  registerAuthRoutes(app);

  app.get("/api/products", isAuthenticated, async (req: any, res) => {
    try {
      const vendorId = req.user.claims.sub;
      const products = await storage.getProductsByVendor(vendorId);
      res.json(products);
    } catch (error) {
      console.error("Error fetching products:", error);
      res.status(500).json({ message: "Failed to fetch products" });
    }
  });

  app.post("/api/products", isAuthenticated, async (req: any, res) => {
    try {
      const vendorId = req.user.claims.sub;
      const parsed = insertProductSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid product data", errors: parsed.error.errors });
      }
      const product = await storage.createProduct(vendorId, parsed.data);
      res.status(201).json(product);
    } catch (error) {
      console.error("Error creating product:", error);
      res.status(500).json({ message: "Failed to create product" });
    }
  });

  app.delete("/api/products/:id", isAuthenticated, async (req: any, res) => {
    try {
      const vendorId = req.user.claims.sub;
      await storage.deleteProduct(req.params.id, vendorId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting product:", error);
      res.status(500).json({ message: "Failed to delete product" });
    }
  });

  app.get("/api/sessions", isAuthenticated, async (req: any, res) => {
    try {
      const vendorId = req.user.claims.sub;
      const sessions = await storage.getSessionsByVendor(vendorId);
      res.json(sessions);
    } catch (error) {
      console.error("Error fetching sessions:", error);
      res.status(500).json({ message: "Failed to fetch sessions" });
    }
  });

  app.get("/api/sessions/:id", isAuthenticated, async (req: any, res) => {
    try {
      const vendorId = req.user.claims.sub;
      const session = await storage.getSession(req.params.id, vendorId);
      if (!session) {
        return res.status(404).json({ message: "Session not found" });
      }
      res.json(session);
    } catch (error) {
      console.error("Error fetching session:", error);
      res.status(500).json({ message: "Failed to fetch session" });
    }
  });

  app.post("/api/sessions", isAuthenticated, async (req: any, res) => {
    try {
      const vendorId = req.user.claims.sub;
      const parsed = insertLiveSessionSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid session data", errors: parsed.error.errors });
      }
      const session = await storage.createSession(vendorId, parsed.data);
      res.status(201).json(session);
    } catch (error) {
      console.error("Error creating session:", error);
      res.status(500).json({ message: "Failed to create session" });
    }
  });

  app.patch("/api/sessions/:id/end", isAuthenticated, async (req: any, res) => {
    try {
      const vendorId = req.user.claims.sub;
      const session = await storage.endSession(req.params.id, vendorId);
      if (!session) {
        return res.status(404).json({ message: "Session not found" });
      }
      res.json(session);
    } catch (error) {
      console.error("Error ending session:", error);
      res.status(500).json({ message: "Failed to end session" });
    }
  });

  app.get("/api/invoices", isAuthenticated, async (req: any, res) => {
    try {
      const vendorId = req.user.claims.sub;
      const sessionId = req.query.sessionId as string | undefined;
      const invoices = await storage.getInvoicesByVendor(vendorId, sessionId);
      res.json(invoices);
    } catch (error) {
      console.error("Error fetching invoices:", error);
      res.status(500).json({ message: "Failed to fetch invoices" });
    }
  });

  app.post("/api/invoices", isAuthenticated, async (req: any, res) => {
    try {
      const vendorId = req.user.claims.sub;
      const parsed = insertInvoiceSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid invoice data", errors: parsed.error.errors });
      }
      if (parsed.data.sessionId) {
        const session = await storage.getSession(parsed.data.sessionId, vendorId);
        if (!session) {
          return res.status(403).json({ message: "Session not found or not owned by you" });
        }
      }
      const invoice = await storage.createInvoice(vendorId, parsed.data);
      res.status(201).json(invoice);
    } catch (error) {
      console.error("Error creating invoice:", error);
      res.status(500).json({ message: "Failed to create invoice" });
    }
  });

  app.get("/api/pay/:token", async (req, res) => {
    try {
      const invoice = await storage.getInvoiceByToken(req.params.token);
      if (!invoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }

      if (invoice.status === "pending" && new Date() > new Date(invoice.expiresAt)) {
        await storage.updateInvoiceStatus(invoice.id, "expired");
        invoice.status = "expired";
      }

      const vendor = await authStorage.getUser(invoice.vendorId);

      res.json({
        id: invoice.id,
        productName: invoice.productName,
        amount: invoice.amount,
        clientName: invoice.clientName,
        status: invoice.status,
        expiresAt: invoice.expiresAt,
        vendorName: vendor
          ? `${vendor.firstName || ""} ${vendor.lastName || ""}`.trim() || vendor.email || "Vendeur"
          : "Vendeur",
      });
    } catch (error) {
      console.error("Error fetching payment:", error);
      res.status(500).json({ message: "Failed to fetch payment" });
    }
  });

  app.post("/api/pay/:token", async (req, res) => {
    try {
      const invoice = await storage.getInvoiceByToken(req.params.token);
      if (!invoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }

      if (invoice.status === "paid") {
        return res.status(400).json({ message: "Already paid" });
      }

      if (new Date() > new Date(invoice.expiresAt)) {
        await storage.updateInvoiceStatus(invoice.id, "expired");
        return res.status(400).json({ message: "Invoice expired" });
      }

      const updated = await storage.updateInvoiceStatus(invoice.id, "paid");
      res.json({ success: true, invoice: updated });
    } catch (error) {
      console.error("Error processing payment:", error);
      res.status(500).json({ message: "Failed to process payment" });
    }
  });

  return httpServer;
}
