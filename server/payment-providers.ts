// ============================================================================
// MOBILE MONEY DIRECT PAYMENT - Pas de PSP intermédiaire
// Génère des deep links vers les apps Wave et Orange Money
// Le vendeur reçoit le paiement directement sur son numéro mobile money
// ============================================================================

export interface PaymentResult {
  success: boolean;
  providerRef?: string;
  error?: string;
  redirectUrl?: string;
  deepLink?: string;
  ussdCode?: string;
  instructions?: string;
}

export interface PaymentProvider {
  name: string;
  generatePaymentLink(
    amount: number,
    vendorPhone: string,
    reference: string,
    metadata?: Record<string, string>
  ): Promise<PaymentResult>;
}

// ============================================================================
// WAVE PAYMENT
// Deep link: wave://send?phone=221XXXXXXXXX&amount=XXXXX
// Fallback web: https://pay.wave.com/m/phone?a=amount (pour les QR)
// ============================================================================
class WaveProvider implements PaymentProvider {
  name = "wave";

  async generatePaymentLink(
    amount: number,
    vendorPhone: string,
    reference: string,
    metadata?: Record<string, string>
  ): Promise<PaymentResult> {
    // Nettoyer le numéro (enlever espaces, +, etc)
    const cleanPhone = vendorPhone.replace(/[^0-9]/g, "");
    
    // Deep link Wave - ouvre directement l'app avec montant pré-rempli
    const deepLink = `wave://send?phone=${cleanPhone}&amount=${amount}`;
    
    // USSD code pour Wave Sénégal (fallback si pas de smartphone)
    const ussdCode = `*155*1*${cleanPhone}*${amount}#`;
    
    return {
      success: true,
      deepLink,
      ussdCode,
      providerRef: `WAVE-${Date.now()}-${reference.slice(0, 8)}`,
      instructions: `Envoyez ${amount.toLocaleString("fr-FR")} FCFA au ${cleanPhone} via Wave`,
    };
  }
}

// ============================================================================
// ORANGE MONEY PAYMENT
// Deep link: intent Android ou scheme iOS
// USSD: #144*1*numero*montant#
// ============================================================================
class OrangeMoneyProvider implements PaymentProvider {
  name = "orange_money";

  async generatePaymentLink(
    amount: number,
    vendorPhone: string,
    reference: string,
    metadata?: Record<string, string>
  ): Promise<PaymentResult> {
    const cleanPhone = vendorPhone.replace(/[^0-9]/g, "");
    
    // Deep link Orange Money (format Sénégal/Afrique de l'Ouest)
    const deepLink = `orangemoney://transfer?recipient=${cleanPhone}&amount=${amount}`;
    
    // USSD code pour Orange Money Sénégal
    const ussdCode = `#144*1*${cleanPhone}*${amount}#`;
    
    return {
      success: true,
      deepLink,
      ussdCode,
      providerRef: `OM-${Date.now()}-${reference.slice(0, 8)}`,
      instructions: `Envoyez ${amount.toLocaleString("fr-FR")} FCFA au ${cleanPhone} via Orange Money`,
    };
  }
}

// ============================================================================
// FREE MONEY (Sénégal)
// Pas de deep link connu - USSD seulement
// ============================================================================
class FreeMoneyProvider implements PaymentProvider {
  name = "free_money";

  async generatePaymentLink(
    amount: number,
    vendorPhone: string,
    reference: string,
    metadata?: Record<string, string>
  ): Promise<PaymentResult> {
    const cleanPhone = vendorPhone.replace(/[^0-9]/g, "");
    
    // USSD code pour Free Money Sénégal
    const ussdCode = `#555*1*${cleanPhone}*${amount}#`;
    
    return {
      success: true,
      deepLink: undefined,
      ussdCode,
      providerRef: `FREE-${Date.now()}-${reference.slice(0, 8)}`,
      instructions: `Composez ${ussdCode} pour envoyer ${amount.toLocaleString("fr-FR")} FCFA au ${cleanPhone}`,
    };
  }
}

// ============================================================================
// MOOV MONEY (Côte d'Ivoire, Bénin, etc)
// ============================================================================
class MoovMoneyProvider implements PaymentProvider {
  name = "moov_money";

  async generatePaymentLink(
    amount: number,
    vendorPhone: string,
    reference: string,
    metadata?: Record<string, string>
  ): Promise<PaymentResult> {
    const cleanPhone = vendorPhone.replace(/[^0-9]/g, "");
    
    // USSD Moov Money
    const ussdCode = `*155*1*${cleanPhone}*${amount}#`;
    
    return {
      success: true,
      deepLink: undefined,
      ussdCode,
      providerRef: `MOOV-${Date.now()}-${reference.slice(0, 8)}`,
      instructions: `Envoyez ${amount.toLocaleString("fr-FR")} FCFA au ${cleanPhone} via Moov Money`,
    };
  }
}

// ============================================================================
// MTN MOBILE MONEY
// ============================================================================
class MTNMomoProvider implements PaymentProvider {
  name = "mtn_momo";

  async generatePaymentLink(
    amount: number,
    vendorPhone: string,
    reference: string,
    metadata?: Record<string, string>
  ): Promise<PaymentResult> {
    const cleanPhone = vendorPhone.replace(/[^0-9]/g, "");
    
    // Deep link MTN MoMo
    const deepLink = `mtn://transfer?phone=${cleanPhone}&amount=${amount}`;
    const ussdCode = `*126*1*${cleanPhone}*${amount}#`;
    
    return {
      success: true,
      deepLink,
      ussdCode,
      providerRef: `MTN-${Date.now()}-${reference.slice(0, 8)}`,
      instructions: `Envoyez ${amount.toLocaleString("fr-FR")} FCFA au ${cleanPhone} via MTN MoMo`,
    };
  }
}

// ============================================================================
// CASH PAYMENT (Paiement en espèces à la livraison)
// ============================================================================
class CashProvider implements PaymentProvider {
  name = "cash";

  async generatePaymentLink(
    amount: number,
    vendorPhone: string,
    reference: string,
    metadata?: Record<string, string>
  ): Promise<PaymentResult> {
    return {
      success: true,
      providerRef: `CASH-${Date.now()}-${reference.slice(0, 8)}`,
      instructions: `Paiement en espèces: ${amount.toLocaleString("fr-FR")} FCFA à la livraison`,
    };
  }
}

// ============================================================================
// Registry des providers
// ============================================================================
const providers: Record<string, PaymentProvider> = {
  wave: new WaveProvider(),
  orange_money: new OrangeMoneyProvider(),
  free_money: new FreeMoneyProvider(),
  moov_money: new MoovMoneyProvider(),
  mtn_momo: new MTNMomoProvider(),
  cash: new CashProvider(),
};

export function getPaymentProvider(method: string): PaymentProvider | undefined {
  return providers[method];
}

export function getAvailableProviders(): { 
  id: string; 
  name: string; 
  description: string; 
  icon: string;
  color: string;
  countries: string[];
}[] {
  return [
    { 
      id: "wave", 
      name: "Wave", 
      description: "Paiement mobile Wave",
      icon: "wave",
      color: "#1DC4F9",
      countries: ["SN", "CI", "ML", "BF", "GM"]
    },
    { 
      id: "orange_money", 
      name: "Orange Money", 
      description: "Paiement mobile Orange",
      icon: "orange",
      color: "#FF6600",
      countries: ["SN", "CI", "ML", "BF", "CM", "MG"]
    },
    { 
      id: "free_money", 
      name: "Free Money", 
      description: "Paiement mobile Free",
      icon: "free",
      color: "#E31937",
      countries: ["SN"]
    },
    { 
      id: "moov_money", 
      name: "Moov Money", 
      description: "Paiement mobile Moov",
      icon: "moov",
      color: "#0066B3",
      countries: ["CI", "BJ", "TG", "NE"]
    },
    { 
      id: "mtn_momo", 
      name: "MTN MoMo", 
      description: "Paiement mobile MTN",
      icon: "mtn",
      color: "#FFCC00",
      countries: ["CI", "CM", "BJ", "GH", "UG"]
    },
    { 
      id: "cash", 
      name: "Espèces", 
      description: "Paiement à la livraison",
      icon: "cash",
      color: "#22C55E",
      countries: ["ALL"]
    },
  ];
}
