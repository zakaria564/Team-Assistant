import { AddPlayerForm } from "@/components/players/add-player-form";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function AddPlayerPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Ajouter un joueur</h1>
        <p className="text-muted-foreground">
          Remplissez les informations ci-dessous pour ajouter un nouveau joueur à votre club.
        </p>
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
