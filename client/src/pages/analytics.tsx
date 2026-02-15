import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BarChart3,
  TrendingUp,
  Users,
  ShoppingBag,
  Clock,
  Target,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import type { Invoice, LiveSession, Product } from "@shared/schema";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from "recharts";

const COLORS = ["#22c55e", "#f59e0b", "#ef4444", "#6366f1"];

export default function Analytics() {
  const { data: invoices, isLoading: loadingInvoices } = useQuery<Invoice[]>({
    queryKey: ["/api/invoices"],
  });

  const { data: sessions, isLoading: loadingSessions } = useQuery<LiveSession[]>({
    queryKey: ["/api/sessions"],
  });

  const { data: products, isLoading: loadingProducts } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  const isLoading = loadingInvoices || loadingSessions || loadingProducts;

  // Calculate statistics with explicit types
  const paidInvoices: Invoice[] = invoices?.filter((i: Invoice) => i.status === "paid") || [];
  const pendingInvoices: Invoice[] = invoices?.filter((i: Invoice) => i.status === "pending") || [];
  const expiredInvoices: Invoice[] = invoices?.filter((i: Invoice) => i.status === "expired") || [];
  
  const totalRevenue = paidInvoices.reduce((sum: number, i: Invoice) => sum + i.amount, 0);
  
  const conversionRate = invoices?.length 
    ? Math.round((paidInvoices.length / invoices.length) * 100) 
    : 0;

  const avgOrderValue = paidInvoices.length 
    ? Math.round(totalRevenue / paidInvoices.length) 
    : 0;

  // Group invoices by status for pie chart
  const statusData = [
    { name: "Payées", value: paidInvoices.length, color: "#22c55e" },
    { name: "En attente", value: pendingInvoices.length, color: "#f59e0b" },
    { name: "Expirées", value: expiredInvoices.length, color: "#ef4444" },
  ].filter((d) => d.value > 0);

  // Best selling products
  const productSales: Record<string, { name: string; count: number; revenue: number }> = {};
  paidInvoices.forEach((inv: Invoice) => {
    if (!productSales[inv.productName]) {
      productSales[inv.productName] = { name: inv.productName, count: 0, revenue: 0 };
    }
    productSales[inv.productName].count++;
    productSales[inv.productName].revenue += inv.amount;
  });
  const topProducts = Object.values(productSales)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  // Revenue by day (last 7 days)
  const revenueByDay: Record<string, number> = {};
  const today = new Date();
  for (let i = 6; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const key = date.toLocaleDateString("fr-FR", { weekday: "short" });
    revenueByDay[key] = 0;
  }
  paidInvoices.forEach((inv: Invoice) => {
    const date = new Date(inv.paidAt || inv.createdAt);
    const dayDiff = Math.floor((today.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    if (dayDiff <= 6) {
      const key = date.toLocaleDateString("fr-FR", { weekday: "short" });
      revenueByDay[key] = (revenueByDay[key] || 0) + inv.amount;
    }
  });
  const revenueChartData = Object.entries(revenueByDay).map(([day, revenue]) => ({
    day,
    revenue,
  }));

  // Sessions stats
  const activeSessions = sessions?.filter((s: LiveSession) => s.active).length || 0;
  const completedSessions = sessions?.filter((s: LiveSession) => !s.active).length || 0;

  // Unique clients
  const uniqueClients = new Set(paidInvoices.map((i: Invoice) => i.clientPhone)).size;

  const stats = [
    {
      label: "Revenus totaux",
      value: `${totalRevenue.toLocaleString("fr-FR")} F`,
      icon: TrendingUp,
      color: "text-green-500",
      bgColor: "bg-green-500/10",
    },
    {
      label: "Taux de conversion",
      value: `${conversionRate}%`,
      icon: Target,
      color: "text-primary",
      bgColor: "bg-primary/10",
      trend: conversionRate >= 50 ? "up" : "down",
    },
    {
      label: "Panier moyen",
      value: `${avgOrderValue.toLocaleString("fr-FR")} F`,
      icon: ShoppingBag,
      color: "text-violet-500",
      bgColor: "bg-violet-500/10",
    },
    {
      label: "Clients uniques",
      value: uniqueClients.toString(),
      icon: Users,
      color: "text-amber-500",
      bgColor: "bg-amber-500/10",
    },
  ];

  if (isLoading) {
    return (
      <div className="p-4 md:p-6 space-y-6 max-w-6xl">
        <div>
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-4 w-48 mt-2" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="p-4">
              <Skeleton className="h-4 w-20 mb-2" />
              <Skeleton className="h-7 w-24" />
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-6xl">
      <div>
        <h1 className="text-2xl font-serif font-bold" data-testid="text-analytics-title">
          Analytiques
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Suivez vos performances de vente en live
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <Card key={i} className="p-4">
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-xs text-muted-foreground">{stat.label}</span>
              <div className={`w-8 h-8 rounded-md ${stat.bgColor} flex items-center justify-center`}>
                <stat.icon className={`w-4 h-4 ${stat.color}`} />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <p className="text-xl font-bold" data-testid={`text-stat-${i}`}>
                {stat.value}
              </p>
              {stat.trend && (
                <span className={stat.trend === "up" ? "text-green-500" : "text-red-500"}>
                  {stat.trend === "up" ? (
                    <ArrowUpRight className="w-4 h-4" />
                  ) : (
                    <ArrowDownRight className="w-4 h-4" />
                  )}
                </span>
              )}
            </div>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Revenue Chart */}
        <Card className="p-4">
          <div className="flex items-center justify-between gap-4 mb-4">
            <h2 className="font-semibold">Revenus (7 derniers jours)</h2>
            <BarChart3 className="w-4 h-4 text-muted-foreground" />
          </div>
          {revenueChartData.some((d) => d.revenue > 0) ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={revenueChartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="day" className="text-xs" />
                <YAxis className="text-xs" tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  formatter={(value: number) => [`${value.toLocaleString("fr-FR")} F`, "Revenus"]}
                  contentStyle={{
                    backgroundColor: "hsl(var(--background))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                />
                <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">
              Aucune donnée disponible
            </div>
          )}
        </Card>

        {/* Status Pie Chart */}
        <Card className="p-4">
          <div className="flex items-center justify-between gap-4 mb-4">
            <h2 className="font-semibold">Répartition des factures</h2>
          </div>
          {statusData.length > 0 ? (
            <div className="flex items-center gap-4">
              <ResponsiveContainer width="50%" height={200}>
                <PieChart>
                  <Pie
                    data={statusData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={70}
                    innerRadius={40}
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number, name: string) => [value, name]}
                    contentStyle={{
                      backgroundColor: "hsl(var(--background))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-2">
                {statusData.map((item, i) => (
                  <div key={i} className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-sm">{item.name}</span>
                    </div>
                    <span className="text-sm font-medium">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">
              Aucune facture
            </div>
          )}
        </Card>
      </div>

      {/* Top Products */}
      <Card className="p-4">
        <div className="flex items-center justify-between gap-4 mb-4">
          <h2 className="font-semibold">Produits les plus vendus</h2>
          <ShoppingBag className="w-4 h-4 text-muted-foreground" />
        </div>
        {topProducts.length > 0 ? (
          <div className="space-y-3">
            {topProducts.map((product, i) => (
              <div
                key={i}
                className="flex items-center justify-between gap-4 p-3 rounded-md bg-background"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">
                    {i + 1}
                  </span>
                  <span className="text-sm font-medium truncate">{product.name}</span>
                </div>
                <div className="flex items-center gap-4 shrink-0 text-sm">
                  <span className="text-muted-foreground">{product.count} ventes</span>
                  <span className="font-medium">{product.revenue.toLocaleString("fr-FR")} F</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-8 text-center text-muted-foreground text-sm">
            Aucune vente enregistrée
          </div>
        )}
      </Card>

      {/* Sessions Summary */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card className="p-4">
          <div className="flex items-center justify-between gap-4 mb-4">
            <h2 className="font-semibold">Sessions Live</h2>
            <Clock className="w-4 h-4 text-muted-foreground" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-md bg-green-500/10 text-center">
              <p className="text-2xl font-bold text-green-500">{activeSessions}</p>
              <p className="text-xs text-muted-foreground mt-1">Actives</p>
            </div>
            <div className="p-4 rounded-md bg-muted text-center">
              <p className="text-2xl font-bold">{completedSessions}</p>
              <p className="text-xs text-muted-foreground mt-1">Terminées</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between gap-4 mb-4">
            <h2 className="font-semibold">Performance globale</h2>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Factures totales</span>
              <span className="font-medium">{invoices?.length || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Produits actifs</span>
              <span className="font-medium">{products?.filter((p) => p.active).length || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Taux d'expiration</span>
              <span className="font-medium">
                {invoices?.length
                  ? Math.round((expiredInvoices.length / invoices.length) * 100)
                  : 0}
                %
              </span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
