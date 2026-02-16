import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";

import { Badge } from "@/components/ui/badge";
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
  MessageCircle,
  Volume2, 
  Save,
  Loader2,
  LogOut,
  Phone,
  Store,
  CheckCircle,
  Smartphone
} from "lucide-react";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

// Settings locaux (localStorage)
const SETTINGS_KEY = "livepay_vendor_settings";

interface VendorSettings {
  enableSoundNotifications: boolean;
  notificationVolume: number;
  defaultPaymentMethod: string;
}

const defaultSettings: VendorSettings = {
  enableSoundNotifications: true,
  notificationVolume: 50,
  defaultPaymentMethod: "wave",
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
  
  // Config chatbot simplifié - juste le délai de paiement
  const [chatbotConfig, setChatbotConfig] = useState({
    reservationDurationMinutes: 10,
  });

  // Config Mobile Money
  const [mobileMoneyConfig, setMobileMoneyConfig] = useState({
    mobileMoneyNumber: "",
    preferredPaymentMethod: "wave",
  });

  // Fetch vendor config
  const { data: vendorConfig } = useQuery({
    queryKey: ["/api/vendor/config"],
    queryFn: fetchVendorConfig,
  });

  // Charger config depuis API
  useEffect(() => {
    if (vendorConfig) {
      setChatbotConfig({
        reservationDurationMinutes: vendorConfig.reservationDurationMinutes || 10,
      });
      setMobileMoneyConfig({
        mobileMoneyNumber: vendorConfig.mobileMoneyNumber || "",
        preferredPaymentMethod: vendorConfig.preferredPaymentMethod || "wave",
      });
    }
  }, [vendorConfig]);

  const vendorConfigMutation = useMutation({
    mutationFn: updateVendorConfig,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vendor/config"] });
      toast({ title: "Configuration enregistrée" });
    },
    onError: () => {
      toast({ title: "Erreur", description: "Impossible de sauvegarder", variant: "destructive" });
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

  const handleSaveSettings = () => {
    saveSettings(settings);
    setHasChanges(false);
    toast({ title: "Paramètres enregistrés" });
  };

  const handleProfileSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileData.phone) {
      toast({ title: "Erreur", description: "Le numéro de téléphone est obligatoire", variant: "destructive" });
      return;
    }
    profileMutation.mutate(profileData);
  };

  const handleChatbotSave = () => {
    vendorConfigMutation.mutate(chatbotConfig);
  };

  const handleMobileMoneyConfigSave = () => {
    vendorConfigMutation.mutate(mobileMoneyConfig);
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-serif font-bold">Paramètres</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Configurez votre boutique LivePay
        </p>
      </div>

      {/* Section Profil */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <User className="w-5 h-5 text-primary" />
          <h2 className="font-semibold">Mon Profil</h2>
        </div>
        
        <form onSubmit={handleProfileSave} className="space-y-4">
          <div className="flex items-center gap-4 mb-4 p-3 bg-muted/50 rounded-lg">
            <Avatar className="w-14 h-14">
              <AvatarImage src={user?.profileImageUrl || undefined} />
              <AvatarFallback className="text-lg bg-primary text-primary-foreground">{initials}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">
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
            <Label htmlFor="businessName" className="flex items-center gap-2">
              <Store className="w-4 h-4" />
              Nom de la boutique
            </Label>
            <Input
              id="businessName"
              value={profileData.businessName}
              onChange={(e) => setProfileData({ ...profileData, businessName: e.target.value })}
              placeholder="Ma Boutique"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone" className="flex items-center gap-2">
              <Phone className="w-4 h-4" />
              Numéro WhatsApp <span className="text-red-500">*</span>
            </Label>
            <Input
              id="phone"
              type="tel"
              value={profileData.phone}
              onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
              placeholder="+221 77 123 45 67"
              className="text-lg"
              required
            />
            <p className="text-xs text-muted-foreground">
              Ce numéro recevra les notifications de commandes et paiements
            </p>
          </div>

          <Button type="submit" className="w-full" disabled={profileMutation.isPending}>
            {profileMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Enregistrement...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Enregistrer le profil
              </>
            )}
          </Button>
        </form>
      </Card>

      {/* Section Mobile Money */}
      <Card className="p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Smartphone className="w-5 h-5 text-cyan-500" />
          <h2 className="font-semibold">Paiement Mobile Money</h2>
        </div>
        
        <p className="text-sm text-muted-foreground">
          Configurez votre numéro Mobile Money pour recevoir les paiements directement de vos clients.
        </p>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="mobileMoneyNumber" className="flex items-center gap-2">
              <Phone className="w-4 h-4" />
              Numéro Mobile Money <span className="text-red-500">*</span>
            </Label>
            <Input
              id="mobileMoneyNumber"
              type="tel"
              value={mobileMoneyConfig.mobileMoneyNumber}
              onChange={(e) => setMobileMoneyConfig({ ...mobileMoneyConfig, mobileMoneyNumber: e.target.value })}
              placeholder="221 77 123 45 67"
              className="text-lg"
            />
            <p className="text-xs text-muted-foreground">
              Numéro sur lequel vous recevrez les paiements (Wave, Orange Money, etc.)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="preferredPaymentMethod">Méthode de paiement préférée</Label>
            <Select
              value={mobileMoneyConfig.preferredPaymentMethod}
              onValueChange={(v) => setMobileMoneyConfig({ ...mobileMoneyConfig, preferredPaymentMethod: v })}
            >
              <SelectTrigger id="preferredPaymentMethod">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="wave">
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-cyan-500"></span>
                    Wave
                  </span>
                </SelectItem>
                <SelectItem value="orange_money">
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-orange-500"></span>
                    Orange Money
                  </span>
                </SelectItem>
                <SelectItem value="free_money">
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-red-500"></span>
                    Free Money
                  </span>
                </SelectItem>
                <SelectItem value="mtn_momo">
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
                    MTN MoMo
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Méthode proposée par défaut aux clients
            </p>
          </div>

          <div className="p-3 bg-cyan-50 dark:bg-cyan-950/20 rounded-lg border border-cyan-200 dark:border-cyan-800">
            <p className="text-sm text-cyan-700 dark:text-cyan-400">
              💡 Les clients verront un lien pour vous payer directement via l'application Mobile Money avec le montant pré-rempli.
            </p>
          </div>
        </div>

        <Button onClick={handleMobileMoneyConfigSave} className="w-full" disabled={vendorConfigMutation.isPending}>
          {vendorConfigMutation.isPending ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          Enregistrer Mobile Money
        </Button>
      </Card>

      {/* Section Comment ça marche - WhatsApp Direct */}
      <Card className="p-6 space-y-4">
        <div className="flex items-center gap-2">
          <MessageCircle className="w-5 h-5 text-green-500" />
          <h2 className="font-semibold">💬 Comment fonctionne WhatsApp ?</h2>
        </div>

        <div className="space-y-4">
          <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800 space-y-3">
            <p className="text-sm text-green-800 dark:text-green-300 font-medium">
              🚀 Aucune configuration nécessaire !
            </p>
            <p className="text-sm text-green-700 dark:text-green-400">
              Quand un client clique sur "Commander sur WhatsApp" depuis une page produit, 
              il ouvre directement une conversation WhatsApp avec votre numéro. Le mot-clé du produit est pré-rempli !
            </p>
          </div>

          <div className="space-y-3">
            <p className="text-sm font-medium">Comment ça marche :</p>
            <div className="space-y-2 text-sm text-muted-foreground">
              <div className="flex items-start gap-3 p-2 bg-muted/30 rounded-lg">
                <span className="text-lg">1️⃣</span>
                <span>Créez vos produits avec des mots-clés simples (ex: ROBE1, SAC2)</span>
              </div>
              <div className="flex items-start gap-3 p-2 bg-muted/30 rounded-lg">
                <span className="text-lg">2️⃣</span>
                <span>Partagez le lien ou QR code de vos produits pendant votre live</span>
              </div>
              <div className="flex items-start gap-3 p-2 bg-muted/30 rounded-lg">
                <span className="text-lg">3️⃣</span>
                <span>Le client clique et vous envoie automatiquement le mot-clé sur WhatsApp</span>
              </div>
              <div className="flex items-start gap-3 p-2 bg-muted/30 rounded-lg">
                <span className="text-lg">4️⃣</span>
                <span>Répondez-lui avec le lien de paiement depuis vos factures</span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reserveDuration">Délai pour le paiement</Label>
            <Select
              value={chatbotConfig.reservationDurationMinutes.toString()}
              onValueChange={(v) => setChatbotConfig({ ...chatbotConfig, reservationDurationMinutes: parseInt(v) })}
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
              Temps accordé au client pour finaliser le paiement après réservation
            </p>
          </div>
        </div>

        <Button onClick={handleChatbotSave} className="w-full" disabled={vendorConfigMutation.isPending}>
          {vendorConfigMutation.isPending ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          Enregistrer
        </Button>
      </Card>

      {/* Section Notifications */}
      <Card className="p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Bell className="w-5 h-5 text-muted-foreground" />
          <h2 className="font-semibold">Notifications</h2>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <Label>Notifications sonores</Label>
              <p className="text-xs text-muted-foreground">
                Son lors de la réception d'un paiement
              </p>
            </div>
            <Switch
              checked={settings.enableSoundNotifications}
              onCheckedChange={(v) => updateSetting("enableSoundNotifications", v)}
            />
          </div>

          {settings.enableSoundNotifications && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Volume</Label>
                <span className="text-sm text-muted-foreground">
                  {settings.notificationVolume}%
                </span>
              </div>
              <div className="flex items-center gap-3">
                <Volume2 className="w-4 h-4 text-muted-foreground" />
                <Slider
                  value={[settings.notificationVolume]}
                  onValueChange={([v]) => updateSetting("notificationVolume", v)}
                  max={100}
                  step={10}
                  className="flex-1"
                />
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label>Mode de paiement par défaut</Label>
            <Select
              value={settings.defaultPaymentMethod}
              onValueChange={(v) => updateSetting("defaultPaymentMethod", v)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="wave">Wave</SelectItem>
                <SelectItem value="orange_money">Orange Money</SelectItem>
                <SelectItem value="card">Carte bancaire</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {hasChanges && (
          <Button onClick={handleSaveSettings} className="w-full">
            <Save className="w-4 h-4 mr-2" />
            Enregistrer
          </Button>
        )}
      </Card>

      {/* Déconnexion */}
      <Card className="p-6">
        <Button 
          variant="destructive" 
          onClick={() => logout()} 
          disabled={isLoggingOut}
          className="w-full"
        >
          {isLoggingOut ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <LogOut className="w-4 h-4 mr-2" />
          )}
          Se déconnecter
        </Button>
      </Card>
    </div>
  );
}

// Export pour compatibilité
export { loadSettings };
export type { VendorSettings };
