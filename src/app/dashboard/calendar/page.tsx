
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { PlusCircle, Clock, MapPin, Users, Calendar as CalendarIcon } from "lucide-react";
import Link from "next/link";
import { Calendar } from "@/components/ui/calendar";
import { format, parse } from "date-fns";
import { fr } from "date-fns/locale";

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

const parseDate = (dateStr: string) => {
    return parse(dateStr.split(' - ')[0], "dd/MM/yyyy", new Date());
};

const formatTime = (dateStr: string) => {
    return dateStr.split(' - ')[1];
};

export default function EventsPage() {
    const [date, setDate] = useState<Date | undefined>(undefined);

    useEffect(() => {
        setDate(new Date());
    }, []);

    const selectedDateStr = date ? format(date, "dd/MM/yyyy") : "";

    const filteredMatches = date ? matches.filter(match => match.date.startsWith(selectedDateStr)) : [];
    const filteredEvents = date ? events.filter(event => event.date.startsWith(selectedDateStr)) : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
            <h1 className="text-3xl font-bold tracking-tight">Événements</h1>
            <p className="text-muted-foreground">Planifiez et consultez les matchs et événements de votre club.</p>
        </div>
        <Button asChild>
          <Link href="/dashboard/events/add">
            <PlusCircle className="mr-2 h-4 w-4" />
            Ajouter un événement
          </Link>
        </Button>
      </div>
      
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="lg:col-span-1">
             <Calendar
                mode="single"
                selected={date}
                onSelect={setDate}
                className="p-3"
                locale={fr}
                modifiers={{ 
                    hasEvent: [...matches, ...events].map(e => parseDate(e.date))
                }}
                modifiersStyles={{
                    hasEvent: { 
                        position: 'relative',
                        fontWeight: 'bold',
                        color: 'hsl(var(--primary))'
                    }
                }}
            />
        </Card>

        <Card className="lg:col-span-3">
            <CardHeader>
                <CardTitle>
                    Agenda du {date ? format(date, "d MMMM yyyy", { locale: fr }) : 'jour'}
                </CardTitle>
                 <CardDescription>
                    {!date ? "Sélectionnez une date pour voir les événements." :
                     filteredMatches.length + filteredEvents.length > 0
                        ? `Vous avez ${filteredMatches.length + filteredEvents.length} événement(s) aujourd'hui.`
                        : "Aucun événement prévu pour cette date."}
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {!date || (filteredMatches.length === 0 && filteredEvents.length === 0) ? (
                    <div className="text-center text-muted-foreground py-10">
                        <CalendarIcon className="mx-auto h-12 w-12 text-gray-400" />
                        <p className="mt-4">Sélectionnez un jour pour voir les événements.</p>
                    </div>
                ) : (
                    <>
                        {filteredMatches.map((match, index) => (
                            <Card key={`match-${index}`} className="bg-muted/30">
                                <CardHeader>
                                    <CardTitle className="text-lg">{match.opponent}</CardTitle>
                                    <CardDescription>{match.team}</CardDescription>
                                </CardHeader>
                                <CardContent className="flex items-center gap-6 text-sm">
                                    <div className="flex items-center gap-2">
                                        <Clock className="h-4 w-4 text-muted-foreground" />
                                        <span>{formatTime(match.date)}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <MapPin className="h-4 w-4 text-muted-foreground" />
                                        <span>{match.location}</span>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                         {filteredEvents.map((event, index) => (
                            <Card key={`event-${index}`} className="border-l-4 border-primary">
                                 <CardHeader>
                                    <CardTitle className="text-lg">{event.name}</CardTitle>
                                </CardHeader>
                                <CardContent className="flex items-center gap-6 text-sm">
                                    <div className="flex items-center gap-2">
                                        <Clock className="h-4 w-4 text-muted-foreground" />
                                        <span>{formatTime(event.date)}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <MapPin className="h-4 w-4 text-muted-foreground" />
                                        <span>{event.location}</span>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </>
                )}
            </CardContent>
        </Card>
      </div>

    </div>
  );
}
