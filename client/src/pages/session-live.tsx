import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertInvoiceSchema, type Invoice, type Product, type LiveSession } from "@shared/schema";
import { Plus, Radio, Copy, ExternalLink, ArrowLeft, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/auth-utils";
import { useState, useEffect, useCallback } from "react";
import { useRoute, useLocation } from "wouter";
import { z } from "zod";

const invoiceFormSchema = z.object({
  clientName: z.string().min(1, "Nom du client requis"),
  clientPhone: z.string().min(1, "T\u00e9l\u00e9phone requis"),
  productId: z.string().min(1, "Produit requis"),
  productName: z.string(),
  amount: z.number().min(1, "Montant requis"),
  sessionId: z.string().nullable(),
});

type InvoiceFormData = z.infer<typeof invoiceFormSchema>;

function StatusDot({ status }: { status: string }) {
  return (
    <span
      className={`w-2.5 h-2.5 rounded-full shrink-0 ${
        status === "paid"
          ? "bg-green-500"
          : status === "pending"
          ? "bg-amber-500 animate-pulse"
          : "bg-red-500"
      }`}
    />
  );
}

function StatusLabel({ status }: { status: string }) {
  const labels: Record<string, string> = {
    paid: "Pay\u00e9",
    pending: "En attente",
    expired: "Expir\u00e9",
    cancelled: "Annul\u00e9",
  };
  const variants: Record<string, "default" | "secondary" | "destructive"> = {
    paid: "default",
    pending: "secondary",
    expired: "destructive",
    cancelled: "destructive",
  };
  return (
    <Badge variant={variants[status] || "secondary"} className="text-xs">
      {labels[status] || status}
    </Badge>
  );
}

export default function SessionLive() {
  const { toast } = useToast();
  const [, params] = useRoute("/sessions/:id");
  const [, navigate] = useLocation();
  const [invoiceOpen, setInvoiceOpen] = useState(false);
  const sessionId = params?.id;

  const { data: session, isLoading: loadingSession } = useQuery<LiveSession>({
    queryKey: ["/api/sessions", sessionId],
    enabled: !!sessionId,
  });

  const { data: products } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  const { data: invoices, isLoading: loadingInvoices } = useQuery<Invoice[]>({
    queryKey: ["/api/invoices", sessionId],
    queryFn: async () => {
      const res = await fetch(`/api/invoices?sessionId=${sessionId}`, { credentials: "include" });
      if (!res.ok) throw new Error(`${res.status}: ${res.statusText}`);
      return res.json();
    },
    enabled: !!sessionId,
    refetchInterval: session?.active ? 5000 : false,
  });

  const form = useForm<InvoiceFormData>({
    resolver: zodResolver(invoiceFormSchema),
    defaultValues: {
      clientName: "",
      clientPhone: "",
      productId: "",
      productName: "",
      amount: 0,
      sessionId: sessionId || null,
    },
  });

  const selectedProductId = form.watch("productId");

  useEffect(() => {
    if (selectedProductId && products) {
      const product = products.find((p) => p.id === selectedProductId);
      if (product) {
        form.setValue("productName", product.name);
        form.setValue("amount", product.price);
      }
    }
  }, [selectedProductId, products, form]);

  const createInvoiceMutation = useMutation({
    mutationFn: (data: InvoiceFormData) =>
      apiRequest("POST", "/api/invoices", { ...data, sessionId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/invoices", sessionId] });
      form.reset({ clientName: "", clientPhone: "", productId: "", productName: "", amount: 0, sessionId });
      setInvoiceOpen(false);
      toast({ title: "Facture g\u00e9n\u00e9r\u00e9e" });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({ title: "Non autoris\u00e9", description: "Reconnexion...", variant: "destructive" });
        setTimeout(() => { window.location.href = "/api/login"; }, 500);
        return;
      }
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    },
  });

  const copyLink = useCallback((token: string) => {
    const url = `${window.location.origin}/pay/${token}`;
    navigator.clipboard.writeText(url);
    toast({ title: "Lien copi\u00e9" });
  }, [toast]);

  const onSubmit = (data: InvoiceFormData) => {
    createInvoiceMutation.mutate(data);
  };

  const sessionInvoices = invoices || [];
  const paidCount = sessionInvoices.filter((i) => i.status === "paid").length;
  const pendingCount = sessionInvoices.filter((i) => i.status === "pending").length;
  const totalRevenue = sessionInvoices.filter((i) => i.status === "paid").reduce((s, i) => s + i.amount, 0);

  if (loadingSession) {
    return (
      <div className="p-4 md:p-6 space-y-4 max-w-5xl">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-32" />
        <div className="grid grid-cols-3 gap-4">
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="p-4 md:p-6 max-w-5xl">
        <p className="text-muted-foreground">Session non trouv&eacute;e.</p>
        <Button variant="ghost" onClick={() => navigate("/sessions")} className="mt-4">
          <ArrowLeft className="w-4 h-4 mr-2" /> Retour
        </Button>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-5xl">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button
            size="icon"
            variant="ghost"
            onClick={() => navigate("/sessions")}
            data-testid="button-back-sessions"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-serif font-bold" data-testid="text-session-title">
                {session.title}
              </h1>
              {session.active ? (
                <span className="inline-flex items-center gap-1 text-xs text-green-500 font-medium">
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  En direct
                </span>
              ) : (
                <Badge variant="secondary" className="text-xs">Termin&eacute;e</Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground capitalize">{session.platform}</p>
          </div>
        </div>

        {session.active && (
          <Dialog open={invoiceOpen} onOpenChange={setInvoiceOpen}>
            <DialogTrigger asChild>
              <Button size="lg" data-testid="button-new-invoice">
                <Plus className="w-4 h-4 mr-2" />
                Nouvelle facture
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Facture rapide</DialogTitle>
              </DialogHeader>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-2">
                  <Label>Produit</Label>
                  <Controller
                    control={form.control}
                    name="productId"
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger data-testid="select-invoice-product">
                          <SelectValue placeholder="Choisir un produit" />
                        </SelectTrigger>
                        <SelectContent>
                          {products?.filter((p) => p.active).map((product) => (
                            <SelectItem key={product.id} value={product.id}>
                              {product.name} - {product.price.toLocaleString("fr-FR")} F
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {form.formState.errors.productId && (
                    <p className="text-xs text-destructive">{form.formState.errors.productId.message}</p>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Nom du client</Label>
                    <Input
                      {...form.register("clientName")}
                      placeholder="Aminata D."
                      data-testid="input-invoice-client-name"
                    />
                    {form.formState.errors.clientName && (
                      <p className="text-xs text-destructive">{form.formState.errors.clientName.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>T&eacute;l&eacute;phone</Label>
                    <Input
                      {...form.register("clientPhone")}
                      placeholder="+221 77 123 4567"
                      data-testid="input-invoice-client-phone"
                    />
                    {form.formState.errors.clientPhone && (
                      <p className="text-xs text-destructive">{form.formState.errors.clientPhone.message}</p>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Montant (FCFA)</Label>
                  <Input
                    type="number"
                    {...form.register("amount", { valueAsNumber: true })}
                    data-testid="input-invoice-amount"
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full"
                  size="lg"
                  disabled={createInvoiceMutation.isPending}
                  data-testid="button-submit-invoice"
                >
                  {createInvoiceMutation.isPending ? "G\u00e9n\u00e9ration..." : "G\u00e9n\u00e9rer le lien de paiement"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card className="p-4 text-center">
          <p className="text-xs text-muted-foreground mb-1">Revenus</p>
          <p className="text-lg font-bold text-green-500" data-testid="text-session-revenue">
            {totalRevenue.toLocaleString("fr-FR")} F
          </p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-xs text-muted-foreground mb-1">Pay&eacute;es</p>
          <p className="text-lg font-bold" data-testid="text-session-paid">{paidCount}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-xs text-muted-foreground mb-1">En attente</p>
          <p className="text-lg font-bold text-amber-500" data-testid="text-session-pending">{pendingCount}</p>
        </Card>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-4">
          <h2 className="font-semibold">Factures de la session</h2>
          {session.active && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/invoices"] })}
              data-testid="button-refresh-invoices"
            >
              <RefreshCw className="w-4 h-4 mr-1" />
              Actualiser
            </Button>
          )}
        </div>

        {loadingInvoices ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : sessionInvoices.length === 0 ? (
          <Card className="p-8 flex flex-col items-center gap-3 text-center">
            <Radio className="w-8 h-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Aucune facture pour cette session.
              {session.active && " Cliquez sur \"Nouvelle facture\" pour commencer."}
            </p>
          </Card>
        ) : (
          <div className="space-y-2">
            {sessionInvoices.map((invoice) => (
              <Card
                key={invoice.id}
                className="p-4"
                data-testid={`card-session-invoice-${invoice.id}`}
              >
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <StatusDot status={invoice.status} />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{invoice.clientName}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {invoice.productName} &middot; {invoice.clientPhone}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-sm font-bold">{invoice.amount.toLocaleString("fr-FR")} F</span>
                    <StatusLabel status={invoice.status} />
                    <div className="flex items-center gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => copyLink(invoice.token)}
                        data-testid={`button-copy-link-${invoice.id}`}
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                      <a href={`/pay/${invoice.token}`} target="_blank" rel="noopener noreferrer">
                        <Button size="icon" variant="ghost" data-testid={`button-open-link-${invoice.id}`}>
                          <ExternalLink className="w-4 h-4" />
                        </Button>
                      </a>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
