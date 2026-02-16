// Admin functionality temporarily disabled during Firebase migration
// This page will be re-implemented with Firebase Admin SDK

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Shield, ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";

export default function AdminUpcoming() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8 text-center space-y-6">
        <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
          <Shield className="w-8 h-8 text-primary" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">Administration</h1>
          <p className="text-muted-foreground">
            Le panneau d'administration sera disponible prochainement avec Firebase.
          </p>
        </div>
        <Button onClick={() => setLocation("/dashboard")} className="gap-2">
          <ArrowLeft className="w-4 h-4" />
          Retour au tableau de bord
        </Button>
      </Card>
    </div>
  );
}
