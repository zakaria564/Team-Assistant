import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PlusCircle } from "lucide-react";

export default function EventsPage() {
  const events = [
    { name: "Réunion des coachs", date: "05/06/2024 - 19:00", location: "Club House" },
    { name: "Fête de fin de saison", date: "22/06/2024 - 18:00", location: "Stade Principal" },
    { name: "Tournoi U12/U13", date: "29/06/2024 - 09:00", location: "Complexe Sportif" },
    { name: "Journée portes ouvertes", date: "07/09/2024 - 10:00", location: "Stade Principal" },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
            <h1 className="text-3xl font-bold tracking-tight">Événements</h1>
            <p className="text-muted-foreground">Gérez les événements de votre club.</p>
        </div>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          Ajouter un événement
        </Button>
      </div>
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
