import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Package, Phone, Clock, CheckCircle, XCircle, AlertCircle, MessageCircle } from "lucide-react";
import { InitiateChatDialog } from "@/components/initiate-chat-dialog";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { getOrders, getProducts, type Order, type Product } from "@/lib/firebase";

const statusConfig = {
  pending: { label: "En attente", color: "bg-yellow-500", icon: Clock },
  reserved: { label: "Réservé", color: "bg-blue-500", icon: AlertCircle },
  paid: { label: "Payé", color: "bg-green-500", icon: CheckCircle },
  expired: { label: "Expiré", color: "bg-gray-500", icon: XCircle },
  cancelled: { label: "Annulé", color: "bg-red-500", icon: XCircle },
};

export default function Orders() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    
    const loadData = async () => {
      try {
        setIsLoading(true);
        const [ordersData, productsData] = await Promise.all([
          getOrders(user.id),
          getProducts(user.id),
        ]);
        setOrders(ordersData);
        setProducts(productsData);
      } catch (error) {
        console.error("Error loading orders:", error);
        toast({ title: "Erreur", description: "Impossible de charger les commandes", variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    };
    
    loadData();
  }, [user, toast]);

  // Calculate stats from orders
  const stats = {
    pending: orders.filter(o => o.status === "pending").length,
    reserved: orders.filter(o => o.status === "reserved").length,
    paid: orders.filter(o => o.status === "paid").length,
    expired: orders.filter(o => o.status === "expired").length,
    totalRevenue: orders.filter(o => o.status === "paid").reduce((sum, o) => sum + o.totalAmount, 0),
  };

  const getProductName = (productId: string) => {
    const product = products.find(p => p.id === productId);
    return product?.name || "Produit";
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat("fr-FR").format(amount) + " FCFA";
  };

  const formatDate = (date: Date) => {
    return date.toLocaleString("fr-FR", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Commandes</h1>
          <p className="text-muted-foreground">Suivi des commandes WhatsApp</p>
        </div>
        <InitiateChatDialog
          trigger={
            <Button className="gap-2 bg-green-600 hover:bg-green-700">
              <MessageCircle className="w-4 h-4" />
              Contacter un client
            </Button>
          }
        />
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">En attente</p>
                <p className="text-2xl font-bold text-blue-600">{stats.reserved}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-blue-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Payées</p>
                <p className="text-2xl font-bold text-green-600">{stats.paid}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Expirées</p>
                <p className="text-2xl font-bold text-gray-600">{stats.expired}</p>
              </div>
              <XCircle className="h-8 w-8 text-gray-400 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-green-50 dark:bg-green-950/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Revenu total</p>
                <p className="text-xl font-bold text-green-600">
                  {formatPrice(stats.totalRevenue)}
                </p>
              </div>
              <Package className="h-8 w-8 text-green-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Orders List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Historique des commandes</CardTitle>
        </CardHeader>
        <CardContent>
          {orders.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Aucune commande pour le moment</p>
              <p className="text-sm mt-2">Les commandes WhatsApp apparaîtront ici</p>
            </div>
          ) : (
            <ScrollArea className="h-[500px]">
              <div className="space-y-3">
                {orders.map((order) => {
                  const config = statusConfig[order.status];
                  const StatusIcon = config.icon;
                  const productName = getProductName(order.productId);
                  return (
                    <div
                      key={order.id}
                      className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className={`p-2 rounded-full ${config.color} bg-opacity-20`}>
                          <StatusIcon className={`h-5 w-5 ${config.color.replace('bg-', 'text-')}`} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{productName}</span>
                            <Badge variant="outline">x{order.quantity}</Badge>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                            <Phone className="h-3 w-3" />
                            <span>{order.clientName || order.clientPhone}</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right flex items-center gap-3">
                        <InitiateChatDialog
                          defaultPhone={order.clientPhone}
                          trigger={
                            <Button size="sm" variant="ghost" className="text-green-600 hover:text-green-700 hover:bg-green-50">
                              <MessageCircle className="w-4 h-4" />
                            </Button>
                          }
                        />
                        <div>
                          <p className="font-semibold">{formatPrice(order.totalAmount)}</p>
                          <div className="flex items-center gap-2 justify-end mt-1">
                            <Badge
                              variant={order.status === "paid" ? "default" : "secondary"}
                              className={order.status === "paid" ? "bg-green-600" : ""}
                            >
                              {config.label}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatDate(order.createdAt)}
                          </p>
                        </div>
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
  );
}
