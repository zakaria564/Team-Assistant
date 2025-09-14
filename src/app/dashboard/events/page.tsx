
"use client";

import React from "react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { PlusCircle, Clock, MapPin, Users, Loader2, ArrowLeft, Pencil, MoreHorizontal, Trash2, FileText } from "lucide-react";
import Link from "next/link";
import { format, isSameDay, differenceInHours, isToday } from "date-fns";
import { fr } from "date-fns/locale";
import { collection, query, onSnapshot, doc, deleteDoc, where, orderBy } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { 
  DropdownMenu, 
  DropdownMenuTrigger, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAuthState } from "react-firebase-hooks/auth";

interface Event {
    id: string;
    type: string;
    team: string;
    category: string;
    opponent?: string;
    date: Date;
    location: string;
}

export default function EventsPage() {
  const [user, loadingUser] = useAuthState(auth);
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [allEvents, setAllEvents] = useState<Event[]>([]);
  const [selectedEvents, setSelectedEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const [isClient, setIsClient] = useState(false);
  const router = useRouter();
  const [eventToDelete, setEventToDelete] = useState<Event | null>(null);

  useEffect(() => {
    setIsClient(true);
    setDate(new Date());
  }, []);

  useEffect(() => {
    if (!user) {
        if (!loadingUser) setLoading(false);
        return;
    }
    setLoading(true);
    const q = query(
        collection(db, "events"), 
        where("userId", "==", user.uid),
        orderBy("date", "asc")
    );
    
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const eventsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        date: doc.data().date.toDate()
      } as Event));
      
      setAllEvents(eventsData);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching events:", error);
      toast({
        variant: "destructive",
        title: "Erreur de chargement",
        description: "Impossible de charger les événements. Vérifiez les index Firestore.",
      });
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, loadingUser, toast]);

  useEffect(() => {
    if (date) {
      const filteredEvents = allEvents
        .filter((event) => isSameDay(event.date, date));
        // No need to sort here as they are already sorted by the query
      setSelectedEvents(filteredEvents);
    } else {
      setSelectedEvents([]);
    }
  }, [date, allEvents]);
  
  const eventDays = allEvents.map(event => event.date);
  
  const modifiers = {
    hasEvent: eventDays,
  };

  const modifiersClassNames = {
    hasEvent: 'has-event',
  };

  const getEventTitle = (event: Event) => {
    const teamName = event.team.replace(/^Club\s/i, '');
    if (event.type.includes("Match") || event.type.includes("Tournoi")) {
      return `${teamName} vs ${event.opponent}`;
    }
    return `${event.type} ${teamName}`;
  };

  const getEventBadgeClass = (type: string) => {
    if (type.includes("Match")) return 'bg-primary/20 text-primary';
    if (type === "Entraînement") return 'bg-accent/20 text-accent-foreground';
    if (type === "Tournoi") return 'bg-purple-100 text-purple-800';
    if (type === "Stage") return 'bg-blue-100 text-blue-800';
    if (type === "Réunion") return 'bg-yellow-100 text-yellow-800';
    return 'bg-gray-100 text-gray-800';
  };

  const handleDeleteEvent = async () => {
    if (!eventToDelete) return;
    try {
      await deleteDoc(doc(db, "events", eventToDelete.id));
      toast({
        title: "Événement supprimé",
        description: `L'événement a été retiré du calendrier.`,
      });
    } catch (error) {
       toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de supprimer l'événement.",
      });
      console.error("Error deleting event: ", error);
    } finally {
        setEventToDelete(null);
    }
  };


  return (
    <>
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-6 w-6" />
            <span className="sr-only">Retour</span>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Événements</h1>
            <p className="text-muted-foreground">
              Planifiez et visualisez les matchs et entraînements.
            </p>
          </div>
        </div>
        <Button asChild className="w-full md:w-auto">
          <Link href="/dashboard/events/add">
            <PlusCircle className="mr-2 h-4 w-4" />
            Ajouter un événement
          </Link>
        </Button>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardContent className="p-0 md:p-2">
            {isClient ? (
                <Calendar
                    key={allEvents.length} // Force re-render when events change for modifiers
                    mode="single"
                    selected={date}
                    onSelect={setDate}
                    className="w-full"
                    locale={fr}
                    disabled={(d) => d < new Date("1900-01-01")}
                    initialFocus
                    modifiers={modifiers}
                    modifiersClassNames={modifiersClassNames}
                />
            ) : (
                <div className="p-3">
                    <div className="flex justify-between items-center mb-4">
                        <Skeleton className="h-8 w-24" />
                        <Skeleton className="h-8 w-24" />
                    </div>
                    <div className="space-y-2">
                        <div className="grid grid-cols-7 gap-2">
                            {[...Array(7)].map((_, i) => <Skeleton key={i} className="h-9 w-9" />)}
                        </div>
                         <div className="grid grid-cols-7 gap-2">
                            {[...Array(35)].map((_, i) => <Skeleton key={i} className="h-9 w-9 rounded-full" />)}
                        </div>
                    </div>
                </div>
            )}
          </CardContent>
        </Card>
        
        <Card>
            <CardHeader>
                <CardTitle className="text-2xl font-bold">
                    {date ? (isToday(date) ? "Événements d'aujourd'hui" : format(date, "d MMMM yyyy", { locale: fr })) : "Sélectionnez une date"}
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {loading || loadingUser ? (
                    <div className="flex justify-center items-center py-10">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                ) : date && selectedEvents.length > 0 ? (
                    selectedEvents.map(event => {
                        const isPast24h = differenceInHours(new Date(), event.date) > 24;
                        return (
                          <Card key={event.id} className="bg-muted/30 group">
                              <CardHeader>
                                  <CardDescription className={cn(`font-medium`, getEventBadgeClass(event.type))}>{event.type}</CardDescription>
                                  <CardTitle className="text-lg pt-1">
                                      {getEventTitle(event)}
                                  </CardTitle>
                              </CardHeader>
                              <CardContent className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6 text-sm">
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
                                      <span>{event.category}</span>
                                  </div>
                              </CardContent>
                              <CardFooter className="flex justify-end">
                                  <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" className="h-8 w-8 p-0">
                                      <span className="sr-only">Ouvrir le menu</span>
                                      <MoreHorizontal className="h-4 w-4" />
                                      </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                      <DropdownMenuItem asChild className="cursor-pointer">
                                          <Link href={`/dashboard/events/${event.id}`}>
                                              <FileText className="mr-2 h-4 w-4" />
                                              Voir les détails
                                          </Link>
                                      </DropdownMenuItem>
                                      <DropdownMenuItem asChild disabled={isPast24h} className="cursor-pointer">
                                        <Link href={`/dashboard/events/${event.id}/edit`}>
                                          <Pencil className="mr-2 h-4 w-4" />
                                          Modifier
                                        </Link>
                                      </DropdownMenuItem>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem
                                          className="cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10"
                                          onSelect={(e) => { e.preventDefault(); setEventToDelete(event); }}
                                        >
                                          <Trash2 className="mr-2 h-4 w-4" />
                                          Supprimer
                                      </DropdownMenuItem>
                                  </DropdownMenuContent>
                                  </DropdownMenu>
                              </CardFooter>
                          </Card>
                        )
                    })
                ) : (
                    <div className="text-center py-10 text-muted-foreground">
                        <p>{date && isToday(date) ? "Aucun événement prévu pour aujourd'hui." : "Aucun événement prévu pour cette date."}</p>
                    </div>
                )}
            </CardContent>
        </Card>
      </div>
    </div>
     <AlertDialog open={!!eventToDelete} onOpenChange={(isOpen) => !isOpen && setEventToDelete(null)}>
        <AlertDialogContent>
        <AlertDialogHeader>
            <AlertDialogTitle>Êtes-vous sûr de vouloir supprimer cet événement ?</AlertDialogTitle>
            <AlertDialogDescription>
            Cette action est irréversible. L'événement sera définitivement supprimé.
            </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteEvent} className="bg-destructive hover:bg-destructive/90">
            Supprimer
            </AlertDialogAction>
        </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
    </>
  );
}

    