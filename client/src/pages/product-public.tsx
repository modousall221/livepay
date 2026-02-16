import { useParams } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageCircle, ShoppingBag, Share2, Copy, Check, Send, Camera, Video, Facebook, Download } from "lucide-react";
import { useState, useEffect } from "react";
import { getProductByShareCode, getUserProfile, getVendorConfig, type Product, type UserProfile, type VendorConfig } from "@/lib/firebase";

interface PublicProductData {
  product: Product;
  vendor: UserProfile | null;
  config: VendorConfig | null;
}

export default function ProductPublic() {
  const params = useParams<{ code: string }>();
  const [copied, setCopied] = useState(false);
  const [isInstagramBrowser, setIsInstagramBrowser] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [data, setData] = useState<PublicProductData | null>(null);

  useEffect(() => {
    // Detect Instagram/TikTok in-app browser
    const ua = navigator.userAgent.toLowerCase();
    setIsInstagramBrowser(ua.includes('instagram') || ua.includes('tiktok'));
  }, []);

  useEffect(() => {
    if (!params.code) return;
    
    const loadProduct = async () => {
      try {
        setIsLoading(true);
        const product = await getProductByShareCode(params.code);
        if (!product) {
          setError(new Error("Product not found"));
          return;
        }
        
        // Load vendor info
        const [vendor, config] = await Promise.all([
          getUserProfile(product.vendorId),
          getVendorConfig(product.vendorId),
        ]);
        
        setData({ product, vendor, config });
      } catch (err) {
        setError(err as Error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadProduct();
  }, [params.code]);

  const product = data?.product;
  const vendorName = data?.vendor?.businessName || data?.vendor?.firstName || "Vendeur";
  const whatsappNumber = data?.vendor?.phone || data?.config?.mobileMoneyNumber;

  const handleCopyKeyword = async () => {
    if (product?.keyword) {
      await navigator.clipboard.writeText(product.keyword);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleWhatsAppOrder = () => {
    if (whatsappNumber && product?.keyword) {
      const message = encodeURIComponent(product.keyword);
      const cleanPhone = whatsappNumber.replace(/[^0-9]/g, "");
      const url = `https://wa.me/${cleanPhone}?text=${message}`;
      
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

  // Social sharing handlers
  const shareText = product ? `🔥 ${product.name}\n💰 ${product.price.toLocaleString("fr-FR")} FCFA\n📱 Code: ${product.keyword}\n\n👉 Commandez maintenant:` : "";
  const shareUrl = typeof window !== 'undefined' ? window.location.href : '';
  
  const handleWhatsAppStatusShare = () => {
    // WhatsApp Status opens the story/status composer
    const text = encodeURIComponent(`${shareText}\n${shareUrl}`);
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  const handleTikTokShare = () => {
    // TikTok doesn't have a direct share URL, so we copy and guide user
    navigator.clipboard.writeText(`${shareText}\n${shareUrl}`);
    alert("Texte copié ! 📋\n\nOuvrez TikTok, créez une vidéo et collez le texte dans la description.");
  };

  const handleSnapchatShare = () => {
    // Snapchat creative kit URL (opens app if installed)
    const url = `https://www.snapchat.com/share?url=${encodeURIComponent(shareUrl)}`;
    window.open(url, '_blank');
  };

  const handleInstagramShare = () => {
    // Instagram doesn't have a direct share URL
    navigator.clipboard.writeText(`${shareText}\n${shareUrl}`);
    alert("Texte copié ! 📋\n\nOuvrez Instagram, créez une story et ajoutez le lien dans la description.");
  };

  const handleFacebookShare = () => {
    const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}&quote=${encodeURIComponent(shareText)}`;
    window.open(url, '_blank');
  };

  const handleDownloadImage = async () => {
    if (product?.imageUrl) {
      try {
        const response = await fetch(product.imageUrl);
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${product.name.replace(/\s+/g, '-')}.jpg`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } catch (error) {
        console.error("Error downloading image:", error);
      }
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
            {vendorName}
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

          {/* Social Share Buttons */}
          <div className="pt-4 border-t space-y-3">
            <p className="text-sm text-center text-muted-foreground font-medium">
              📢 Partager ce produit
            </p>
            <div className="grid grid-cols-3 gap-2">
              {/* WhatsApp Status */}
              <Button
                variant="outline"
                className="flex flex-col items-center gap-1 h-auto py-3 bg-green-50 hover:bg-green-100 border-green-200 dark:bg-green-950 dark:hover:bg-green-900 dark:border-green-800"
                onClick={handleWhatsAppStatusShare}
              >
                <Send className="w-5 h-5 text-green-600" />
                <span className="text-[10px] text-green-700 dark:text-green-400">WhatsApp</span>
              </Button>

              {/* TikTok */}
              <Button
                variant="outline"
                className="flex flex-col items-center gap-1 h-auto py-3 bg-gray-50 hover:bg-gray-100 border-gray-200 dark:bg-gray-900 dark:hover:bg-gray-800"
                onClick={handleTikTokShare}
              >
                <Video className="w-5 h-5 text-gray-800 dark:text-gray-200" />
                <span className="text-[10px]">TikTok</span>
              </Button>

              {/* Snapchat */}
              <Button
                variant="outline"
                className="flex flex-col items-center gap-1 h-auto py-3 bg-yellow-50 hover:bg-yellow-100 border-yellow-200 dark:bg-yellow-950 dark:hover:bg-yellow-900"
                onClick={handleSnapchatShare}
              >
                <Camera className="w-5 h-5 text-yellow-600" />
                <span className="text-[10px] text-yellow-700 dark:text-yellow-400">Snapchat</span>
              </Button>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {/* Instagram */}
              <Button
                variant="outline"
                className="flex flex-col items-center gap-1 h-auto py-3 bg-pink-50 hover:bg-pink-100 border-pink-200 dark:bg-pink-950 dark:hover:bg-pink-900"
                onClick={handleInstagramShare}
              >
                <Camera className="w-5 h-5 text-pink-600" />
                <span className="text-[10px] text-pink-700 dark:text-pink-400">Instagram</span>
              </Button>

              {/* Facebook */}
              <Button
                variant="outline"
                className="flex flex-col items-center gap-1 h-auto py-3 bg-blue-50 hover:bg-blue-100 border-blue-200 dark:bg-blue-950 dark:hover:bg-blue-900"
                onClick={handleFacebookShare}
              >
                <Facebook className="w-5 h-5 text-blue-600" />
                <span className="text-[10px] text-blue-700 dark:text-blue-400">Facebook</span>
              </Button>

              {/* Download Image */}
              {product?.imageUrl && (
                <Button
                  variant="outline"
                  className="flex flex-col items-center gap-1 h-auto py-3"
                  onClick={handleDownloadImage}
                >
                  <Download className="w-5 h-5" />
                  <span className="text-[10px]">Image</span>
                </Button>
              )}
            </div>
          </div>
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
