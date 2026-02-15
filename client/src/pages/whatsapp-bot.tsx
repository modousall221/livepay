import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  MessageCircle,
  Send,
  Bot,
  Settings,
  Zap,
  Users,
  ShoppingCart,
  Bell,
  Clock,
  Check,
  Copy,
  ExternalLink,
  Smartphone,
  QrCode,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Product, Invoice } from "@shared/schema";

// Types pour le chatbot
interface BotConfig {
  enabled: boolean;
  welcomeMessage: string;
  autoReplyEnabled: boolean;
  autoCreateInvoice: boolean;
  businessHours: {
    enabled: boolean;
    start: string;
    end: string;
    offHoursMessage: string;
  };
}

interface ConversationPreview {
  phone: string;
  name: string;
  lastMessage: string;
  lastMessageAt: Date;
  unreadCount: number;
  status: "active" | "idle" | "completed";
}

const defaultBotConfig: BotConfig = {
  enabled: true,
  welcomeMessage: "Bienvenue ! Je suis l'assistant LivePay. Comment puis-je vous aider ?",
  autoReplyEnabled: true,
  autoCreateInvoice: true,
  businessHours: {
    enabled: false,
    start: "09:00",
    end: "21:00",
    offHoursMessage: "Nous sommes actuellement fermés. Nous vous répondrons dès que possible.",
  },
};

export default function WhatsAppBot() {
  const { toast } = useToast();
  const [botConfig, setBotConfig] = useState<BotConfig>(defaultBotConfig);
  const [testPhone, setTestPhone] = useState("");
  const [testMessage, setTestMessage] = useState("");
  const [selectedInvoice, setSelectedInvoice] = useState<string>("");

  // Récupérer les produits pour les statistiques
  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  // Récupérer les factures récentes
  const { data: invoices = [] } = useQuery<Invoice[]>({
    queryKey: ["/api/invoices"],
  });

  // Mutation pour envoyer un message test
  const sendTestMutation = useMutation({
    mutationFn: async ({ to, message }: { to: string; message: string }) => {
      return apiRequest("POST", "/api/whatsapp/send", { to, message });
    },
    onSuccess: () => {
      toast({
        title: "Message envoyé",
        description: "Le message test a été envoyé avec succès.",
      });
      setTestMessage("");
    },
    onError: () => {
      toast({
        title: "Erreur",
        description: "Impossible d'envoyer le message. Vérifiez la configuration.",
        variant: "destructive",
      });
    },
  });

  // Mutation pour envoyer un lien de paiement
  const sendPaymentLinkMutation = useMutation({
    mutationFn: async (invoiceId: string) => {
      return apiRequest("POST", "/api/whatsapp/send-payment-link", { invoiceId });
    },
    onSuccess: () => {
      toast({
        title: "Lien envoyé",
        description: "Le lien de paiement a été envoyé au client.",
      });
      setSelectedInvoice("");
    },
    onError: () => {
      toast({
        title: "Erreur",
        description: "Impossible d'envoyer le lien de paiement.",
        variant: "destructive",
      });
    },
  });

  // Mutation pour envoyer le catalogue
  const sendCatalogMutation = useMutation({
    mutationFn: async (to: string) => {
      return apiRequest("POST", "/api/whatsapp/send-catalog", { to });
    },
    onSuccess: () => {
      toast({
        title: "Catalogue envoyé",
        description: "Le catalogue a été envoyé avec succès.",
      });
    },
    onError: () => {
      toast({
        title: "Erreur",
        description: "Impossible d'envoyer le catalogue.",
        variant: "destructive",
      });
    },
  });

  const pendingInvoices = invoices.filter((inv) => inv.status === "pending");
  const recentConversations: ConversationPreview[] = []; // En production, charger depuis l'API

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6 pb-24">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-serif font-bold flex items-center gap-2">
            <Bot className="w-6 h-6 text-green-500" />
            WhatsApp Bot
          </h1>
          <p className="text-muted-foreground text-sm">
            Automatisez vos ventes et commandes via WhatsApp
          </p>
        </div>
        <Badge variant={botConfig.enabled ? "default" : "secondary"} className="w-fit">
          {botConfig.enabled ? (
            <>
              <span className="w-2 h-2 rounded-full bg-green-500 mr-2 animate-pulse" />
              Bot actif
            </>
          ) : (
            "Bot désactivé"
          )}
        </Badge>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/10">
              <MessageCircle className="w-5 h-5 text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">0</p>
              <p className="text-xs text-muted-foreground">Messages aujourd'hui</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <Users className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">0</p>
              <p className="text-xs text-muted-foreground">Conversations</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10">
              <ShoppingCart className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{pendingInvoices.length}</p>
              <p className="text-xs text-muted-foreground">Commandes en attente</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-violet-500/10">
              <Zap className="w-5 h-5 text-violet-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{products.filter((p) => p.active).length}</p>
              <p className="text-xs text-muted-foreground">Produits actifs</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4 lg:w-[600px]">
          <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
          <TabsTrigger value="actions">Actions</TabsTrigger>
          <TabsTrigger value="config">Configuration</TabsTrigger>
          <TabsTrigger value="setup">Installation</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          {/* Flow Diagram */}
          <Card className="p-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              Comment fonctionne le bot
            </h3>
            <div className="grid md:grid-cols-5 gap-4 text-center">
              {[
                { icon: MessageCircle, label: "Client écrit", desc: '"Je veux commander"' },
                { icon: Bot, label: "Bot répond", desc: "Affiche le catalogue" },
                { icon: ShoppingCart, label: "Client choisit", desc: "Sélectionne un produit" },
                { icon: Send, label: "Bot envoie", desc: "Lien de paiement" },
                { icon: Check, label: "Paiement", desc: "Confirmation auto" },
              ].map((step, i) => (
                <div key={i} className="flex flex-col items-center gap-2">
                  <div className="p-3 rounded-full bg-primary/10">
                    <step.icon className="w-6 h-6 text-primary" />
                  </div>
                  <p className="font-medium text-sm">{step.label}</p>
                  <p className="text-xs text-muted-foreground">{step.desc}</p>
                  {i < 4 && (
                    <ArrowRight className="hidden md:block absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  )}
                </div>
              ))}
            </div>
          </Card>

          {/* Keywords */}
          <Card className="p-6">
            <h3 className="font-semibold mb-4">Mots-clés reconnus</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <p className="text-sm font-medium text-green-500">Commande</p>
                <div className="flex flex-wrap gap-2">
                  {["je prends", "je veux", "commander", "acheter", "payer"].map((kw) => (
                    <Badge key={kw} variant="outline" className="text-xs">
                      "{kw}"
                    </Badge>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-blue-500">Catalogue</p>
                <div className="flex flex-wrap gap-2">
                  {["catalogue", "produits", "voir", "liste", "menu"].map((kw) => (
                    <Badge key={kw} variant="outline" className="text-xs">
                      "{kw}"
                    </Badge>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-amber-500">Aide</p>
                <div className="flex flex-wrap gap-2">
                  {["aide", "help", "info", "comment"].map((kw) => (
                    <Badge key={kw} variant="outline" className="text-xs">
                      "{kw}"
                    </Badge>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-violet-500">Statut</p>
                <div className="flex flex-wrap gap-2">
                  {["statut", "ma commande", "suivi"].map((kw) => (
                    <Badge key={kw} variant="outline" className="text-xs">
                      "{kw}"
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </Card>

          {/* Recent Activity */}
          <Card className="p-6">
            <h3 className="font-semibold mb-4">Activité récente</h3>
            {recentConversations.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <MessageCircle className="w-12 h-12 mx-auto mb-4 opacity-20" />
                <p>Aucune conversation récente</p>
                <p className="text-sm">Les conversations apparaîtront ici</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentConversations.map((conv) => (
                  <div
                    key={conv.phone}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                  >
                    <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center">
                      <Smartphone className="w-5 h-5 text-green-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{conv.name || conv.phone}</p>
                      <p className="text-sm text-muted-foreground truncate">{conv.lastMessage}</p>
                    </div>
                    {conv.unreadCount > 0 && (
                      <Badge className="bg-green-500">{conv.unreadCount}</Badge>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </TabsContent>

        {/* Actions Tab */}
        <TabsContent value="actions" className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            {/* Send Test Message */}
            <Card className="p-6">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Send className="w-4 h-4" />
                Envoyer un message
              </h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="testPhone">Numéro WhatsApp</Label>
                  <Input
                    id="testPhone"
                    placeholder="+221 77 123 45 67"
                    value={testPhone}
                    onChange={(e) => setTestPhone(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Format international avec indicatif pays
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="testMessage">Message</Label>
                  <Textarea
                    id="testMessage"
                    placeholder="Votre message..."
                    value={testMessage}
                    onChange={(e) => setTestMessage(e.target.value)}
                    rows={3}
                  />
                </div>
                <Button
                  onClick={() => sendTestMutation.mutate({ to: testPhone, message: testMessage })}
                  disabled={!testPhone || !testMessage || sendTestMutation.isPending}
                  className="w-full"
                >
                  <Send className="w-4 h-4 mr-2" />
                  Envoyer
                </Button>
              </div>
            </Card>

            {/* Send Payment Link */}
            <Card className="p-6">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <ShoppingCart className="w-4 h-4" />
                Envoyer un lien de paiement
              </h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Facture en attente</Label>
                  <Select value={selectedInvoice} onValueChange={setSelectedInvoice}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner une facture" />
                    </SelectTrigger>
                    <SelectContent>
                      {pendingInvoices.map((inv) => (
                        <SelectItem key={inv.id} value={inv.id}>
                          {inv.clientName} - {inv.productName} ({inv.amount.toLocaleString("fr-FR")} F)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {selectedInvoice && (
                  <div className="p-3 rounded-lg bg-muted/50 text-sm">
                    {(() => {
                      const inv = pendingInvoices.find((i) => i.id === selectedInvoice);
                      if (!inv) return null;
                      return (
                        <>
                          <p>
                            <strong>Client:</strong> {inv.clientName}
                          </p>
                          <p>
                            <strong>Téléphone:</strong> {inv.clientPhone}
                          </p>
                          <p>
                            <strong>Produit:</strong> {inv.productName}
                          </p>
                          <p>
                            <strong>Montant:</strong> {inv.amount.toLocaleString("fr-FR")} FCFA
                          </p>
                        </>
                      );
                    })()}
                  </div>
                )}
                <Button
                  onClick={() => sendPaymentLinkMutation.mutate(selectedInvoice)}
                  disabled={!selectedInvoice || sendPaymentLinkMutation.isPending}
                  className="w-full"
                >
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Envoyer via WhatsApp
                </Button>
              </div>
            </Card>

            {/* Send Catalog */}
            <Card className="p-6">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <QrCode className="w-4 h-4" />
                Envoyer le catalogue
              </h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="catalogPhone">Numéro WhatsApp</Label>
                  <Input
                    id="catalogPhone"
                    placeholder="+221 77 123 45 67"
                    value={testPhone}
                    onChange={(e) => setTestPhone(e.target.value)}
                  />
                </div>
                <p className="text-sm text-muted-foreground">
                  Envoie la liste de vos {products.filter((p) => p.active).length} produits actifs
                  avec un menu interactif.
                </p>
                <Button
                  onClick={() => sendCatalogMutation.mutate(testPhone)}
                  disabled={!testPhone || sendCatalogMutation.isPending}
                  className="w-full"
                  variant="outline"
                >
                  <Send className="w-4 h-4 mr-2" />
                  Envoyer le catalogue
                </Button>
              </div>
            </Card>

            {/* Quick Actions */}
            <Card className="p-6">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Zap className="w-4 h-4" />
                Actions rapides
              </h3>
              <div className="space-y-3">
                <Button variant="outline" className="w-full justify-start" disabled>
                  <Bell className="w-4 h-4 mr-2" />
                  Notifier tous les clients en attente
                </Button>
                <Button variant="outline" className="w-full justify-start" disabled>
                  <Users className="w-4 h-4 mr-2" />
                  Exporter les contacts
                </Button>
                <Button variant="outline" className="w-full justify-start" disabled>
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Broadcast promotionnel
                </Button>
              </div>
            </Card>
          </div>
        </TabsContent>

        {/* Config Tab */}
        <TabsContent value="config" className="space-y-4">
          <Card className="p-6 space-y-6">
            <div>
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Settings className="w-4 h-4" />
                Configuration du Bot
              </h3>
            </div>

            <div className="flex items-center justify-between gap-4">
              <div className="space-y-0.5">
                <Label>Bot activé</Label>
                <p className="text-xs text-muted-foreground">
                  Le bot répond automatiquement aux messages
                </p>
              </div>
              <Switch
                checked={botConfig.enabled}
                onCheckedChange={(v) => setBotConfig({ ...botConfig, enabled: v })}
              />
            </div>

            <Separator />

            <div className="space-y-2">
              <Label>Message de bienvenue</Label>
              <Textarea
                value={botConfig.welcomeMessage}
                onChange={(e) => setBotConfig({ ...botConfig, welcomeMessage: e.target.value })}
                rows={3}
                placeholder="Bienvenue ! Comment puis-je vous aider ?"
              />
              <p className="text-xs text-muted-foreground">
                Premier message envoyé aux nouveaux clients
              </p>
            </div>

            <Separator />

            <div className="flex items-center justify-between gap-4">
              <div className="space-y-0.5">
                <Label>Réponse automatique</Label>
                <p className="text-xs text-muted-foreground">
                  Répondre aux mots-clés reconnus
                </p>
              </div>
              <Switch
                checked={botConfig.autoReplyEnabled}
                onCheckedChange={(v) => setBotConfig({ ...botConfig, autoReplyEnabled: v })}
              />
            </div>

            <div className="flex items-center justify-between gap-4">
              <div className="space-y-0.5">
                <Label>Création auto de factures</Label>
                <p className="text-xs text-muted-foreground">
                  Créer automatiquement une facture quand un client commande
                </p>
              </div>
              <Switch
                checked={botConfig.autoCreateInvoice}
                onCheckedChange={(v) => setBotConfig({ ...botConfig, autoCreateInvoice: v })}
              />
            </div>

            <Separator />

            <div className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <Label>Horaires d'ouverture</Label>
                  <p className="text-xs text-muted-foreground">
                    Message automatique en dehors des heures
                  </p>
                </div>
                <Switch
                  checked={botConfig.businessHours.enabled}
                  onCheckedChange={(v) =>
                    setBotConfig({
                      ...botConfig,
                      businessHours: { ...botConfig.businessHours, enabled: v },
                    })
                  }
                />
              </div>

              {botConfig.businessHours.enabled && (
                <div className="grid grid-cols-2 gap-4 pl-4 border-l-2 border-muted">
                  <div className="space-y-2">
                    <Label>Ouverture</Label>
                    <Input
                      type="time"
                      value={botConfig.businessHours.start}
                      onChange={(e) =>
                        setBotConfig({
                          ...botConfig,
                          businessHours: { ...botConfig.businessHours, start: e.target.value },
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Fermeture</Label>
                    <Input
                      type="time"
                      value={botConfig.businessHours.end}
                      onChange={(e) =>
                        setBotConfig({
                          ...botConfig,
                          businessHours: { ...botConfig.businessHours, end: e.target.value },
                        })
                      }
                    />
                  </div>
                  <div className="col-span-2 space-y-2">
                    <Label>Message hors horaires</Label>
                    <Textarea
                      value={botConfig.businessHours.offHoursMessage}
                      onChange={(e) =>
                        setBotConfig({
                          ...botConfig,
                          businessHours: {
                            ...botConfig.businessHours,
                            offHoursMessage: e.target.value,
                          },
                        })
                      }
                      rows={2}
                    />
                  </div>
                </div>
              )}
            </div>

            <Button className="w-full" disabled>
              Sauvegarder la configuration
            </Button>
          </Card>
        </TabsContent>

        {/* Setup Tab */}
        <TabsContent value="setup" className="space-y-4">
          <Card className="p-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Smartphone className="w-4 h-4" />
              Configuration WhatsApp Business API
            </h3>
            <div className="space-y-6">
              <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <p className="text-sm text-amber-600 dark:text-amber-400">
                  <strong>Note:</strong> Pour utiliser le bot WhatsApp, vous devez configurer un
                  compte WhatsApp Business API via Meta Business Suite.
                </p>
              </div>

              <div className="space-y-4">
                <h4 className="font-medium">Étapes d'installation</h4>
                <ol className="space-y-4 text-sm">
                  <li className="flex gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold">
                      1
                    </span>
                    <div>
                      <p className="font-medium">Créer une app Meta Business</p>
                      <p className="text-muted-foreground">
                        Rendez-vous sur{" "}
                        <a
                          href="https://developers.facebook.com"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary underline"
                        >
                          developers.facebook.com
                        </a>{" "}
                        et créez une application de type "Business".
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold">
                      2
                    </span>
                    <div>
                      <p className="font-medium">Configurer WhatsApp</p>
                      <p className="text-muted-foreground">
                        Ajoutez le produit "WhatsApp" à votre app et configurez un numéro de téléphone.
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold">
                      3
                    </span>
                    <div>
                      <p className="font-medium">Configurer le webhook</p>
                      <p className="text-muted-foreground">
                        URL du webhook:{" "}
                        <code className="px-2 py-1 bg-muted rounded text-xs">
                          {window.location.origin}/api/webhooks/whatsapp
                        </code>
                      </p>
                      <p className="text-muted-foreground mt-1">
                        Token de vérification:{" "}
                        <code className="px-2 py-1 bg-muted rounded text-xs">
                          livepay_webhook_verify
                        </code>
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold">
                      4
                    </span>
                    <div>
                      <p className="font-medium">Variables d'environnement</p>
                      <div className="mt-2 p-3 bg-muted rounded-lg font-mono text-xs space-y-1">
                        <p>WHATSAPP_PHONE_NUMBER_ID=votre_id</p>
                        <p>WHATSAPP_ACCESS_TOKEN=votre_token</p>
                        <p>WHATSAPP_APP_SECRET=votre_secret</p>
                        <p>WHATSAPP_VERIFY_TOKEN=livepay_webhook_verify</p>
                      </div>
                    </div>
                  </li>
                </ol>
              </div>

              <Separator />

              <div className="space-y-3">
                <h4 className="font-medium">Documentation</h4>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" asChild>
                    <a
                      href="https://developers.facebook.com/docs/whatsapp/cloud-api/get-started"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Guide Meta
                    </a>
                  </Button>
                  <Button variant="outline" size="sm" asChild>
                    <a
                      href="https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Webhooks
                    </a>
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
