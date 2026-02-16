import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  CheckCircle, 
  Circle, 
  ArrowRight, 
  Package, 
  MessageCircle, 
  CreditCard,
  Sparkles,
  X,
  Phone
} from "lucide-react";
import { Link } from "wouter";

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  completed: boolean;
  action?: {
    label: string;
    href: string;
  };
}

interface OnboardingProps {
  hasProducts: boolean;
  hasPhone: boolean;
  hasLiveMode: boolean;
  onDismiss: () => void;
}

export function OnboardingChecklist({ hasProducts, hasPhone, hasLiveMode, onDismiss }: OnboardingProps) {
  const steps: OnboardingStep[] = [
    {
      id: "phone",
      title: "Configurer votre numéro",
      description: "Ajoutez votre numéro WhatsApp Business",
      icon: Phone,
      completed: hasPhone,
      action: { label: "Paramètres", href: "/settings" },
    },
    {
      id: "products",
      title: "Ajouter vos produits",
      description: "Créez au moins un produit avec un mot-clé unique",
      icon: Package,
      completed: hasProducts,
      action: { label: "Produits", href: "/products" },
    },
    {
      id: "live",
      title: "Activer le Mode Live",
      description: "Prêt à recevoir des commandes !",
      icon: MessageCircle,
      completed: hasLiveMode,
    },
  ];

  const completedCount = steps.filter((s) => s.completed).length;
  const progress = (completedCount / steps.length) * 100;
  const allCompleted = completedCount === steps.length;

  if (allCompleted) {
    return (
      <Card className="p-4 border-green-500/50 bg-gradient-to-r from-green-500/10 to-emerald-500/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-green-500/20">
              <Sparkles className="h-5 w-5 text-green-500" />
            </div>
            <div>
              <p className="font-medium text-green-600 dark:text-green-400">
                Félicitations ! Votre boutique est prête 🎉
              </p>
              <p className="text-sm text-muted-foreground">
                Activez le Mode Live pendant vos streams pour recevoir des commandes.
              </p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onDismiss}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <div className="p-4 border-b bg-gradient-to-r from-primary/5 to-primary/10">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Configuration de votre boutique</h3>
          </div>
          <Badge variant="outline">{completedCount}/{steps.length}</Badge>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-green-500 to-emerald-500 transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
      
      <div className="p-4 space-y-3">
        {steps.map((step, index) => (
          <div 
            key={step.id}
            className={`flex items-center gap-3 p-3 rounded-lg transition-all ${
              step.completed 
                ? "bg-green-500/10" 
                : "bg-muted/50 hover:bg-muted"
            }`}
          >
            <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
              step.completed ? "bg-green-500 text-white" : "bg-muted-foreground/20"
            }`}>
              {step.completed ? (
                <CheckCircle className="h-5 w-5" />
              ) : (
                <span className="text-sm font-medium">{index + 1}</span>
              )}
            </div>
            
            <div className="flex-1 min-w-0">
              <p className={`font-medium ${step.completed ? "text-green-600 dark:text-green-400" : ""}`}>
                {step.title}
              </p>
              <p className="text-sm text-muted-foreground truncate">
                {step.description}
              </p>
            </div>
            
            {!step.completed && step.action && (
              <Link href={step.action.href}>
                <Button size="sm" variant="outline" className="flex-shrink-0">
                  {step.action.label}
                  <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
              </Link>
            )}
            
            {step.completed && (
              <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}

// Welcome modal for first-time users
export function WelcomeModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <Card className="max-w-md w-full animate-in fade-in zoom-in duration-300">
        <div className="p-6 space-y-6">
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 mb-4">
              <MessageCircle className="h-8 w-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold">Bienvenue sur LivePay ! 🎉</h2>
            <p className="text-muted-foreground">
              Transformez vos lives en ventes avec notre chatbot WhatsApp intelligent.
            </p>
          </div>
          
          <div className="space-y-3">
            {[
              { icon: Package, text: "Créez vos produits avec des mots-clés" },
              { icon: MessageCircle, text: "Les clients commandent via WhatsApp" },
              { icon: CreditCard, text: "Paiement instantané Wave/OM/Carte" },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <item.icon className="h-5 w-5 text-green-500" />
                <span className="text-sm">{item.text}</span>
              </div>
            ))}
          </div>
          
          <Button className="w-full bg-green-500 hover:bg-green-600" size="lg" onClick={onClose}>
            Commencer la configuration
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </Card>
    </div>
  );
}
