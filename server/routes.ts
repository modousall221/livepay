import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, registerAuthRoutes, isAuthenticated } from "./replit_integrations/auth";
import { authStorage } from "./replit_integrations/auth/storage";
import { insertProductSchema, insertLiveSessionSchema, insertInvoiceSchema } from "@shared/schema";
import { getPaymentProvider, getAvailableProviders, checkPaydunyaStatus } from "./payment-providers";

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

  app.get("/pay/:token", async (req, res, next) => {
    const ua = (req.headers["user-agent"] || "").toLowerCase();
    const isCrawler = /bot|crawl|spider|facebook|whatsapp|telegram|twitter|slack|discord|linkedin|preview/i.test(ua);
    if (!isCrawler) {
      return next();
    }

    try {
      const invoice = await storage.getInvoiceByToken(req.params.token);
      if (!invoice) {
        return next();
      }

      if (invoice.status === "pending" && new Date() > new Date(invoice.expiresAt)) {
        await storage.updateInvoiceStatus(invoice.id, "expired");
        invoice.status = "expired";
      }

      const vendor = await authStorage.getUser(invoice.vendorId);
      const vendorName = vendor
        ? `${vendor.firstName || ""} ${vendor.lastName || ""}`.trim() || vendor.email || "Vendeur"
        : "Vendeur";

      const statusText = invoice.status === "paid" ? "Paye" : invoice.status === "pending" ? "En attente" : "Expire";
      const amountFormatted = invoice.amount.toLocaleString("fr-FR");
      const title = `Payer ${amountFormatted} FCFA - ${invoice.productName}`;
      const description = `Facture de ${vendorName} pour ${invoice.clientName}. ${invoice.productName} - ${amountFormatted} FCFA. Statut: ${statusText}`;

      res.setHeader("Content-Type", "text/html");
      res.send(`<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title} | LivePay</title>
  <meta name="description" content="${description}" />
  <meta property="og:type" content="website" />
  <meta property="og:title" content="${title}" />
  <meta property="og:description" content="${description}" />
  <meta property="og:site_name" content="LivePay" />
  <meta property="og:url" content="${req.protocol}://${req.get("host")}/pay/${req.params.token}" />
  <meta name="twitter:card" content="summary" />
  <meta name="twitter:title" content="${title}" />
  <meta name="twitter:description" content="${description}" />
  <link rel="canonical" href="${req.protocol}://${req.get("host")}/pay/${req.params.token}" />
</head>
<body>
  <h1>${title}</h1>
  <p>${description}</p>
  <p>Paiement securise par LivePay - Zone UEMOA</p>
</body>
</html>`);
    } catch (error) {
      next();
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
        paymentMethod: invoice.paymentMethod,
        vendorName: vendor
          ? `${vendor.firstName || ""} ${vendor.lastName || ""}`.trim() || vendor.email || "Vendeur"
          : "Vendeur",
      });
    } catch (error) {
      console.error("Error fetching payment:", error);
      res.status(500).json({ message: "Failed to fetch payment" });
    }
  });

  app.get("/api/payment-methods", async (_req, res) => {
    res.json(getAvailableProviders());
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

      const paymentMethod = req.body?.paymentMethod || "wave";
      const provider = getPaymentProvider(paymentMethod);
      if (!provider) {
        return res.status(400).json({ message: "Methode de paiement invalide" });
      }

      if (paymentMethod === "cash") {
        const result = await provider.processPayment(invoice.id, invoice.amount, {
          clientName: invoice.clientName,
          clientPhone: invoice.clientPhone,
          productName: invoice.productName,
        });
        const updated = await storage.updateInvoiceStatus(invoice.id, "paid", paymentMethod, result.providerRef);
        return res.json({ success: true, invoice: updated });
      }

      const result = await provider.processPayment(invoice.id, invoice.amount, {
        clientName: invoice.clientName,
        clientPhone: invoice.clientPhone,
        productName: invoice.productName,
        invoiceToken: invoice.token,
      });

      if (!result.success) {
        return res.status(400).json({ message: result.error || "Echec du paiement" });
      }

      if (result.paydunyaToken && result.redirectUrl) {
        await storage.updateInvoicePaydunya(
          invoice.id,
          result.paydunyaToken,
          result.redirectUrl,
          paymentMethod,
          result.providerRef || ""
        );
        return res.json({
          success: true,
          redirect: true,
          redirectUrl: result.redirectUrl,
          paydunyaToken: result.paydunyaToken,
        });
      }

      const updated = await storage.updateInvoiceStatus(invoice.id, "paid", paymentMethod, result.providerRef);
      res.json({ success: true, invoice: updated });
    } catch (error) {
      console.error("Error processing payment:", error);
      res.status(500).json({ message: "Failed to process payment" });
    }
  });

  app.post("/api/paydunya/ipn", async (req, res) => {
    try {
      res.sendStatus(200);

      const data = req.body?.data;
      if (!data) return;

      const paydunyaToken = data.invoice?.token;
      const status = data.status;
      const customData = data.custom_data || {};
      const livepayToken = customData.livepay_token;

      console.log(`[PayDunia IPN] Token: ${paydunyaToken}, Status: ${status}`);

      if (!paydunyaToken) return;

      let invoice = await storage.getInvoiceByPaydunyaToken(paydunyaToken);
      if (!invoice && livepayToken) {
        invoice = await storage.getInvoiceByToken(livepayToken);
      }
      if (!invoice) {
        console.error(`[PayDunia IPN] No invoice found for token: ${paydunyaToken}`);
        return;
      }

      if (invoice.status === "paid") return;

      if (status === "completed") {
        await storage.updateInvoiceStatus(
          invoice.id,
          "paid",
          invoice.paymentMethod || "wave",
          `PDY-${paydunyaToken}`
        );
        console.log(`[PayDunia IPN] Invoice ${invoice.id} marked as paid`);
      } else if (status === "cancelled" || status === "failed") {
        console.log(`[PayDunia IPN] Invoice ${invoice.id} payment ${status}`);
      }
    } catch (error) {
      console.error("[PayDunia IPN] Error:", error);
    }
  });

  app.get("/api/pay/:token/status", async (req, res) => {
    try {
      const invoice = await storage.getInvoiceByToken(req.params.token);
      if (!invoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }

      if (invoice.status === "pending" && new Date() > new Date(invoice.expiresAt)) {
        await storage.updateInvoiceStatus(invoice.id, "expired");
        return res.json({ status: "expired" });
      }

      if (invoice.status === "pending" && invoice.paydunyaToken) {
        const pdStatus = await checkPaydunyaStatus(invoice.paydunyaToken);
        if (pdStatus.status === "paid") {
          await storage.updateInvoiceStatus(
            invoice.id,
            "paid",
            invoice.paymentMethod || "wave",
            `PDY-${invoice.paydunyaToken}`
          );
          return res.json({ status: "paid" });
        }
      }

      res.json({ status: invoice.status });
    } catch (error) {
      console.error("Error checking status:", error);
      res.status(500).json({ message: "Failed to check status" });
    }
  });

  app.get("/api/webhooks/whatsapp", (req, res) => {
    const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN || "livepay_webhook_verify";
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];

    if (mode === "subscribe" && token === verifyToken) {
      console.log("WhatsApp webhook verified");
      return res.status(200).send(challenge);
    }
    res.sendStatus(403);
  });

  app.post("/api/webhooks/whatsapp", async (req, res) => {
    try {
      res.sendStatus(200);

      const body = req.body;
      if (!body?.entry) return;

      for (const entry of body.entry) {
        const changes = entry.changes || [];
        for (const change of changes) {
          if (change.field !== "messages") continue;
          const messages = change.value?.messages || [];
          for (const msg of messages) {
            if (msg.type !== "text") continue;
            const text = (msg.text?.body || "").trim().toLowerCase();
            const from = msg.from;

            const keywords = ["je prends", "je veux", "commander", "acheter", "payer"];
            const matched = keywords.some((kw) => text.includes(kw));

            if (matched) {
              console.log(`[WhatsApp Bot] Order intent from ${from}: "${text}"`);
            }
          }
        }
      }
    } catch (error) {
      console.error("WhatsApp webhook error:", error);
    }
  });

  return httpServer;
}
