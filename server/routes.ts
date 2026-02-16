import type { Express } from "express";
import { type Server } from "http";

/**
 * Minimal routes for development server
 * All data operations are handled directly by Firebase in the client
 * This server is only for:
 * - Local development (Vite proxy)
 * - Health check endpoint
 * - WhatsApp webhook (to be moved to Firebase Cloud Functions for production)
 */

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // Health check endpoint
  app.get("/api/health", (_req, res) => {
    res.json({ 
      status: "ok", 
      timestamp: new Date().toISOString(),
      mode: "firebase",
      message: "LivePay API - Data stored in Firebase"
    });
  });

  // WhatsApp webhook verification (GET request from Meta)
  app.get("/api/webhooks/whatsapp", (req, res) => {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];

    // The verify token should be configured in Firebase environment
    const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN || "livepay-webhook-verify";

    if (mode === "subscribe" && token === verifyToken) {
      console.log("[WhatsApp Webhook] Verified successfully");
      res.status(200).send(challenge);
    } else {
      console.log("[WhatsApp Webhook] Verification failed");
      res.sendStatus(403);
    }
  });

  // WhatsApp webhook messages (POST from Meta)
  // In production, this will be handled by Firebase Cloud Functions
  app.post("/api/webhooks/whatsapp", (req, res) => {
    const body = req.body;
    
    console.log("[WhatsApp Webhook] Received:", JSON.stringify(body, null, 2));
    
    // Always respond 200 to Meta quickly
    res.sendStatus(200);
    
    // TODO: Process webhook in Firebase Cloud Functions
    // For now, just log the incoming messages
    if (body.object === "whatsapp_business_account") {
      const entries = body.entry || [];
      for (const entry of entries) {
        const changes = entry.changes || [];
        for (const change of changes) {
          if (change.field === "messages") {
            const value = change.value;
            const messages = value?.messages || [];
            
            for (const message of messages) {
              console.log("[WhatsApp] Message from:", message.from);
              console.log("[WhatsApp] Content:", message.text?.body || message.type);
            }
          }
        }
      }
    }
  });

  return httpServer;
}
