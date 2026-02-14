import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { Radio, Smartphone, Store, CreditCard, ArrowRight, Download, Share2, QrCode } from "lucide-react";
import { useEffect, useState } from "react";

export default function Demo() {
  const [appUrl, setAppUrl] = useState("");
  const isStandalone = window.matchMedia("(display-mode: standalone)").matches
    || (navigator as any).standalone;

  useEffect(() => {
    setAppUrl(window.location.origin);
  }, []);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-md">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center">
              <Radio className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="text-lg font-semibold tracking-tight">LivePay</span>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="flex-1 p-4">
        <div className="max-w-3xl mx-auto space-y-8 py-4">
          <div className="text-center space-y-2">
            <h1 className="text-2xl md:text-3xl font-serif font-bold" data-testid="text-demo-title">
              Tester LivePay
            </h1>
            <p className="text-muted-foreground">
              Deux experiences : vendeur et client payeur
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <Card className="p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center">
                  <Store className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h2 className="font-semibold text-lg">App Vendeur</h2>
                  <p className="text-xs text-muted-foreground">Gestion des ventes en live</p>
                </div>
              </div>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>Le dashboard vendeur permet de :</p>
                <ul className="space-y-1.5 ml-4">
                  <li className="flex items-start gap-2">
                    <span className="w-1 h-1 rounded-full bg-primary mt-2 shrink-0" />
                    Gerer votre catalogue de produits
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1 h-1 rounded-full bg-primary mt-2 shrink-0" />
                    Lancer des sessions de vente en direct
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1 h-1 rounded-full bg-primary mt-2 shrink-0" />
                    Generer des factures instantanees
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1 h-1 rounded-full bg-primary mt-2 shrink-0" />
                    Partager les liens par WhatsApp / QR code
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1 h-1 rounded-full bg-primary mt-2 shrink-0" />
                    Suivre les paiements en temps reel
                  </li>
                </ul>
              </div>
              <a href={`${appUrl}/api/login`}>
                <Button className="w-full" size="lg" data-testid="button-demo-vendor">
                  <Store className="w-4 h-4 mr-2" />
                  Ouvrir l'app vendeur
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </a>
              <p className="text-[10px] text-center text-muted-foreground">
                Lien: {appUrl}
              </p>
            </Card>

            <Card className="p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-md bg-green-500/10 flex items-center justify-center">
                  <Smartphone className="w-5 h-5 text-green-500" />
                </div>
                <div>
                  <h2 className="font-semibold text-lg">App Client Payeur</h2>
                  <p className="text-xs text-muted-foreground">Paiement mobile securise</p>
                </div>
              </div>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>La page de paiement client permet de :</p>
                <ul className="space-y-1.5 ml-4">
                  <li className="flex items-start gap-2">
                    <span className="w-1 h-1 rounded-full bg-green-500 mt-2 shrink-0" />
                    Voir les details de la facture
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1 h-1 rounded-full bg-green-500 mt-2 shrink-0" />
                    Choisir Wave, Orange Money, Carte ou Especes
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1 h-1 rounded-full bg-green-500 mt-2 shrink-0" />
                    Payer via Bictorys (checkout securise)
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1 h-1 rounded-full bg-green-500 mt-2 shrink-0" />
                    Confirmation en temps reel
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1 h-1 rounded-full bg-green-500 mt-2 shrink-0" />
                    Compte a rebours d'expiration (15 min)
                  </li>
                </ul>
              </div>
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground text-center">
                  Le lien client est genere par le vendeur pendant un live.
                  Connectez-vous d'abord en tant que vendeur, creez une facture,
                  puis ouvrez le lien de paiement.
                </p>
                <p className="text-xs text-center text-muted-foreground">
                  Format: {appUrl}/pay/[token]
                </p>
              </div>
            </Card>
          </div>

          <Card className="p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-md bg-violet-500/10 flex items-center justify-center">
                <Download className="w-5 h-5 text-violet-500" />
              </div>
              <div>
                <h2 className="font-semibold text-lg">Installer sur telephone</h2>
                <p className="text-xs text-muted-foreground">Fonctionne comme une app native</p>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="p-4 rounded-md bg-background space-y-3">
                <p className="text-sm font-medium">Android / Chrome</p>
                <ol className="text-xs text-muted-foreground space-y-1.5">
                  <li className="flex items-start gap-2">
                    <span className="font-bold text-foreground shrink-0">1.</span>
                    Ouvrez <span className="font-medium text-foreground">{appUrl}</span> dans Chrome
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-bold text-foreground shrink-0">2.</span>
                    Appuyez sur la banniere "Installer" ou le menu (3 points)
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-bold text-foreground shrink-0">3.</span>
                    Selectionnez "Ajouter a l'ecran d'accueil"
                  </li>
                </ol>
              </div>
              <div className="p-4 rounded-md bg-background space-y-3">
                <p className="text-sm font-medium">iPhone / Safari</p>
                <ol className="text-xs text-muted-foreground space-y-1.5">
                  <li className="flex items-start gap-2">
                    <span className="font-bold text-foreground shrink-0">1.</span>
                    Ouvrez <span className="font-medium text-foreground">{appUrl}</span> dans Safari
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-bold text-foreground shrink-0">2.</span>
                    Appuyez sur le bouton de partage (fleche vers le haut)
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-bold text-foreground shrink-0">3.</span>
                    Selectionnez "Sur l'ecran d'accueil"
                  </li>
                </ol>
              </div>
            </div>
          </Card>

          <Card className="p-6 space-y-4">
            <h2 className="font-semibold text-lg">Comment tester le flux complet</h2>
            <div className="space-y-3">
              {[
                { step: 1, icon: Store, text: "Connectez-vous en tant que vendeur via l'app vendeur", color: "text-primary" },
                { step: 2, icon: Radio, text: "Creez un produit, puis lancez une session live", color: "text-primary" },
                { step: 3, icon: Share2, text: "Generez une facture et copiez le lien de paiement", color: "text-primary" },
                { step: 4, icon: Smartphone, text: "Ouvrez le lien sur un autre telephone (ou navigateur)", color: "text-green-500" },
                { step: 5, icon: CreditCard, text: "Choisissez un moyen de paiement et payez", color: "text-green-500" },
                { step: 6, icon: QrCode, text: "Le vendeur voit le statut passer en temps reel", color: "text-primary" },
              ].map((item) => (
                <div key={item.step} className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center shrink-0">
                    <span className="text-xs font-bold">{item.step}</span>
                  </div>
                  <item.icon className={`w-4 h-4 ${item.color} shrink-0`} />
                  <p className="text-sm">{item.text}</p>
                </div>
              ))}
            </div>
          </Card>

          <div className="text-center">
            <a href="/">
              <Button variant="outline" data-testid="button-demo-back">
                Retour a l'accueil
              </Button>
            </a>
          </div>
        </div>
      </main>

      <footer className="border-t py-6">
        <div className="max-w-3xl mx-auto px-4 text-center text-sm text-muted-foreground">
          LivePay - Infrastructure de paiement pour le live commerce - Zone UEMOA
        </div>
      </footer>
    </div>
  );
}
