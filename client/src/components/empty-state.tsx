import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Package, 
  ShoppingCart, 
  FileText,
  Inbox,
  Plus,
  ArrowRight,
  Sparkles
} from "lucide-react";
import { Link } from "wouter";

interface EmptyStateProps {
  type: "products" | "orders" | "general";
  title?: string;
  description?: string;
  actionLabel?: string;
  actionHref?: string;
}

const emptyConfigs = {
  products: {
    icon: Package,
    title: "Aucun produit encore",
    description: "Créez votre premier produit avec un mot-clé unique pour commencer à vendre.",
    actionLabel: "Créer un produit",
    actionHref: "/products",
    gradient: "from-blue-500/10 to-indigo-500/10",
    iconBg: "bg-blue-500/10",
    iconColor: "text-blue-500",
  },
  orders: {
    icon: ShoppingCart,
    title: "Aucune commande",
    description: "Les commandes de vos clients apparaîtront ici pendant vos lives.",
    actionLabel: "Voir les produits",
    actionHref: "/products",
    gradient: "from-amber-500/10 to-orange-500/10",
    iconBg: "bg-amber-500/10",
    iconColor: "text-amber-500",
  },
  general: {
    icon: Inbox,
    title: "Rien à afficher",
    description: "Il n'y a pas de données à afficher pour le moment.",
    actionLabel: undefined as string | undefined,
    actionHref: undefined as string | undefined,
    gradient: "from-gray-500/10 to-slate-500/10",
    iconBg: "bg-gray-500/10",
    iconColor: "text-gray-500",
  },
};

export function EmptyState({ 
  type, 
  title, 
  description, 
  actionLabel, 
  actionHref 
}: EmptyStateProps) {
  const config = emptyConfigs[type];
  const Icon = config.icon;
  const finalActionLabel = actionLabel || config.actionLabel;
  const finalActionHref = actionHref || config.actionHref;
  
  return (
    <Card className={`p-8 bg-gradient-to-br ${config.gradient} border-dashed`}>
      <div className="flex flex-col items-center text-center space-y-4">
        <div className={`p-4 rounded-full ${config.iconBg}`}>
          <Icon className={`h-8 w-8 ${config.iconColor}`} />
        </div>
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">{title || config.title}</h3>
          <p className="text-sm text-muted-foreground max-w-sm">
            {description || config.description}
          </p>
        </div>
        {finalActionLabel && finalActionHref && (
          <Link href={finalActionHref}>
            <Button className="mt-2">
              <Plus className="h-4 w-4 mr-2" />
              {finalActionLabel}
            </Button>
          </Link>
        )}
      </div>
    </Card>
  );
}

// Tip card for helpful hints
interface TipCardProps {
  title: string;
  description: string;
  icon?: React.ElementType;
}

export function TipCard({ title, description, icon: Icon = Sparkles }: TipCardProps) {
  return (
    <Card className="p-4 border-amber-500/30 bg-gradient-to-r from-amber-500/5 to-yellow-500/5">
      <div className="flex gap-3">
        <div className="p-2 h-fit rounded-lg bg-amber-500/10">
          <Icon className="h-4 w-4 text-amber-500" />
        </div>
        <div>
          <p className="font-medium text-amber-600 dark:text-amber-400 text-sm">
            💡 {title}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            {description}
          </p>
        </div>
      </div>
    </Card>
  );
}

// Stats skeleton for loading states
export function StatsSkeleton() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {[1, 2, 3, 4].map((i) => (
        <Card key={i} className="p-4 animate-pulse">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <div className="h-3 w-20 bg-muted rounded" />
              <div className="h-6 w-16 bg-muted rounded" />
            </div>
            <div className="h-10 w-10 rounded-lg bg-muted" />
          </div>
        </Card>
      ))}
    </div>
  );
}
