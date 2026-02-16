import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Package, 
  ShoppingCart, 
  CircleDollarSign, 
  MessageCircle, 
  Radio,
  AlertTriangle,
  CheckCircle,
  Clock
} from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { OnboardingChecklist, WelcomeModal } from "@/components/onboarding";
import { QuickActions } from "@/components/quick-actions";
import { StatsSkeleton } from "@/components/empty-state";
import {
  getVendorConfig,
  updateVendorConfig,
  getProducts,
  getOrders,
  type VendorConfig,
  type Product,
  type Order,
} from "@/lib/firebase";

interface OrderStats {
  pending: number;
  reserved: number;
  paid: number;
  expired: number;
  totalRevenue: number;
}

export default function Dashboard() {
  const { toast } = useToast();
  const { user } = useAuth();
  
  // Data state
  const [config, setConfig] = useState<VendorConfig | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isTogglingLive, setIsTogglingLive] = useState(false);
  
  // Welcome modal state for new users
  const [showWelcome, setShowWelcome] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(true);
  
  // Check if first visit
  useEffect(() => {
    const hasVisited = localStorage.getItem("livepay_visited");
    if (!hasVisited) {
      setShowWelcome(true);
    }
  }, []);
  
  // Load data from Firebase
  useEffect(() => {
    if (!user) return;
    
    const loadData = async () => {
      try {
        setIsLoading(true);
        const [configData, productsData, ordersData] = await Promise.all([
          getVendorConfig(user.id),
          getProducts(user.id),
          getOrders(user.id),
        ]);
        setConfig(configData);
        setProducts(productsData);
        setOrders(ordersData);
      } catch (error) {
        console.error("Error loading dashboard data:", error);
        toast({ title: "Erreur", description: "Impossible de charger les données", variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    };
    
    loadData();
  }, [user, toast]);
  
  const dismissWelcome = () => {
    localStorage.setItem("livepay_visited", "true");
    setShowWelcome(false);
  };

  // Toggle live mode
  const toggleLiveMode = async (liveMode: boolean) => {
    if (!config) return;
    setIsTogglingLive(true);
    try {
      await updateVendorConfig(config.id, { liveMode });
      setConfig(prev => prev ? { ...prev, liveMode } : null);
      toast({
        title: liveMode ? "Mode Live activé" : "Mode Live désactivé",
        description: liveMode 
          ? "Le chatbot WhatsApp accepte maintenant les commandes" 
          : "Le chatbot est en pause",
      });
    } catch (error) {
      toast({ title: "Erreur", description: "Impossible de changer le mode", variant: "destructive" });
    } finally {
      setIsTogglingLive(false);
    }
  };

  // Calculate stats from orders
  const stats: OrderStats = {
    pending: orders.filter(o => o.status === "pending").length,
    reserved: orders.filter(o => o.status === "reserved").length,
    paid: orders.filter(o => o.status === "paid").length,
    expired: orders.filter(o => o.status === "expired").length,
    totalRevenue: orders.filter(o => o.status === "paid").reduce((sum, o) => sum + o.totalAmount, 0),
  };

  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat("fr-FR").format(amount) + " FCFA";
  };

  const recentOrders = orders.slice(0, 5);
  
  // Onboarding state calculations
  const hasProducts = products.length > 0;
  const hasPhone = true; // TODO: Check from config when available
  const hasLiveMode = config?.liveMode || false;

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32" />
        <StatsSkeleton />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      {/* Welcome Modal for first-time users */}
      {showWelcome && <WelcomeModal onClose={dismissWelcome} />}
      
      {/* Quick Actions FAB */}
      <QuickActions 
        isLiveMode={config?.liveMode || false}
        onToggleLiveMode={() => toggleLiveMode(!config?.liveMode)}
      />
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold" data-testid="text-dashboard-title">Dashboard</h1>
        <p className="text-muted-foreground">LivePay - Chatbot WhatsApp pour vos lives</p>
      </div>

      {/* Onboarding Checklist - shows until all steps complete or dismissed */}
      {showOnboarding && (
        <OnboardingChecklist
          hasProducts={hasProducts}
          hasPhone={hasPhone}
          hasLiveMode={hasLiveMode}
          onDismiss={() => setShowOnboarding(false)}
        />
      )}

      {/* Live Mode Control - BIG TOGGLE */}
      <Card className={`border-2 ${config?.liveMode ? "border-green-500 bg-green-50 dark:bg-green-950/20" : "border-gray-300"}`}>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-full ${config?.liveMode ? "bg-green-500" : "bg-gray-400"}`}>
                <Radio className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold">
                  {config?.liveMode ? "🟢 Mode Live ACTIF" : "⚪ Mode Live INACTIF"}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {config?.liveMode 
                    ? "Le chatbot accepte les commandes WhatsApp" 
                    : "Activez pour recevoir des commandes pendant votre live"
                  }
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium">{config?.liveMode ? "ON" : "OFF"}</span>
              <Switch
                checked={config?.liveMode || false}
                onCheckedChange={(checked) => toggleLiveMode(checked)}
                disabled={isTogglingLive}
                className="scale-125"
              />
            </div>
          </div>
          
          {config?.liveMode && (
            <div className="mt-4 p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <p className="text-sm flex items-center gap-2">
                <MessageCircle className="h-4 w-4" />
                <span>
                  Clients: envoyez le mot-clé du produit (ex: <strong>ROBE1</strong>) sur WhatsApp pour commander!
                </span>
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">En attente</p>
                <p className="text-2xl font-bold text-blue-600">{stats?.reserved || 0}</p>
              </div>
              <Clock className="h-8 w-8 text-blue-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Payées auj.</p>
                <p className="text-2xl font-bold text-green-600">{stats?.paid || 0}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Produits</p>
                <p className="text-2xl font-bold">{products?.filter(p => p.active).length || 0}</p>
              </div>
              <Package className="h-8 w-8 text-primary opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-green-50 dark:bg-green-950/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Revenu total</p>
                <p className="text-lg font-bold text-green-600">
                  {formatPrice(stats?.totalRevenue || 0)}
                </p>
              </div>
              <CircleDollarSign className="h-8 w-8 text-green-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Two Column Layout */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Recent Orders */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg">Commandes récentes</CardTitle>
            <Link href="/orders">
              <Button variant="ghost" size="sm">Voir tout →</Button>
            </Link>
          </CardHeader>
          <CardContent>
            {recentOrders.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <ShoppingCart className="h-10 w-10 mx-auto mb-3 opacity-50" />
                <p>Aucune commande</p>
                <p className="text-xs mt-1">Activez le mode Live pour recevoir des commandes</p>
              </div>
            ) : (
              <ScrollArea className="h-[280px]">
                <div className="space-y-3">
                  {recentOrders.map((order) => {
                    const product = products.find(p => p.id === order.productId);
                    const productName = product?.name || "Produit";
                    return (
                    <div key={order.id} className="flex items-center justify-between p-3 rounded-lg border">
                      <div>
                        <p className="font-medium text-sm">{productName} x{order.quantity}</p>
                        <p className="text-xs text-muted-foreground">{order.clientName || order.clientPhone}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-sm">{formatPrice(order.totalAmount)}</p>
                        <Badge 
                          variant={order.status === "paid" ? "default" : "secondary"}
                          className={order.status === "paid" ? "bg-green-600" : ""}
                        >
                          {order.status === "paid" ? "Payé" : order.status === "reserved" ? "En attente" : order.status}
                        </Badge>
                      </div>
                    </div>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        {/* Products Stock */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              Stock produits
            </CardTitle>
            <Link href="/products">
              <Button variant="ghost" size="sm">Gérer →</Button>
            </Link>
          </CardHeader>
          <CardContent>
            {!products || products.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Package className="h-10 w-10 mx-auto mb-3 opacity-50" />
                <p>Aucun produit</p>
                <Link href="/products">
                  <Button variant="outline" size="sm" className="mt-2">
                    Ajouter un produit
                  </Button>
                </Link>
              </div>
            ) : (
              <ScrollArea className="h-[280px]">
                <div className="space-y-2">
                  {products.filter(p => p.active).slice(0, 8).map((product) => {
                    const availableStock = product.stock - product.reservedStock;
                    const isLowStock = availableStock <= 3;
                    return (
                      <div 
                        key={product.id} 
                        className={`flex items-center justify-between p-3 rounded-lg border ${isLowStock ? "border-amber-300 bg-amber-50 dark:bg-amber-950/20" : ""}`}
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="font-mono text-xs">
                              {product.keyword}
                            </Badge>
                            <span className="font-medium text-sm">{product.name}</span>
                          </div>
                          <p className="text-xs text-muted-foreground">{formatPrice(product.price)}</p>
                        </div>
                        <div className="text-right">
                          <p className={`font-bold ${isLowStock ? "text-amber-600" : "text-green-600"}`}>
                            {availableStock}
                          </p>
                          <p className="text-xs text-muted-foreground">en stock</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>

      {/* How it works */}
      <Card className="bg-muted/50">
        <CardContent className="pt-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-green-600" />
            Comment ça marche ?
          </h3>
          <div className="grid sm:grid-cols-4 gap-4 text-sm">
            <div className="flex items-start gap-3">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-green-600 text-white text-xs font-bold shrink-0">1</span>
              <div>
                <p className="font-medium">Ajoutez vos produits</p>
                <p className="text-muted-foreground">Avec un mot-clé simple (ROBE1)</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-green-600 text-white text-xs font-bold shrink-0">2</span>
              <div>
                <p className="font-medium">Activez le mode Live</p>
                <p className="text-muted-foreground">Pendant votre live Facebook/TikTok</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-green-600 text-white text-xs font-bold shrink-0">3</span>
              <div>
                <p className="font-medium">Clients envoient le mot-clé</p>
                <p className="text-muted-foreground">Sur WhatsApp → commande créée</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-green-600 text-white text-xs font-bold shrink-0">4</span>
              <div>
                <p className="font-medium">Paiement mobile money</p>
                <p className="text-muted-foreground">Wave, Orange Money, Carte</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
