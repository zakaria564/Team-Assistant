import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PlusCircle } from "lucide-react";

export default function CalendarPage() {
  const matches = [
    { team: "Seniors A", opponent: "FC Rive Droite", date: "25/05/2024 - 15:00", location: "Extérieur" },
    { team: "U17", opponent: "AS Monts d'Or", date: "25/05/2024 - 10:30", location: "Domicile" },
    { team: "U15", opponent: "Olympique Ouest", date: "26/05/2024 - 11:00", location: "Domicile" },
    { team: "U12", opponent: "Stade Nord", date: "26/05/2024 - 14:00", location: "Extérieur" },
    { team: "Seniors B", opponent: "FC Sud", date: "01/06/2024 - 15:00", location: "Domicile" },
  ];

  const events = [
    { name: "Réunion des coachs", date: "05/06/2024 - 19:00", location: "Club House" },
    { name: "Fête de fin de saison", date: "22/06/2024 - 18:00", location: "Stade Principal" },
    { name: "Tournoi U12/U13", date: "29/06/2024 - 09:00", location: "Complexe Sportif" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
            <h1 className="text-3xl font-bold tracking-tight">Calendrier & Événements</h1>
            <p className="text-muted-foreground">Planifiez et consultez les matchs et événements de votre club.</p>
        </div>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          Ajouter
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
      
      <Card>
        <CardHeader>
          <CardTitle>Liste des événements</CardTitle>
          <CardDescription>Retrouvez ici tous les événements à venir du club.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom de l'événement</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Lieu</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {events.map((event, index) => (
                <TableRow key={index}>
                  <TableCell className="font-medium">{event.name}</TableCell>
                  <TableCell>{event.date}</TableCell>
                  <TableCell>{event.location}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
