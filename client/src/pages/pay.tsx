import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Radio, Shield, Clock, CheckCircle2, XCircle, Loader2, CreditCard, Smartphone, Banknote, ExternalLink } from "lucide-react";
import { useRoute, useSearch } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { ThemeToggle } from "@/components/theme-toggle";

type PaymentInvoice = {
  id: string;
  productName: string;
  amount: number;
  clientName: string;
  status: string;
  expiresAt: string;
  vendorName: string;
};

type PaymentMethod = {
  id: string;
  name: string;
  description: string;
  icon: string;
};

const methodIcons: Record<string, typeof Smartphone> = {
  wave: Smartphone,
  orange: Smartphone,
  card: CreditCard,
  cash: Banknote,
};

const methodColors: Record<string, string> = {
  wave: "text-blue-500",
  orange_money: "text-orange-500",
  card: "text-violet-500",
  cash: "text-green-500",
};

export default function Pay() {
  const [, params] = useRoute("/pay/:token");
  const { toast } = useToast();
  const token = params?.token;
  const searchString = useSearch();
  const urlParams = new URLSearchParams(searchString);
  const returnStatus = urlParams.get("status");
  const [timeLeft, setTimeLeft] = useState("");
  const [expired, setExpired] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<string>("wave");
  const [redirecting, setRedirecting] = useState(false);
  const [waitingPayment, setWaitingPayment] = useState(false);

  const { data: invoice, isLoading, error } = useQuery<PaymentInvoice>({
    queryKey: ["/api/pay", token],
    queryFn: async () => {
      const res = await fetch(`/api/pay/${token}`);
      if (!res.ok) throw new Error(`${res.status}: ${res.statusText}`);
      return res.json();
    },
    enabled: !!token,
    refetchInterval: waitingPayment ? 3000 : 5000,
  });

  const { data: methods } = useQuery<PaymentMethod[]>({
    queryKey: ["/api/payment-methods"],
    queryFn: async () => {
      const res = await fetch("/api/payment-methods");
      if (!res.ok) throw new Error(`${res.status}`);
      return res.json();
    },
  });

  useEffect(() => {
    if (returnStatus === "completed" && token) {
      setWaitingPayment(true);
    }
  }, [returnStatus, token]);

  useEffect(() => {
    if (waitingPayment && invoice?.status === "paid") {
      setWaitingPayment(false);
      toast({ title: "Paiement confirme" });
    }
  }, [waitingPayment, invoice?.status, toast]);

  useEffect(() => {
    if (!invoice?.expiresAt || invoice.status !== "pending") return;

    const interval = setInterval(() => {
      const now = new Date().getTime();
      const exp = new Date(invoice.expiresAt).getTime();
      const diff = exp - now;

      if (diff <= 0) {
        setTimeLeft("Expire");
        setExpired(true);
        clearInterval(interval);
        return;
      }

      const minutes = Math.floor(diff / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${minutes}:${seconds.toString().padStart(2, "0")}`);
    }, 1000);

    return () => clearInterval(interval);
  }, [invoice?.expiresAt, invoice?.status]);

  const payMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/pay/${token}`, { paymentMethod: selectedMethod });
      return res.json();
    },
    onSuccess: (data: any) => {
      if (data.redirect && data.redirectUrl) {
        setRedirecting(true);
        window.location.href = data.redirectUrl;
      } else {
        queryClient.invalidateQueries({ queryKey: ["/api/pay", token] });
        toast({ title: "Paiement effectue" });
      }
    },
    onError: (error: Error) => {
      toast({ title: "Erreur de paiement", description: error.message, variant: "destructive" });
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-sm p-6 space-y-4">
          <Skeleton className="h-6 w-32 mx-auto" />
          <Skeleton className="h-4 w-48 mx-auto" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </Card>
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 gap-4">
        <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
          <XCircle className="w-6 h-6 text-destructive" />
        </div>
        <p className="text-muted-foreground text-center">
          Ce lien de paiement est invalide ou a expire.
        </p>
      </div>
    );
  }

  const isPaid = invoice.status === "paid";
  const isExpired = invoice.status === "expired" || expired;
  const isPending = invoice.status === "pending" && !expired;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-md">
        <div className="max-w-md mx-auto flex items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center">
              <Radio className="w-3.5 h-3.5 text-primary-foreground" />
            </div>
            <span className="text-sm font-semibold">LivePay</span>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-sm space-y-4">
          <Card className="p-6 space-y-5">
            <div className="text-center space-y-1">
              <p className="text-xs text-muted-foreground">Facture de</p>
              <p className="font-semibold" data-testid="text-vendor-name">{invoice.vendorName}</p>
            </div>

            <div className="text-center space-y-2 py-4 border-y">
              <p className="text-sm text-muted-foreground" data-testid="text-product-name">{invoice.productName}</p>
              <p className="text-3xl font-bold" data-testid="text-amount">
                {invoice.amount.toLocaleString("fr-FR")} <span className="text-lg">FCFA</span>
              </p>
              <p className="text-xs text-muted-foreground" data-testid="text-client-name">
                Pour: {invoice.clientName}
              </p>
            </div>

            {isPaid && (
              <div className="flex flex-col items-center gap-3 py-4">
                <div className="w-14 h-14 rounded-full bg-green-500/10 flex items-center justify-center">
                  <CheckCircle2 className="w-7 h-7 text-green-500" />
                </div>
                <div className="text-center">
                  <p className="font-semibold text-green-500">Paiement confirme</p>
                  <p className="text-xs text-muted-foreground mt-1">Merci pour votre achat</p>
                </div>
              </div>
            )}

            {isExpired && (
              <div className="flex flex-col items-center gap-3 py-4">
                <div className="w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center">
                  <XCircle className="w-7 h-7 text-destructive" />
                </div>
                <div className="text-center">
                  <p className="font-semibold text-destructive">Lien expire</p>
                  <p className="text-xs text-muted-foreground mt-1">Contactez le vendeur pour un nouveau lien</p>
                </div>
              </div>
            )}

            {waitingPayment && isPending && (
              <div className="flex flex-col items-center gap-3 py-4">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <div className="text-center">
                  <p className="font-semibold">Verification du paiement...</p>
                  <p className="text-xs text-muted-foreground mt-1">Veuillez patienter pendant la confirmation</p>
                </div>
              </div>
            )}

            {isPending && !waitingPayment && (
              <>
                <div className="flex items-center justify-center gap-2 text-amber-500">
                  <Clock className="w-4 h-4" />
                  <span className="text-sm font-medium" data-testid="text-timer">
                    Expire dans {timeLeft}
                  </span>
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">Mode de paiement</p>
                  <div className="grid grid-cols-2 gap-2">
                    {(methods || [
                      { id: "wave", name: "Wave", description: "Paiement mobile", icon: "wave" },
                      { id: "orange_money", name: "Orange Money", description: "Paiement mobile", icon: "orange" },
                      { id: "card", name: "Carte bancaire", description: "Visa / Mastercard", icon: "card" },
                      { id: "cash", name: "Especes", description: "Main propre", icon: "cash" },
                    ]).map((method) => {
                      const IconComponent = methodIcons[method.icon] || Smartphone;
                      const isSelected = selectedMethod === method.id;
                      return (
                        <button
                          key={method.id}
                          onClick={() => setSelectedMethod(method.id)}
                          className={`relative flex flex-col items-center gap-1.5 p-3 rounded-md border-2 transition-colors ${
                            isSelected
                              ? "border-primary bg-primary/5"
                              : "border-border hover-elevate"
                          }`}
                          data-testid={`button-method-${method.id}`}
                        >
                          <IconComponent className={`w-5 h-5 ${methodColors[method.id] || "text-foreground"}`} />
                          <span className="text-xs font-medium">{method.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <Button
                  className="w-full"
                  size="lg"
                  onClick={() => payMutation.mutate()}
                  disabled={payMutation.isPending || redirecting}
                  data-testid="button-pay"
                >
                  {redirecting ? (
                    <>
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Redirection vers le paiement...
                    </>
                  ) : payMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Traitement...
                    </>
                  ) : (
                    `Payer avec ${(methods || []).find(m => m.id === selectedMethod)?.name || selectedMethod}`
                  )}
                </Button>

                {selectedMethod !== "cash" && (
                  <p className="text-[10px] text-center text-muted-foreground">
                    Vous serez redirige vers la plateforme de paiement securisee PayDunya
                  </p>
                )}
              </>
            )}
          </Card>

          <div className="flex items-center justify-center gap-3 text-xs text-muted-foreground">
            <Shield className="w-3 h-3" />
            <span>Paiement securise par PayDunya - Zone UEMOA</span>
          </div>
        </div>
      </main>
    </div>
  );
}
