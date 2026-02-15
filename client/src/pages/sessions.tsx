import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertLiveSessionSchema, type LiveSession, type InsertLiveSession, type Invoice } from "@shared/schema";
import { Plus, Radio, Square, Eye, CheckCircle2, Clock, XCircle, TrendingUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/auth-utils";
import { useState } from "react";
import { useLocation } from "wouter";

interface SessionSummary {
  session: LiveSession;
  invoices: Invoice[];
}

function SessionSummaryDialog({ 
  summary, 
  open, 
  onClose,
  onConfirm,
  isEnding 
}: { 
  summary: SessionSummary | null;
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isEnding: boolean;
}) {
  if (!summary) return null;

  const { session, invoices } = summary;
  const paidInvoices = invoices.filter((i) => i.status === "paid");
  const pendingInvoices = invoices.filter((i) => i.status === "pending");
  const expiredInvoices = invoices.filter((i) => i.status === "expired");
  const totalRevenue = paidInvoices.reduce((sum, i) => sum + i.amount, 0);
  const conversionRate = invoices.length > 0 
    ? Math.round((paidInvoices.length / invoices.length) * 100) 
    : 0;

  // Calculate session duration
  const startTime = new Date(session.createdAt);
  const endTime = new Date();
  const durationMs = endTime.getTime() - startTime.getTime();
  const hours = Math.floor(durationMs / (1000 * 60 * 60));
  const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
  const durationText = hours > 0 ? `${hours}h ${minutes}min` : `${minutes} min`;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Résumé de session</DialogTitle>
          <DialogDescription>
            {session.title} - {session.platform}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {/* Revenue Card */}
          <div className="p-4 rounded-lg bg-green-500/10 text-center">
            <p className="text-sm text-muted-foreground mb-1">Revenus de la session</p>
            <p className="text-3xl font-bold text-green-500">
              {totalRevenue.toLocaleString("fr-FR")} F
            </p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-md bg-muted/50 text-center">
              <div className="flex items-center justify-center gap-1 text-green-500 mb-1">
                <CheckCircle2 className="w-4 h-4" />
                <span className="text-lg font-bold">{paidInvoices.length}</span>
              </div>
              <p className="text-xs text-muted-foreground">Payées</p>
            </div>
            <div className="p-3 rounded-md bg-muted/50 text-center">
              <div className="flex items-center justify-center gap-1 text-amber-500 mb-1">
                <Clock className="w-4 h-4" />
                <span className="text-lg font-bold">{pendingInvoices.length}</span>
              </div>
              <p className="text-xs text-muted-foreground">En attente</p>
            </div>
            <div className="p-3 rounded-md bg-muted/50 text-center">
              <div className="flex items-center justify-center gap-1 text-red-500 mb-1">
                <XCircle className="w-4 h-4" />
                <span className="text-lg font-bold">{expiredInvoices.length}</span>
              </div>
              <p className="text-xs text-muted-foreground">Expirées</p>
            </div>
            <div className="p-3 rounded-md bg-muted/50 text-center">
              <div className="flex items-center justify-center gap-1 text-primary mb-1">
                <TrendingUp className="w-4 h-4" />
                <span className="text-lg font-bold">{conversionRate}%</span>
              </div>
              <p className="text-xs text-muted-foreground">Conversion</p>
            </div>
          </div>

          {/* Duration */}
          <div className="flex items-center justify-between p-3 rounded-md bg-muted/50">
            <span className="text-sm text-muted-foreground">Durée de la session</span>
            <span className="font-medium">{durationText}</span>
          </div>

          {pendingInvoices.length > 0 && (
            <div className="p-3 rounded-md border border-amber-500/50 bg-amber-500/10">
              <p className="text-sm text-amber-500">
                ⚠️ Il reste {pendingInvoices.length} facture(s) en attente. 
                Elles resteront accessibles même après la clôture.
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button 
            variant="destructive" 
            onClick={onConfirm}
            disabled={isEnding}
          >
            {isEnding ? "Fermeture..." : "Terminer la session"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function Sessions() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [, navigate] = useLocation();
  const [summarySession, setSummarySession] = useState<SessionSummary | null>(null);
  const [showSummary, setShowSummary] = useState(false);

  const { data: sessions, isLoading } = useQuery<LiveSession[]>({
    queryKey: ["/api/sessions"],
  });

  const form = useForm<InsertLiveSession>({
    resolver: zodResolver(
      insertLiveSessionSchema.extend({
        title: insertLiveSessionSchema.shape.title.min(1, "Titre requis"),
        platform: insertLiveSessionSchema.shape.platform.min(1, "Plateforme requise"),
      })
    ),
    defaultValues: {
      title: "",
      platform: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: InsertLiveSession) => apiRequest("POST", "/api/sessions", data),
    onSuccess: async (res) => {
      const session = await res.json();
      queryClient.invalidateQueries({ queryKey: ["/api/sessions"] });
      form.reset();
      setOpen(false);
      toast({ title: "Session créée" });
      navigate(`/sessions/${session.id}`);
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({ title: "Non autorisé", description: "Reconnexion...", variant: "destructive" });
        setTimeout(() => { window.location.href = "/api/login"; }, 500);
        return;
      }
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    },
  });

  const endMutation = useMutation({
    mutationFn: (id: string) => apiRequest("PATCH", `/api/sessions/${id}/end`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sessions"] });
      setShowSummary(false);
      setSummarySession(null);
      toast({ title: "Session terminée" });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({ title: "Non autorisé", description: "Reconnexion...", variant: "destructive" });
        setTimeout(() => { window.location.href = "/api/login"; }, 500);
        return;
      }
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    },
  });

  const handleEndSession = async (session: LiveSession) => {
    // Fetch invoices for this session to show summary
    try {
      const res = await fetch(`/api/invoices?sessionId=${session.id}`, { credentials: "include" });
      if (res.ok) {
        const invoices = await res.json();
        setSummarySession({ session, invoices });
        setShowSummary(true);
      } else {
        // If we can't fetch invoices, just end the session directly
        endMutation.mutate(session.id);
      }
    } catch {
      endMutation.mutate(session.id);
    }
  };

  const confirmEndSession = () => {
    if (summarySession) {
      endMutation.mutate(summarySession.session.id);
    }
  };

  const onSubmit = (data: InsertLiveSession) => {
    createMutation.mutate(data);
  };

  const activeSessions = sessions?.filter((s) => s.active) || [];
  const pastSessions = sessions?.filter((s) => !s.active) || [];

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-5xl">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-serif font-bold" data-testid="text-sessions-title">Sessions Live</h1>
          <p className="text-sm text-muted-foreground mt-1">G&eacute;rez vos sessions de vente en direct</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-new-session">
              <Plus className="w-4 h-4 mr-2" />
              Nouvelle session
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nouvelle session live</DialogTitle>
            </DialogHeader>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Titre</Label>
                <Input
                  id="title"
                  {...form.register("title")}
                  placeholder="Ex: Vente sp\u00e9ciale Wax"
                  data-testid="input-session-title"
                />
                {form.formState.errors.title && (
                  <p className="text-xs text-destructive">{form.formState.errors.title.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Plateforme</Label>
                <Controller
                  control={form.control}
                  name="platform"
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger data-testid="select-platform">
                        <SelectValue placeholder="Choisir une plateforme" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="tiktok">TikTok</SelectItem>
                        <SelectItem value="instagram">Instagram</SelectItem>
                        <SelectItem value="facebook">Facebook</SelectItem>
                        <SelectItem value="whatsapp">WhatsApp</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
                {form.formState.errors.platform && (
                  <p className="text-xs text-destructive">{form.formState.errors.platform.message}</p>
                )}
              </div>
              <Button
                type="submit"
                className="w-full"
                disabled={createMutation.isPending}
                data-testid="button-submit-session"
              >
                {createMutation.isPending ? "Cr\u00e9ation..." : "D\u00e9marrer la session"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="p-4">
              <Skeleton className="h-5 w-40 mb-2" />
              <Skeleton className="h-4 w-24" />
            </Card>
          ))}
        </div>
      ) : sessions?.length === 0 ? (
        <Card className="p-12 flex flex-col items-center gap-4 text-center">
          <div className="w-12 h-12 rounded-md bg-muted flex items-center justify-center">
            <Radio className="w-6 h-6 text-muted-foreground" />
          </div>
          <div>
            <h3 className="font-semibold">Aucune session</h3>
            <p className="text-sm text-muted-foreground mt-1">
              D&eacute;marrez votre premi&egrave;re session live pour commencer &agrave; g&eacute;n&eacute;rer des factures.
            </p>
          </div>
        </Card>
      ) : (
        <div className="space-y-6">
          {activeSessions.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">En cours</h2>
              {activeSessions.map((session) => (
                <Card key={session.id} className="p-4" data-testid={`card-session-${session.id}`}>
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse shrink-0" />
                      <div className="min-w-0">
                        <h3 className="font-semibold truncate">{session.title}</h3>
                        <p className="text-xs text-muted-foreground capitalize">{session.platform}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/sessions/${session.id}`)}
                        data-testid={`button-view-session-${session.id}`}
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        Ouvrir
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleEndSession(session)}
                        disabled={endMutation.isPending}
                        data-testid={`button-end-session-${session.id}`}
                      >
                        <Square className="w-4 h-4 mr-1" />
                        Terminer
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}

          {pastSessions.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Terminées</h2>
              {pastSessions.map((session) => (
                <Card key={session.id} className="p-4" data-testid={`card-session-${session.id}`}>
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="w-2.5 h-2.5 rounded-full bg-muted-foreground shrink-0" />
                      <div className="min-w-0">
                        <h3 className="font-semibold truncate">{session.title}</h3>
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="secondary" className="text-xs capitalize">{session.platform}</Badge>
                          <span className="text-xs text-muted-foreground">
                            {session.endedAt ? new Date(session.endedAt).toLocaleDateString("fr-FR") : ""}
                          </span>
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate(`/sessions/${session.id}`)}
                      data-testid={`button-view-session-${session.id}`}
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      Voir
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Session Summary Dialog */}
      <SessionSummaryDialog
        summary={summarySession}
        open={showSummary}
        onClose={() => {
          setShowSummary(false);
          setSummarySession(null);
        }}
        onConfirm={confirmEndSession}
        isEnding={endMutation.isPending}
      />
    </div>
  );
}
