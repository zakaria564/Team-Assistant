
"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";

export default function ResultsPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Résultats des Matchs</h1>
        <p className="text-muted-foreground">Consultez et gérez les résultats des matchs passés.</p>
      </div>
      <Card>
        <CardHeader>
            <CardTitle>Page désactivée</CardTitle>
            <CardDescription>Cette page a été temporairement désactivée.</CardDescription>
        </CardHeader>
        <CardContent>
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Fonctionnalité désactivée</AlertTitle>
              <AlertDescription>
                Cette section est en cours de maintenance en raison d'un problème technique.
              </AlertDescription>
            </Alert>
        </CardContent>
      </Card>
    </div>
  );
}
