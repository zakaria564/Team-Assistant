
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { suggestPlayerPositions, type SuggestPlayerPositionsOutput } from "@/ai/flows/suggest-player-positions";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useState } from "react";
import { Loader2, Sparkles, Dumbbell } from "lucide-react";

const formSchema = z.object({
  age: z.coerce.number({invalid_type_error: "L'âge est requis."}).min(5, "L'âge doit être d'au moins 5 ans.").max(40, "L'âge ne peut pas dépasser 40 ans."),
  heightCm: z.coerce.number({invalid_type_error: "La taille est requise."}).min(100, "La taille doit être d'au moins 100 cm.").max(220, "La taille ne peut pas dépasser 220 cm."),
  weightKg: z.coerce.number({invalid_type_error: "Le poids est requis."}).min(20, "Le poids doit être d'au moins 20 kg.").max(150, "Le poids ne pas dépasser 150 kg."),
  strengths: z.string().min(10, "Décrivez les points forts avec au moins 10 caractères."),
  weaknesses: z.string().min(10, "Décrivez les points faibles avec au moins 10 caractères."),
});

export function SuggestionForm() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SuggestPlayerPositionsOutput | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      age: 18,
      heightCm: 180,
      weightKg: 75,
      strengths: "",
      weaknesses: ""
    }
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const output = await suggestPlayerPositions(values);
      setResult(output);
    } catch (e) {
      setError("Une erreur est survenue lors de la génération des suggestions.");
      console.error(e);
    } finally {
      setLoading(false);
    }
  }
  
  return (
    <>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
              <FormField
                control={form.control}
                name="age"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Âge (années)</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="heightCm"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Taille (cm)</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="weightKg"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Poids (kg)</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <FormField
                control={form.control}
                name="strengths"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Points forts du joueur</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Ex: Vitesse, bonne vision du jeu, tirs précis..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="weaknesses"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Points faibles du joueur</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Ex: Jeu de tête, pied faible, endurance..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Génération en cours...
                </>
              ) : "Obtenir les suggestions"}
            </Button>
          </form>
        </Form>
      </CardContent>
      
      {error && <p className="p-6 pt-0 text-destructive">{error}</p>}
      
      {result && (
        <div className="p-6 pt-0 grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="bg-muted/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-primary" />Postes Suggérés</CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-lg font-semibold">{result.suggestedPositions}</p>
            </CardContent>
          </Card>
          <Card className="bg-muted/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Dumbbell className="h-5 w-5 text-primary" />Plan d'Entraînement</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="list-disc pl-5 space-y-1">
                {result.trainingRegimen.split('\n').map((item, index) => item.trim() && <li key={index}>{item.replace(/^- /, '')}</li>)}
              </ul>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}
