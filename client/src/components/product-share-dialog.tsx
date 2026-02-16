import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Share2,
  QrCode,
  Copy,
  Check,
  MessageCircle,
  Link2,
  Smartphone,
  Download,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ProductShareInfo {
  shareCode: string;
  keyword: string;
  name: string;
  price: number;
  shareUrl: string;
  whatsappDeepLink: string;
  qrData: string;
}

interface ProductShareDialogProps {
  productId: string;
  productName: string;
  trigger?: React.ReactNode;
}

export function ProductShareDialog({
  productId,
  productName,
  trigger,
}: ProductShareDialogProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const { toast } = useToast();

  const { data: shareInfo, isLoading } = useQuery<ProductShareInfo>({
    queryKey: [`/api/products/${productId}/share`],
    enabled: open,
  });

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
    }
  };

  const downloadQRCode = () => {
    if (!shareInfo) return;
    
    // Create a canvas element and draw the QR
    const canvas = document.createElement("canvas");
    const size = 300;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    
    if (ctx) {
      // White background
      ctx.fillStyle = "white";
      ctx.fillRect(0, 0, size, size);
      
      // Draw QR code image
      const img = document.querySelector(`[data-qr-product="${productId}"]`) as HTMLImageElement;
      if (img) {
        ctx.drawImage(img, 0, 0, size, size);
        
        // Download
        const link = document.createElement("a");
        link.download = `qr-${shareInfo.shareCode}.png`;
        link.href = canvas.toDataURL("image/png");
        link.click();
      }
    }
  };

  // Generate QR code URL using a free API
  const qrCodeUrl = shareInfo
    ? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(shareInfo.shareUrl)}`
    : "";

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
            Partager {productName}
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-48 w-48 mx-auto rounded-lg" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : shareInfo ? (
          <Tabs defaultValue="qr" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="qr" className="gap-1">
                <QrCode className="w-3 h-3" />
                QR Code
              </TabsTrigger>
              <TabsTrigger value="link" className="gap-1">
                <Link2 className="w-3 h-3" />
                Lien
              </TabsTrigger>
              <TabsTrigger value="code" className="gap-1">
                <Smartphone className="w-3 h-3" />
                Code
              </TabsTrigger>
            </TabsList>

            {/* QR Code Tab */}
            <TabsContent value="qr" className="space-y-4">
              <div className="bg-white p-4 rounded-lg mx-auto w-fit">
                <img
                  src={qrCodeUrl}
                  alt="QR Code"
                  className="w-48 h-48"
                  data-qr-product={productId}
                />
              </div>
              <p className="text-sm text-center text-muted-foreground">
                Montrez ce QR code pendant votre live !<br />
                Les clients peuvent le scanner pour commander.
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={downloadQRCode}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Télécharger
                </Button>
                <Button
                  className="flex-1 bg-green-600 hover:bg-green-700"
                  onClick={handleShare}
                >
                  <Share2 className="w-4 h-4 mr-2" />
                  Partager
                </Button>
              </div>
            </TabsContent>

            {/* Link Tab */}
            <TabsContent value="link" className="space-y-4">
              <div className="space-y-3">
                <div>
                  <Label className="text-xs text-muted-foreground">Lien de partage</Label>
                  <div className="flex gap-2 mt-1">
                    <Input value={shareInfo.shareUrl} readOnly className="font-mono text-sm" />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => copyToClipboard(shareInfo.shareUrl, "Lien")}
                    >
                      {copied === "Lien" ? (
                        <Check className="w-4 h-4 text-green-600" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>

                <div>
                  <Label className="text-xs text-muted-foreground">Lien WhatsApp direct</Label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      value={shareInfo.whatsappDeepLink}
                      readOnly
                      className="font-mono text-xs"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => copyToClipboard(shareInfo.whatsappDeepLink, "Lien WhatsApp")}
                    >
                      {copied === "Lien WhatsApp" ? (
                        <Check className="w-4 h-4 text-green-600" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Ce lien ouvre WhatsApp avec le code produit pré-rempli
                  </p>
                </div>
              </div>

              <Button
                className="w-full bg-green-600 hover:bg-green-700"
                onClick={() => window.open(shareInfo.whatsappDeepLink, "_blank")}
              >
                <MessageCircle className="w-4 h-4 mr-2" />
                Tester le lien WhatsApp
              </Button>
            </TabsContent>

            {/* Code Tab */}
            <TabsContent value="code" className="space-y-4">
              <div className="bg-gradient-to-br from-green-50 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30 rounded-lg p-6 text-center">
                <p className="text-sm text-muted-foreground mb-2">Code produit à dicter en live :</p>
                <div className="flex items-center justify-center gap-3">
                  <span className="text-4xl font-mono font-bold tracking-wider text-green-600 dark:text-green-400">
                    {shareInfo.keyword}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
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

              <div className="bg-muted/50 rounded-lg p-4 text-center">
                <p className="text-sm text-muted-foreground mb-2">Code court de partage :</p>
                <Badge variant="outline" className="font-mono text-lg px-4 py-1">
                  {shareInfo.shareCode}
                </Badge>
                <p className="text-xs text-muted-foreground mt-2">
                  URL: livepay.tech/p/{shareInfo.shareCode}
                </p>
              </div>

              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 text-sm">
                <p className="font-medium text-blue-800 dark:text-blue-300 mb-1">
                  💡 Conseil pour le live :
                </p>
                <p className="text-blue-700 dark:text-blue-400">
                  "Pour commander, envoyez <strong>{shareInfo.keyword}</strong> sur mon WhatsApp 
                  ou scannez le QR code à l'écran !"
                </p>
              </div>
            </TabsContent>
          </Tabs>
        ) : (
          <p className="text-center text-muted-foreground py-8">
            Erreur de chargement des informations
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
