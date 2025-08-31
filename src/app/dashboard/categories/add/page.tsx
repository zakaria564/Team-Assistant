
import { AddCategoryForm } from "@/components/categories/add-category-form";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function AddCategoryPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Ajouter une catégorie</h1>
        <p className="text-muted-foreground">
          Remplissez les informations ci-dessous pour ajouter une nouvelle catégorie à votre club.
        </p>
      </div>
      <Card>
        <CardHeader>
            <CardTitle>Informations de la Catégorie</CardTitle>
            <CardDescription>Entrez le nom et assignez un entraîneur si vous le souhaitez.</CardDescription>
        </CardHeader>
        <CardContent>
            <AddCategoryForm />
        </CardContent>
      </Card>
    </div>
  );
}
