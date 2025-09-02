"use client";

import { AddCoachForm } from "@/components/coaches/add-coach-form";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";


export default function AddCoachPage() {
  const router = useRouter();

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-6 w-6" />
            <span className="sr-only">Retour</span>
        </Button>
        <div>
            <h1 className="text-3xl font-bold tracking-tight">Ajouter un entraîneur</h1>
            <p className="text-muted-foreground">
            Remplissez les informations ci-dessous pour ajouter un nouvel entraîneur à votre club.
            </p>
        </div>
      </div>
      <Card>
        <CardHeader>
            <CardTitle>Informations de l'entraîneur</CardTitle>
            <CardDescription>Prenez une photo ou téléchargez-en une.</CardDescription>
        </CardHeader>
        <AddCoachForm />
      </Card>
    </div>
  );
}
