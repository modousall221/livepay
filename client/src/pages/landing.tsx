import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ThemeToggle } from "@/components/theme-toggle";
import { MessageCircle, Shield, CreditCard, ArrowRight, Bell, Package } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-md bg-green-500 flex items-center justify-center">
              <MessageCircle className="w-4 h-4 text-white" />
            </div>
            <span className="text-lg font-semibold tracking-tight">LivePay</span>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <a href="/login">
              <Button data-testid="button-login">Se connecter</Button>
            </a>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <section className="max-w-6xl mx-auto px-4 py-16 md:py-24">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 rounded-md bg-green-500/10 px-3 py-1 text-sm text-green-600 dark:text-green-400">
                <MessageCircle className="w-3 h-3" />
                Chatbot WhatsApp pour Live Commerce
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-serif font-bold tracking-tight leading-tight">
                Vendez en <span className="text-green-500">live</span> via WhatsApp
              </h1>
              <p className="text-lg text-muted-foreground max-w-lg">
                Vos clients envoient un mot-cl&eacute; sur WhatsApp, re&ccedil;oivent un lien de paiement s&eacute;curis&eacute;.
                Paiement confirm&eacute; = notification instantan&eacute;e. C'est tout.
              </p>
              <div className="flex flex-wrap gap-3">
                <a href="/register">
                  <Button size="lg" className="bg-green-500 hover:bg-green-600" data-testid="button-get-started">
                    Commencer gratuitement
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </a>
                <a href="/login">
                  <Button size="lg" variant="outline" data-testid="button-login-hero">
                    Se connecter
                  </Button>
                </a>
              </div>
              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Shield className="w-3 h-3 text-green-500" />
                  Zone UEMOA
                </span>
                <span className="flex items-center gap-1">
                  <CreditCard className="w-3 h-3 text-green-500" />
                  Wave, Orange Money, Carte
                </span>
              </div>
            </div>

            <div className="relative hidden lg:block">
              <div className="absolute inset-0 bg-gradient-to-tr from-green-500/20 via-transparent to-green-500/10 rounded-2xl" />
              <Card className="p-6 space-y-4">
                <div className="flex items-center justify-between gap-4">
                  <h3 className="font-semibold flex items-center gap-2">
                    <MessageCircle className="w-4 h-4 text-green-500" />
                    WhatsApp Business
                  </h3>
                  <span className="inline-flex items-center gap-1 text-xs text-green-500 font-medium">
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    Mode Live actif
                  </span>
                </div>
                <div className="space-y-3">
                  <div className="p-3 rounded-lg bg-muted/50 text-sm">
                    <p className="text-xs text-muted-foreground mb-1">Client: Aminata</p>
                    <p className="font-medium">ROBE1</p>
                  </div>
                  <div className="p-3 rounded-lg bg-green-500/10 text-sm border border-green-500/20">
                    <p className="text-xs text-green-600 dark:text-green-400 mb-1">LivePay Bot</p>
                    <p>Bonjour Aminata ! Voici votre lien de paiement pour "Robe Wax" (15 000 F):</p>
                    <p className="text-green-600 dark:text-green-400 mt-1 text-xs">pay.livepay.africa/abc123</p>
                  </div>
                  <div className="flex items-center gap-2 p-2 rounded-md bg-green-500/10 text-green-600 dark:text-green-400 text-xs">
                    <Bell className="w-3 h-3" />
                    Paiement re&ccedil;u ! Stock mis &agrave; jour.
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </section>

        <section className="max-w-6xl mx-auto px-4 pb-16 md:pb-24">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-serif font-bold">Comment &ccedil;a marche</h2>
            <p className="text-muted-foreground mt-2">En 4 &eacute;tapes simples</p>
          </div>
          <div className="grid md:grid-cols-4 gap-6">
            {[
              {
                icon: Package,
                title: "1. Ajoutez vos produits",
                desc: "Cr\u00e9ez vos produits avec un mot-cl\u00e9 unique (ex: ROBE1, SAC2).",
              },
              {
                icon: MessageCircle,
                title: "2. Activez le Mode Live",
                desc: "Pendant votre live, activez le mode. Le chatbot est pr\u00eat.",
              },
              {
                icon: CreditCard,
                title: "3. Client envoie mot-cl\u00e9",
                desc: "Le client envoie 'ROBE1' sur WhatsApp et re\u00e7oit le lien de paiement.",
              },
              {
                icon: Bell,
                title: "4. Notification paiement",
                desc: "Paiement confirm\u00e9 = notification instantan\u00e9e + stock mis \u00e0 jour.",
              },
            ].map((item, i) => (
              <Card key={i} className="p-6 hover:shadow-md transition-shadow">
                <div className="w-10 h-10 rounded-md bg-green-500/10 flex items-center justify-center mb-4">
                  <item.icon className="w-5 h-5 text-green-500" />
                </div>
                <h3 className="font-semibold mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
              </Card>
            ))}
          </div>
        </section>

        <section className="max-w-6xl mx-auto px-4 pb-16 md:pb-24">
          <Card className="p-8 bg-green-500/5 border-green-500/20">
            <div className="text-center max-w-2xl mx-auto">
              <h2 className="text-2xl font-serif font-bold mb-6">Paiements support&eacute;s</h2>
              <div className="flex flex-wrap justify-center items-center gap-8">
                {/* Wave Logo */}
                <div className="flex items-center gap-3">
                  <img 
                    src="https://www.wave.com/img/logo-wave.svg" 
                    alt="Wave" 
                    className="h-8 w-auto"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                      e.currentTarget.nextElementSibling?.classList.remove('hidden');
                    }}
                  />
                  <svg className="h-8 w-auto hidden" viewBox="0 0 100 40" fill="none">
                    <rect width="100" height="40" rx="8" fill="#1DC1EC"/>
                    <text x="50" y="26" textAnchor="middle" fill="white" fontWeight="bold" fontSize="18">Wave</text>
                  </svg>
                </div>
                
                {/* Orange Money Logo */}
                <div className="flex items-center gap-3">
                  <img 
                    src="https://www.orange.com/sites/orangecom/files/2021-09/Orange%20Money%20logo.png" 
                    alt="Orange Money" 
                    className="h-10 w-auto"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                      e.currentTarget.nextElementSibling?.classList.remove('hidden');
                    }}
                  />
                  <svg className="h-10 w-auto hidden" viewBox="0 0 120 40" fill="none">
                    <rect width="120" height="40" rx="8" fill="#FF6600"/>
                    <text x="60" y="26" textAnchor="middle" fill="white" fontWeight="bold" fontSize="14">Orange Money</text>
                  </svg>
                </div>
                
                {/* Visa & Mastercard Logos */}
                <div className="flex items-center gap-2">
                  <svg className="h-8 w-auto" viewBox="0 0 60 40" fill="none">
                    <rect width="60" height="40" rx="4" fill="#1A1F71"/>
                    <text x="30" y="26" textAnchor="middle" fill="white" fontWeight="bold" fontStyle="italic" fontSize="16">VISA</text>
                  </svg>
                  <svg className="h-8 w-auto" viewBox="0 0 60 40" fill="none">
                    <rect width="60" height="40" rx="4" fill="#F5F5F5"/>
                    <circle cx="22" cy="20" r="12" fill="#EB001B"/>
                    <circle cx="38" cy="20" r="12" fill="#F79E1B"/>
                    <path d="M30 10.5a12 12 0 0 0 0 19" fill="#FF5F00"/>
                  </svg>
                </div>
              </div>
            </div>
          </Card>
        </section>
      </main>

      <footer className="border-t py-6">
        <div className="max-w-6xl mx-auto px-4 flex flex-wrap items-center justify-between gap-4 text-sm text-muted-foreground">
          <span>LivePay &copy; 2025. Zone UEMOA.</span>
          <div className="flex items-center gap-4">
            <span>Conformit&eacute; BCEAO</span>
            <span className="flex items-center gap-1">
              <MessageCircle className="w-3 h-3 text-green-500" />
              WhatsApp Business API
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
