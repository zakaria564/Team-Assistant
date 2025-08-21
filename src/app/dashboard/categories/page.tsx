import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PlusCircle } from "lucide-react";

export default function CategoriesPage() {
  const categories = [
    { name: "U10", players: 15, coach: "Jean Dupont" },
    { name: "U12", players: 18, coach: "Marie Curie" },
    { name: "U15", players: 22, coach: "Paul Martin" },
    { name: "U17", players: 20, coach: "Sophie Bernard" },
    { name: "Seniors", players: 25, coach: "Luc Dubois" },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
            <h1 className="text-3xl font-bold tracking-tight">Catégories</h1>
            <p className="text-muted-foreground">Gérez les catégories d'âge de votre club.</p>
        </div>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          Ajouter une catégorie
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Liste des catégories</CardTitle>
          <CardDescription>Retrouvez ici toutes les catégories de votre club.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom</TableHead>
                <TableHead>Nombre de joueurs</TableHead>
                <TableHead>Entraîneur principal</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categories.map((category) => (
                <TableRow key={category.name}>
                  <TableCell className="font-medium">{category.name}</TableCell>
                  <TableCell>{category.players}</TableCell>
                  <TableCell>{category.coach}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
