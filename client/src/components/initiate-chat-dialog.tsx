import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MessageCircle, Send, Package, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { getProducts, type Product } from "@/lib/firebase";

interface InitiateChatDialogProps {
  trigger?: React.ReactNode;
  defaultPhone?: string;
  defaultProductId?: string;
}

export function InitiateChatDialog({
  trigger,
  defaultPhone = "",
  defaultProductId,
}: InitiateChatDialogProps) {
  const [open, setOpen] = useState(false);
  const [phone, setPhone] = useState(defaultPhone);
  const [selectedProductId, setSelectedProductId] = useState<string>(defaultProductId || "");
  const [customMessage, setCustomMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const { toast } = useToast();
  const { user } = useAuth();

  // Load products from Firebase when dialog opens
  useEffect(() => {
    if (open && user) {
      getProducts(user.id).then(setProducts).catch(console.error);
    }
  }, [open, user]);

  const activeProducts = products.filter((p) => p.active);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Clean phone number
    const cleanPhone = phone.replace(/[^0-9]/g, "");
    if (cleanPhone.length < 9) {
      toast({
        title: "Numéro invalide",
        description: "Entrez un numéro de téléphone valide",
        variant: "destructive",
      });
      return;
    }

    setIsSending(true);

    // Build message
    let message = customMessage;
    if (!message && selectedProduct) {
      message = `🛍️ *${selectedProduct.name}*\n💰 ${selectedProduct.price.toLocaleString("fr-FR")} FCFA\n\n📱 Pour commander, envoyez le code: *${selectedProduct.keyword}*`;
    }
    if (!message) {
      message = "Bonjour ! Comment puis-je vous aider ?";
    }

    // Open WhatsApp Web/App directly
    const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, "_blank");

    toast({
      title: "WhatsApp ouvert",
      description: "Envoyez votre message via WhatsApp",
    });
    
    setOpen(false);
    setPhone("");
    setSelectedProductId("");
    setCustomMessage("");
    setIsSending(false);
  };

  const selectedProduct = activeProducts.find((p) => p.id === selectedProductId);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" className="gap-2">
            <MessageCircle className="w-4 h-4" />
            Contacter un client
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-green-600" />
            Envoyer un message WhatsApp
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Phone Number */}
          <div className="space-y-2">
            <Label htmlFor="phone">Numéro WhatsApp du client</Label>
            <Input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+221 77 123 45 67"
              className="font-mono"
            />
            <p className="text-xs text-muted-foreground">
              Format international recommandé (ex: 221771234567)
            </p>
          </div>

          {/* Product Selection */}
          <div className="space-y-2">
            <Label>Produit à partager (optionnel)</Label>
            <Select value={selectedProductId} onValueChange={setSelectedProductId}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un produit..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Aucun produit</SelectItem>
                {activeProducts.map((product) => (
                  <SelectItem key={product.id} value={product.id}>
                    <div className="flex items-center gap-2">
                      <Package className="w-4 h-4" />
                      <span>{product.name}</span>
                      <span className="text-muted-foreground">
                        ({product.price.toLocaleString("fr-FR")} F)
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Preview if product selected */}
          {selectedProduct && (
            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 text-sm">
              <p className="font-medium text-green-800 dark:text-green-300 mb-1">
                Aperçu du message :
              </p>
              <div className="text-green-700 dark:text-green-400 whitespace-pre-line">
                🛍️ *{selectedProduct.name}*{"\n"}
                💰 {selectedProduct.price.toLocaleString("fr-FR")} FCFA{"\n\n"}
                📱 Pour commander, envoyez le code: *{selectedProduct.keyword}*
              </div>
            </div>
          )}

          {/* Custom Message */}
          <div className="space-y-2">
            <Label htmlFor="message">
              {selectedProductId ? "Message personnalisé (remplace l'aperçu)" : "Message"}
            </Label>
            <Textarea
              id="message"
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              placeholder={
                selectedProductId
                  ? "Laisser vide pour utiliser le message par défaut"
                  : "Bonjour ! Comment puis-je vous aider ?"
              }
              rows={3}
            />
          </div>

          {/* Submit */}
          <Button
            type="submit"
            className="w-full bg-green-600 hover:bg-green-700"
            disabled={isSending || !phone}
          >
            {isSending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Envoi en cours...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Envoyer sur WhatsApp
              </>
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
