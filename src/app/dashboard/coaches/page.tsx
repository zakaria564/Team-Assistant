import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PlusCircle } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function CoachesPage() {
  const coaches = [
    { name: "Jean Dupont", category: "Seniors", phone: "06 12 34 56 78", email: "jean.dupont@email.com" },
    { name: "Marie Curie", category: "U17", phone: "06 23 45 67 89", email: "marie.curie@email.com" },
    { name: "Paul Martin", category: "U15", phone: "06 34 56 78 90", email: "paul.martin@email.com" },
    { name: "Sophie Bernard", category: "U12", phone: "06 45 67 89 01", email: "sophie.bernard@email.com" },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
            <h1 className="text-3xl font-bold tracking-tight">Entraîneurs</h1>
            <p className="text-muted-foreground">Gérez les entraîneurs de votre club.</p>
        </div>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          Ajouter un entraîneur
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Liste des entraîneurs</CardTitle>
          <CardDescription>Retrouvez ici tous les entraîneurs du club.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[80px]">Photo</TableHead>
                <TableHead>Nom</TableHead>
                <TableHead>Catégorie</TableHead>
                <TableHead>Téléphone</TableHead>
                <TableHead>Email</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {coaches.map((coach) => (
                <TableRow key={coach.name}>
                   <TableCell>
                        <Avatar>
                          <AvatarImage src={`https://i.pravatar.cc/150?u=${coach.email}`} alt={coach.name} data-ai-hint="coach portrait" />
                          <AvatarFallback>{coach.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                      </TableCell>
                  <TableCell className="font-medium">{coach.name}</TableCell>
                  <TableCell>{coach.category}</TableCell>
                  <TableCell>{coach.phone}</TableCell>
                  <TableCell>{coach.email}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}