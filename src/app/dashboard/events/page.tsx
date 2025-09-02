
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { PlusCircle, Clock, MapPin, Users } from "lucide-react";
import Link from "next/link";
import { format, isSameDay } from "date-fns";
import { fr } from "date-fns/locale";

const events = [
    { id: 1, type: "Match", team: "Seniors A", opponent: "FC Rive Droite", date: new Date("2024-05-25T15:00:00"), location: "Extérieur" },
    { id: 2, type: "Match", team: "U17", opponent: "AS Monts d'Or", date: new Date("2024-05-25T10:30:00"), location: "Domicile" },
    { id: 3, type: "Entraînement", team: "U15", date: new Date("2024-05-27T18:00:00"), location: "Stade Principal" },
    { id: 4, type: "Match", team: "U15", opponent: "Olympique Ouest", date: new Date("2024-05-26T11:00:00"), location: "Domicile" },
];

export default function EventsPage() {
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [selectedEvents, setSelectedEvents] = useState<typeof events>([]);

  useEffect(() => {
    // Set initial date to today on client-side to avoid hydration errors
    setDate(new Date());
  }, []);

  useEffect(() => {
    if (date) {
      const filteredEvents = events.filter((event) => isSameDay(event.date, date)).sort((a, b) => a.date.getTime() - b.date.getTime());
      setSelectedEvents(filteredEvents);
    }
  }, [date]);

  return (
    <div className="space-y-6">
       <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Événements</h1>
          <p className="text-muted-foreground">
            Planifiez et visualisez les matchs et entraînements.
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/events/add">
            <PlusCircle className="mr-2 h-4 w-4" />
            Ajouter un événement
          </Link>
        </Button>
      </div>

      <div className="grid md:grid-cols-1 lg:grid-cols-4 gap-6">
        <Card className="lg:col-span-1">
          <CardContent className="p-2">
            <Calendar
              mode="single"
              selected={date}
              onSelect={setDate}
              className="w-full"
              locale={fr}
            />
          </CardContent>
        </Card>
        
        <div className="lg:col-span-3">
             <Card>
                <CardHeader>
                    <CardTitle className="text-2xl font-bold">
                        {date ? format(date, "d MMMM yyyy", { locale: fr }) : "Sélectionnez une date"}
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {selectedEvents.length > 0 ? (
                        selectedEvents.map(event => (
                             <Card key={event.id} className="bg-muted/30">
                                <CardHeader>
                                    <CardTitle className="text-lg flex items-center justify-between">
                                        <span>{event.type === 'Match' ? `${event.team} vs ${event.opponent}` : `Entraînement ${event.team}`}</span>
                                        <span className={`text-sm font-medium px-2 py-1 rounded-md ${event.type === 'Match' ? 'bg-primary/20 text-primary' : 'bg-accent/20 text-accent-foreground'}`}>
                                            {event.type}
                                        </span>
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="flex items-center gap-6 text-sm">
                                    <div className="flex items-center gap-2 text-muted-foreground">
                                        <Clock className="h-4 w-4" />
                                        <span>{format(event.date, "HH:mm", { locale: fr })}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-muted-foreground">
                                        <MapPin className="h-4 w-4" />
                                        <span>{event.location}</span>
                                    </div>
                                     <div className="flex items-center gap-2 text-muted-foreground">
                                        <Users className="h-4 w-4" />
                                        <span>{event.team}</span>
                                    </div>
                                </CardContent>
                            </Card>
                        ))
                    ) : (
                        <div className="text-center py-10 text-muted-foreground">
                            <p>Aucun événement prévu pour cette date.</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
      </div>
    </div>
  );
}
