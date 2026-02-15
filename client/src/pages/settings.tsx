import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/use-auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  User, 
  Bell, 
  Clock, 
  Smartphone, 
  Volume2, 
  Shield,
  Save,
  Loader2,
  LogOut,
  MessageCircle,
  CheckCircle,
  AlertCircle,
  ExternalLink
} from "lucide-react";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

// Settings are stored in localStorage
const SETTINGS_KEY = "livepay_vendor_settings";

interface VendorSettings {
  invoiceExpirationMinutes: number;
  enableSoundNotifications: boolean;
  notificationVolume: number;
  defaultPaymentMethod: string;
  autoOpenWhatsApp: boolean;
  compactView: boolean;
}

const defaultSettings: VendorSettings = {
  invoiceExpirationMinutes: 15,
  enableSoundNotifications: true,
  notificationVolume: 50,
  defaultPaymentMethod: "wave",
  autoOpenWhatsApp: false,
  compactView: false,
};

function loadSettings(): VendorSettings {
  try {
    const saved = localStorage.getItem(SETTINGS_KEY);
    if (saved) {
      return { ...defaultSettings, ...JSON.parse(saved) };
    }
  } catch (error) {
    console.error("Failed to load settings:", error);
  }
  return defaultSettings;
}

function saveSettings(settings: VendorSettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (error) {
    console.error("Failed to save settings:", error);
  }
}

async function fetchVendorConfig() {
  const response = await fetch("/api/vendor/config", { credentials: "include" });
  if (!response.ok) throw new Error("Erreur chargement config");
  return response.json();
}

async function updateVendorConfig(data: Record<string, any>) {
  const response = await fetch("/api/vendor/config", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error("Erreur mise à jour config");
  return response.json();
}

async function testWhatsAppConnection() {
  const response = await fetch("/api/vendor/test-whatsapp", {
    method: "POST",
    credentials: "include",
  });
  return response.json();
}

async function updateProfile(data: {
  firstName?: string;
  lastName?: string;
  businessName?: string;
  phone?: string;
}) {
  const response = await fetch("/api/auth/profile", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    throw new Error("Erreur lors de la mise à jour du profil");
  }
  return response.json();
}

export default function Settings() {
  const { user, logout, isLoggingOut } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [settings, setSettings] = useState<VendorSettings>(loadSettings);
  const [hasChanges, setHasChanges] = useState(false);
  
  // WhatsApp configuration state
  const [whatsappConfig, setWhatsappConfig] = useState({
    whatsappPhoneNumberId: "",
    whatsappAccessToken: "",
    whatsappVerifyToken: "",
    welcomeMessage: "",
    reservationDurationMinutes: 10,
    autoReplyEnabled: true,
    autoReminderEnabled: true,
  });
  const [whatsappTestResult, setWhatsappTestResult] = useState<{success: boolean; message: string; phoneNumber?: string} | null>(null);

  // Fetch vendor config
  const { data: vendorConfig, isLoading: configLoading } = useQuery({
    queryKey: ["/api/vendor/config"],
    queryFn: fetchVendorConfig,
  });

  // Update whatsappConfig when vendorConfig loads
  useEffect(() => {
    if (vendorConfig) {
      setWhatsappConfig({
        whatsappPhoneNumberId: vendorConfig.whatsappPhoneNumberId || "",
        whatsappAccessToken: vendorConfig.whatsappAccessToken || "",
        whatsappVerifyToken: vendorConfig.whatsappVerifyToken || "",
        welcomeMessage: vendorConfig.welcomeMessage || "",
        reservationDurationMinutes: vendorConfig.reservationDurationMinutes || 10,
        autoReplyEnabled: vendorConfig.autoReplyEnabled ?? true,
        autoReminderEnabled: vendorConfig.autoReminderEnabled ?? true,
      });
    }
  }, [vendorConfig]);

  const vendorConfigMutation = useMutation({
    mutationFn: updateVendorConfig,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vendor/config"] });
      toast({ title: "Configuration WhatsApp enregistrée" });
    },
    onError: () => {
      toast({ title: "Erreur", description: "Impossible de sauvegarder", variant: "destructive" });
    },
  });

  const testWhatsAppMutation = useMutation({
    mutationFn: testWhatsAppConnection,
    onSuccess: (result) => {
      setWhatsappTestResult(result);
      if (result.success) {
        toast({ title: "Connexion réussie", description: result.phoneNumber });
      } else {
        toast({ title: "Erreur", description: result.message, variant: "destructive" });
      }
    },
    onError: () => {
      toast({ title: "Erreur", description: "Test échoué", variant: "destructive" });
    },
  });

  // Profile form state
  const [profileData, setProfileData] = useState({
    firstName: user?.firstName || "",
    lastName: user?.lastName || "",
    businessName: (user as any)?.businessName || "",
    phone: (user as any)?.phone || "",
  });

  useEffect(() => {
    if (user) {
      setProfileData({
        firstName: user.firstName || "",
        lastName: user.lastName || "",
        businessName: (user as any)?.businessName || "",
        phone: (user as any)?.phone || "",
      });
    }
  }, [user]);

  const profileMutation = useMutation({
    mutationFn: updateProfile,
    onSuccess: (updatedUser) => {
      queryClient.setQueryData(["/api/auth/user"], updatedUser);
      toast({ title: "Profil mis à jour" });
    },
    onError: () => {
      toast({ title: "Erreur", description: "Impossible de mettre à jour le profil", variant: "destructive" });
    },
  });

  const initials = user
    ? `${(user.firstName || "")[0] || ""}${(user.lastName || "")[0] || ""}`.toUpperCase() || "U"
    : "U";

  const updateSetting = <K extends keyof VendorSettings>(
    key: K,
    value: VendorSettings[K]
  ) => {
    setSettings((prev: VendorSettings) => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleSave = () => {
    saveSettings(settings);
    setHasChanges(false);
    toast({ title: "Paramètres enregistrés" });
  };

  const handleReset = () => {
    setSettings(defaultSettings);
    setHasChanges(true);
  };

  const handleProfileSave = (e: React.FormEvent) => {
    e.preventDefault();
    profileMutation.mutate(profileData);
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-3xl">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-serif font-bold" data-testid="text-settings-title">
            Paramètres
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Personnalisez votre expérience LivePay
          </p>
        </div>
        {hasChanges && (
          <Button onClick={handleSave} data-testid="button-save-settings">
            <Save className="w-4 h-4 mr-2" />
            Enregistrer
          </Button>
        )}
      </div>

      {/* Profile Section */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <User className="w-5 h-5 text-muted-foreground" />
          <h2 className="font-semibold">Profil</h2>
        </div>
        <form onSubmit={handleProfileSave} className="space-y-4">
          <div className="flex items-center gap-4 mb-4">
            <Avatar className="w-16 h-16">
              <AvatarImage src={user?.profileImageUrl || undefined} />
              <AvatarFallback className="text-lg">{initials}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-lg font-medium truncate">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-sm text-muted-foreground truncate">{user?.email}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">Prénom</Label>
              <Input
                id="firstName"
                value={profileData.firstName}
                onChange={(e) => setProfileData({ ...profileData, firstName: e.target.value })}
                placeholder="Prénom"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Nom</Label>
              <Input
                id="lastName"
                value={profileData.lastName}
                onChange={(e) => setProfileData({ ...profileData, lastName: e.target.value })}
                placeholder="Nom"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="businessName">Nom de l'entreprise</Label>
            <Input
              id="businessName"
              value={profileData.businessName}
              onChange={(e) => setProfileData({ ...profileData, businessName: e.target.value })}
              placeholder="Ma Boutique"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Téléphone</Label>
            <Input
              id="phone"
              type="tel"
              value={profileData.phone}
              onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
              placeholder="+221 77 123 45 67"
            />
          </div>

          <Button type="submit" disabled={profileMutation.isPending}>
            {profileMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Enregistrement...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Mettre à jour le profil
              </>
            )}
          </Button>
        </form>
      </Card>

      {/* WhatsApp Business API Configuration */}
      <Card className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-green-500" />
            <h2 className="font-semibold">WhatsApp Business API</h2>
          </div>
          {whatsappTestResult && (
            <div className={`flex items-center gap-1 text-sm ${whatsappTestResult.success ? 'text-green-500' : 'text-red-500'}`}>
              {whatsappTestResult.success ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
              <span>{whatsappTestResult.success ? 'Connecté' : 'Non connecté'}</span>
            </div>
          )}
        </div>

        <div className="p-4 rounded-md bg-muted/50 text-sm">
          <p className="font-medium mb-2">Comment obtenir ces identifiants ?</p>
          <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
            <li>Créez une app sur <a href="https://developers.facebook.com" target="_blank" rel="noopener noreferrer" className="text-primary underline inline-flex items-center gap-1">Meta for Developers <ExternalLink className="w-3 h-3" /></a></li>
            <li>Ajoutez le produit "WhatsApp Business"</li>
            <li>Copiez le Phone Number ID et l'Access Token</li>
          </ol>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="waPhoneId">Phone Number ID</Label>
            <Input
              id="waPhoneId"
              value={whatsappConfig.whatsappPhoneNumberId}
              onChange={(e) => setWhatsappConfig({ ...whatsappConfig, whatsappPhoneNumberId: e.target.value })}
              placeholder="1234567890123456"
            />
            <p className="text-xs text-muted-foreground">
              ID de votre numéro WhatsApp Business (Meta Business Manager)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="waToken">Access Token</Label>
            <Input
              id="waToken"
              type="password"
              value={whatsappConfig.whatsappAccessToken}
              onChange={(e) => setWhatsappConfig({ ...whatsappConfig, whatsappAccessToken: e.target.value })}
              placeholder="EAAxxxxxxx..."
            />
            <p className="text-xs text-muted-foreground">
              Token d'accès permanent de l'API WhatsApp
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="waVerify">Verify Token (Webhook)</Label>
            <Input
              id="waVerify"
              value={whatsappConfig.whatsappVerifyToken}
              onChange={(e) => setWhatsappConfig({ ...whatsappConfig, whatsappVerifyToken: e.target.value })}
              placeholder="livepay_webhook_verify"
            />
            <p className="text-xs text-muted-foreground">
              Token de vérification pour le webhook (configurez-le dans Meta)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="welcomeMsg">Message de bienvenue</Label>
            <Textarea
              id="welcomeMsg"
              value={whatsappConfig.welcomeMessage}
              onChange={(e) => setWhatsappConfig({ ...whatsappConfig, welcomeMessage: e.target.value })}
              placeholder="Bienvenue ! 🎉 Envoyez le mot-clé du produit pour commander..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="reserveDuration">Durée de réservation</Label>
            <Select
              value={whatsappConfig.reservationDurationMinutes.toString()}
              onValueChange={(v) => setWhatsappConfig({ ...whatsappConfig, reservationDurationMinutes: parseInt(v) })}
            >
              <SelectTrigger id="reserveDuration">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5">5 minutes</SelectItem>
                <SelectItem value="10">10 minutes</SelectItem>
                <SelectItem value="15">15 minutes</SelectItem>
                <SelectItem value="20">20 minutes</SelectItem>
                <SelectItem value="30">30 minutes</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Temps accordé au client pour payer après confirmation
            </p>
          </div>

          <div className="flex items-center justify-between gap-4 pt-2">
            <div className="space-y-0.5">
              <Label>Réponse automatique</Label>
              <p className="text-xs text-muted-foreground">
                Le chatbot répond automatiquement aux clients
              </p>
            </div>
            <Switch
              checked={whatsappConfig.autoReplyEnabled}
              onCheckedChange={(v) => setWhatsappConfig({ ...whatsappConfig, autoReplyEnabled: v })}
            />
          </div>

          <div className="flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <Label>Rappels automatiques</Label>
              <p className="text-xs text-muted-foreground">
                Envoyer des rappels avant expiration des commandes
              </p>
            </div>
            <Switch
              checked={whatsappConfig.autoReminderEnabled}
              onCheckedChange={(v) => setWhatsappConfig({ ...whatsappConfig, autoReminderEnabled: v })}
            />
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <Button
            variant="outline"
            onClick={() => testWhatsAppMutation.mutate()}
            disabled={testWhatsAppMutation.isPending || !whatsappConfig.whatsappPhoneNumberId}
          >
            {testWhatsAppMutation.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <CheckCircle className="w-4 h-4 mr-2" />
            )}
            Tester la connexion
          </Button>
          <Button
            onClick={() => vendorConfigMutation.mutate(whatsappConfig)}
            disabled={vendorConfigMutation.isPending}
          >
            {vendorConfigMutation.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Enregistrer
          </Button>
        </div>
      </Card>

      {/* Invoice Settings */}
      <Card className="p-6 space-y-6">
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-muted-foreground" />
          <h2 className="font-semibold">Factures</h2>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="expiration">Délai d'expiration des factures</Label>
            <Select
              value={settings.invoiceExpirationMinutes.toString()}
              onValueChange={(v: string) => updateSetting("invoiceExpirationMinutes", parseInt(v))}
            >
              <SelectTrigger id="expiration">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5">5 minutes</SelectItem>
                <SelectItem value="10">10 minutes</SelectItem>
                <SelectItem value="15">15 minutes</SelectItem>
                <SelectItem value="30">30 minutes</SelectItem>
                <SelectItem value="60">1 heure</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Temps accordé au client pour effectuer le paiement
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="defaultPayment">Mode de paiement par défaut</Label>
            <Select
              value={settings.defaultPaymentMethod}
              onValueChange={(v: string) => updateSetting("defaultPaymentMethod", v)}
            >
              <SelectTrigger id="defaultPayment">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="wave">Wave</SelectItem>
                <SelectItem value="orange_money">Orange Money</SelectItem>
                <SelectItem value="card">Carte bancaire</SelectItem>
                <SelectItem value="cash">Espèces</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* Notification Settings */}
      <Card className="p-6 space-y-6">
        <div className="flex items-center gap-2">
          <Bell className="w-5 h-5 text-muted-foreground" />
          <h2 className="font-semibold">Notifications</h2>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <Label htmlFor="soundNotif">Notifications sonores</Label>
              <p className="text-xs text-muted-foreground">
                Jouer un son lors de la réception d'un paiement
              </p>
            </div>
            <Switch
              id="soundNotif"
              checked={settings.enableSoundNotifications}
              onCheckedChange={(v: boolean) => updateSetting("enableSoundNotifications", v)}
            />
          </div>

          {settings.enableSoundNotifications && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="volume">Volume</Label>
                <span className="text-sm text-muted-foreground">
                  {settings.notificationVolume}%
                </span>
              </div>
              <div className="flex items-center gap-3">
                <Volume2 className="w-4 h-4 text-muted-foreground" />
                <Slider
                  id="volume"
                  value={[settings.notificationVolume]}
                  onValueChange={([v]: number[]) => updateSetting("notificationVolume", v)}
                  max={100}
                  step={10}
                  className="flex-1"
                />
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* App Settings */}
      <Card className="p-6 space-y-6">
        <div className="flex items-center gap-2">
          <Smartphone className="w-5 h-5 text-muted-foreground" />
          <h2 className="font-semibold">Application</h2>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <Label htmlFor="autoWhatsApp">Ouvrir WhatsApp automatiquement</Label>
              <p className="text-xs text-muted-foreground">
                Ouvrir WhatsApp après la création d'une facture
              </p>
            </div>
            <Switch
              id="autoWhatsApp"
              checked={settings.autoOpenWhatsApp}
              onCheckedChange={(v: boolean) => updateSetting("autoOpenWhatsApp", v)}
            />
          </div>

          <div className="flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <Label htmlFor="compactView">Vue compacte</Label>
              <p className="text-xs text-muted-foreground">
                Réduire l'espacement pour voir plus de contenu
              </p>
            </div>
            <Switch
              id="compactView"
              checked={settings.compactView}
              onCheckedChange={(v: boolean) => updateSetting("compactView", v)}
            />
          </div>
        </div>
      </Card>

      {/* Security Section */}
      <Card className="p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-muted-foreground" />
          <h2 className="font-semibold">Sécurité</h2>
        </div>
        
        <div className="p-4 rounded-md bg-muted/50">
          <p className="text-sm text-muted-foreground">
            Vos données sont protégées. Les paiements sont sécurisés via notre partenaire 
            Bictorys, certifié BCEAO pour les transactions dans la zone UEMOA.
          </p>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={handleReset} className="flex-1">
            Réinitialiser les paramètres
          </Button>
          <Button 
            variant="destructive" 
            onClick={() => logout()} 
            disabled={isLoggingOut}
            className="flex-1"
          >
            {isLoggingOut ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <LogOut className="w-4 h-4 mr-2" />
            )}
            Se déconnecter
          </Button>
        </div>
      </Card>
    </div>
  );
}

// Export the loadSettings function for use in other components
export { loadSettings };
export type { VendorSettings };
