import { useQuery } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { QRCodeDisplay } from "@/components/qr-code";
import { Radio } from "lucide-react";

type PaymentInvoice = {
  id: string;
  productName: string;
  amount: number;
  clientName: string;
  status: string;
  expiresAt: string;
  vendorName: string;
};

export default function QROverlay() {
  const [, params] = useRoute("/qr/:token");
  const token = params?.token;

  const { data: invoice, isLoading } = useQuery<PaymentInvoice>({
    queryKey: ["/api/pay", token],
    queryFn: async () => {
      const res = await fetch(`/api/pay/${token}`);
      if (!res.ok) throw new Error(`${res.status}`);
      return res.json();
    },
    enabled: !!token,
    refetchInterval: 10000,
  });

  const payUrl = `${window.location.origin}/pay/${token}`;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-transparent flex items-center justify-center">
        <div className="animate-pulse w-48 h-48 bg-muted rounded-lg" />
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="min-h-screen bg-transparent flex items-center justify-center">
        <p className="text-muted-foreground text-sm">Lien invalide</p>
      </div>
    );
  }

  const isPaid = invoice.status === "paid";

  return (
    <div className="min-h-screen bg-[#111] flex items-center justify-center p-4">
      <div className="bg-[#1a1a2e] rounded-2xl p-6 shadow-2xl border border-white/10 max-w-xs w-full space-y-4">
        <div className="flex items-center justify-center gap-2">
          <div className="w-6 h-6 rounded bg-primary flex items-center justify-center">
            <Radio className="w-3 h-3 text-primary-foreground" />
          </div>
          <span className="text-white text-sm font-semibold">LivePay</span>
        </div>

        {isPaid ? (
          <div className="text-center space-y-2 py-4">
            <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center mx-auto">
              <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-green-400 font-semibold text-sm">Paye</p>
          </div>
        ) : (
          <QRCodeDisplay url={payUrl} size={200} showDownload={false} />
        )}

        <div className="text-center space-y-1">
          <p className="text-white font-bold text-lg">
            {invoice.amount.toLocaleString("fr-FR")} <span className="text-sm text-white/60">FCFA</span>
          </p>
          <p className="text-white/70 text-xs">{invoice.productName}</p>
          <p className="text-white/50 text-xs">{invoice.clientName}</p>
        </div>

        <p className="text-center text-white/30 text-[10px]">Scannez pour payer</p>
      </div>
    </div>
  );
}
