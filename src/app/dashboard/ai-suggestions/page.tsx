
"use client";

import { SuggestionForm } from "@/components/ai/suggestion-form";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function AiSuggestionsPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Suggestions de Poste par IA</h1>
        <p className="text-muted-foreground">
          Utilisez notre outil d'IA pour analyser les caractéristiques d'un joueur et obtenir des recommandations de postes et un plan d'entraînement.
        </p>
      </div>
      <Card>
        <CardHeader>
            <CardTitle>Analyse du Joueur</CardTitle>
            <CardDescription>Remplissez les informations ci-dessous pour générer une suggestion.</CardDescription>
        </CardHeader>
        <SuggestionForm />
      </Card>
    </div>
  );
}
