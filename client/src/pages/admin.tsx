import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { 
  Users, 
  ShoppingCart, 
  CreditCard, 
  TrendingUp,
  Settings,
  MessageCircle,
  Eye,
  Save,
  Loader2,
  RefreshCw,
  Search,
  Shield,
  Activity,
  CheckCircle2,
  XCircle,
  Zap,
  Phone,
  Copy,
  ExternalLink,
  Terminal,
  Radio,
  AlertTriangle
} from "lucide-react";

// Types
interface Vendor {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  businessName: string | null;
  phone: string | null;
  role: string;
  createdAt: string;
}

interface VendorConfig {
  id: string;
  vendorId: string;
  businessName: string;
  whatsappPhoneNumberId: string | null;
  whatsappAccessToken: string | null;
  whatsappVerifyToken: string | null;
  liveMode: boolean;
  status: string;
  segment: string;
  reservationDurationMinutes: number;
  autoReplyEnabled: boolean;
  autoReminderEnabled: boolean;
  createdAt: string;
}

interface AdminStats {
  totalVendors: number;
  activeVendors: number;
  totalOrders: number;
  paidOrders: number;
  totalRevenue: number;
  todayOrders: number;
  todayRevenue: number;
}

interface Order {
  id: string;
  vendorId: string;
  clientPhone: string;
  clientName: string | null;
  productName: string;
  quantity: number;
  totalAmount: number;
  status: string;
  createdAt: string;
  paidAt: string | null;
  vendor?: { businessName: string };
}

// API functions
async function fetchAdminStats(): Promise<AdminStats> {
  const res = await fetch("/api/admin/stats", { credentials: "include" });
  if (!res.ok) throw new Error("Non autorisé");
  return res.json();
}

async function fetchVendors(): Promise<Vendor[]> {
  const res = await fetch("/api/admin/vendors", { credentials: "include" });
  if (!res.ok) throw new Error("Non autorisé");
  return res.json();
}

async function fetchVendorConfig(vendorId: string): Promise<VendorConfig | null> {
  const res = await fetch(`/api/admin/vendors/${vendorId}/config`, { credentials: "include" });
  if (!res.ok) return null;
  return res.json();
}

async function updateVendorConfig(vendorId: string, data: Partial<VendorConfig>) {
  const res = await fetch(`/api/admin/vendors/${vendorId}/config`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Erreur de mise à jour");
  return res.json();
}

async function fetchAllOrders(): Promise<Order[]> {
  const res = await fetch("/api/admin/orders", { credentials: "include" });
  if (!res.ok) throw new Error("Non autorisé");
  return res.json();
}

async function testVendorWhatsApp(vendorId: string) {
  const res = await fetch(`/api/admin/vendors/${vendorId}/test-whatsapp`, {
    method: "POST",
    credentials: "include",
  });
  return res.json();
}

async function setupVendorWhatsAppDefaults(vendorId: string) {
  const res = await fetch(`/api/admin/vendors/${vendorId}/setup-whatsapp-defaults`, {
    method: "POST",
    credentials: "include",
  });
  return res.json();
}

// Component to show WhatsApp status inline
function VendorWhatsAppStatus({ vendorId }: { vendorId: string }) {
  const { data: config, isLoading } = useQuery({
    queryKey: ["vendorConfig", vendorId],
    queryFn: () => fetchVendorConfig(vendorId),
    staleTime: 60000,
  });

  if (isLoading) {
    return <Badge variant="outline" className="text-xs"><Loader2 className="w-3 h-3 animate-spin" /></Badge>;
  }

  const isConfigured = !!(config?.whatsappPhoneNumberId && config?.whatsappAccessToken);

  return isConfigured ? (
    <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
      <CheckCircle2 className="w-3 h-3 mr-1" /> Configuré
    </Badge>
  ) : (
    <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200">
      <AlertTriangle className="w-3 h-3 mr-1" /> À configurer
    </Badge>
  );
}

// Components
function StatCard({ title, value, icon: Icon, subtitle, trend }: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  subtitle?: string;
  trend?: number;
}) {
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
          {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
        </div>
        <div className="p-2 bg-primary/10 rounded-lg">
          <Icon className="w-5 h-5 text-primary" />
        </div>
      </div>
      {trend !== undefined && (
        <div className={`flex items-center gap-1 mt-2 text-xs ${trend >= 0 ? 'text-green-500' : 'text-red-500'}`}>
          <TrendingUp className={`w-3 h-3 ${trend < 0 ? 'rotate-180' : ''}`} />
          <span>{trend >= 0 ? '+' : ''}{trend}% vs hier</span>
        </div>
      )}
    </Card>
  );
}

function VendorConfigDialog({ vendor, onClose }: { vendor: Vendor; onClose: () => void }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showToken, setShowToken] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; phoneNumber?: string } | null>(null);
  const [config, setConfig] = useState<Partial<VendorConfig>>({
    whatsappPhoneNumberId: "",
    whatsappAccessToken: "",
    whatsappVerifyToken: "",
    liveMode: false,
    autoReplyEnabled: true,
    autoReminderEnabled: true,
    reservationDurationMinutes: 10,
    segment: "live_seller",
  });

  const { data: fetchedConfig, isLoading } = useQuery({
    queryKey: ["vendorConfig", vendor.id],
    queryFn: () => fetchVendorConfig(vendor.id),
  });

  // Update local state when config is fetched
  useEffect(() => {
    if (fetchedConfig) {
      setConfig({
        whatsappPhoneNumberId: fetchedConfig.whatsappPhoneNumberId || "",
        whatsappAccessToken: fetchedConfig.whatsappAccessToken || "",
        whatsappVerifyToken: fetchedConfig.whatsappVerifyToken || "",
        liveMode: fetchedConfig.liveMode,
        autoReplyEnabled: fetchedConfig.autoReplyEnabled,
        autoReminderEnabled: fetchedConfig.autoReminderEnabled,
        reservationDurationMinutes: fetchedConfig.reservationDurationMinutes,
        segment: fetchedConfig.segment,
      });
    }
  }, [fetchedConfig]);

  const mutation = useMutation({
    mutationFn: (data: Partial<VendorConfig>) => updateVendorConfig(vendor.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendorConfig", vendor.id] });
      queryClient.invalidateQueries({ queryKey: ["adminVendors"] });
      toast({ title: "Configuration sauvegardée" });
    },
    onError: () => {
      toast({ title: "Erreur", description: "Impossible de sauvegarder", variant: "destructive" });
    },
  });

  const testMutation = useMutation({
    mutationFn: () => testVendorWhatsApp(vendor.id),
    onSuccess: (data) => {
      setTestResult(data);
      if (data.success) {
        toast({ title: "✅ Connexion réussie !", description: `Numéro: ${data.phoneNumber}` });
      } else {
        toast({ title: "❌ Échec", description: data.message, variant: "destructive" });
      }
    },
    onError: () => {
      toast({ title: "Erreur", description: "Test impossible", variant: "destructive" });
    },
  });

  const setupDefaultsMutation = useMutation({
    mutationFn: () => setupVendorWhatsAppDefaults(vendor.id),
    onSuccess: (data) => {
      if (data.success) {
        toast({ title: "✅ Commandes configurées !" });
      } else {
        toast({ title: "Erreur", description: data.error, variant: "destructive" });
      }
    },
  });

  const isWhatsAppConfigured = !!(config.whatsappPhoneNumberId && config.whatsappAccessToken);
  const webhookUrl = `${window.location.origin}/api/whatsapp/webhook`;

  return (
    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Settings className="w-5 h-5" />
          Configuration - {vendor.businessName || vendor.email}
        </DialogTitle>
        <DialogDescription>
          Configurer les tokens WhatsApp API et les paramètres du vendeur
        </DialogDescription>
      </DialogHeader>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      ) : (
        <div className="space-y-6 mt-4">
          {/* Vendor Info */}
          <div className="p-4 bg-muted/50 rounded-lg space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Email</span>
              <span className="font-mono text-sm">{vendor.email}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Téléphone</span>
              <span className="font-mono text-sm">{vendor.phone || "Non renseigné"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Mode Live</span>
              <Badge variant={config.liveMode ? "default" : "secondary"} className={config.liveMode ? "bg-green-500" : ""}>
                {config.liveMode ? <><Radio className="w-3 h-3 mr-1 animate-pulse" /> ACTIF</> : "INACTIF"}
              </Badge>
            </div>
          </div>

          <Separator />

          {/* WhatsApp API Config */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold flex items-center gap-2">
                <MessageCircle className="w-4 h-4 text-green-500" />
                WhatsApp Business API
              </h3>
              {isWhatsAppConfigured ? (
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                  <CheckCircle2 className="w-3 h-3 mr-1" /> Configuré
                </Badge>
              ) : (
                <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                  <AlertTriangle className="w-3 h-3 mr-1" /> Non configuré
                </Badge>
              )}
            </div>
            
            <div className="space-y-3">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Phone className="w-3 h-3" />
                  Phone Number ID
                </Label>
                <Input
                  value={config.whatsappPhoneNumberId || ""}
                  onChange={(e) => setConfig({ ...config, whatsappPhoneNumberId: e.target.value })}
                  placeholder="994899897039054"
                  className="font-mono"
                />
              </div>

              <div className="space-y-2">
                <Label className="flex items-center justify-between">
                  <span>Access Token</span>
                  <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => setShowToken(!showToken)}>
                    <Eye className="w-3 h-3 mr-1" />
                    {showToken ? "Masquer" : "Afficher"}
                  </Button>
                </Label>
                <Input
                  type={showToken ? "text" : "password"}
                  value={config.whatsappAccessToken || ""}
                  onChange={(e) => setConfig({ ...config, whatsappAccessToken: e.target.value })}
                  placeholder="EAAxxxxxxx..."
                  className="font-mono text-xs"
                />
              </div>

              <div className="space-y-2">
                <Label>Verify Token (Webhook)</Label>
                <Input
                  value={config.whatsappVerifyToken || ""}
                  onChange={(e) => setConfig({ ...config, whatsappVerifyToken: e.target.value })}
                  placeholder="livepay_webhook_verify"
                />
              </div>

              {/* Webhook URL */}
              <div className="p-3 bg-muted/50 rounded-lg space-y-2">
                <Label className="text-xs text-muted-foreground">URL Webhook (à configurer dans Meta)</Label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-xs bg-background p-2 rounded border overflow-x-auto">
                    {webhookUrl}
                  </code>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      navigator.clipboard.writeText(webhookUrl);
                      toast({ title: "Copié !" });
                    }}
                  >
                    <Copy className="w-3 h-3" />
                  </Button>
                </div>
              </div>

              {/* Test & Actions */}
              {isWhatsAppConfigured && (
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1"
                    onClick={() => testMutation.mutate()}
                    disabled={testMutation.isPending}
                  >
                    {testMutation.isPending ? (
                      <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                    ) : testResult?.success ? (
                      <CheckCircle2 className="w-3 h-3 mr-1 text-green-500" />
                    ) : testResult ? (
                      <XCircle className="w-3 h-3 mr-1 text-red-500" />
                    ) : (
                      <Zap className="w-3 h-3 mr-1" />
                    )}
                    Tester connexion
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1"
                    onClick={() => setupDefaultsMutation.mutate()}
                    disabled={setupDefaultsMutation.isPending}
                  >
                    {setupDefaultsMutation.isPending ? (
                      <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                    ) : (
                      <Terminal className="w-3 h-3 mr-1" />
                    )}
                    Configurer commandes
                  </Button>
                </div>
              )}

              {testResult && (
                <div className={`p-3 rounded-lg text-sm ${testResult.success ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                  {testResult.success ? (
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Connecté : {testResult.phoneNumber}</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <XCircle className="w-4 h-4" />
                      <span>{testResult.message}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Settings */}
          <div className="space-y-4 border-t pt-4">
            <h3 className="font-semibold">Paramètres</h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Segment</Label>
                <Select
                  value={config.segment}
                  onValueChange={(v) => setConfig({ ...config, segment: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="live_seller">Live Seller</SelectItem>
                    <SelectItem value="shop">Boutique</SelectItem>
                    <SelectItem value="events">Événements</SelectItem>
                    <SelectItem value="services">Services</SelectItem>
                    <SelectItem value="b2b">B2B</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Durée réservation</Label>
                <Select
                  value={config.reservationDurationMinutes?.toString()}
                  onValueChange={(v) => setConfig({ ...config, reservationDurationMinutes: parseInt(v) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5 min</SelectItem>
                    <SelectItem value="10">10 min</SelectItem>
                    <SelectItem value="15">15 min</SelectItem>
                    <SelectItem value="20">20 min</SelectItem>
                    <SelectItem value="30">30 min</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Mode Live activé</Label>
                <Switch
                  checked={config.liveMode}
                  onCheckedChange={(v) => setConfig({ ...config, liveMode: v })}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label>Réponse automatique</Label>
                <Switch
                  checked={config.autoReplyEnabled}
                  onCheckedChange={(v) => setConfig({ ...config, autoReplyEnabled: v })}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label>Rappels automatiques</Label>
                <Switch
                  checked={config.autoReminderEnabled}
                  onCheckedChange={(v) => setConfig({ ...config, autoReminderEnabled: v })}
                />
              </div>
            </div>
          </div>

          <Button 
            className="w-full" 
            onClick={() => mutation.mutate(config)}
            disabled={mutation.isPending}
          >
            {mutation.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Sauvegarder
          </Button>
        </div>
      )}
    </DialogContent>
  );
}

export default function Admin() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const queryClient = useQueryClient();

  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useQuery({
    queryKey: ["adminStats"],
    queryFn: fetchAdminStats,
    refetchInterval: 30000, // Refresh every 30s
  });

  const { data: vendors = [], isLoading: vendorsLoading } = useQuery({
    queryKey: ["adminVendors"],
    queryFn: fetchVendors,
  });

  const { data: orders = [], isLoading: ordersLoading } = useQuery({
    queryKey: ["adminOrders"],
    queryFn: fetchAllOrders,
    refetchInterval: 15000, // Refresh every 15s
  });

  const filteredVendors = vendors.filter(v => 
    v.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.businessName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.phone?.includes(searchTerm)
  );

  const recentOrders = orders.slice(0, 50);

  const formatCurrency = (amount: number) => 
    new Intl.NumberFormat("fr-FR").format(amount) + " F";

  const formatDate = (date: string) => 
    new Date(date).toLocaleString("fr-FR", { 
      day: "2-digit", 
      month: "2-digit", 
      hour: "2-digit", 
      minute: "2-digit" 
    });

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      paid: "default",
      reserved: "secondary",
      pending: "outline",
      expired: "destructive",
      cancelled: "destructive",
    };
    const labels: Record<string, string> = {
      paid: "Payé",
      reserved: "Réservé",
      pending: "En attente",
      expired: "Expiré",
      cancelled: "Annulé",
    };
    return <Badge variant={variants[status] || "outline"}>{labels[status] || status}</Badge>;
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="w-6 h-6 text-primary" />
            Backoffice Admin
          </h1>
          <p className="text-sm text-muted-foreground">
            Monitoring et configuration globale LivePay
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => {
          refetchStats();
          queryClient.invalidateQueries({ queryKey: ["adminVendors"] });
          queryClient.invalidateQueries({ queryKey: ["adminOrders"] });
        }}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Actualiser
        </Button>
      </div>

      {/* Stats */}
      {statsLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="p-4 animate-pulse">
              <div className="h-4 bg-muted rounded w-20 mb-2" />
              <div className="h-8 bg-muted rounded w-16" />
            </Card>
          ))}
        </div>
      ) : stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard 
            title="Vendeurs actifs" 
            value={stats.activeVendors}
            subtitle={`${stats.totalVendors} total`}
            icon={Users} 
          />
          <StatCard 
            title="Commandes payées" 
            value={stats.paidOrders}
            subtitle={`${stats.totalOrders} total`}
            icon={ShoppingCart} 
          />
          <StatCard 
            title="Revenu total" 
            value={formatCurrency(stats.totalRevenue)}
            icon={CreditCard} 
          />
          <StatCard 
            title="Aujourd'hui" 
            value={formatCurrency(stats.todayRevenue)}
            subtitle={`${stats.todayOrders} commandes`}
            icon={Activity} 
          />
        </div>
      )}

      {/* Tabs */}
      <Tabs defaultValue="vendors" className="space-y-4">
        <TabsList>
          <TabsTrigger value="vendors" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Vendeurs ({vendors.length})
          </TabsTrigger>
          <TabsTrigger value="orders" className="flex items-center gap-2">
            <ShoppingCart className="w-4 h-4" />
            Commandes ({orders.length})
          </TabsTrigger>
        </TabsList>

        {/* Vendors Tab */}
        <TabsContent value="vendors" className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher vendeur..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vendeur</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Téléphone</TableHead>
                  <TableHead>WhatsApp API</TableHead>
                  <TableHead>Inscrit le</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vendorsLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                    </TableCell>
                  </TableRow>
                ) : filteredVendors.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      Aucun vendeur trouvé
                    </TableCell>
                  </TableRow>
                ) : filteredVendors.map((vendor) => (
                  <TableRow key={vendor.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{vendor.businessName || "Non défini"}</p>
                        <p className="text-xs text-muted-foreground">
                          {vendor.firstName} {vendor.lastName}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{vendor.email}</TableCell>
                    <TableCell className="text-sm">{vendor.phone || "-"}</TableCell>
                    <TableCell>
                      <VendorWhatsAppStatus vendorId={vendor.id} />
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(vendor.createdAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Dialog open={selectedVendor?.id === vendor.id} onOpenChange={(open) => !open && setSelectedVendor(null)}>
                        <DialogTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => setSelectedVendor(vendor)}
                          >
                            <Settings className="w-4 h-4 mr-1" />
                            Configurer
                          </Button>
                        </DialogTrigger>
                        {selectedVendor && (
                          <VendorConfigDialog 
                            vendor={selectedVendor} 
                            onClose={() => setSelectedVendor(null)} 
                          />
                        )}
                      </Dialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* Orders Tab */}
        <TabsContent value="orders" className="space-y-4">
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ref</TableHead>
                  <TableHead>Vendeur</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Produit</TableHead>
                  <TableHead>Montant</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ordersLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                    </TableCell>
                  </TableRow>
                ) : recentOrders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      Aucune commande
                    </TableCell>
                  </TableRow>
                ) : recentOrders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-mono text-xs">
                      #{order.id.slice(0, 8).toUpperCase()}
                    </TableCell>
                    <TableCell className="text-sm">
                      {order.vendor?.businessName || order.vendorId.slice(0, 8)}
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="text-sm">{order.clientName || "Client"}</p>
                        <p className="text-xs text-muted-foreground">{order.clientPhone}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="text-sm">{order.productName}</p>
                        <p className="text-xs text-muted-foreground">x{order.quantity}</p>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">
                      {formatCurrency(order.totalAmount)}
                    </TableCell>
                    <TableCell>{getStatusBadge(order.status)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(order.createdAt)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
