import { useState } from "react";
import { Button } from "@/components/ui/button";
import { 
  Plus, 
  Package, 
  Radio, 
  ShoppingCart, 
  Settings,
  X,
  Zap
} from "lucide-react";
import { Link } from "wouter";

interface QuickAction {
  id: string;
  label: string;
  icon: React.ElementType;
  href: string;
  color: string;
}

interface QuickActionsProps {
  isLiveMode: boolean;
  onToggleLiveMode?: () => void;
}

export function QuickActions({ isLiveMode, onToggleLiveMode }: QuickActionsProps) {
  const [isOpen, setIsOpen] = useState(false);

  const actions: QuickAction[] = [
    {
      id: "products",
      label: "Ajouter produit",
      icon: Package,
      href: "/products",
      color: "bg-blue-500 hover:bg-blue-600",
    },
    {
      id: "orders",
      label: "Voir commandes",
      icon: ShoppingCart,
      href: "/orders",
      color: "bg-amber-500 hover:bg-amber-600",
    },
    {
      id: "settings",
      label: "Paramètres",
      icon: Settings,
      href: "/settings",
      color: "bg-gray-500 hover:bg-gray-600",
    },
  ];

  return (
    <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-2">
      {/* Action items */}
      <div 
        className={`flex flex-col gap-2 transition-all duration-300 ${
          isOpen 
            ? "opacity-100 translate-y-0 pointer-events-auto" 
            : "opacity-0 translate-y-4 pointer-events-none"
        }`}
      >
        {/* Live Mode Toggle */}
        <button
          onClick={() => {
            onToggleLiveMode?.();
            setIsOpen(false);
          }}
          className={`flex items-center gap-3 px-4 py-3 rounded-xl text-white shadow-lg transition-transform hover:scale-105 ${
            isLiveMode 
              ? "bg-red-500 hover:bg-red-600" 
              : "bg-green-500 hover:bg-green-600"
          }`}
        >
          <Radio className={`h-4 w-4 ${isLiveMode ? "animate-pulse" : ""}`} />
          <span className="font-medium whitespace-nowrap">
            {isLiveMode ? "Désactiver Live" : "Activer Live"}
          </span>
        </button>

        {/* Other actions */}
        {actions.map((action) => (
          <Link key={action.id} href={action.href}>
            <button
              onClick={() => setIsOpen(false)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-white shadow-lg transition-transform hover:scale-105 ${action.color}`}
            >
              <action.icon className="h-4 w-4" />
              <span className="font-medium whitespace-nowrap">{action.label}</span>
            </button>
          </Link>
        ))}
      </div>

      {/* Main FAB */}
      <Button
        onClick={() => setIsOpen(!isOpen)}
        size="lg"
        className={`h-14 w-14 rounded-full shadow-xl transition-all duration-300 ${
          isOpen 
            ? "bg-gray-700 hover:bg-gray-800 rotate-45" 
            : "bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
        }`}
      >
        {isOpen ? (
          <X className="h-6 w-6" />
        ) : (
          <Zap className="h-6 w-6" />
        )}
      </Button>
    </div>
  );
}
