"use client";

import { AddPlayerForm } from "@/components/players/add-player-form";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

export default function AddPlayerPage() {
  const router = useRouter();

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
         <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-6 w-6" />
          <span className="sr-only">Retour</span>
        </Button>
        <div>
            <h1 className="text-3xl font-bold tracking-tight">Ajouter un joueur</h1>
            <p className="text-muted-foreground">
            Remplissez les informations ci-dessous pour ajouter un nouveau joueur à votre club.
            </p>
        </div>
      </div>
      <Card>
        <CardHeader>
            <CardTitle>Informations du Joueur</CardTitle>
            <CardDescription>Vous pouvez prendre une photo avec la webcam ou en télécharger une.</CardDescription>
        </CardHeader>
        <AddPlayerForm />
      </Card>
    </div>
  );
}
