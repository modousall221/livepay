/**
 * Templates de messages WhatsApp pour LivePay
 * Ces templates peuvent être utilisés avec l'API WhatsApp Business
 * 
 * Note: Pour utiliser les templates officiels, ils doivent être approuvés par Meta
 * via le Business Manager. Ces exemples servent de guide.
 */

export interface MessageTemplate {
  id: string;
  name: string;
  language: string;
  category: "MARKETING" | "UTILITY" | "AUTHENTICATION";
  description: string;
  bodyText: string;
  variables: string[];
}

/**
 * Templates de messages (utility - transactionnels)
 */
export const messageTemplates: MessageTemplate[] = [
  {
    id: "payment_link",
    name: "livepay_payment_link",
    language: "fr",
    category: "UTILITY",
    description: "Envoie un lien de paiement au client",
    bodyText: `🧾 *Facture LivePay*

Bonjour {{1}} !

*Produit:* {{2}}
*Montant:* {{3}} FCFA

⏱️ Ce lien expire dans {{4}} minutes

👇 Cliquez pour payer en toute sécurité:
{{5}}

_Paiement sécurisé via Wave, Orange Money ou Carte bancaire_`,
    variables: ["clientName", "productName", "amount", "expiresInMinutes", "paymentUrl"],
  },
  {
    id: "payment_confirmed",
    name: "livepay_payment_confirmed",
    language: "fr",
    category: "UTILITY",
    description: "Confirme la réception du paiement",
    bodyText: `✅ *Paiement confirmé !*

Merci {{1}} !

Votre paiement de *{{2}} FCFA* pour "{{3}}" a été reçu.

🧾 Référence: #{{4}}

Le vendeur a été notifié et préparera votre commande.

Merci d'avoir utilisé LivePay ! 🎉`,
    variables: ["clientName", "amount", "productName", "reference"],
  },
  {
    id: "payment_reminder",
    name: "livepay_payment_reminder",
    language: "fr",
    category: "UTILITY",
    description: "Rappel de paiement en attente",
    bodyText: `⏰ *Rappel de paiement*

Bonjour {{1}},

Votre facture pour "{{2}}" ({{3}} FCFA) est toujours en attente.

Il vous reste {{4}} minutes pour finaliser le paiement:
{{5}}

_Après expiration, le produit sera remis en vente_`,
    variables: ["clientName", "productName", "amount", "remainingMinutes", "paymentUrl"],
  },
  {
    id: "order_expired",
    name: "livepay_order_expired",
    language: "fr",
    category: "UTILITY",
    description: "Notification d'expiration de commande",
    bodyText: `⌛ *Commande expirée*

Bonjour {{1}},

Votre réservation pour "{{2}}" a expiré car le paiement n'a pas été effectué dans les délais.

Vous pouvez repasser commande à tout moment.

Tapez "catalogue" pour voir nos produits disponibles.`,
    variables: ["clientName", "productName"],
  },
  {
    id: "welcome",
    name: "livepay_welcome",
    language: "fr",
    category: "MARKETING",
    description: "Message de bienvenue",
    bodyText: `👋 *Bienvenue chez {{1}} !*

Je suis l'assistant LivePay. Je peux vous aider à:

📦 Voir nos produits
🛒 Passer commande
💳 Payer en toute sécurité
📋 Suivre vos commandes

Tapez "catalogue" pour commencer !`,
    variables: ["businessName"],
  },
  {
    id: "order_shipped",
    name: "livepay_order_shipped",
    language: "fr",
    category: "UTILITY",
    description: "Notification d'expédition",
    bodyText: `📦 *Commande expédiée !*

Bonjour {{1}},

Votre commande "{{2}}" a été expédiée !

🚚 Mode de livraison: {{3}}
📍 Délai estimé: {{4}}

Merci pour votre achat !`,
    variables: ["clientName", "productName", "deliveryMethod", "estimatedDelivery"],
  },
];

/**
 * Génère un message à partir d'un template et des variables
 */
export function generateMessage(templateId: string, variables: Record<string, string | number>): string {
  const template = messageTemplates.find((t) => t.id === templateId);
  if (!template) {
    throw new Error(`Template "${templateId}" not found`);
  }

  let message = template.bodyText;
  
  // Remplacer les variables {{1}}, {{2}}, etc.
  template.variables.forEach((varName, index) => {
    const value = variables[varName];
    if (value !== undefined) {
      message = message.replace(new RegExp(`\\{\\{${index + 1}\\}\\}`, "g"), String(value));
    }
  });

  return message;
}

/**
 * Messages prédéfinis pour les réponses du bot
 */
export const botResponses = {
  welcome: (customerName: string) => `Bienvenue ${customerName} ! 🎉

Je suis l'assistant LivePay. Comment puis-je vous aider ?

📦 Tapez "catalogue" pour voir nos produits
❓ Tapez "aide" pour plus d'informations`,

  catalogEmpty: () => `😕 Aucun produit disponible pour le moment.

Revenez plus tard ou contactez le vendeur directement.`,

  productSelected: (productName: string, price: number, description?: string) => `📦 *${productName}*

💰 Prix: *${price.toLocaleString("fr-FR")} FCFA*

${description || ""}

Souhaitez-vous commander ce produit ?`,

  orderConfirmed: (productName: string, amount: number) => `✅ *Commande confirmée !*

📦 ${productName}
💰 ${amount.toLocaleString("fr-FR")} FCFA

Je vous envoie le lien de paiement...`,

  orderCancelled: () => `❌ Commande annulée.

Que souhaitez-vous faire ?`,

  help: () => `❓ *Comment utiliser LivePay ?*

1️⃣ *Voir les produits*
Tapez "catalogue" ou "produits"

2️⃣ *Commander*
Sélectionnez un produit, puis confirmez

3️⃣ *Payer*
Cliquez sur le lien de paiement envoyé

4️⃣ *Suivre ma commande*
Tapez "statut" ou "ma commande"

💬 Vous pouvez aussi écrire:
• "Je veux commander"
• "Je prends [produit]"

🔒 Paiement 100% sécurisé`,

  unknownCommand: () => `Je n'ai pas compris votre demande.

Tapez "aide" pour voir les commandes disponibles.`,

  error: () => `😕 Une erreur est survenue.

Veuillez réessayer ou contacter le vendeur.`,

  offHours: (openTime: string, closeTime: string) => `⏰ Nous sommes actuellement fermés.

Nos horaires d'ouverture: ${openTime} - ${closeTime}

Nous vous répondrons dès que possible !`,

  noOrders: () => `📭 Vous n'avez pas de commandes récentes.

Tapez "catalogue" pour passer une commande.`,
};

/**
 * Emojis utilisés dans les messages
 */
export const emojis = {
  paid: "✅",
  pending: "⏳",
  expired: "⌛",
  cancelled: "❌",
  product: "📦",
  money: "💰",
  time: "⏱️",
  link: "🔗",
  secure: "🔒",
  wave: "🌊",
  orange: "🍊",
  card: "💳",
  cash: "💵",
  delivery: "🚚",
  location: "📍",
  phone: "📱",
  help: "❓",
  welcome: "👋",
  success: "🎉",
  warning: "⚠️",
  error: "😕",
  bell: "🔔",
};
