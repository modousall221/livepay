import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
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
  LogOut
} from "lucide-react";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";

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
