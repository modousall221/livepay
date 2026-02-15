/**
 * TemplateEngine - Messages dynamiques et personnalisés
 * Adapte les messages WhatsApp selon le segment vendeur et le contexte client
 */

import { Client, ClientTier, VendorSegment, Product, Order, VendorConfig } from "@shared/schema";
import { scoringEngine } from "./scoring-engine";

export interface MessageContext {
  client: {
    name: string;
    phone: string;
    tier: ClientTier;
    trustScore: number;
    previousPurchases: number;
  };
  product: {
    name: string;
    keyword: string;
    price: number;
    stock: number;
  };
  order?: {
    id: string;
    expiresAt: Date;
    paymentUrl: string;
    paymentToken: string;
    totalAmount: number;
    quantity: number;
  };
  vendor: {
    businessName: string;
    segment: VendorSegment;
    reservationMinutes: number;
  };
}

export interface RenderedMessage {
  text: string;
  buttons?: Array<{ id: string; title: string }>;
  useInteractiveButtons: boolean;
}

// Templates par segment et type de message
const TEMPLATES: Record<VendorSegment, Record<string, string>> = {
  live_seller: {
    welcome: `👋 {greeting} {client.name} !

👗 *{product.name}*
💰 {product.price} F CFA
📦 Stock: {stock_display}
⏱️ Réservé {remaining_time} pour toi

{tier_message}`,

    payment_choice: `💳 Choisis ton mode de paiement:

⏱️ Reste {remaining_time} pour payer`,

    payment_link: `🔗 Clique ici pour payer:
{order.paymentUrl}

💡 Tu seras redirigé vers {payment_method}
⏱️ Lien valide {remaining_time}`,

    confirmation: `🎉 *PAIEMENT CONFIRMÉ !*

📦 {product.name}
💰 {order.totalAmount} F CFA
🧾 Réf: {order_reference}

📞 Le vendeur te contactera pour la livraison.

{loyalty_message}`,

    reminder: `⏰ Plus que {remaining_time} pour payer !

👗 {product.name} - {product.price} F
🔗 {order.paymentUrl}`,

    expired: `⏳ Délai expiré pour {product.name}

Le produit a été remis en vente.
Renvoie le mot-clé pour recommander.`,

    out_of_stock: `😔 Désolé {client.name}, {product.name} n'est plus disponible.

📱 Reste connecté, un nouvel arrivage est prévu !`,

    live_inactive: `👋 Salut {client.name} !

Le vendeur n'est pas en live actuellement.
Tu seras notifié au prochain live.`
  },

  shop: {
    welcome: `Bienvenue chez *{vendor.businessName}* !

📦 *{product.name}*
💰 {product.price} F CFA
{product_description}

Réponds OUI pour commander.`,

    quantity_selection: `Combien en voulez-vous ?

📦 {product.name} - {product.price} F / unité
📊 {product.stock} disponibles`,

    payment_choice: `💳 Mode de paiement:

📦 {order.quantity}x {product.name}
💰 Total: {order.totalAmount} F CFA

⏱️ Commande valide {remaining_time}`,

    confirmation: `✅ *COMMANDE CONFIRMÉE !*

📦 {order.quantity}x {product.name}
💰 {order.totalAmount} F CFA
🧾 Réf: {order_reference}

📍 Passez récupérer votre commande chez {vendor.businessName}

{loyalty_message}`
  },

  events: {
    welcome: `🎫 *{product.name}*

💰 {product.price} F CFA
📦 Places disponibles: {product.stock}

⚠️ Un acompte de 50% est requis pour réserver.`,

    payment_choice: `💳 Acompte de {deposit_amount} F requis

🎫 {product.name}
💰 Prix total: {product.price} F
📅 Solde à payer sur place

⏱️ Réservation valide {remaining_time}`,

    confirmation: `🎉 *RÉSERVATION CONFIRMÉE !*

🎫 {product.name}
💰 Acompte payé: {order.totalAmount} F CFA
📅 Solde restant: {remaining_amount} F

🧾 Réf: {order_reference}
📱 Présentez cette référence à l'entrée.`
  },

  services: {
    welcome: `👋 Bienvenue chez *{vendor.businessName}* !

💇 *{product.name}*
💰 {product.price} F CFA

Choisis ton créneau pour réserver:`,

    datetime_selection: `📅 Choisis ton créneau:

💇 {product.name} - {product.price} F`,

    confirmation: `✅ *RENDEZ-VOUS CONFIRMÉ !*

💇 {product.name}
📅 {appointment_datetime}
💰 {order.totalAmount} F CFA
🧾 Réf: {order_reference}

📍 Adresse: {vendor.address}
📞 En cas d'empêchement, prévenez 2h avant.`
  },

  b2b: {
    welcome: `📦 *{vendor.businessName}* - Grossiste

📦 *{product.name}*
💰 {product.price} F CFA / unité
📊 Stock: {product.stock} unités

Quantité minimum: 10 unités`,

    quote_generated: `📋 *DEVIS #{quote_number}*

📦 {order.quantity}x {product.name}
💰 Prix unitaire: {product.price} F
💰 *Total: {order.totalAmount} F CFA*

💳 Paiement: Comptant ou 30 jours
📅 Validité: 7 jours`,

    confirmation: `✅ *COMMANDE B2B CONFIRMÉE !*

📦 {order.quantity}x {product.name}
💰 {order.totalAmount} F CFA
🧾 Facture: {order_reference}

📦 Livraison sous 48-72h
📞 Vous serez contacté pour les détails.`
  }
};

// Boutons interactifs par type de message
const BUTTONS: Record<string, Array<{ id: string; title: string }>> = {
  welcome_confirm: [
    { id: 'pay', title: '✅ PAYER' },
    { id: 'cancel', title: '❌ ANNULER' }
  ],
  payment_methods: [
    { id: 'wave', title: '🔵 WAVE' },
    { id: 'om', title: '🟠 OM' },
    { id: 'card', title: '💳 CARTE' }
  ],
  quantity_select: [
    { id: 'qty_1', title: '1' },
    { id: 'qty_2', title: '2' },
    { id: 'qty_3', title: '3' }
  ],
  confirmation_actions: [
    { id: 'history', title: '📜 MES ACHATS' }
  ],
  change_payment: [
    { id: 'change_method', title: '🔄 CHANGER' }
  ]
};

export class TemplateEngine {
  private static instance: TemplateEngine;
  
  private constructor() {}
  
  static getInstance(): TemplateEngine {
    if (!TemplateEngine.instance) {
      TemplateEngine.instance = new TemplateEngine();
    }
    return TemplateEngine.instance;
  }

  /**
   * Rend un template avec le contexte donné
   */
  render(
    segment: VendorSegment, 
    templateName: string, 
    context: MessageContext,
    options?: { paymentMethod?: string; includeButtons?: boolean }
  ): RenderedMessage {
    // Récupérer le template (fallback vers live_seller)
    const template = TEMPLATES[segment]?.[templateName] 
      || TEMPLATES.live_seller[templateName]
      || '';
    
    if (!template) {
      console.warn(`Template not found: ${segment}/${templateName}`);
      return { text: '', useInteractiveButtons: false };
    }
    
    // Enrichir le contexte
    const enrichedContext = this.enrichContext(context, options);
    
    // Interpoler les variables
    const text = this.interpolate(template, enrichedContext);
    
    // Déterminer les boutons à afficher
    const buttons = options?.includeButtons !== false 
      ? this.getButtonsForTemplate(templateName, segment) 
      : undefined;
    
    return {
      text,
      buttons,
      useInteractiveButtons: !!buttons && buttons.length > 0
    };
  }

  /**
   * Enrichit le contexte avec des valeurs calculées
   */
  private enrichContext(
    ctx: MessageContext, 
    options?: { paymentMethod?: string }
  ): Record<string, any> {
    const now = new Date();
    
    // Calculer le temps restant si applicable
    let remainingTime = '';
    let remainingMinutes = 0;
    if (ctx.order?.expiresAt) {
      const expires = new Date(ctx.order.expiresAt);
      const diffMs = expires.getTime() - now.getTime();
      remainingMinutes = Math.max(0, Math.floor(diffMs / 60000));
      const remainingSeconds = Math.max(0, Math.floor((diffMs % 60000) / 1000));
      remainingTime = `${remainingMinutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    } else {
      remainingTime = `${ctx.vendor.reservationMinutes} min`;
      remainingMinutes = ctx.vendor.reservationMinutes;
    }
    
    // Affichage du stock
    let stockDisplay = `${ctx.product.stock} disponibles`;
    if (ctx.product.stock === 1) {
      stockDisplay = '⚡ Dernier en stock !';
    } else if (ctx.product.stock <= 3) {
      stockDisplay = `🔥 Plus que ${ctx.product.stock} !`;
    }
    
    // Message de tier
    const tierMessage = scoringEngine.getTierMessage(ctx.client.tier);
    
    // Message de fidélité
    const loyaltyMessage = ctx.client.previousPurchases > 0 
      ? this.getLoyaltyMessage(ctx.client.previousPurchases + 1)
      : '🎉 Premier achat réussi !';
    
    // Référence commande formatée
    const orderReference = ctx.order?.id 
      ? `#LP-${new Date().getFullYear()}-${ctx.order.id.slice(0, 8).toUpperCase()}`
      : '';
    
    // Greeting basé sur l'heure
    const hour = now.getHours();
    let greeting = 'Salut';
    if (hour < 12) greeting = 'Bonjour';
    else if (hour >= 18) greeting = 'Bonsoir';
    
    return {
      ...ctx,
      greeting,
      remaining_time: remainingTime,
      remaining_minutes: remainingMinutes,
      stock_display: stockDisplay,
      tier_message: tierMessage,
      loyalty_message: loyaltyMessage,
      order_reference: orderReference,
      payment_method: options?.paymentMethod || 'Wave',
      deposit_amount: Math.round(ctx.product.price * 0.5),
      remaining_amount: Math.round(ctx.product.price * 0.5),
      product_description: ctx.product.keyword ? `🏷️ Réf: ${ctx.product.keyword}` : ''
    };
  }

  /**
   * Interpole les variables dans le template
   */
  private interpolate(template: string, context: Record<string, any>): string {
    return template.replace(/\{([^}]+)\}/g, (match, path) => {
      const value = this.getNestedValue(context, path);
      if (value === undefined || value === null) return '';
      if (typeof value === 'number') {
        // Formatter les prix
        return value.toLocaleString('fr-FR');
      }
      return String(value);
    });
  }

  /**
   * Récupère une valeur imbriquée (ex: "client.name")
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : undefined;
    }, obj);
  }

  /**
   * Retourne les boutons appropriés pour un template
   */
  private getButtonsForTemplate(
    templateName: string, 
    segment: VendorSegment
  ): Array<{ id: string; title: string }> | undefined {
    switch (templateName) {
      case 'welcome':
        return BUTTONS.welcome_confirm;
      case 'payment_choice':
        return BUTTONS.payment_methods;
      case 'payment_link':
        return BUTTONS.change_payment;
      case 'confirmation':
        return BUTTONS.confirmation_actions;
      case 'quantity_selection':
        return BUTTONS.quantity_select;
      default:
        return undefined;
    }
  }

  /**
   * Message de fidélité basé sur le nombre d'achats
   */
  private getLoyaltyMessage(totalPurchases: number): string {
    if (totalPurchases === 1) return '🎉 Premier achat réussi ! Bienvenue';
    if (totalPurchases === 3) return '⭐ 3ème achat ! Tu es maintenant client Argent 🥈';
    if (totalPurchases === 6) return '🥇 6ème achat ! Tu passes client Or';
    if (totalPurchases === 10) return '💎 10ème achat ! Félicitations, tu es Diamant';
    if (totalPurchases >= 5) return `⭐ ${totalPurchases}ème achat !`;
    return '';
  }

  /**
   * Génère un message d'urgence pour stock bas
   */
  getUrgencyMessage(stock: number): string {
    if (stock === 0) return '❌ RUPTURE DE STOCK';
    if (stock === 1) return '⚡ DERNIER EN STOCK !';
    if (stock <= 3) return `🔥 Plus que ${stock} disponibles !`;
    return '';
  }

  /**
   * Message de suggestion/upsell
   */
  getUpsellMessage(
    productName: string, 
    productPrice: number, 
    clientTier: ClientTier
  ): string | null {
    // Pas d'upsell pour nouveaux clients
    if (clientTier === 'bronze') return null;
    
    return `💡 Ça pourrait te plaire: *${productName}* à seulement ${productPrice.toLocaleString('fr-FR')} F !`;
  }

  /**
   * Résumé de fin de live pour le vendeur
   */
  generateLiveSummary(stats: {
    duration: number;          // en minutes
    totalOrders: number;
    paidOrders: number;
    expiredOrders: number;
    revenue: number;
    bestSeller?: { name: string; quantity: number };
    newClients: number;
    returningClients: number;
  }): string {
    const hours = Math.floor(stats.duration / 60);
    const minutes = stats.duration % 60;
    const durationStr = hours > 0 
      ? `${hours}h ${minutes}min` 
      : `${minutes}min`;
    
    const conversionRate = stats.totalOrders > 0 
      ? Math.round((stats.paidOrders / stats.totalOrders) * 100) 
      : 0;
    
    let summary = `📊 *RÉSUMÉ DE TON LIVE*
Durée: ${durationStr}

💰 Chiffre: ${stats.revenue.toLocaleString('fr-FR')} F CFA
📦 Commandes: ${stats.totalOrders} (${stats.paidOrders} payées, ${stats.expiredOrders} expirées)
⭐ Taux conversion: ${conversionRate}%`;

    if (stats.bestSeller) {
      summary += `\n🏆 Best-seller: ${stats.bestSeller.name} (${stats.bestSeller.quantity} ventes)`;
    }

    summary += `

👥 Nouveaux clients: ${stats.newClients}
🔄 Clients récurrents: ${stats.returningClients}`;

    // Conseil automatique
    if (conversionRate < 50) {
      summary += `\n\n💡 Conseil: Réduis le délai de réservation pour plus de conversions`;
    } else if (conversionRate >= 80) {
      summary += `\n\n💡 Excellent live ! Continue comme ça 🚀`;
    }

    return summary;
  }
}

export const templateEngine = TemplateEngine.getInstance();
