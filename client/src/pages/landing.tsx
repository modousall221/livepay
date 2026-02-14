import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ThemeToggle } from "@/components/theme-toggle";
import { Zap, Shield, Clock, ArrowRight, Radio } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center">
              <Radio className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="text-lg font-semibold tracking-tight">LivePay</span>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <a href="/api/login">
              <Button data-testid="button-login">Se connecter</Button>
            </a>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <section className="max-w-6xl mx-auto px-4 py-16 md:py-24">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 rounded-md bg-primary/10 px-3 py-1 text-sm text-primary">
                <Radio className="w-3 h-3" />
                Infrastructure de paiement live
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-serif font-bold tracking-tight leading-tight">
                Paiement <span className="text-primary">instantan&eacute;</span> pendant vos lives
              </h1>
              <p className="text-lg text-muted-foreground max-w-lg">
                S&eacute;curisez vos ventes en direct sur TikTok, Instagram et Facebook. 
                G&eacute;n&eacute;rez des factures instantan&eacute;es avec liens de paiement s&eacute;curis&eacute;s pour vos clients.
              </p>
              <div className="flex flex-wrap gap-3">
                <a href="/api/login">
                  <Button size="lg" data-testid="button-get-started">
                    Commencer gratuitement
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </a>
              </div>
              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Shield className="w-3 h-3 text-primary" />
                  Zone UEMOA
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3 text-primary" />
                  Facture en 5 secondes
                </span>
              </div>
            </div>

            <div className="relative hidden lg:block">
              <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 via-transparent to-primary/10 rounded-2xl" />
              <Card className="p-6 space-y-4">
                <div className="flex items-center justify-between gap-4">
                  <h3 className="font-semibold">Session Live</h3>
                  <span className="inline-flex items-center gap-1 text-xs text-green-500 font-medium">
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    En direct
                  </span>
                </div>
                <div className="space-y-3">
                  {[
                    { name: "Aminata D.", product: "Robe Wax", amount: "15 000 F", status: "paid" },
                    { name: "Fatou K.", product: "Sac en cuir", amount: "25 000 F", status: "pending" },
                    { name: "Ibrahim S.", product: "Chaussures", amount: "18 000 F", status: "expired" },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center justify-between gap-4 p-3 rounded-md bg-background">
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{item.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{item.product}</p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-sm font-medium">{item.amount}</span>
                        <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                          item.status === "paid" ? "bg-green-500" :
                          item.status === "pending" ? "bg-amber-500" :
                          "bg-red-500"
                        }`} />
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </div>
        </section>

        <section className="max-w-6xl mx-auto px-4 pb-16 md:pb-24">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-serif font-bold">Comment &ccedil;a marche</h2>
            <p className="text-muted-foreground mt-2">En 3 &eacute;tapes simples</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: Radio,
                title: "Lancez votre live",
                desc: "Cr\u00e9ez une session live et ajoutez vos produits depuis votre dashboard.",
              },
              {
                icon: Zap,
                title: "G\u00e9n\u00e9rez des factures",
                desc: "Un client dit \u00abje prends\u00bb ? G\u00e9n\u00e9rez une facture en un clic avec lien de paiement.",
              },
              {
                icon: Shield,
                title: "Paiement s\u00e9curis\u00e9",
                desc: "Le client re\u00e7oit un lien unique. Suivi en temps r\u00e9el: pay\u00e9, en attente, expir\u00e9.",
              },
            ].map((item, i) => (
              <Card key={i} className="p-6 hover-elevate">
                <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center mb-4">
                  <item.icon className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
              </Card>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t py-6">
        <div className="max-w-6xl mx-auto px-4 flex flex-wrap items-center justify-between gap-4 text-sm text-muted-foreground">
          <span>LivePay &copy; 2026. Zone UEMOA.</span>
          <div className="flex items-center gap-4">
            <span>Conformit&eacute; BCEAO</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
