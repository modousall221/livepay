import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, registerAuthRoutes, isAuthenticated, authStorage } from "./auth";
import { insertProductSchema, insertLiveSessionSchema, insertInvoiceSchema } from "@shared/schema";
import { getPaymentProvider, getAvailableProviders } from "./payment-providers";
import { whatsappService } from "./whatsapp/service";
import type { WhatsAppWebhookPayload } from "./whatsapp/types";
import multer from "multer";
import path from "path";
import fs from "fs";

// Configure multer for image uploads
const uploadDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const imageStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `product-${uniqueSuffix}${ext}`);
  },
});

const upload = multer({
  storage: imageStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
  fileFilter: (_req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error("Only images are allowed (jpeg, jpg, png, gif, webp)"));
    }
  },
});

// Helper to get display phone number from WhatsApp Business API
async function getWhatsAppDisplayPhone(phoneNumberId: string, accessToken?: string | null): Promise<string | null> {
  if (!phoneNumberId || !accessToken) return null;
  try {
    const response = await fetch(
      `https://graph.facebook.com/v18.0/${phoneNumberId}?fields=display_phone_number`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (response.ok) {
      const data = await response.json();
      return data.display_phone_number?.replace(/[^0-9]/g, '') || null;
    }
  } catch (e) {
    console.error("Error fetching WhatsApp phone:", e);
  }
  return null;
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  await setupAuth(app);
  registerAuthRoutes(app);

  // Health check endpoint for Railway/deployment monitoring
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Serve uploaded images
  app.use("/uploads", (await import("express")).default.static(uploadDir));

  // Image upload endpoint
  app.post("/api/upload", isAuthenticated, upload.single("image"), (req: any, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "Aucune image fournie" });
      }
      const appHost = process.env.APP_HOST || 
        (process.env.NODE_ENV === "production" ? "https://livepay.tech" : "http://localhost:5000");
      const imageUrl = `${appHost}/uploads/${req.file.filename}`;
      res.json({ url: imageUrl, filename: req.file.filename });
    } catch (error: any) {
      console.error("Upload error:", error);
      res.status(500).json({ message: error.message || "Erreur d'upload" });
    }
  });

  // ========== PUBLIC PRODUCT SHARING ROUTES ==========
  
  // Get product by share code (public - for sharing links)
  app.get("/api/public/product/:code", async (req, res) => {
    try {
      const product = await storage.getProductByShareCode(req.params.code);
      if (!product || !product.active) {
        return res.status(404).json({ message: "Produit non trouvé" });
      }
      
      // Get vendor info for WhatsApp link
      const vendorConfig = await storage.getVendorConfig(product.vendorId);
      const phoneNumber = vendorConfig?.whatsappPhoneNumberId ? 
        await getWhatsAppDisplayPhone(vendorConfig.whatsappPhoneNumberId, vendorConfig.whatsappAccessToken) : 
        null;
      
      res.json({
        id: product.id,
        name: product.name,
        keyword: product.keyword,
        shareCode: product.shareCode,
        price: product.price,
        description: product.description,
        imageUrl: product.imageUrl,
        stock: product.stock - (product.reservedStock || 0),
        vendorName: vendorConfig?.businessName || "Boutique",
        whatsappNumber: phoneNumber,
      });
    } catch (error) {
      console.error("Error fetching public product:", error);
      res.status(500).json({ message: "Erreur serveur" });
    }
  });

  // Vendor initiate chat with a client
  app.post("/api/vendor/initiate-chat", isAuthenticated, async (req: any, res) => {
    try {
      const vendorId = (req.user as any).id;
      const { clientPhone, productId, message } = req.body;
      
      if (!clientPhone) {
        return res.status(400).json({ message: "Numéro de téléphone requis" });
      }
      
      const vendorConfig = await storage.getVendorConfig(vendorId);
      if (!vendorConfig?.whatsappPhoneNumberId || !vendorConfig?.whatsappAccessToken) {
        return res.status(400).json({ message: "WhatsApp non configuré" });
      }
      
      let chatMessage = message;
      
      // If productId provided, include product info
      if (productId) {
        const product = await storage.getProduct(productId);
        if (product && product.vendorId === vendorId) {
          const appHost = process.env.APP_HOST || 
            (process.env.NODE_ENV === "production" ? "https://livepay.tech" : "http://localhost:5000");
          const productLink = `${appHost}/p/${product.shareCode}`;
          
          chatMessage = message || 
            `🛍️ *${product.name}*\n💰 ${product.price.toLocaleString("fr-FR")} FCFA\n\n` +
            `📱 Pour commander, envoyez le code: *${product.keyword}*\n\n` +
            `🔗 ${productLink}`;
        }
      }
      
      // Send WhatsApp message
      const result = await whatsappService.sendMessage(
        clientPhone,
        chatMessage || "Bonjour ! Comment puis-je vous aider ?",
        vendorConfig.whatsappPhoneNumberId,
        vendorConfig.whatsappAccessToken
      );
      
      res.json({ success: true, messageId: result?.messages?.[0]?.id });
    } catch (error: any) {
      console.error("Error initiating chat:", error);
      res.status(500).json({ message: error.message || "Erreur d'envoi" });
    }
  });

  // Get product share info (for quick share dialog)
  app.get("/api/products/:id/share", isAuthenticated, async (req: any, res) => {
    try {
      const vendorId = (req.user as any).id;
      const product = await storage.getProduct(req.params.id);
      
      if (!product || product.vendorId !== vendorId) {
        return res.status(404).json({ message: "Produit non trouvé" });
      }
      
      const appHost = process.env.APP_HOST || 
        (process.env.NODE_ENV === "production" ? "https://livepay.tech" : "http://localhost:5000");
      
      const vendorConfig = await storage.getVendorConfig(vendorId);
      const phoneNumber = vendorConfig?.whatsappPhoneNumberId || "";
      
      res.json({
        shareCode: product.shareCode,
        keyword: product.keyword,
        name: product.name,
        price: product.price,
        shareUrl: `${appHost}/p/${product.shareCode}`,
        whatsappDeepLink: `https://wa.me/${phoneNumber}?text=${encodeURIComponent(product.keyword)}`,
        qrData: `${appHost}/p/${product.shareCode}`,
      });
    } catch (error) {
      console.error("Error getting share info:", error);
      res.status(500).json({ message: "Erreur serveur" });
    }
  });

  app.get("/api/products", isAuthenticated, async (req: any, res) => {
    try {
      const vendorId = (req.user as any).id;
      const products = await storage.getProductsByVendor(vendorId);
      res.json(products);
    } catch (error) {
      console.error("Error fetching products:", error);
      res.status(500).json({ message: "Failed to fetch products" });
    }
  });

  app.post("/api/products", isAuthenticated, async (req: any, res) => {
    try {
      const vendorId = (req.user as any).id;
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

  app.patch("/api/products/:id", isAuthenticated, async (req: any, res) => {
    try {
      const vendorId = (req.user as any).id;
      const parsed = insertProductSchema.partial().safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid product data", errors: parsed.error.errors });
      }
      const product = await storage.updateProduct(req.params.id, vendorId, parsed.data);
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }
      res.json(product);
    } catch (error) {
      console.error("Error updating product:", error);
      res.status(500).json({ message: "Failed to update product" });
    }
  });

  app.delete("/api/products/:id", isAuthenticated, async (req: any, res) => {
    try {
      const vendorId = (req.user as any).id;
      await storage.deleteProduct(req.params.id, vendorId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting product:", error);
      res.status(500).json({ message: "Failed to delete product" });
    }
  });

  app.get("/api/sessions", isAuthenticated, async (req: any, res) => {
    try {
      const vendorId = (req.user as any).id;
      const sessions = await storage.getSessionsByVendor(vendorId);
      res.json(sessions);
    } catch (error) {
      console.error("Error fetching sessions:", error);
      res.status(500).json({ message: "Failed to fetch sessions" });
    }
  });

  app.get("/api/sessions/:id", isAuthenticated, async (req: any, res) => {
    try {
      const vendorId = (req.user as any).id;
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
      const vendorId = (req.user as any).id;
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
      const vendorId = (req.user as any).id;
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
      const vendorId = (req.user as any).id;
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
      const vendorId = (req.user as any).id;
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

      // Get vendor config to retrieve mobile money number
      const vendorConfig = await storage.getVendorConfig(invoice.vendorId);
      const vendorPhone = vendorConfig?.mobileMoneyNumber;
      
      if (!vendorPhone) {
        return res.status(400).json({ 
          message: "Le vendeur n'a pas configuré son numéro Mobile Money" 
        });
      }

      const paymentMethod = req.body?.paymentMethod || vendorConfig?.preferredPaymentMethod || "wave";
      const provider = getPaymentProvider(paymentMethod);
      if (!provider) {
        return res.status(400).json({ message: "Méthode de paiement invalide" });
      }

      // Generate payment link with vendor's mobile money number
      const result = await provider.generatePaymentLink(
        invoice.amount,
        vendorPhone,
        invoice.token,
        {
          clientName: invoice.clientName,
          clientPhone: invoice.clientPhone,
          productName: invoice.productName,
        }
      );

      if (!result.success) {
        return res.status(400).json({ message: result.error || "Échec de la génération du paiement" });
      }

      // For cash payments, mark as paid immediately
      if (paymentMethod === "cash") {
        const updated = await storage.updateInvoiceStatus(invoice.id, "paid", paymentMethod, result.providerRef);
        return res.json({ success: true, invoice: updated });
      }

      // For mobile money, return deep link and instructions
      // Note: We don't mark as paid yet - payment confirmation will come separately
      await storage.updateInvoiceStatus(invoice.id, "processing", paymentMethod, result.providerRef);
      
      return res.json({
        success: true,
        paymentMethod,
        deepLink: result.deepLink,
        ussdCode: result.ussdCode,
        instructions: result.instructions,
        vendorPhone,
        amount: invoice.amount,
        providerRef: result.providerRef,
      });
    } catch (error) {
      console.error("Error processing payment:", error);
      res.status(500).json({ message: "Failed to process payment" });
    }
  });

  app.post("/api/bictorys/webhook", async (req, res) => {
    try {
      res.sendStatus(200);

      const webhookSecret = process.env.BICTORYS_SECRET_KEY;
      if (webhookSecret) {
        const signature = req.headers["x-bictorys-signature"] || req.headers["x-webhook-signature"];
        if (!signature) {
          console.warn("[Bictorys Webhook] Missing signature header, skipping verification");
        }
      }

      const event = req.body?.event;
      const data = req.body?.data;

      if (!event || !data) return;

      const chargeId = data.id?.toString();
      const reference = data.reference;
      const status = data.status;

      console.log(`[Bictorys Webhook] Event: ${event}, ChargeId: ${chargeId}, Status: ${status}`);

      if (!chargeId && !reference) return;

      let invoice = chargeId ? await storage.getInvoiceByChargeId(chargeId) : null;
      if (!invoice && reference) {
        invoice = await storage.getInvoiceByToken(reference);
      }
      if (!invoice) {
        console.error(`[Bictorys Webhook] No invoice found for charge: ${chargeId}`);
        return;
      }

      if (invoice.status === "paid") return;

      if (chargeId && invoice.bictorysChargeId && invoice.bictorysChargeId !== chargeId) {
        console.error(`[Bictorys Webhook] ChargeId mismatch: expected ${invoice.bictorysChargeId}, got ${chargeId}`);
        return;
      }

      if (event === "charge.successful" || status === "success") {
        await storage.updateInvoiceStatus(
          invoice.id,
          "paid",
          invoice.paymentMethod || "wave",
          `BIC-${chargeId}`
        );
        console.log(`[Bictorys Webhook] Invoice ${invoice.id} marked as paid`);

        // Envoyer notification WhatsApp automatique au client
        try {
          await whatsappService.notifyPaymentReceived({
            id: invoice.id,
            clientPhone: invoice.clientPhone,
            clientName: invoice.clientName,
            productName: invoice.productName,
            amount: invoice.amount,
          });
          console.log(`[Bictorys Webhook] WhatsApp notification sent to ${invoice.clientPhone}`);
        } catch (waError) {
          console.error("[Bictorys Webhook] Failed to send WhatsApp notification:", waError);
        }
      } else if (event === "charge.failed" || status === "failed") {
        console.log(`[Bictorys Webhook] Invoice ${invoice.id} payment failed`);
      }
    } catch (error) {
      console.error("[Bictorys Webhook] Error:", error);
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

      if (invoice.status === "pending" && invoice.bictorysChargeId) {
        try {
          const baseUrl = (process.env.BICTORYS_PUBLIC_KEY || "").startsWith("test_")
            ? "https://api.test.bictorys.com"
            : "https://api.bictorys.com";
          const checkRes = await fetch(`${baseUrl}/pay/v1/charges/${invoice.bictorysChargeId}`, {
            headers: {
              "X-Api-Key": process.env.BICTORYS_PUBLIC_KEY || "",
            },
          });
          if (checkRes.ok) {
            const checkData = await checkRes.json();
            const chargeStatus = checkData.data?.status || checkData.status;
            if (chargeStatus === "success" || chargeStatus === "completed") {
              await storage.updateInvoiceStatus(
                invoice.id,
                "paid",
                invoice.paymentMethod || "wave",
                `BIC-${invoice.bictorysChargeId}`
              );
              return res.json({ status: "paid" });
            }
          }
        } catch (pollErr) {
          console.error("[Bictorys] Status poll error:", pollErr);
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

  // Webhook WhatsApp - Traitement des messages entrants
  app.post("/api/webhooks/whatsapp", async (req, res) => {
    try {
      // Répondre immédiatement pour éviter les timeouts Meta
      res.sendStatus(200);

      // Vérifier la signature (optionnel en dev)
      const signature = req.headers["x-hub-signature-256"] as string;
      if (process.env.WHATSAPP_APP_SECRET && signature) {
        const isValid = whatsappService.verifyWebhookSignature(
          JSON.stringify(req.body),
          signature
        );
        if (!isValid) {
          console.warn("[WhatsApp] Invalid webhook signature");
          return;
        }
      }

      const body = req.body as WhatsAppWebhookPayload;
      if (!body?.entry) return;

      for (const entry of body.entry) {
        const changes = entry.changes || [];
        for (const change of changes) {
          if (change.field !== "messages") continue;
          
          const phoneNumberId = change.value?.metadata?.phone_number_id;
          const contacts = change.value?.contacts || [];
          const messages = change.value?.messages || [];

          for (const msg of messages) {
            // Trouver le contact associé
            const contact = contacts.find((c) => c.wa_id === msg.from);
            const contactInfo = {
              phone: msg.from,
              name: contact?.profile?.name,
            };

            // Traiter le message via le service
            await whatsappService.processIncomingMessage(msg, contactInfo, phoneNumberId || "");
          }

          // Traiter les statuts de messages (sent, delivered, read)
          const statuses = change.value?.statuses || [];
          for (const status of statuses) {
            console.log(`[WhatsApp] Message ${status.id} status: ${status.status}`);
          }
        }
      }
    } catch (error) {
      console.error("WhatsApp webhook error:", error);
    }
  });

  // API pour envoyer un message WhatsApp manuellement
  app.post("/api/whatsapp/send", isAuthenticated, async (req: any, res) => {
    try {
      const { to, message } = req.body;
      if (!to || !message) {
        return res.status(400).json({ message: "Phone number and message required" });
      }

      const result = await whatsappService.sendText(to, message);
      if (result.success) {
        res.json({ success: true, messageId: result.messageId });
      } else {
        res.status(500).json({ success: false, error: "Failed to send message" });
      }
    } catch (error) {
      console.error("Error sending WhatsApp message:", error);
      res.status(500).json({ message: "Failed to send message" });
    }
  });

  // API pour envoyer un lien de paiement via WhatsApp
  app.post("/api/whatsapp/send-payment-link", isAuthenticated, async (req: any, res) => {
    try {
      const { invoiceId } = req.body;
      if (!invoiceId) {
        return res.status(400).json({ message: "Invoice ID required" });
      }

      const invoice = await storage.getInvoiceById(invoiceId);
      if (!invoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }

      // Vérifier que l'utilisateur est le propriétaire
      const vendorId = (req.user as any).id;
      if (invoice.vendorId !== vendorId) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      const appHost = process.env.APP_HOST || 
        (process.env.NODE_ENV === "production" ? "https://livepay.tech" : "http://localhost:5000");

      const result = await whatsappService.sendPaymentLink(
        invoice.clientPhone,
        {
          clientName: invoice.clientName,
          productName: invoice.productName,
          amount: invoice.amount,
          token: invoice.token,
          expiresAt: invoice.expiresAt,
        },
        appHost
      );

      if (result.success) {
        res.json({ success: true, messageId: result.messageId });
      } else {
        res.status(500).json({ success: false, error: "Failed to send payment link" });
      }
    } catch (error) {
      console.error("Error sending payment link via WhatsApp:", error);
      res.status(500).json({ message: "Failed to send payment link" });
    }
  });

  // API pour notifier un paiement reçu via WhatsApp
  app.post("/api/whatsapp/notify-payment", isAuthenticated, async (req: any, res) => {
    try {
      const { invoiceId } = req.body;
      if (!invoiceId) {
        return res.status(400).json({ message: "Invoice ID required" });
      }

      const invoice = await storage.getInvoiceById(invoiceId);
      if (!invoice || invoice.status !== "paid") {
        return res.status(404).json({ message: "Paid invoice not found" });
      }

      await whatsappService.notifyPaymentReceived({
        id: invoice.id,
        clientPhone: invoice.clientPhone,
        clientName: invoice.clientName,
        productName: invoice.productName,
        amount: invoice.amount,
      });

      res.json({ success: true });
    } catch (error) {
      console.error("Error notifying payment:", error);
      res.status(500).json({ message: "Failed to notify payment" });
    }
  });

  // API pour envoyer le catalogue via WhatsApp
  app.post("/api/whatsapp/send-catalog", isAuthenticated, async (req: any, res) => {
    try {
      const { to } = req.body;
      const vendorId = (req.user as any).id;

      if (!to) {
        return res.status(400).json({ message: "Phone number required" });
      }

      const productsList = await storage.getProductsByVendor(vendorId);
      const activeProducts = productsList.filter((p) => p.active);

      if (activeProducts.length === 0) {
        return res.status(400).json({ message: "No active products" });
      }

      const result = await whatsappService.sendProductList(
        to,
        activeProducts.map((p) => ({
          id: p.id,
          name: p.name,
          price: p.price,
          description: p.description || undefined,
        })),
        "📦 Catalogue"
      );

      if (result.success) {
        res.json({ success: true, messageId: result.messageId });
      } else {
        res.status(500).json({ success: false, error: "Failed to send catalog" });
      }
    } catch (error) {
      console.error("Error sending catalog:", error);
      res.status(500).json({ message: "Failed to send catalog" });
    }
  });

  // ========== ORDER ROUTES (WhatsApp Bot Flow) ==========

  // Get order by payment token (for payment page)
  app.get("/api/orders/pay/:token", async (req, res) => {
    try {
      const order = await storage.getOrderByToken(req.params.token);
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }

      if (order.status === "reserved" && order.expiresAt && new Date() > new Date(order.expiresAt)) {
        await storage.releaseStock(order.productId, order.quantity);
        await storage.expireOrder(order.id);
        return res.json({ ...order, status: "expired" });
      }

      const vendor = await authStorage.getUser(order.vendorId);

      res.json({
        id: order.id,
        productName: order.productName,
        quantity: order.quantity,
        unitPrice: order.unitPrice,
        totalAmount: order.totalAmount,
        clientName: order.clientName,
        status: order.status,
        expiresAt: order.expiresAt,
        paymentMethod: order.paymentMethod,
        vendorName: vendor
          ? `${vendor.firstName || ""} ${vendor.lastName || ""}`.trim() || vendor.email || "Vendeur"
          : "Vendeur",
      });
    } catch (error) {
      console.error("Error fetching order:", error);
      res.status(500).json({ message: "Failed to fetch order" });
    }
  });

  // Process order payment
  app.post("/api/orders/pay/:token", async (req, res) => {
    try {
      const order = await storage.getOrderByToken(req.params.token);
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }

      if (order.status === "paid") {
        return res.status(400).json({ message: "Already paid" });
      }

      if (order.expiresAt && new Date() > new Date(order.expiresAt)) {
        await storage.releaseStock(order.productId, order.quantity);
        await storage.expireOrder(order.id);
        return res.status(400).json({ message: "Order expired" });
      }

      const paymentMethod = req.body?.paymentMethod || "wave";
      const provider = getPaymentProvider(paymentMethod);
      if (!provider) {
        return res.status(400).json({ message: "Invalid payment method" });
      }

      if (paymentMethod === "cash") {
        await storage.confirmStock(order.productId, order.quantity);
        const updated = await storage.updateOrderStatus(order.id, "paid", "CASH");
        
        // Notify via WhatsApp
        const vendorConfig = await storage.getVendorConfig(order.vendorId);
        if (updated) {
          await whatsappService.notifyPaymentReceived(updated, vendorConfig || undefined);
          // Also notify vendor
          const vendor = await authStorage.getUser(order.vendorId);
          if (vendor?.phone) {
            await whatsappService.notifyVendorPaymentReceived(updated, vendor.phone);
          }
        }
        
        return res.json({ success: true, order: updated });
      }

      const result = await provider.processPayment(order.id, order.totalAmount, {
        clientName: order.clientName || "Client",
        clientPhone: order.clientPhone,
        productName: order.productName,
        invoiceToken: order.paymentToken,
      });

      if (!result.success) {
        return res.status(400).json({ message: result.error || "Payment failed" });
      }

      if (result.chargeId && result.redirectUrl) {
        await storage.updateOrderPaymentInfo(order.id, result.redirectUrl, paymentMethod);
        return res.json({
          success: true,
          redirect: true,
          redirectUrl: result.redirectUrl,
          chargeId: result.chargeId,
        });
      }

      await storage.confirmStock(order.productId, order.quantity);
      const updated = await storage.updateOrderStatus(order.id, "paid", result.providerRef);
      
      const vendorConfig = await storage.getVendorConfig(order.vendorId);
      if (updated) {
        await whatsappService.notifyPaymentReceived(updated, vendorConfig || undefined);
        // Also notify vendor
        const vendor = await authStorage.getUser(order.vendorId);
        if (vendor?.phone) {
          await whatsappService.notifyVendorPaymentReceived(updated, vendor.phone);
        }
      }
      
      res.json({ success: true, order: updated });
    } catch (error) {
      console.error("Error processing order payment:", error);
      res.status(500).json({ message: "Failed to process payment" });
    }
  });

  // Check order payment status
  app.get("/api/orders/pay/:token/status", async (req, res) => {
    try {
      const order = await storage.getOrderByToken(req.params.token);
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }

      if (order.status === "reserved" && order.expiresAt && new Date() > new Date(order.expiresAt)) {
        await storage.releaseStock(order.productId, order.quantity);
        await storage.expireOrder(order.id);
        return res.json({ status: "expired" });
      }

      res.json({ status: order.status });
    } catch (error) {
      console.error("Error checking order status:", error);
      res.status(500).json({ message: "Failed to check status" });
    }
  });

  // Get vendor orders
  app.get("/api/orders", isAuthenticated, async (req: any, res) => {
    try {
      const vendorId = (req.user as any).id;
      const status = req.query.status as string | undefined;
      const orders = await storage.getOrdersByVendor(vendorId, status);
      res.json(orders);
    } catch (error) {
      console.error("Error fetching orders:", error);
      res.status(500).json({ message: "Failed to fetch orders" });
    }
  });

  // Get order stats
  app.get("/api/orders/stats", isAuthenticated, async (req: any, res) => {
    try {
      const vendorId = (req.user as any).id;
      const sessionId = req.query.sessionId as string | undefined;
      const stats = await storage.getOrderStats(vendorId, sessionId);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching order stats:", error);
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  // Toggle live mode
  app.post("/api/vendor/live-mode", isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user as any;
      const vendorId = user.id;
      const { liveMode } = req.body;
      
      if (typeof liveMode !== "boolean") {
        return res.status(400).json({ message: "liveMode must be a boolean" });
      }

      let config = await storage.getVendorConfig(vendorId);
      if (!config) {
        const businessName = user.businessName || `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email;
        config = await storage.createVendorConfig({ vendorId, businessName, liveMode });
      } else {
        config = await storage.setLiveMode(vendorId, liveMode);
      }

      res.json({ success: true, liveMode: config?.liveMode });
    } catch (error) {
      console.error("Error toggling live mode:", error);
      res.status(500).json({ message: "Failed to toggle live mode" });
    }
  });

  // Get vendor config
  app.get("/api/vendor/config", isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user as any;
      const vendorId = user.id;
      let config = await storage.getVendorConfig(vendorId);
      
      if (!config) {
        const businessName = user.businessName || `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email;
        config = await storage.createVendorConfig({ vendorId, businessName, liveMode: false });
      }

      res.json(config);
    } catch (error) {
      console.error("Error fetching vendor config:", error);
      res.status(500).json({ message: "Failed to fetch config" });
    }
  });

  // Update vendor config
  app.patch("/api/vendor/config", isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user as any;
      const vendorId = user.id;
      const { 
        welcomeMessage, 
        reservationDurationMinutes, 
        autoReplyEnabled,
        whatsappPhoneNumberId,
        whatsappAccessToken,
        whatsappVerifyToken,
        autoReminderEnabled,
        segment,
        businessName,
        mobileMoneyNumber,
        preferredPaymentMethod
      } = req.body;
      
      const updateData: Record<string, any> = {};
      if (welcomeMessage !== undefined) updateData.welcomeMessage = welcomeMessage;
      if (reservationDurationMinutes !== undefined) updateData.reservationDurationMinutes = reservationDurationMinutes;
      if (autoReplyEnabled !== undefined) updateData.autoReplyEnabled = autoReplyEnabled;
      if (whatsappPhoneNumberId !== undefined) updateData.whatsappPhoneNumberId = whatsappPhoneNumberId;
      if (whatsappAccessToken !== undefined) updateData.whatsappAccessToken = whatsappAccessToken;
      if (whatsappVerifyToken !== undefined) updateData.whatsappVerifyToken = whatsappVerifyToken;
      if (autoReminderEnabled !== undefined) updateData.autoReminderEnabled = autoReminderEnabled;
      if (segment !== undefined) updateData.segment = segment;
      if (businessName !== undefined) updateData.businessName = businessName;
      if (mobileMoneyNumber !== undefined) updateData.mobileMoneyNumber = mobileMoneyNumber;
      if (preferredPaymentMethod !== undefined) updateData.preferredPaymentMethod = preferredPaymentMethod;

      let config = await storage.getVendorConfig(vendorId);
      if (!config) {
        const defaultBusinessName = businessName || user.businessName || `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email;
        config = await storage.createVendorConfig({ vendorId, businessName: defaultBusinessName, ...updateData });
      } else {
        config = await storage.updateVendorConfig(vendorId, updateData);
      }

      res.json(config);
    } catch (error) {
      console.error("Error updating vendor config:", error);
      res.status(500).json({ message: "Failed to update config" });
    }
  });

  // Test WhatsApp connection
  app.post("/api/vendor/test-whatsapp", isAuthenticated, async (req: any, res) => {
    try {
      const vendorId = (req.user as any).id;
      const config = await storage.getVendorConfig(vendorId);
      
      if (!config?.whatsappPhoneNumberId || !config?.whatsappAccessToken) {
        return res.status(400).json({ 
          success: false, 
          message: "Configuration WhatsApp incomplète. Veuillez configurer Phone Number ID et Access Token." 
        });
      }

      // Tester la connexion avec l'API Meta
      const response = await fetch(
        `https://graph.facebook.com/v18.0/${config.whatsappPhoneNumberId}`,
        {
          headers: { "Authorization": `Bearer ${config.whatsappAccessToken}` }
        }
      );

      if (response.ok) {
        const data = await response.json();
        res.json({ 
          success: true, 
          message: "Connexion WhatsApp réussie !",
          phoneNumber: data.display_phone_number,
          verifiedName: data.verified_name
        });
      } else {
        const error = await response.json();
        res.status(400).json({ 
          success: false, 
          message: error.error?.message || "Erreur de connexion WhatsApp" 
        });
      }
    } catch (error) {
      console.error("WhatsApp test error:", error);
      res.status(500).json({ success: false, message: "Erreur de test WhatsApp" });
    }
  });

  // ============================================================
  // ADMIN BACKOFFICE ROUTES
  // ============================================================

  // Admin middleware - check if user has admin role
  const isAdmin = (req: any, res: any, next: any) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Non authentifié" });
    }
    const user = req.user as any;
    if (user.role !== "admin") {
      return res.status(403).json({ message: "Accès non autorisé - Admin requis" });
    }
    next();
  };

  // Get admin stats
  app.get("/api/admin/stats", isAdmin, async (req: any, res) => {
    try {
      const stats = await storage.getAdminStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching admin stats:", error);
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  // Get all vendors
  app.get("/api/admin/vendors", isAdmin, async (req: any, res) => {
    try {
      const vendors = await storage.getAllVendors();
      res.json(vendors);
    } catch (error) {
      console.error("Error fetching vendors:", error);
      res.status(500).json({ message: "Failed to fetch vendors" });
    }
  });

  // Get vendor config by vendor ID
  app.get("/api/admin/vendors/:vendorId/config", isAdmin, async (req: any, res) => {
    try {
      const { vendorId } = req.params;
      const config = await storage.getVendorConfig(vendorId);
      if (!config) {
        return res.status(404).json({ message: "Config not found" });
      }
      res.json(config);
    } catch (error) {
      console.error("Error fetching vendor config:", error);
      res.status(500).json({ message: "Failed to fetch vendor config" });
    }
  });

  // Update vendor config (admin)
  app.patch("/api/admin/vendors/:vendorId/config", isAdmin, async (req: any, res) => {
    try {
      const { vendorId } = req.params;
      const updateData = req.body;

      let config = await storage.getVendorConfig(vendorId);
      if (!config) {
        // Create config if doesn't exist
        const vendor = await storage.getVendorById(vendorId);
        if (!vendor) {
          return res.status(404).json({ message: "Vendor not found" });
        }
        const businessName = updateData.businessName || vendor.businessName || vendor.email;
        config = await storage.createVendorConfig({ vendorId, businessName, ...updateData });
      } else {
        config = await storage.updateVendorConfig(vendorId, updateData);
      }

      res.json(config);
    } catch (error) {
      console.error("Error updating vendor config:", error);
      res.status(500).json({ message: "Failed to update vendor config" });
    }
  });

  // Get all orders (admin)
  app.get("/api/admin/orders", isAdmin, async (req: any, res) => {
    try {
      const orders = await storage.getAllOrders();
      res.json(orders);
    } catch (error) {
      console.error("Error fetching orders:", error);
      res.status(500).json({ message: "Failed to fetch orders" });
    }
  });

  // ============================================================
  // WHATSAPP CONVERSATIONAL AUTOMATION ROUTES
  // ============================================================

  // Get WhatsApp conversational automation config
  app.get("/api/vendor/whatsapp-automation", isAuthenticated, async (req: any, res) => {
    try {
      const vendorId = (req.user as any).id;
      const config = await storage.getVendorConfig(vendorId);
      
      if (!config?.whatsappPhoneNumberId || !config?.whatsappAccessToken) {
        return res.status(400).json({ 
          success: false, 
          message: "Configuration WhatsApp incomplète" 
        });
      }

      const result = await whatsappService.getConversationalAutomation(config);
      res.json(result);
    } catch (error) {
      console.error("Error getting WhatsApp automation:", error);
      res.status(500).json({ success: false, message: "Erreur serveur" });
    }
  });

  // Configure WhatsApp conversational automation
  app.post("/api/vendor/whatsapp-automation", isAuthenticated, async (req: any, res) => {
    try {
      const vendorId = (req.user as any).id;
      const config = await storage.getVendorConfig(vendorId);
      
      if (!config?.whatsappPhoneNumberId || !config?.whatsappAccessToken) {
        return res.status(400).json({ 
          success: false, 
          message: "Configuration WhatsApp incomplète. Configurez d'abord Phone Number ID et Access Token." 
        });
      }

      const { enableWelcomeMessage, commands, prompts } = req.body;
      
      const result = await whatsappService.configureConversationalAutomation(config, {
        enableWelcomeMessage,
        commands,
        prompts,
      });

      res.json(result);
    } catch (error) {
      console.error("Error configuring WhatsApp automation:", error);
      res.status(500).json({ success: false, message: "Erreur serveur" });
    }
  });

  // Setup default WhatsApp commands for LivePay
  app.post("/api/vendor/whatsapp-automation/setup-defaults", isAuthenticated, async (req: any, res) => {
    try {
      const vendorId = (req.user as any).id;
      const config = await storage.getVendorConfig(vendorId);
      
      if (!config?.whatsappPhoneNumberId || !config?.whatsappAccessToken) {
        return res.status(400).json({ 
          success: false, 
          message: "Configuration WhatsApp incomplète. Configurez d'abord Phone Number ID et Access Token." 
        });
      }

      const result = await whatsappService.setupDefaultCommands(config);
      res.json(result);
    } catch (error) {
      console.error("Error setting up WhatsApp defaults:", error);
      res.status(500).json({ success: false, message: "Erreur serveur" });
    }
  });

  // ============================================================
  // ADMIN WHATSAPP MANAGEMENT ROUTES
  // ============================================================

  // Test WhatsApp connection for a specific vendor (admin)
  app.post("/api/admin/vendors/:vendorId/test-whatsapp", isAdmin, async (req: any, res) => {
    try {
      const { vendorId } = req.params;
      const config = await storage.getVendorConfig(vendorId);
      
      if (!config?.whatsappPhoneNumberId || !config?.whatsappAccessToken) {
        return res.json({ 
          success: false, 
          message: "Configuration WhatsApp incomplète" 
        });
      }

      // Test connection with Meta API
      const response = await fetch(
        `https://graph.facebook.com/v18.0/${config.whatsappPhoneNumberId}`,
        {
          headers: { "Authorization": `Bearer ${config.whatsappAccessToken}` }
        }
      );

      if (response.ok) {
        const data = await response.json();
        res.json({ 
          success: true, 
          message: "Connexion réussie",
          phoneNumber: data.display_phone_number,
          verifiedName: data.verified_name
        });
      } else {
        const error = await response.json();
        res.json({ 
          success: false, 
          message: error.error?.message || "Erreur de connexion WhatsApp" 
        });
      }
    } catch (error) {
      console.error("WhatsApp test error:", error);
      res.json({ success: false, message: "Erreur de test" });
    }
  });

  // Setup WhatsApp defaults for a specific vendor (admin)
  app.post("/api/admin/vendors/:vendorId/setup-whatsapp-defaults", isAdmin, async (req: any, res) => {
    try {
      const { vendorId } = req.params;
      const config = await storage.getVendorConfig(vendorId);
      
      if (!config?.whatsappPhoneNumberId || !config?.whatsappAccessToken) {
        return res.json({ 
          success: false, 
          error: "Configuration WhatsApp incomplète" 
        });
      }

      const result = await whatsappService.setupDefaultCommands(config);
      res.json(result);
    } catch (error) {
      console.error("Error setting up WhatsApp defaults:", error);
      res.json({ success: false, error: "Erreur serveur" });
    }
  });

  return httpServer;
}
