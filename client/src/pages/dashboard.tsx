import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Package, Radio, FileText, CircleDollarSign, TrendingUp, Clock } from "lucide-react";
import type { Invoice, LiveSession, Product } from "@shared/schema";

export default function Dashboard() {
  const { data: products, isLoading: loadingProducts } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  const { data: sessions, isLoading: loadingSessions } = useQuery<LiveSession[]>({
    queryKey: ["/api/sessions"],
  });

  const { data: invoices, isLoading: loadingInvoices } = useQuery<Invoice[]>({
    queryKey: ["/api/invoices"],
  });

  const isLoading = loadingProducts || loadingSessions || loadingInvoices;

  const totalRevenue = invoices?.filter((i) => i.status === "paid").reduce((sum, i) => sum + i.amount, 0) || 0;
  const pendingCount = invoices?.filter((i) => i.status === "pending").length || 0;
  const paidCount = invoices?.filter((i) => i.status === "paid").length || 0;
  const activeSessions = sessions?.filter((s) => s.active).length || 0;

  const recentInvoices = invoices?.slice(0, 5) || [];

  const stats = [
    {
      label: "Revenus totaux",
      value: `${totalRevenue.toLocaleString("fr-FR")} F`,
      icon: CircleDollarSign,
      color: "text-green-500",
    },
    {
      label: "Factures pay\u00e9es",
      value: paidCount.toString(),
      icon: TrendingUp,
      color: "text-primary",
    },
    {
      label: "En attente",
      value: pendingCount.toString(),
      icon: Clock,
      color: "text-amber-500",
    },
    {
      label: "Sessions actives",
      value: activeSessions.toString(),
      icon: Radio,
      color: "text-green-500",
    },
  ];

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-serif font-bold" data-testid="text-dashboard-title">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">Vue d'ensemble de votre activit&eacute;</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <Card key={i} className="p-4">
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-7 w-16" />
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-xs text-muted-foreground">{stat.label}</span>
                  <stat.icon className={`w-4 h-4 ${stat.color}`} />
                </div>
                <p className="text-xl font-bold" data-testid={`text-stat-${i}`}>{stat.value}</p>
              </>
            )}
          </Card>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card className="p-4">
          <div className="flex items-center justify-between gap-4 mb-4">
            <h2 className="font-semibold">Factures r&eacute;centes</h2>
            <FileText className="w-4 h-4 text-muted-foreground" />
          </div>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : recentInvoices.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">Aucune facture encore</p>
          ) : (
            <div className="space-y-2">
              {recentInvoices.map((inv) => (
                <div
                  key={inv.id}
                  className="flex items-center justify-between gap-4 p-3 rounded-md bg-background"
                  data-testid={`card-invoice-${inv.id}`}
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{inv.clientName}</p>
                    <p className="text-xs text-muted-foreground truncate">{inv.productName}</p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-sm font-medium">{inv.amount.toLocaleString("fr-FR")} F</span>
                    <span
                      className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                        inv.status === "paid"
                          ? "bg-green-500"
                          : inv.status === "pending"
                          ? "bg-amber-500"
                          : "bg-red-500"
                      }`}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between gap-4 mb-4">
            <h2 className="font-semibold">Acc&egrave;s rapide</h2>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Produits", count: products?.length || 0, icon: Package, href: "/products" },
              { label: "Sessions", count: sessions?.length || 0, icon: Radio, href: "/sessions" },
              { label: "Factures", count: invoices?.length || 0, icon: FileText, href: "/invoices" },
              { label: "Pay\u00e9es", count: paidCount, icon: CircleDollarSign, href: "/invoices" },
            ].map((item, i) => (
              <a
                key={i}
                href={item.href}
                className="p-4 rounded-md bg-background hover-elevate flex flex-col items-center gap-2 text-center"
                data-testid={`link-quick-${item.label.toLowerCase()}`}
              >
                <item.icon className="w-5 h-5 text-muted-foreground" />
                <span className="text-lg font-bold">{item.count}</span>
                <span className="text-xs text-muted-foreground">{item.label}</span>
              </a>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
