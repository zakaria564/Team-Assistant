import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function AddEventPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Ajouter un événement ou un match</h1>
        <p className="text-muted-foreground">
          Remplissez les informations ci-dessous pour ajouter un nouvel élément au calendrier.
        </p>
      </div>
      <Card>
        <CardHeader>
            <CardTitle>Nouvel Événement / Match</CardTitle>
            <CardDescription>Remplissez les détails ci-dessous.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Titre</Label>
              <Input id="title" placeholder="Ex: Match contre FC Rive Droite" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="date">Date et Heure</Label>
              <Input id="date" type="datetime-local" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="location">Lieu</Label>
              <Input id="location" placeholder="Ex: Stade Principal" />
            </div>
            <Button type="submit">Enregistrer</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
