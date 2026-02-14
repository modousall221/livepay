import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, QrCode } from "lucide-react";

interface QRCodeProps {
  url: string;
  size?: number;
  showDownload?: boolean;
  className?: string;
  label?: string;
}

export function QRCodeDisplay({ url, size = 180, showDownload = true, className = "", label }: QRCodeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [dataUrl, setDataUrl] = useState<string>("");

  useEffect(() => {
    let cancelled = false;
    import("qrcode").then((QRCode) => {
      if (cancelled || !canvasRef.current) return;
      QRCode.toCanvas(canvasRef.current, url, {
        width: size,
        margin: 2,
        color: { dark: "#000000", light: "#ffffff" },
        errorCorrectionLevel: "M",
      }).then(() => {
        if (!cancelled && canvasRef.current) {
          setDataUrl(canvasRef.current.toDataURL("image/png"));
        }
      });
    });
    return () => { cancelled = true; };
  }, [url, size]);

  const handleDownload = () => {
    if (!dataUrl) return;
    const link = document.createElement("a");
    link.download = `livepay-qr-${Date.now()}.png`;
    link.href = dataUrl;
    link.click();
  };

  return (
    <div className={`flex flex-col items-center gap-3 ${className}`}>
      <div className="bg-white rounded-lg p-2">
        <canvas ref={canvasRef} data-testid="qr-code-canvas" />
      </div>
      {label && <p className="text-xs text-muted-foreground text-center">{label}</p>}
      {showDownload && dataUrl && (
        <Button size="sm" variant="outline" onClick={handleDownload} data-testid="button-download-qr">
          <Download className="w-3 h-3 mr-1" />
          Telecharger QR
        </Button>
      )}
    </div>
  );
}

export function InlineQR({ url }: { url: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let cancelled = false;
    import("qrcode").then((QRCode) => {
      if (cancelled || !canvasRef.current) return;
      QRCode.toCanvas(canvasRef.current, url, {
        width: 64,
        margin: 1,
        color: { dark: "#000000", light: "#ffffff" },
        errorCorrectionLevel: "M",
      });
    });
    return () => { cancelled = true; };
  }, [url]);

  return (
    <div className="bg-white rounded p-0.5 shrink-0">
      <canvas ref={canvasRef} className="w-8 h-8" />
    </div>
  );
}
