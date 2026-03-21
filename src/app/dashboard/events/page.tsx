
"use client";

import React from "react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { PlusCircle, Clock, MapPin, Users, Loader2, ArrowLeft, Pencil, MoreHorizontal, Trash2, FileText, CheckCircle2, Trophy } from "lucide-react";
import Link from "next/link";
import { format, isSameDay, isToday, compareAsc, isPast, addHours } from "date-fns";
import { fr } from "date-fns/locale";
import { collection, query, onSnapshot, doc, deleteDoc, where } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuthState } from "react-firebase-hooks/auth";
import { AddScoreForm } from "@/components/events/add-score-form";
import { Badge } from "@/components/ui/badge";

interface Event {
    id: string;
    type: string;
    category: string;
    status?: string;
    date: Date;
    location?: string;
    teamHome?: string;
    teamAway?: string;
    scoreHome?: number;
    scoreAway?: number;
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
  const [eventForScore, setEventForScore] = useState<Event | null>(null);

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
    const q = query(collection(db, "events"), where("userId", "==", user.uid));
    
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const eventsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        date: doc.data().date.toDate()
      } as Event));
      eventsData.sort((a, b) => compareAsc(a.date, b.date));
      setAllEvents(eventsData);
      setLoading(false);
    }, (error) => {
      console.error(error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, loadingUser]);

  useEffect(() => {
    if (date) {
      const filteredEvents = allEvents.filter((event) => isSameDay(event.date, date));
      setSelectedEvents(filteredEvents);
    } else {
      setSelectedEvents([]);
    }
  }, [date, allEvents]);
  
  const getEventTitle = (event: Event) => {
    const isMatch = event.type.includes("Match") || event.type.includes("Tournoi");
    if (isMatch) return `${event.teamHome} vs ${event.teamAway}`;
    return `${event.type} - ${event.category}`;
  };

  const getStatusBadge = (event: Event) => {
    const status = event.status || (event.scoreHome !== undefined ? "Terminé" : "Prévu");
    switch (status) {
        case 'Terminé': return <Badge variant="secondary" className="bg-green-100 text-green-800 border-green-200 gap-1"><CheckCircle2 className="h-3 w-3" /> Terminé</Badge>;
        case 'En cours': return <Badge className="bg-blue-100 text-blue-800 border-blue-200 animate-pulse">En cours</Badge>;
        case 'Annulé': return <Badge variant="destructive">Annulé</Badge>;
        default: return <Badge variant="outline" className="bg-slate-50 text-slate-600">Prévu</Badge>;
    }
  };

  const handleDeleteEvent = async () => {
    if (!eventToDelete) return;
    try {
      await deleteDoc(doc(db, "events", eventToDelete.id));
      toast({ title: "Événement supprimé" });
    } catch (error) {
      console.error(error);
    } finally {
        setEventToDelete(null);
    }
  };

  return (
    <>
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}><ArrowLeft className="h-6 w-6" /></Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Événements</h1>
            <p className="text-muted-foreground">Planifiez et visualisez les matchs et entraînements.</p>
          </div>
        </div>
        <Button asChild><Link href="/dashboard/events/add"><PlusCircle className="mr-2 h-4 w-4" /> Ajouter un événement</Link></Button>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardContent className="p-0 md:p-2">
            {isClient && <Calendar mode="single" selected={date} onSelect={setDate} className="w-full" locale={fr} initialFocus modifiers={{ hasEvent: allEvents.map(e => e.date) }} modifiersClassNames={{ hasEvent: 'has-event' }} />}
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
                    <div className="flex justify-center items-center py-10"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
                ) : date && selectedEvents.length > 0 ? (
                    selectedEvents.map(event => {
                        const isMatch = event.type.includes('Match') || event.type.includes('Tournoi');
                        const isFinished = event.status === 'Terminé' || event.scoreHome !== undefined;
                        
                        // Logic for duration based on competition type
                        const isKnockout = event.type.includes("Coupe") || event.type.includes("Tournoi");
                        const matchDuration = isKnockout ? 3 : 2; // 3h for cups/tournaments, 2h for others
                        const finishExpectedTime = addHours(event.date, matchDuration);
                        
                        // Show score action only after the match is expected to be finished
                        const canEnterScore = isMatch && !isFinished && isPast(finishExpectedTime);

                        return (
                          <Card key={event.id} className="bg-muted/30 group overflow-hidden border-l-4 border-l-primary">
                              <CardHeader className="pb-2">
                                  <div className="flex justify-between items-start">
                                      <CardDescription className="font-bold text-primary uppercase text-[10px] tracking-widest">{event.type}</CardDescription>
                                      {getStatusBadge(event)}
                                  </div>
                                  <CardTitle className="text-lg pt-1">{getEventTitle(event)}</CardTitle>
                                  {isFinished && isMatch && (
                                      <div className="bg-slate-900 text-white px-3 py-1 rounded w-fit text-xl font-black italic">
                                          {event.scoreHome} - {event.scoreAway}
                                      </div>
                                  )}
                              </CardHeader>
                              <CardContent className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6 text-xs font-semibold">
                                  <div className="flex items-center gap-2 text-muted-foreground"><Clock className="h-3.5 w-3.5" /><span>{format(event.date, "HH:mm")}</span></div>
                                  {event.location && <div className="flex items-center gap-2 text-muted-foreground"><MapPin className="h-3.5 w-3.5" /><span>{event.location}</span></div>}
                                  <div className="flex items-center gap-2 text-muted-foreground"><Users className="h-3.5 w-3.5" /><span>{event.category}</span></div>
                              </CardContent>
                              <CardFooter className="flex justify-end gap-2 bg-muted/20 py-2">
                                  <DropdownMenu>
                                  <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                      <DropdownMenuItem asChild><Link href={`/dashboard/events/${event.id}`}><FileText className="mr-2 h-4 w-4" /> Détails</Link></DropdownMenuItem>
                                      {!isFinished && <DropdownMenuItem asChild><Link href={`/dashboard/events/${event.id}/edit`}><Pencil className="mr-2 h-4 w-4" /> Modifier</Link></DropdownMenuItem>}
                                      {canEnterScore && (
                                          <DropdownMenuItem onSelect={() => setEventForScore(event)} className="text-primary font-black uppercase text-[10px] tracking-widest bg-primary/5">
                                              <Trophy className="mr-2 h-4 w-4" /> Saisir le score
                                          </DropdownMenuItem>
                                      )}
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem className="text-destructive" onSelect={() => setEventToDelete(event)}><Trash2 className="mr-2 h-4 w-4" /> Supprimer</DropdownMenuItem>
                                  </DropdownMenuContent>
                                  </DropdownMenu>
                              </CardFooter>
                          </Card>
                        )
                    })
                ) : (
                    <div className="text-center py-10 text-muted-foreground"><p>Aucun événement prévu.</p></div>
                )}
            </CardContent>
        </Card>
      </div>
    </div>
    <AlertDialog open={!!eventToDelete} onOpenChange={() => setEventToDelete(null)}>
        <AlertDialogContent>
            <AlertDialogHeader><AlertDialogTitle>Supprimer cet événement ?</AlertDialogTitle><AlertDialogDescription>Cette action est irréversible.</AlertDialogDescription></AlertDialogHeader>
            <AlertDialogFooter><AlertDialogCancel>Annuler</AlertDialogCancel><AlertDialogAction onClick={handleDeleteEvent} className="bg-destructive">Supprimer</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
    <Dialog open={!!eventForScore} onOpenChange={() => setEventForScore(null)}>
        <DialogContent className="max-w-2xl"><DialogHeader><DialogTitle>Résultat & Statistiques</DialogTitle><DialogDescription>Enregistrez le score et les buteurs du match.</DialogDescription></DialogHeader>
            {eventForScore && <AddScoreForm event={eventForScore} onFinished={() => setEventForScore(null)} />}
        </DialogContent>
    </Dialog>
    </>
  );
}
