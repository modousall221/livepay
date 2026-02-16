import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Share2,
  Copy,
  Check,
  MessageCircle,
  Link2,
  ImageIcon,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { type Product } from "@/lib/firebase";

interface ProductShareDialogProps {
  product: Product;
  trigger?: React.ReactNode;
}

export function ProductShareDialog({
  product,
  trigger,
}: ProductShareDialogProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const { toast } = useToast();

  // Compute share info locally from product data
  const shareInfo = useMemo(() => {
    const baseUrl = window.location.origin;
    const shareCode = product.id.slice(0, 8).toUpperCase();
    const shareUrl = `${baseUrl}/pay?p=${product.id}`;
    const whatsappMessage = `Je commande: ${product.keyword}`;
    const whatsappDeepLink = `https://wa.me/?text=${encodeURIComponent(whatsappMessage)}`;
    
    return {
      shareCode,
      keyword: product.keyword || "",
      name: product.name,
      price: product.price,
      shareUrl,
      whatsappDeepLink,
    };
  }, [product]);

  const copyToClipboard = async (text: string, label: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
    toast({ title: "Copié !", description: `${label} copié dans le presse-papiers` });
  };

  const handleShare = async () => {
    if (navigator.share && shareInfo) {
      try {
        await navigator.share({
          title: shareInfo.name,
          text: `${shareInfo.name} - ${shareInfo.price.toLocaleString("fr-FR")} FCFA\nCode: ${shareInfo.keyword}`,
          url: shareInfo.shareUrl,
        });
      } catch (err) {
        // User cancelled
      }
    } else {
      // Fallback: copy link
      copyToClipboard(shareInfo.shareUrl, "Lien");
    }
  };

  const formatPrice = (price: number) => {
    return price.toLocaleString("fr-FR") + " FCFA";
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Share2 className="w-4 h-4" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="w-5 h-5" />
            Partager {product.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Product Image */}
          <div className="relative aspect-square w-full max-w-[280px] mx-auto rounded-xl overflow-hidden bg-muted">
            {product.imageUrl ? (
              <img
                src={product.imageUrl}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                <ImageIcon className="w-16 h-16" />
              </div>
            )}
            {/* Price badge overlay */}
            <div className="absolute bottom-3 right-3">
              <Badge className="bg-green-600 hover:bg-green-600 text-white text-lg px-3 py-1 font-bold shadow-lg">
                {formatPrice(product.price)}
              </Badge>
            </div>
          </div>

          {/* Product Name & Description */}
          <div className="text-center space-y-2">
            <h3 className="text-xl font-semibold">{product.name}</h3>
            {product.description && (
              <p className="text-sm text-muted-foreground line-clamp-3">
                {product.description}
              </p>
            )}
          </div>

          {/* Product Code - Copiable */}
          <div className="bg-gradient-to-br from-green-50 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30 rounded-xl p-4">
            <Label className="text-xs text-muted-foreground block text-center mb-2">
              Code produit (à dicter en live)
            </Label>
            <div className="flex items-center justify-center gap-3">
              <span className="text-3xl font-mono font-bold tracking-wider text-green-600 dark:text-green-400">
                {shareInfo.keyword}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10"
                onClick={() => copyToClipboard(shareInfo.keyword, "Code")}
              >
                {copied === "Code" ? (
                  <Check className="w-5 h-5 text-green-600" />
                ) : (
                  <Copy className="w-5 h-5" />
                )}
              </Button>
            </div>
          </div>

          {/* Share Link */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Lien de commande</Label>
            <div className="flex gap-2">
              <Input 
                value={shareInfo.shareUrl} 
                readOnly 
                className="font-mono text-xs bg-muted" 
              />
              <Button
                variant="outline"
                size="icon"
                onClick={() => copyToClipboard(shareInfo.shareUrl, "Lien")}
              >
                {copied === "Lien" ? (
                  <Check className="w-4 h-4 text-green-600" />
                ) : (
                  <Link2 className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => window.open(shareInfo.whatsappDeepLink, "_blank")}
            >
              <MessageCircle className="w-4 h-4 mr-2" />
              WhatsApp
            </Button>
            <Button
              className="flex-1 bg-green-600 hover:bg-green-700"
              onClick={handleShare}
            >
              <Share2 className="w-4 h-4 mr-2" />
              Partager
            </Button>
          </div>

          {/* Tip */}
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 text-sm">
            <p className="text-blue-700 dark:text-blue-400 text-center">
              💡 "Pour commander, envoyez <strong>{shareInfo.keyword}</strong> sur mon WhatsApp !"
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
