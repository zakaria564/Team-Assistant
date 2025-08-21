import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PlusCircle } from "lucide-react";

export default function MatchesPage() {
  const matches = [
    { team: "Seniors A", opponent: "FC Rive Droite", date: "25/05/2024 - 15:00", location: "Extérieur" },
    { team: "U17", opponent: "AS Monts d'Or", date: "25/05/2024 - 10:30", location: "Domicile" },
    { team: "U15", opponent: "Olympique Ouest", date: "26/05/2024 - 11:00", location: "Domicile" },
    { team: "U12", opponent: "Stade Nord", date: "26/05/2024 - 14:00", location: "Extérieur" },
    { team: "Seniors B", opponent: "FC Sud", date: "01/06/2024 - 15:00", location: "Domicile" },
    { team: "U10", opponent: "ES Centre", date: "01/06/2024 - 09:30", location: "Extérieur" },
    { team: "U17", opponent: "Avenir Est", date: "02/06/2024 - 10:30", location: "Domicile" },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
            <h1 className="text-3xl font-bold tracking-tight">Matchs</h1>
            <p className="text-muted-foreground">Planifiez et consultez les matchs de votre club.</p>
        </div>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          Ajouter un match
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Liste des matchs</CardTitle>
          <CardDescription>Retrouvez ici tous les matchs à venir et passés.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Équipe</TableHead>
                <TableHead>Adversaire</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Lieu</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {matches.map((match, index) => (
                <TableRow key={index}>
                  <TableCell className="font-medium">{match.team}</TableCell>
                  <TableCell>{match.opponent}</TableCell>
                  <TableCell>{match.date}</TableCell>
                  <TableCell>{match.location}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
