import { useQuery } from "@tanstack/react-query";
import { useParams } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageCircle, ShoppingBag, Share2, Copy, Check } from "lucide-react";
import { useState, useEffect } from "react";

interface PublicProduct {
  id: string;
  name: string;
  keyword: string;
  shareCode: string;
  price: number;
  description: string | null;
  imageUrl: string | null;
  stock: number;
  vendorName: string;
  whatsappNumber: string | null;
}

export default function ProductPublic() {
  const params = useParams<{ code: string }>();
  const [copied, setCopied] = useState(false);
  const [isInstagramBrowser, setIsInstagramBrowser] = useState(false);

  useEffect(() => {
    // Detect Instagram/TikTok in-app browser
    const ua = navigator.userAgent.toLowerCase();
    setIsInstagramBrowser(ua.includes('instagram') || ua.includes('tiktok'));
  }, []);

  const { data: product, isLoading, error } = useQuery<PublicProduct>({
    queryKey: [`/api/public/product/${params.code}`],
    enabled: !!params.code,
  });

  const handleCopyKeyword = async () => {
    if (product?.keyword) {
      await navigator.clipboard.writeText(product.keyword);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleWhatsAppOrder = () => {
    if (product?.whatsappNumber && product?.keyword) {
      const message = encodeURIComponent(product.keyword);
      const url = `https://wa.me/${product.whatsappNumber}?text=${message}`;
      
      // For in-app browsers, try to open in external browser
      if (isInstagramBrowser) {
        // Copy to clipboard and show instructions
        navigator.clipboard.writeText(product.keyword);
        alert(`Code copié ! Ouvrez WhatsApp et envoyez "${product.keyword}" au vendeur.`);
        window.location.href = url;
      } else {
        window.open(url, '_blank');
      }
    }
  };

  const handleShare = async () => {
    if (navigator.share && product) {
      try {
        await navigator.share({
          title: product.name,
          text: `${product.name} - ${product.price.toLocaleString("fr-FR")} FCFA\nCode: ${product.keyword}`,
          url: window.location.href,
        });
      } catch (err) {
        // User cancelled or error
      }
    } else {
      // Fallback: copy link
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 dark:from-gray-900 dark:to-gray-800 p-4 flex items-center justify-center">
        <Card className="w-full max-w-md p-6 space-y-4">
          <Skeleton className="h-48 w-full rounded-lg" />
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-8 w-1/2" />
          <Skeleton className="h-12 w-full" />
        </Card>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 dark:from-gray-900 dark:to-gray-800 p-4 flex items-center justify-center">
        <Card className="w-full max-w-md p-8 text-center">
          <ShoppingBag className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
          <h1 className="text-xl font-bold mb-2">Produit non trouvé</h1>
          <p className="text-muted-foreground">
            Ce produit n'existe pas ou n'est plus disponible.
          </p>
        </Card>
      </div>
    );
  }

  const isOutOfStock = product.stock <= 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 dark:from-gray-900 dark:to-gray-800 p-4">
      {/* Header */}
      <div className="max-w-md mx-auto mb-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-green-700 dark:text-green-400">
            {product.vendorName}
          </span>
          <Button variant="ghost" size="icon" onClick={handleShare}>
            <Share2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Product Card */}
      <Card className="w-full max-w-md mx-auto overflow-hidden shadow-xl">
        {/* Product Image */}
        {product.imageUrl ? (
          <div className="aspect-square bg-gray-100 dark:bg-gray-800">
            <img
              src={product.imageUrl}
              alt={product.name}
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          <div className="aspect-square bg-gradient-to-br from-green-100 to-emerald-200 dark:from-green-900 dark:to-emerald-800 flex items-center justify-center">
            <ShoppingBag className="w-24 h-24 text-green-300 dark:text-green-600" />
          </div>
        )}

        {/* Product Info */}
        <div className="p-6 space-y-4">
          {/* Name & Price */}
          <div>
            <h1 className="text-2xl font-bold mb-2">{product.name}</h1>
            <p className="text-3xl font-bold text-green-600 dark:text-green-400">
              {product.price.toLocaleString("fr-FR")} <span className="text-lg">FCFA</span>
            </p>
          </div>

          {/* Stock Status */}
          <div className="flex items-center gap-2">
            {isOutOfStock ? (
              <Badge variant="destructive">Rupture de stock</Badge>
            ) : product.stock <= 3 ? (
              <Badge variant="outline" className="border-amber-500 text-amber-600">
                Plus que {product.stock} en stock !
              </Badge>
            ) : (
              <Badge variant="outline" className="border-green-500 text-green-600">
                En stock
              </Badge>
            )}
          </div>

          {/* Description */}
          {product.description && (
            <p className="text-muted-foreground">{product.description}</p>
          )}

          {/* Keyword Box */}
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border-2 border-dashed border-green-300 dark:border-green-700">
            <p className="text-sm text-muted-foreground mb-2 text-center">
              📱 Code à envoyer sur WhatsApp :
            </p>
            <div className="flex items-center justify-center gap-2">
              <span className="text-2xl font-mono font-bold tracking-wider text-green-600 dark:text-green-400">
                {product.keyword}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={handleCopyKeyword}
              >
                {copied ? (
                  <Check className="w-4 h-4 text-green-600" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>

          {/* CTA Button */}
          <Button
            className="w-full h-14 text-lg gap-2 bg-green-600 hover:bg-green-700"
            onClick={handleWhatsAppOrder}
            disabled={isOutOfStock}
          >
            <MessageCircle className="w-6 h-6" />
            {isOutOfStock ? "Indisponible" : "Commander sur WhatsApp"}
          </Button>

          {/* Instructions */}
          {!isOutOfStock && (
            <p className="text-xs text-center text-muted-foreground">
              Cliquez pour ouvrir WhatsApp et envoyer automatiquement le code
            </p>
          )}
        </div>
      </Card>

      {/* Footer */}
      <div className="max-w-md mx-auto mt-6 text-center">
        <p className="text-xs text-muted-foreground">
          Propulsé par <span className="font-semibold text-green-600">LivePay</span>
        </p>
      </div>
    </div>
  );
}
