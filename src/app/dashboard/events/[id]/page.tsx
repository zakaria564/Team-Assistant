
"use client";

import React from "react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, ArrowLeft, Calendar, Clock, MapPin, Users, Trophy, Goal, Footprints } from "lucide-react";
import { format, isPast } from "date-fns";
import { fr } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";


interface Event {
  id: string;
  type: string;
  team: string;
  category: string;
  opponent?: string;
  date: Date;
  location: string;
  scoreTeam?: number;
  scoreOpponent?: number;
  scorers?: { playerId: string, playerName: string, goals: number }[];
  assisters?: { playerId: string, playerName: string, assists: number }[];
}

const DetailItem = ({ icon: Icon, label, value, children }: { icon: React.ElementType, label: string, value?: string | number, children?: React.ReactNode }) => (
  <div className="flex items-start gap-4">
    <Icon className="h-6 w-6 text-muted-foreground mt-1" />
    <div>
      <p className="text-sm text-muted-foreground">{label}</p>
      <div className="text-base font-medium">{value || children || "Non spécifié"}</div>
    </div>
  </div>
);

const getResultBadgeClass = (scoreTeam?: number, scoreOpponent?: number) => {
    if (typeof scoreTeam !== 'number' || typeof scoreOpponent !== 'number') {
      return "bg-gray-100 text-gray-800 border-gray-300";
    }
    if (scoreTeam > scoreOpponent) return "bg-green-100 text-green-800 border-green-300";
    if (scoreTeam < scoreOpponent) return "bg-red-100 text-red-800 border-red-300";
    return "bg-yellow-100 text-yellow-800 border-yellow-300";
};
  
const getResultLabel = (scoreTeam?: number, scoreOpponent?: number) => {
    if (typeof scoreTeam !== 'number' || typeof scoreOpponent !== 'number') {
        return "En attente";
    }
    if (scoreTeam > scoreOpponent) return "Victoire";
    if (scoreTeam < scoreOpponent) return "Défaite";
    return "Match Nul";
};


export default function EventDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { id: eventId } = React.use(params);
  
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!eventId) return;

    const fetchEvent = async () => {
      setLoading(true);
      try {
        const eventRef = doc(db, "events", eventId as string);
        const eventSnap = await getDoc(eventRef);

        if (eventSnap.exists()) {
           const data = eventSnap.data();
           const date = data.date?.toDate ? data.date.toDate() : new Date();
           setEvent({ 
              id: eventSnap.id, 
              ...data,
              date: date
            } as Event);
        } else {
          console.log("No such event document!");
          router.push('/dashboard/events');
        }
      } catch (error) {
        console.error("Error fetching event details:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchEvent();
  }, [eventId, router]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="text-center">
        <p>Événement non trouvé.</p>
        <Button onClick={() => router.push("/dashboard/events")} className="mt-4">Retour à la liste</Button>
      </div>
    );
  }
  
  const eventTypeIsMatch = event.type.includes("Match") || event.type.includes("Tournoi");
  const isPastEvent = isPast(event.date);
  const showScoreAndStats = eventTypeIsMatch && isPastEvent;
  const clubName = event.team.split(' - ')[0].replace(/^Club\s/i, '');


  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.back()}>
              <ArrowLeft className="h-6 w-6" />
              <span className="sr-only">Retour</span>
            </Button>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Détails de l'événement</h1>
              <p className="text-muted-foreground">
                  Consultez les informations de l'événement.
              </p>
            </div>
        </div>
      </div>
      
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-3 text-2xl">
                    <Trophy />
                    <span>
                      {eventTypeIsMatch ? `${clubName} (${event.category}) vs ${event.opponent}` : `${event.type} - ${clubName} (${event.category})`}
                    </span>
                </CardTitle>
                <CardDescription>
                   {event.type}
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <DetailItem icon={Calendar} label="Date" value={format(event.date, "eeee d MMMM yyyy", { locale: fr })} />
                  <DetailItem icon={Clock} label="Heure" value={format(event.date, "HH:mm", { locale: fr })} />
                  <DetailItem icon={MapPin} label="Lieu" value={event.location} />
                  <DetailItem icon={Users} label="Club" value={clubName} />
                  <DetailItem icon={Users} label="Catégorie" value={event.category} />
                  {eventTypeIsMatch && <DetailItem icon={Users} label="Adversaire" value={event.opponent} />}
               </div>
            </CardContent>
        </Card>

        {showScoreAndStats && (
            <Card>
                <CardHeader>
                    <CardTitle>Résultat Final</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center justify-between gap-6">
                        <div className="text-center">
                            <p className="text-sm text-muted-foreground">{clubName}</p>
                            <p className="text-4xl font-bold">{event.scoreTeam ?? '-'}</p>
                        </div>
                         <div className="text-2xl font-bold text-muted-foreground">vs</div>
                        <div className="text-center">
                            <p className="text-sm text-muted-foreground">{event.opponent}</p>
                            <p className="text-4xl font-bold">{event.scoreOpponent ?? '-'}</p>
                        </div>
                        <Badge className={cn("ml-auto text-base", getResultBadgeClass(event.scoreTeam, event.scoreOpponent))}>
                          {getResultLabel(event.scoreTeam, event.scoreOpponent)}
                        </Badge>
                    </div>
                </CardContent>
            </Card>
        )}
        
        {showScoreAndStats && ((event.scorers && event.scorers.length > 0) || (event.assisters && event.assisters.length > 0)) && (
            <Card>
                <CardHeader>
                    <CardTitle>Statistiques du Match</CardTitle>
                </CardHeader>
                <CardContent className="grid md:grid-cols-2 gap-6">
                    {event.scorers && event.scorers.length > 0 && (
                        <div className="space-y-3">
                            <h4 className="font-semibold flex items-center gap-2"><Goal className="h-5 w-5" />Buteurs</h4>
                            <ul className="list-disc pl-5 text-sm space-y-1">
                                {event.scorers.map((scorer, index) => (
                                    <li key={index}>{scorer.playerName} ({scorer.goals} but{scorer.goals > 1 ? 's' : ''})</li>
                                ))}
                            </ul>
                        </div>
                    )}
                     {event.assisters && event.assisters.length > 0 && (
                        <div className="space-y-3">
                            <h4 className="font-semibold flex items-center gap-2"><Footprints className="h-5 w-5" />Passeurs</h4>
                             <ul className="list-disc pl-5 text-sm space-y-1">
                                {event.assisters.map((assister, index) => (
                                    <li key={index}>{assister.playerName} ({assister.assists} passe{assister.assists > 1 ? 's' : ''})</li>
                                ))}
                            </ul>
                        </div>
                    )}
                </CardContent>
            </Card>
        )}
    </div>
  );
}
