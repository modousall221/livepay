export interface PaymentResult {
  success: boolean;
  providerRef?: string;
  error?: string;
  redirectUrl?: string;
  chargeId?: string;
}

export interface PaymentProvider {
  name: string;
  processPayment(invoiceId: string, amount: number, metadata: Record<string, string>): Promise<PaymentResult>;
}

function getBictorysBaseUrl() {
  const publicKey = process.env.BICTORYS_PUBLIC_KEY || "";
  if (publicKey.startsWith("test_")) {
    return "https://api.test.bictorys.com";
  }
  return "https://api.bictorys.com";
}

function getBictorysHeaders() {
  return {
    "Content-Type": "application/json",
    "X-Api-Key": process.env.BICTORYS_PUBLIC_KEY || "",
  };
}

function getAppHost() {
  if (process.env.REPLIT_DEV_DOMAIN) {
    return `https://${process.env.REPLIT_DEV_DOMAIN}`;
  }
  if (process.env.REPL_SLUG && process.env.REPL_OWNER) {
    return `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`;
  }
  return "http://localhost:5000";
}

async function createBictorysCheckout(
  amount: number,
  invoiceToken: string,
  clientName: string,
  clientPhone: string,
  clientEmail: string,
  paymentType?: string
): Promise<PaymentResult> {
  try {
    const baseUrl = getBictorysBaseUrl();
    const appHost = getAppHost();

    const url = paymentType && paymentType !== "checkout"
      ? `${baseUrl}/pay/v1/charges?payment_type=${paymentType}`
      : `${baseUrl}/pay/v1/charges`;

    const payload: any = {
      amount,
      currency: "XOF",
      country: "SN",
      paymentReference: invoiceToken,
      successRedirectUrl: `${appHost}/pay/${invoiceToken}?status=completed`,
      errorRedirectUrl: `${appHost}/pay/${invoiceToken}?status=failed`,
      customer: {
        name: clientName,
        phone: clientPhone,
        email: clientEmail || `${clientPhone.replace(/[^0-9]/g, "")}@livepay.sn`,
      },
    };

    const response = await fetch(url, {
      method: "POST",
      headers: getBictorysHeaders(),
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (data.link || data.chargeId || (data.data && data.data.authorization)) {
      const checkoutLink = data.link || data.data?.authorization?.redirect || "";
      const chargeId = data.chargeId || data.data?.id?.toString() || "";

      return {
        success: true,
        redirectUrl: checkoutLink,
        chargeId,
        providerRef: `BIC-${chargeId}`,
      };
    }

    console.error("[Bictorys] Checkout creation failed:", data);
    return {
      success: false,
      error: data.message || "Erreur lors de la creation du paiement",
    };
  } catch (error) {
    console.error("[Bictorys] API error:", error);
    return {
      success: false,
      error: "Erreur de connexion au service de paiement",
    };
  }
}

class BictorysProvider implements PaymentProvider {
  name: string;
  paymentType: string | undefined;

  constructor(name: string, paymentType?: string) {
    this.name = name;
    this.paymentType = paymentType;
  }

  async processPayment(invoiceId: string, amount: number, metadata: Record<string, string>): Promise<PaymentResult> {
    return createBictorysCheckout(
      amount,
      metadata.invoiceToken || invoiceId,
      metadata.clientName,
      metadata.clientPhone,
      metadata.clientEmail || "",
      this.paymentType
    );
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
}

const providers: Record<string, PaymentProvider> = {
  wave: new BictorysProvider("wave"),
  orange_money: new BictorysProvider("orange_money", "orange_money"),
  card: new BictorysProvider("card", "card"),
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
