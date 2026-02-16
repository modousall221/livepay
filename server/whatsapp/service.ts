import type {
  SendMessageOptions,
  InteractiveMessage,
  ConversationState,
  WebhookMessage,
} from "./types";
import { storage } from "../storage";
import { db } from "../db";
import { liveSessions } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import crypto from "crypto";
import type { VendorConfig, Product, Order } from "@shared/schema";
import { ScoringEngine } from "../services/scoring-engine";

// Configuration WhatsApp Business API
const WHATSAPP_API_URL = "https://graph.facebook.com/v18.0";

// Cache des états de conversation (en production, utiliser Redis)
const conversationStates = new Map<string, ConversationState>();
const scoringEngine = ScoringEngine.getInstance();

/**
 * Service WhatsApp LivePay - Chatbot Transactionnel
 * 
 * Flux simplifié:
 * 1. Client envoie mot-clé (ROBE1)
 * 2. Bot trouve produit, affiche prix/stock
 * 3. Demande quantité
 * 4. Crée commande avec réservation stock
 * 5. Envoie lien paiement (10 min)
 * 6. Après paiement: confirme stock, notifie vendeur
 */
export class WhatsAppService {
  
  /**
   * Envoie un message WhatsApp via l'API Meta
   */
  async sendMessage(
    options: SendMessageOptions,
    vendorConfig?: VendorConfig
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const phoneNumberId = vendorConfig?.whatsappPhoneNumberId || process.env.WHATSAPP_PHONE_NUMBER_ID;
    const accessToken = vendorConfig?.whatsappAccessToken || process.env.WHATSAPP_ACCESS_TOKEN;

    if (!phoneNumberId || !accessToken) {
      console.log("[WhatsApp] API non configurée, simulation d'envoi:", options.to);
      return { success: true, messageId: `sim_${Date.now()}` };
    }

    try {
      const payload: any = {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: options.to,
        type: options.type,
      };

      if (options.type === "text" && options.text) {
        payload.text = { preview_url: true, body: options.text };
      } else if (options.type === "template" && options.template) {
        payload.template = options.template;
      } else if (options.type === "interactive" && options.interactive) {
        payload.interactive = options.interactive;
      }

      const response = await fetch(
        `${WHATSAPP_API_URL}/${phoneNumberId}/messages`,
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      const data = await response.json();
      
      if (!response.ok) {
        console.error("[WhatsApp] Erreur API:", data);
        return { success: false, error: data.error?.message || "Erreur inconnue" };
      }

      return { success: true, messageId: data.messages?.[0]?.id };
    } catch (error) {
      console.error("[WhatsApp] Erreur d'envoi:", error);
      return { success: false, error: String(error) };
    }
  }

  /**
   * Envoie un message texte simple
   */
  async sendText(to: string, text: string, vendorConfig?: VendorConfig): Promise<{ success: boolean; messageId?: string }> {
    return this.sendMessage({ to, type: "text", text }, vendorConfig);
  }

  /**
   * Envoie un message interactif avec des boutons
   */
  async sendButtons(
    to: string,
    body: string,
    buttons: Array<{ id: string; title: string }>,
    vendorConfig?: VendorConfig,
    header?: string,
    footer?: string
  ): Promise<{ success: boolean; messageId?: string }> {
    const interactive: InteractiveMessage = {
      type: "button",
      body: { text: body },
      action: {
        buttons: buttons.slice(0, 3).map((btn) => ({
          type: "reply" as const,
          reply: { id: btn.id, title: btn.title.slice(0, 20) },
        })),
      },
    };

    if (header) {
      interactive.header = { type: "text", text: header };
    }
    if (footer) {
      interactive.footer = { text: footer };
    }

    return this.sendMessage({ to, type: "interactive", interactive }, vendorConfig);
  }

  /**
   * Traite un message entrant du webhook
   * Flux principal du chatbot transactionnel
   */
  async processIncomingMessage(
    message: WebhookMessage,
    contact: { phone: string; name?: string },
    phoneNumberId: string
  ): Promise<void> {
    const clientPhone = contact.phone;
    const clientName = contact.name || "Client";

    console.log(`[WhatsApp Bot] Message de ${clientPhone}:`, message);

    // Trouver le vendeur associé à ce numéro WhatsApp
    const vendorConfig = await storage.getVendorConfigByWhatsAppPhoneId(phoneNumberId);
    
    if (!vendorConfig) {
      console.log(`[WhatsApp] Aucun vendeur trouvé pour phoneNumberId: ${phoneNumberId}`);
      return;
    }

    // Vérifier si le mode Live est activé
    if (!vendorConfig.liveMode && !vendorConfig.autoReplyEnabled) {
      console.log(`[WhatsApp] Mode Live OFF pour vendeur ${vendorConfig.vendorId}`);
      return;
    }

    // Récupérer ou créer l'état de conversation
    const stateKey = `${vendorConfig.vendorId}:${clientPhone}`;
    let state = conversationStates.get(stateKey);
    
    if (!state) {
      state = {
        phone: clientPhone,
        vendorId: vendorConfig.vendorId,
        currentStep: "idle",
        lastInteraction: new Date(),
        context: { clientName },
      };
      conversationStates.set(stateKey, state);
    }

    state.lastInteraction = new Date();
    state.context.clientName = clientName;

    // Extraire le texte du message
    let text = "";
    let buttonReplyId = "";

    if (message.type === "text" && message.text) {
      text = message.text.body.trim();
    } else if (message.type === "interactive") {
      if (message.interactive?.button_reply) {
        buttonReplyId = message.interactive.button_reply.id;
        text = message.interactive.button_reply.title;
      } else if (message.interactive?.list_reply) {
        buttonReplyId = message.interactive.list_reply.id;
        text = message.interactive.list_reply.title;
      }
    } else if (message.type === "button" && message.button) {
      buttonReplyId = message.button.payload;
      text = message.button.text;
    }

    // Traiter selon l'état de la conversation
    await this.handleConversation(clientPhone, text, buttonReplyId, state, vendorConfig);
  }

  /**
   * Gère le flux de conversation simplifié
   */
  private async handleConversation(
    clientPhone: string,
    text: string,
    buttonReplyId: string,
    state: ConversationState,
    vendorConfig: VendorConfig
  ): Promise<void> {
    const textLower = text.toLowerCase().trim();
    const clientName = state.context.clientName || "Client";

    // Traitement des boutons
    if (buttonReplyId) {
      if (buttonReplyId === "confirm_order") {
        await this.confirmOrder(clientPhone, state, vendorConfig);
        return;
      }
      if (buttonReplyId === "cancel_order") {
        await this.cancelOrder(clientPhone, state, vendorConfig);
        return;
      }
      if (buttonReplyId.startsWith("qty_")) {
        const qty = parseInt(buttonReplyId.replace("qty_", ""), 10);
        await this.handleQuantitySelection(clientPhone, qty, state, vendorConfig);
        return;
      }
    }

    // État: en attente de quantité
    if (state.currentStep === "awaiting_quantity") {
      const qty = parseInt(text, 10);
      if (!isNaN(qty) && qty > 0) {
        await this.handleQuantitySelection(clientPhone, qty, state, vendorConfig);
        return;
      }
      await this.sendText(
        clientPhone,
        "❌ Veuillez entrer un nombre valide (ex: 1, 2, 3...)",
        vendorConfig
      );
      return;
    }

    // Commandes spéciales
    if (textLower === "aide" || textLower === "help" || textLower === "?") {
      await this.sendHelpMessage(clientPhone, vendorConfig);
      return;
    }

    if (textLower === "statut" || textLower === "status" || textLower === "commandes") {
      await this.sendOrderStatus(clientPhone, vendorConfig);
      return;
    }

    // Recherche par mot-clé produit
    const product = await storage.getProductByKeyword(vendorConfig.vendorId, text);
    
    if (product) {
      await this.handleProductKeyword(clientPhone, product, state, vendorConfig);
      return;
    }

    // Message de bienvenue si nouveau
    if (state.currentStep === "idle" || textLower.match(/^(bonjour|salut|hello|hi|bjr|slt)$/)) {
      await this.sendWelcomeMessage(clientPhone, vendorConfig, clientName);
      state.currentStep = "browsing";
      return;
    }

    // Mot-clé non reconnu
    await this.sendText(
      clientPhone,
      `❓ Mot-clé "${text}" non reconnu.\n\nEnvoyez le mot-clé affiché pendant le live pour commander.\n\nTapez "aide" pour plus d'informations.`,
      vendorConfig
    );
  }

  /**
   * Gère la recherche par mot-clé produit
   */
  private async handleProductKeyword(
    clientPhone: string,
    product: Product,
    state: ConversationState,
    vendorConfig: VendorConfig
  ): Promise<void> {
    const availableStock = await storage.getAvailableStock(product.id);

    if (availableStock <= 0) {
      await this.sendText(
        clientPhone,
        `😔 *${product.name}*\n\n❌ Rupture de stock\n\nCe produit n'est plus disponible pour le moment.`,
        vendorConfig
      );
      return;
    }

    state.selectedProductId = product.id;
    state.context.selectedProduct = product;
    state.currentStep = "awaiting_quantity";

    const maxQty = Math.min(availableStock, 3);
    const qtyButtons = [];
    for (let i = 1; i <= maxQty; i++) {
      qtyButtons.push({ id: `qty_${i}`, title: `${i}` });
    }

    const message = `📦 *${product.name}*

💰 Prix: *${product.price.toLocaleString("fr-FR")} FCFA*
📊 Stock disponible: *${availableStock}*

${product.description ? `\n${product.description}\n` : ""}
Combien souhaitez-vous en commander ?`;

    if (qtyButtons.length > 0) {
      await this.sendButtons(clientPhone, message, qtyButtons, vendorConfig, "🛒 Commander");
    } else {
      await this.sendText(clientPhone, message + "\n\nEntrez la quantité souhaitée:", vendorConfig);
    }
  }

  /**
   * Gère la sélection de quantité
   */
  private async handleQuantitySelection(
    clientPhone: string,
    quantity: number,
    state: ConversationState,
    vendorConfig: VendorConfig
  ): Promise<void> {
    const product = state.context.selectedProduct as Product;
    if (!product) {
      await this.sendText(clientPhone, "❌ Erreur: produit non trouvé. Veuillez recommencer.", vendorConfig);
      state.currentStep = "idle";
      return;
    }

    const availableStock = await storage.getAvailableStock(product.id);
    
    if (quantity > availableStock) {
      await this.sendText(
        clientPhone,
        `❌ Stock insuffisant.\n\nStock disponible: ${availableStock}\nQuantité demandée: ${quantity}\n\nVeuillez choisir une quantité ≤ ${availableStock}.`,
        vendorConfig
      );
      return;
    }

    state.context.quantity = quantity;
    state.currentStep = "confirming_order";

    const totalAmount = product.price * quantity;

    await this.sendButtons(
      clientPhone,
      `🧾 *Récapitulatif*

📦 ${product.name}
📊 Quantité: ${quantity}
💰 Prix unitaire: ${product.price.toLocaleString("fr-FR")} FCFA

*Total: ${totalAmount.toLocaleString("fr-FR")} FCFA*

⏱️ Vous aurez *${vendorConfig.reservationDurationMinutes || 10} min* pour payer.

Confirmer ?`,
      [
        { id: "confirm_order", title: "✅ Confirmer" },
        { id: "cancel_order", title: "❌ Annuler" },
      ],
      vendorConfig,
      "Confirmation"
    );
  }

  /**
   * Confirme la commande et envoie le lien de paiement
   * Utilise le scoring pour adapter le délai de réservation
   */
  private async confirmOrder(
    clientPhone: string,
    state: ConversationState,
    vendorConfig: VendorConfig
  ): Promise<void> {
    const product = state.context.selectedProduct as Product;
    const quantity = state.context.quantity as number;
    const clientName = state.context.clientName || "Client";

    if (!product || !quantity) {
      await this.sendText(clientPhone, "❌ Erreur. Veuillez recommencer.", vendorConfig);
      state.currentStep = "idle";
      return;
    }

    const availableStock = await storage.getAvailableStock(product.id);
    if (quantity > availableStock) {
      await this.sendText(
        clientPhone,
        `😔 Le stock a changé.\n\nStock disponible: ${availableStock}\n\nVeuillez recommencer.`,
        vendorConfig
      );
      state.currentStep = "idle";
      return;
    }

    const reserved = await storage.reserveStock(product.id, quantity);
    if (!reserved) {
      await this.sendText(clientPhone, "😔 Impossible de réserver. Réessayez.", vendorConfig);
      return;
    }

    const totalAmount = product.price * quantity;
    
    // Scoring: récupérer ou créer le client et calculer son score
    let client = await storage.getOrCreateClient(vendorConfig.vendorId, clientPhone, clientName);
    const clientScore = scoringEngine.calculateScore(client);
    
    // Adapter la durée de réservation selon le score
    let reservationMinutes = vendorConfig.reservationDurationMinutes || 10;
    if (clientScore.recommendations) {
      reservationMinutes = clientScore.recommendations.reservationMinutes;
    }
    
    const expiresAt = new Date(Date.now() + reservationMinutes * 60 * 1000);

    const [activeSession] = await db
      .select()
      .from(liveSessions)
      .where(and(eq(liveSessions.vendorId, vendorConfig.vendorId), eq(liveSessions.active, true)))
      .limit(1);

    try {
      const order = await storage.createOrder(vendorConfig.vendorId, {
        sessionId: activeSession?.id || null,
        productId: product.id,
        clientPhone,
        clientName,
        productName: product.name,
        quantity,
        unitPrice: product.price,
        totalAmount,
        expiresAt,
        clientId: client.id,
      });

      state.context.orderId = order.id;
      state.currentStep = "awaiting_payment";

      const appHost = process.env.APP_HOST || 
        (process.env.NODE_ENV === "production" ? "https://livepay.tech" : "http://localhost:5000");
      const payUrl = `${appHost}/pay/${order.paymentToken}`;

      await storage.updateOrderPaymentInfo(order.id, payUrl, "wave");

      // Message personnalisé selon le tier du client
      let tierEmoji = "";
      if (clientScore.tier === "diamond") tierEmoji = "💎 ";
      else if (clientScore.tier === "gold") tierEmoji = "🥇 ";
      else if (clientScore.tier === "silver") tierEmoji = "🥈 ";

      await this.sendText(
        clientPhone,
        `${tierEmoji}✅ *Commande créée !*

📦 ${product.name} x${quantity}
💰 Total: *${totalAmount.toLocaleString("fr-FR")} FCFA*

⏱️ Vous avez *${reservationMinutes} minutes* pour payer.

👇 Cliquez pour payer:
${payUrl}

_Paiement sécurisé via Wave, Orange Money ou Carte_`,
        vendorConfig
      );

      console.log(`[WhatsApp Bot] Commande: ${order.id} - ${clientPhone} - ${product.name} x${quantity} - Score: ${clientScore.trustScore} - Tier: ${clientScore.tier}`);
    } catch (error) {
      await storage.releaseStock(product.id, quantity);
      console.error("[WhatsApp Bot] Erreur:", error);
      await this.sendText(clientPhone, "😔 Erreur. Veuillez réessayer.", vendorConfig);
    }
  }

  /**
   * Annule la commande
   */
  private async cancelOrder(
    clientPhone: string,
    state: ConversationState,
    vendorConfig: VendorConfig
  ): Promise<void> {
    state.currentStep = "idle";
    state.selectedProductId = undefined;
    state.context.selectedProduct = undefined;
    state.context.quantity = undefined;

    await this.sendText(clientPhone, "❌ Commande annulée.\n\nEnvoyez un mot-clé pour recommencer.", vendorConfig);
  }

  /**
   * Message de bienvenue
   */
  private async sendWelcomeMessage(
    clientPhone: string,
    vendorConfig: VendorConfig,
    clientName: string
  ): Promise<void> {
    const msg = vendorConfig.welcomeMessage || 
      `Bienvenue ${clientName} ! 🎉\n\nPour commander:\n1️⃣ Envoyez le mot-clé du produit\n2️⃣ Choisissez la quantité\n3️⃣ Payez en 1 clic\n\nTapez "aide" pour plus d'infos.`;

    await this.sendText(clientPhone, msg, vendorConfig);
  }

  /**
   * Message d'aide
   */
  private async sendHelpMessage(clientPhone: string, vendorConfig: VendorConfig): Promise<void> {
    await this.sendText(
      clientPhone,
      `❓ *Comment commander ?*

1️⃣ Pendant le live, notez le mot-clé (ex: ROBE1)
2️⃣ Envoyez ce mot-clé ici
3️⃣ Choisissez la quantité
4️⃣ Confirmez et payez en ${vendorConfig.reservationDurationMinutes || 10} min

💬 Commandes:
• "statut" - Voir vos commandes
• "aide" - Cette aide

🔒 Paiement 100% sécurisé`,
      vendorConfig
    );
  }

  /**
   * Statut des commandes
   */
  private async sendOrderStatus(clientPhone: string, vendorConfig: VendorConfig): Promise<void> {
    const recentOrders = await storage.getOrdersByClientPhone(vendorConfig.vendorId, clientPhone);
    
    if (recentOrders.length === 0) {
      await this.sendText(clientPhone, "📭 Pas de commandes récentes.", vendorConfig);
      return;
    }

    let text = "📋 *Vos commandes:*\n\n";

    for (const order of recentOrders.slice(0, 5)) {
      const emoji = order.status === "paid" ? "✅" : order.status === "reserved" ? "⏳" : order.status === "expired" ? "⌛" : "❌";
      text += `${emoji} *${order.productName}* x${order.quantity}\n   ${order.totalAmount.toLocaleString("fr-FR")} FCFA\n\n`;
    }

    await this.sendText(clientPhone, text, vendorConfig);
  }

  /**
   * Notifie le client du paiement reçu
   * Accepte soit un Order, soit les anciennes données d'invoice pour compatibilité
   */
  async notifyPaymentReceived(
    data: Order | { id: string; clientPhone: string; clientName: string; productName: string; amount: number; vendorId?: string },
    vendorConfig?: VendorConfig
  ): Promise<void> {
    // Déterminer s'il s'agit d'un Order ou des anciennes données
    const isOrder = 'quantity' in data && 'totalAmount' in data;
    
    const clientPhone = data.clientPhone;
    const productName = data.productName;
    const amount = isOrder ? (data as Order).totalAmount : (data as any).amount;
    const quantity = isOrder ? (data as Order).quantity : 1;
    const vendorId = isOrder ? (data as Order).vendorId : (data as any).vendorId;
    
    if (vendorId) {
      const stateKey = `${vendorId}:${clientPhone}`;
      const state = conversationStates.get(stateKey);
      if (state) state.currentStep = "idle";

      if (!vendorConfig) {
        vendorConfig = await storage.getVendorConfig(vendorId) || undefined;
      }
    }

    const message = isOrder
      ? `✅ *Paiement confirmé !*

📦 ${productName} x${quantity}
💰 ${amount.toLocaleString("fr-FR")} FCFA
🧾 Ref: #${data.id.slice(0, 8).toUpperCase()}

Le vendeur préparera votre commande.

Merci ! 🎉`
      : `✅ *Paiement confirmé !*

💰 *${amount.toLocaleString("fr-FR")} FCFA*
📦 ${productName}
🧾 #${data.id.slice(0, 8).toUpperCase()}

Merci ! 🎉`;

    await this.sendText(clientPhone, message, vendorConfig);
  }

  /**
   * Notifie le vendeur d'une nouvelle commande
   */
  async notifyVendorNewOrder(order: Order, vendorPhone?: string): Promise<void> {
    if (!vendorPhone) return;

    await this.sendText(
      vendorPhone,
      `🔔 *Nouvelle commande !*

📦 ${order.productName} x${order.quantity}
💰 ${order.totalAmount.toLocaleString("fr-FR")} FCFA

👤 ${order.clientName || order.clientPhone}
📱 ${order.clientPhone}

⏳ En attente de paiement
🧾 #${order.id.slice(0, 8).toUpperCase()}`
    );
  }

  /**
   * Notifie le vendeur qu'un paiement a été reçu
   */
  async notifyVendorPaymentReceived(order: Order, vendorPhone?: string): Promise<void> {
    if (!vendorPhone) return;

    await this.sendText(
      vendorPhone,
      `💰 *Paiement reçu !*

✅ ${order.productName} x${order.quantity}
💵 ${order.totalAmount.toLocaleString("fr-FR")} FCFA

👤 ${order.clientName || "Client"}
📱 ${order.clientPhone}

📦 Préparez cette commande !
🧾 #${order.id.slice(0, 8).toUpperCase()}`
    );
  }

  /**
   * Notifie le vendeur d'une commande expirée
   */
  async notifyVendorOrderExpired(order: Order, vendorPhone?: string): Promise<void> {
    if (!vendorPhone) return;

    await this.sendText(
      vendorPhone,
      `⏰ *Commande expirée*

📦 ${order.productName} x${order.quantity}
💰 ${order.totalAmount.toLocaleString("fr-FR")} FCFA

👤 ${order.clientName || "Client"} - Non payé dans les délais
📊 Stock libéré automatiquement

🧾 #${order.id.slice(0, 8).toUpperCase()}`
    );
  }

  /**
   * Envoie liste de produits (pour compatibilité)
   */
  async sendProductList(
    to: string,
    productsData: Array<{ id: string; name: string; price: number; description?: string }>,
    header: string = "📦 Produits"
  ): Promise<{ success: boolean; messageId?: string }> {
    let text = `*${header}*\n\n`;
    for (const p of productsData.slice(0, 10)) {
      text += `📦 *${p.name}*\n💰 ${p.price.toLocaleString("fr-FR")} FCFA\n\n`;
    }
    return this.sendText(to, text);
  }

  /**
   * Envoie lien de paiement (pour compatibilité)
   */
  async sendPaymentLink(
    to: string,
    data: { clientName: string; productName: string; amount: number; token: string; expiresAt: Date },
    appHost: string
  ): Promise<{ success: boolean; messageId?: string }> {
    const payUrl = `${appHost}/pay/${data.token}`;
    const mins = Math.max(0, Math.round((data.expiresAt.getTime() - Date.now()) / 60000));

    return this.sendText(
      to,
      `🧾 *Facture LivePay*

Bonjour ${data.clientName} !

📦 ${data.productName}
💰 *${data.amount.toLocaleString("fr-FR")} FCFA*

⏱️ Expire dans *${mins} min*

👇 Payez ici:
${payUrl}`
    );
  }

  /**
   * Confirmation paiement (compatibilité)
   */
  async sendPaymentConfirmation(
    to: string,
    data: { clientName: string; productName: string; amount: number; invoiceId: string }
  ): Promise<{ success: boolean; messageId?: string }> {
    return this.sendText(
      to,
      `✅ *Paiement confirmé !*

Merci ${data.clientName} !

💰 *${data.amount.toLocaleString("fr-FR")} FCFA*
📦 ${data.productName}
🧾 #${data.invoiceId.slice(0, 8).toUpperCase()}

Merci ! 🎉`
    );
  }

  /**
   * Configure les Conversational Components de WhatsApp
   * (welcome message, commands, prompts)
   */
  async configureConversationalAutomation(
    vendorConfig: VendorConfig,
    options: {
      enableWelcomeMessage?: boolean;
      commands?: Array<{ command_name: string; command_description: string }>;
      prompts?: string[];
    }
  ): Promise<{ success: boolean; error?: string }> {
    const phoneNumberId = vendorConfig.whatsappPhoneNumberId;
    const accessToken = vendorConfig.whatsappAccessToken;

    if (!phoneNumberId || !accessToken) {
      return { success: false, error: "WhatsApp API non configurée" };
    }

    try {
      const payload: any = {};
      
      if (options.enableWelcomeMessage !== undefined) {
        payload.enable_welcome_message = options.enableWelcomeMessage;
      }
      
      if (options.commands && options.commands.length > 0) {
        payload.commands = options.commands;
      }
      
      if (options.prompts && options.prompts.length > 0) {
        payload.prompts = options.prompts;
      }

      const response = await fetch(
        `${WHATSAPP_API_URL}/${phoneNumberId}/conversational_automation`,
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        console.error("[WhatsApp] Erreur config automation:", data);
        return { success: false, error: data.error?.message || "Erreur inconnue" };
      }

      console.log("[WhatsApp] Conversational automation configurée:", data);
      return { success: true };
    } catch (error) {
      console.error("[WhatsApp] Erreur config automation:", error);
      return { success: false, error: String(error) };
    }
  }

  /**
   * Récupère la configuration actuelle des Conversational Components
   */
  async getConversationalAutomation(
    vendorConfig: VendorConfig
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    const phoneNumberId = vendorConfig.whatsappPhoneNumberId;
    const accessToken = vendorConfig.whatsappAccessToken;

    if (!phoneNumberId || !accessToken) {
      return { success: false, error: "WhatsApp API non configurée" };
    }

    try {
      const response = await fetch(
        `${WHATSAPP_API_URL}/${phoneNumberId}?fields=conversational_automation`,
        {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${accessToken}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        console.error("[WhatsApp] Erreur get automation:", data);
        return { success: false, error: data.error?.message || "Erreur inconnue" };
      }

      return { success: true, data: data.conversational_automation };
    } catch (error) {
      console.error("[WhatsApp] Erreur get automation:", error);
      return { success: false, error: String(error) };
    }
  }

  /**
   * Configure les commandes par défaut pour LivePay
   */
  async setupDefaultCommands(vendorConfig: VendorConfig): Promise<{ success: boolean; error?: string }> {
    // Commandes par défaut pour un vendeur live commerce
    const defaultCommands = [
      { command_name: "aide", command_description: "Afficher l'aide et les commandes disponibles" },
      { command_name: "commandes", command_description: "Voir vos commandes en cours" },
      { command_name: "catalogue", command_description: "Afficher les produits disponibles" },
      { command_name: "annuler", command_description: "Annuler votre dernière commande" },
    ];

    const defaultPrompts = [
      "🛍️ Commander un produit",
      "📋 Mes commandes",
      "❓ Aide",
    ];

    return this.configureConversationalAutomation(vendorConfig, {
      enableWelcomeMessage: true,
      commands: defaultCommands,
      prompts: defaultPrompts,
    });
  }

  /**
   * Vérifie signature webhook
   */
  verifyWebhookSignature(payload: string, signature: string, appSecret?: string): boolean {
    const secret = appSecret || process.env.WHATSAPP_APP_SECRET;
    if (!secret) return true;

    const expected = crypto.createHmac("sha256", secret).update(payload).digest("hex");
    return signature === `sha256=${expected}`;
  }
}

export const whatsappService = new WhatsAppService();
