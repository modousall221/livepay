import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
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
  Zap,
  CheckCircle,
  AlertCircle,
  Terminal
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

async function setupWhatsAppDefaults() {
  const response = await fetch("/api/vendor/whatsapp-automation/setup-defaults", {
    method: "POST",
    credentials: "include",
  });
  if (!response.ok) {
    throw new Error("Erreur configuration WhatsApp");
  }
  return response.json();
}

async function getWhatsAppAutomation() {
  const response = await fetch("/api/vendor/whatsapp-automation", {
    credentials: "include",
  });
  if (!response.ok) return null;
  return response.json();
}

export default function Settings() {
  const { user, logout, isLoggingOut } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [settings, setSettings] = useState<VendorSettings>(loadSettings);
  const [hasChanges, setHasChanges] = useState(false);
  
  // Config chatbot simplifié (sans tokens API)
  const [chatbotConfig, setChatbotConfig] = useState({
    welcomeMessage: "",
    reservationDurationMinutes: 10,
    autoReplyEnabled: true,
    autoReminderEnabled: true,
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

  // WhatsApp automation
  const { data: whatsappAutomation, refetch: refetchAutomation } = useQuery({
    queryKey: ["/api/vendor/whatsapp-automation"],
    queryFn: getWhatsAppAutomation,
    enabled: !!vendorConfig?.whatsappPhoneNumberId,
  });

  const setupDefaultsMutation = useMutation({
    mutationFn: setupWhatsAppDefaults,
    onSuccess: () => {
      refetchAutomation();
      toast({ title: "Commandes WhatsApp configurées !" });
    },
    onError: (error: Error) => {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
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

      {/* Section Chatbot WhatsApp */}
      <Card className="p-6 space-y-4">
        <div className="flex items-center gap-2">
          <MessageCircle className="w-5 h-5 text-green-500" />
          <h2 className="font-semibold">Chatbot WhatsApp</h2>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="welcomeMsg">Message de bienvenue</Label>
            <Textarea
              id="welcomeMsg"
              value={chatbotConfig.welcomeMessage}
              onChange={(e) => setChatbotConfig({ ...chatbotConfig, welcomeMessage: e.target.value })}
              placeholder="Bienvenue ! 🎉 Envoyez le mot-clé du produit affiché pendant le live pour commander..."
              rows={3}
            />
            <p className="text-xs text-muted-foreground">
              Message envoyé automatiquement aux nouveaux clients
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reserveDuration">Délai de paiement</Label>
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
              Temps accordé au client pour finaliser le paiement
            </p>
          </div>

          <div className="flex items-center justify-between gap-4 py-2 border-t">
            <div className="space-y-0.5">
              <Label>Réponse automatique</Label>
              <p className="text-xs text-muted-foreground">
                Le chatbot répond automatiquement aux clients
              </p>
            </div>
            <Switch
              checked={chatbotConfig.autoReplyEnabled}
              onCheckedChange={(v) => setChatbotConfig({ ...chatbotConfig, autoReplyEnabled: v })}
            />
          </div>

          <div className="flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <Label>Rappels de paiement</Label>
              <p className="text-xs text-muted-foreground">
                Envoyer un rappel avant expiration
              </p>
            </div>
            <Switch
              checked={chatbotConfig.autoReminderEnabled}
              onCheckedChange={(v) => setChatbotConfig({ ...chatbotConfig, autoReminderEnabled: v })}
            />
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

      {/* Section WhatsApp Conversational Automation */}
      <Card className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Terminal className="w-5 h-5 text-green-500" />
            <h2 className="font-semibold">Commandes WhatsApp</h2>
          </div>
          {whatsappAutomation?.success && whatsappAutomation?.data?.commands?.length > 0 && (
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
              <CheckCircle className="w-3 h-3 mr-1" />
              Configuré
            </Badge>
          )}
        </div>

        <p className="text-sm text-muted-foreground">
          Configurez les commandes automatiques que vos clients peuvent utiliser sur WhatsApp (ex: /aide, /commandes)
        </p>

        {!vendorConfig?.whatsappPhoneNumberId ? (
          <div className="p-4 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-800">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-amber-700 dark:text-amber-400">Configuration API requise</p>
                <p className="text-sm text-amber-600 dark:text-amber-500 mt-1">
                  Contactez l'administrateur pour configurer votre Phone Number ID WhatsApp.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {whatsappAutomation?.success && whatsappAutomation?.data && (
              <div className="space-y-3">
                {/* Welcome message status */}
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <span className="text-sm">Message de bienvenue</span>
                  <Badge variant={whatsappAutomation.data.enable_welcome_message ? "default" : "secondary"}>
                    {whatsappAutomation.data.enable_welcome_message ? "Activé" : "Désactivé"}
                  </Badge>
                </div>

                {/* Commands list */}
                {whatsappAutomation.data.commands?.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground uppercase">Commandes actives</Label>
                    <div className="grid gap-2">
                      {whatsappAutomation.data.commands.map((cmd: any, i: number) => (
                        <div key={i} className="flex items-center gap-3 p-2 bg-muted/30 rounded-lg">
                          <Badge variant="outline" className="font-mono">/{cmd.command_name}</Badge>
                          <span className="text-sm text-muted-foreground">{cmd.command_description}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Prompts list */}
                {whatsappAutomation.data.prompts?.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground uppercase">Suggestions rapides</Label>
                    <div className="flex flex-wrap gap-2">
                      {whatsappAutomation.data.prompts.map((prompt: string, i: number) => (
                        <Badge key={i} variant="secondary">{prompt}</Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <Button 
              onClick={() => setupDefaultsMutation.mutate()} 
              variant="outline"
              className="w-full"
              disabled={setupDefaultsMutation.isPending}
            >
              {setupDefaultsMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Zap className="w-4 h-4 mr-2" />
              )}
              {whatsappAutomation?.data?.commands?.length > 0 
                ? "Réinitialiser les commandes par défaut" 
                : "Configurer les commandes LivePay"
              }
            </Button>
          </div>
        )}
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
