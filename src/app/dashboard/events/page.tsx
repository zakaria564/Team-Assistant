
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { PlusCircle, Clock, MapPin, Users, Loader2 } from "lucide-react";
import Link from "next/link";
import { format, isSameDay } from "date-fns";
import { fr } from "date-fns/locale";
import { collection, getDocs, query, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";

interface Event {
    id: string;
    type: "Match" | "Entraînement";
    team: string;
    opponent?: string;
    date: Date;
    location: string;
}

export default function EventsPage() {
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [allEvents, setAllEvents] = useState<Event[]>([]);
  const [selectedEvents, setSelectedEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const [calendarKey, setCalendarKey] = useState(0);

  useEffect(() => {
    // Set initial date to today on client-side to avoid hydration errors
    if(!date) {
        setDate(new Date());
    }
  }, [date]);

  useEffect(() => {
    setLoading(true);
    const q = query(collection(db, "events"), orderBy("date", "asc"));
    
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const eventsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        date: doc.data().date.toDate()
      } as Event));
      setAllEvents(eventsData);
      setCalendarKey(prevKey => prevKey + 1); // Force re-render of calendar
      setLoading(false);
    }, (error) => {
      console.error("Error fetching events:", error);
      toast({
        variant: "destructive",
        title: "Erreur de chargement",
        description: "Impossible de charger les événements depuis la base de données.",
      });
      setLoading(false);
    });

    return () => unsubscribe();
  }, [toast]);

  useEffect(() => {
    if (date) {
      const filteredEvents = allEvents
        .filter((event) => isSameDay(event.date, date))
        .sort((a, b) => a.date.getTime() - b.date.getTime());
      setSelectedEvents(filteredEvents);
    } else {
      setSelectedEvents([]);
    }
  }, [date, allEvents]);

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

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardContent className="p-2">
            <Calendar
              key={calendarKey}
              mode="single"
              selected={date}
              onSelect={setDate}
              className="w-full"
              locale={fr}
              disabled={(d) => d < new Date("1900-01-01")}
              initialFocus
            />
          </CardContent>
        </Card>
        
        <Card>
            <CardHeader>
                <CardTitle className="text-2xl font-bold">
                    {date ? format(date, "d MMMM yyyy", { locale: fr }) : "Sélectionnez une date"}
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {loading ? (
                    <div className="flex justify-center items-center py-10">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                ) : date && selectedEvents.length > 0 ? (
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
  );
}
