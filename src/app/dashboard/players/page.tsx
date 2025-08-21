import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PlusCircle } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Image from "next/image";

export default function PlayersPage() {
  const players = [
    { name: "Léo Martin", category: "U12", number: 10, photo: "https://placehold.co/40x40.png" },
    { name: "Hugo Bernard", category: "U15", number: 7, photo: "https://placehold.co/40x40.png" },
    { name: "Arthur Petit", category: "Seniors", number: 9, photo: "https://placehold.co/40x40.png" },
    { name: "Gabriel Dubois", category: "Seniors", number: 1, photo: "https://placehold.co/40x40.png" },
    { name: "Jules Moreau", category: "U17", number: 11, photo: "https://placehold.co/40x40.png" },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
            <h1 className="text-3xl font-bold tracking-tight">Joueurs</h1>
            <p className="text-muted-foreground">Gérez les joueurs de votre club.</p>
        </div>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          Ajouter un joueur
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Liste des joueurs</CardTitle>
          <CardDescription>Retrouvez ici tous les joueurs inscrits dans votre club.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[80px]">Photo</TableHead>
                <TableHead>Nom</TableHead>
                <TableHead>Catégorie</TableHead>
                <TableHead>Numéro</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {players.map((player) => (
                <TableRow key={player.name}>
                  <TableCell>
                    <Avatar>
                      <AvatarImage src={player.photo} alt={player.name} data-ai-hint="player portrait" />
                      <AvatarFallback>{player.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                  </TableCell>
                  <TableCell className="font-medium">{player.name}</TableCell>
                  <TableCell>{player.category}</TableCell>
                  <TableCell>{player.number}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
