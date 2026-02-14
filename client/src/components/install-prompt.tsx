import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Download, X } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  useEffect(() => {
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches
      || (navigator as any).standalone;
    setIsIOS(isIOSDevice);

    if (isStandalone) return;

    const wasDismissed = sessionStorage.getItem("livepay-install-dismissed");
    if (wasDismissed) {
      setDismissed(true);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setDeferredPrompt(null);
      }
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    setShowIOSGuide(false);
    sessionStorage.setItem("livepay-install-dismissed", "true");
  };

  const isStandalone = window.matchMedia("(display-mode: standalone)").matches
    || (navigator as any).standalone;
  if (isStandalone || dismissed) return null;

  if (isIOS && !deferredPrompt) {
    if (!showIOSGuide) {
      return (
        <div className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-4 md:max-w-sm">
          <div className="flex items-center gap-3 p-3 rounded-md bg-card border shadow-lg">
            <Download className="w-5 h-5 text-primary shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">Installer LivePay</p>
              <p className="text-xs text-muted-foreground">Ajoutez l'app sur votre ecran d'accueil</p>
            </div>
            <Button size="sm" onClick={() => setShowIOSGuide(true)} data-testid="button-install-ios">
              Installer
            </Button>
            <Button size="icon" variant="ghost" onClick={handleDismiss} data-testid="button-dismiss-install">
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      );
    }

    return (
      <div className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-4 md:max-w-sm">
        <div className="p-4 rounded-md bg-card border shadow-lg space-y-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold">Installer LivePay sur iPhone</p>
            <Button size="icon" variant="ghost" onClick={handleDismiss}>
              <X className="w-4 h-4" />
            </Button>
          </div>
          <ol className="text-xs text-muted-foreground space-y-2">
            <li className="flex items-start gap-2">
              <span className="font-bold text-foreground shrink-0">1.</span>
              <span>Appuyez sur le bouton de partage en bas de Safari</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-bold text-foreground shrink-0">2.</span>
              <span>Faites defiler et appuyez sur "Sur l'ecran d'accueil"</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-bold text-foreground shrink-0">3.</span>
              <span>Appuyez sur "Ajouter" en haut a droite</span>
            </li>
          </ol>
        </div>
      </div>
    );
  }

  if (!deferredPrompt) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-4 md:max-w-sm">
      <div className="flex items-center gap-3 p-3 rounded-md bg-card border shadow-lg">
        <Download className="w-5 h-5 text-primary shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">Installer LivePay</p>
          <p className="text-xs text-muted-foreground">App mobile pour gerer vos ventes</p>
        </div>
        <Button size="sm" onClick={handleInstall} data-testid="button-install-app">
          Installer
        </Button>
        <Button size="icon" variant="ghost" onClick={handleDismiss} data-testid="button-dismiss-install">
          <X className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
