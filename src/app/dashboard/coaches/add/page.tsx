import { AddCoachForm } from "@/components/coaches/add-coach-form";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function AddCoachPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Ajouter un entraîneur</h1>
        <p className="text-muted-foreground">
          Remplissez les informations ci-dessous pour ajouter un nouvel entraîneur à votre club.
        </p>
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
