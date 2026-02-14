export interface PaymentResult {
  success: boolean;
  providerRef?: string;
  error?: string;
  redirectUrl?: string;
  paydunyaToken?: string;
}

export interface PaymentProvider {
  name: string;
  processPayment(invoiceId: string, amount: number, metadata: Record<string, string>): Promise<PaymentResult>;
  checkStatus(providerRef: string): Promise<string>;
}

function getPaydunyaHeaders() {
  return {
    "Content-Type": "application/json",
    "PAYDUNYA-MASTER-KEY": process.env.PAYDUNYA_MASTER_KEY || "",
    "PAYDUNYA-PRIVATE-KEY": process.env.PAYDUNYA_PRIVATE_KEY || "",
    "PAYDUNYA-TOKEN": process.env.PAYDUNYA_TOKEN || "",
  };
}

function getPaydunyaBaseUrl() {
  const mode = process.env.PAYDUNYA_MODE || "test";
  return mode === "live"
    ? "https://app.paydunya.com/api/v1"
    : "https://app.paydunya.com/sandbox-api/v1";
}

async function createPaydunyaCheckout(
  amount: number,
  description: string,
  invoiceToken: string,
  clientName: string,
  clientPhone: string,
  paymentMethod?: string
): Promise<PaymentResult> {
  try {
    const baseUrl = getPaydunyaBaseUrl();
    const appHost = process.env.REPLIT_DEV_DOMAIN
      ? `https://${process.env.REPLIT_DEV_DOMAIN}`
      : process.env.REPL_SLUG
        ? `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`
        : "http://localhost:5000";

    const payload: any = {
      invoice: {
        total_amount: amount,
        description: description,
      },
      store: {
        name: "LivePay",
        tagline: "Paiement live commerce UEMOA",
        website_url: appHost,
      },
      custom_data: {
        livepay_token: invoiceToken,
        client_name: clientName,
        client_phone: clientPhone,
      },
      actions: {
        return_url: `${appHost}/pay/${invoiceToken}?status=completed`,
        cancel_url: `${appHost}/pay/${invoiceToken}?status=cancelled`,
        callback_url: `${appHost}/api/paydunya/ipn`,
      },
    };

    if (paymentMethod) {
      const channelMap: Record<string, string[]> = {
        wave: ["wave-senegal"],
        orange_money: ["orange-money-senegal"],
        card: ["card"],
      };
      if (channelMap[paymentMethod]) {
        payload.channels = channelMap[paymentMethod];
      }
    }

    const response = await fetch(`${baseUrl}/checkout-invoice/create`, {
      method: "POST",
      headers: getPaydunyaHeaders(),
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (data.response_code === "00") {
      return {
        success: true,
        redirectUrl: data.response_text,
        paydunyaToken: data.token,
        providerRef: `PDY-${data.token}`,
      };
    }

    console.error("[PayDunia] Checkout creation failed:", data);
    return {
      success: false,
      error: data.response_text || "Erreur lors de la creation du paiement",
    };
  } catch (error) {
    console.error("[PayDunia] API error:", error);
    return {
      success: false,
      error: "Erreur de connexion au service de paiement",
    };
  }
}

async function checkPaydunyaStatus(paydunyaToken: string): Promise<{ status: string; receiptUrl?: string }> {
  try {
    const baseUrl = getPaydunyaBaseUrl();
    const response = await fetch(`${baseUrl}/checkout-invoice/confirm/${paydunyaToken}`, {
      method: "GET",
      headers: getPaydunyaHeaders(),
    });

    const data = await response.json();

    if (data.response_code === "00") {
      const statusMap: Record<string, string> = {
        completed: "paid",
        pending: "pending",
        cancelled: "cancelled",
        failed: "expired",
      };
      return {
        status: statusMap[data.status] || "pending",
        receiptUrl: data.receipt_url,
      };
    }

    return { status: "pending" };
  } catch (error) {
    console.error("[PayDunia] Status check error:", error);
    return { status: "pending" };
  }
}

class PaydunyaProvider implements PaymentProvider {
  name: string;
  channelId: string;

  constructor(name: string, channelId: string) {
    this.name = name;
    this.channelId = channelId;
  }

  async processPayment(invoiceId: string, amount: number, metadata: Record<string, string>): Promise<PaymentResult> {
    return createPaydunyaCheckout(
      amount,
      `Paiement ${metadata.productName} - ${metadata.clientName}`,
      metadata.invoiceToken || invoiceId,
      metadata.clientName,
      metadata.clientPhone,
      this.name
    );
  }

  async checkStatus(providerRef: string): Promise<string> {
    const token = providerRef.replace("PDY-", "");
    const result = await checkPaydunyaStatus(token);
    return result.status;
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
  wave: new PaydunyaProvider("wave", "wave-senegal"),
  orange_money: new PaydunyaProvider("orange_money", "orange-money-senegal"),
  card: new PaydunyaProvider("card", "card"),
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

export { checkPaydunyaStatus };
