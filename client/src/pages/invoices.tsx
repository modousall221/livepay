import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText, Copy, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Invoice } from "@shared/schema";
import { useCallback } from "react";

function StatusDot({ status }: { status: string }) {
  return (
    <span
      className={`w-2.5 h-2.5 rounded-full shrink-0 ${
        status === "paid"
          ? "bg-green-500"
          : status === "pending"
          ? "bg-amber-500"
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

export default function Invoices() {
  const { toast } = useToast();

  const { data: invoices, isLoading } = useQuery<Invoice[]>({
    queryKey: ["/api/invoices"],
  });

  const copyLink = useCallback((token: string) => {
    const url = `${window.location.origin}/pay/${token}`;
    navigator.clipboard.writeText(url);
    toast({ title: "Lien copi\u00e9" });
  }, [toast]);

  const paidInvoices = invoices?.filter((i) => i.status === "paid") || [];
  const pendingInvoices = invoices?.filter((i) => i.status === "pending") || [];
  const otherInvoices = invoices?.filter((i) => i.status !== "paid" && i.status !== "pending") || [];

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-serif font-bold" data-testid="text-invoices-title">Factures</h1>
        <p className="text-sm text-muted-foreground mt-1">Toutes vos factures g&eacute;n&eacute;r&eacute;es</p>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : !invoices || invoices.length === 0 ? (
        <Card className="p-12 flex flex-col items-center gap-4 text-center">
          <div className="w-12 h-12 rounded-md bg-muted flex items-center justify-center">
            <FileText className="w-6 h-6 text-muted-foreground" />
          </div>
          <div>
            <h3 className="font-semibold">Aucune facture</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Les factures appara&icirc;tront ici une fois g&eacute;n&eacute;r&eacute;es pendant vos sessions live.
            </p>
          </div>
        </Card>
      ) : (
        <div className="space-y-6">
          {pendingInvoices.length > 0 && (
            <Section title="En attente" invoices={pendingInvoices} copyLink={copyLink} />
          )}
          {paidInvoices.length > 0 && (
            <Section title="Pay\u00e9es" invoices={paidInvoices} copyLink={copyLink} />
          )}
          {otherInvoices.length > 0 && (
            <Section title="Expir\u00e9es / Annul\u00e9es" invoices={otherInvoices} copyLink={copyLink} />
          )}
        </div>
      )}
    </div>
  );
}

function Section({ title, invoices, copyLink }: { title: string; invoices: Invoice[]; copyLink: (token: string) => void }) {
  return (
    <div className="space-y-3">
      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">{title} ({invoices.length})</h2>
      <div className="space-y-2">
        {invoices.map((invoice) => (
          <Card key={invoice.id} className="p-4" data-testid={`card-invoice-${invoice.id}`}>
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
                    data-testid={`button-copy-invoice-${invoice.id}`}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                  <a href={`/pay/${invoice.token}`} target="_blank" rel="noopener noreferrer">
                    <Button size="icon" variant="ghost" data-testid={`button-open-invoice-${invoice.id}`}>
                      <ExternalLink className="w-4 h-4" />
                    </Button>
                  </a>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
