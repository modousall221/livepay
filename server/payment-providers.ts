export interface PaymentResult {
  success: boolean;
  providerRef?: string;
  error?: string;
  redirectUrl?: string;
}

export interface PaymentProvider {
  name: string;
  processPayment(invoiceId: string, amount: number, metadata: Record<string, string>): Promise<PaymentResult>;
  checkStatus(providerRef: string): Promise<string>;
}

class WaveProvider implements PaymentProvider {
  name = "wave";

  async processPayment(invoiceId: string, amount: number, metadata: Record<string, string>): Promise<PaymentResult> {
    const ref = `WAVE-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    return {
      success: true,
      providerRef: ref,
    };
  }

  async checkStatus(providerRef: string): Promise<string> {
    return "paid";
  }
}

class OrangeMoneyProvider implements PaymentProvider {
  name = "orange_money";

  async processPayment(invoiceId: string, amount: number, metadata: Record<string, string>): Promise<PaymentResult> {
    const ref = `OM-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    return {
      success: true,
      providerRef: ref,
    };
  }

  async checkStatus(providerRef: string): Promise<string> {
    return "paid";
  }
}

class CardProvider implements PaymentProvider {
  name = "card";

  async processPayment(invoiceId: string, amount: number, metadata: Record<string, string>): Promise<PaymentResult> {
    const ref = `CARD-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    return {
      success: true,
      providerRef: ref,
    };
  }

  async checkStatus(providerRef: string): Promise<string> {
    return "paid";
  }
}

class CashProvider implements PaymentProvider {
  name = "cash";

  async processPayment(invoiceId: string, amount: number, metadata: Record<string, string>): Promise<PaymentResult> {
    const ref = `CASH-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    return {
      success: true,
      providerRef: ref,
    };
  }

  async checkStatus(providerRef: string): Promise<string> {
    return "paid";
  }
}

const providers: Record<string, PaymentProvider> = {
  wave: new WaveProvider(),
  orange_money: new OrangeMoneyProvider(),
  card: new CardProvider(),
  cash: new CashProvider(),
};

export function getPaymentProvider(method: string): PaymentProvider | undefined {
  return providers[method];
}

export function getAvailableProviders(): { id: string; name: string; description: string; icon: string }[] {
  return [
    { id: "wave", name: "Wave", description: "Paiement mobile Wave", icon: "wave" },
    { id: "orange_money", name: "Orange Money", description: "Paiement mobile Orange", icon: "orange" },
    { id: "card", name: "Carte bancaire", description: "Visa / Mastercard", icon: "card" },
    { id: "cash", name: "Especes", description: "Paiement en main propre", icon: "cash" },
  ];
}
