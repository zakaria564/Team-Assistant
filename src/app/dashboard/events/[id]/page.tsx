
"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, ArrowLeft, Calendar, Clock, MapPin, Users, Trophy, Goal, Footprints } from "lucide-react";
import { format, isPast } from "date-fns";
import { fr } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useAuthState } from "react-firebase-hooks/auth";

interface Event {
  id: string;
  type: string;
  category: string;
  date: Date;
  location?: string;
  teamHome?: string;
  teamAway?: string;
  scoreHome?: number;
  scoreAway?: number;
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

const getResultStyles = (scoreHome?: number, scoreAway?: number, clubName?: string, homeTeam?: string, awayTeam?: string) => {
    if (typeof scoreHome !== 'number' || typeof scoreAway !== 'number' || !clubName || !homeTeam || !awayTeam) {
        return { label: "En attente", className: "bg-gray-100 text-gray-800 border-gray-300" };
    }

    if (scoreHome === scoreAway) {
        return { label: "Match Nul", className: "bg-yellow-100 text-yellow-800 border-yellow-300" };
    }
    
    const isUserClubInvolved = clubName === homeTeam || clubName === awayTeam;
    
    if (!isUserClubInvolved) {
        return { label: "Terminé", className: "bg-gray-100 text-gray-800 border-gray-300" };
    }

    let won;
    if (clubName === homeTeam) {
        won = scoreHome > scoreAway;
    } else { // clubName is awayTeam
        won = scoreAway > scoreHome;
    }

    if (won) {
        return { label: "Victoire", className: "bg-green-100 text-green-800 border-green-300" };
    } else {
        return { label: "Défaite", className: "bg-red-100 text-red-800 border-red-300" };
    }
};

export default function EventDetailPage() {
  const params = useParams();
  const eventId = params.id as string;
  const router = useRouter();
  const [user, loadingUser] = useAuthState(auth);
  
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [clubName, setClubName] = useState("Votre Club");

  useEffect(() => {
    if (!eventId) return;

    const fetchEventAndClub = async () => {
      if (!user && !loadingUser) {
        setLoading(false);
        return;
      }
      if(!user) return;

      setLoading(true);
      try {
        const eventRef = doc(db, "events", eventId);
        const clubRef = doc(db, "clubs", user.uid);
        
        const [eventSnap, clubSnap] = await Promise.all([getDoc(eventRef), getDoc(clubRef)]);

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

        if (clubSnap.exists() && clubSnap.data().clubName) {
            setClubName(clubSnap.data().clubName);
        }

      } catch (error) {
        console.error("Error fetching event details:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchEventAndClub();
  }, [eventId, user, loadingUser, router]);

  if (loading || loadingUser) {
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
  const showScoreAndStats = eventTypeIsMatch && (typeof event.scoreHome === 'number');
  const eventTitle = eventTypeIsMatch ? `${event.teamHome} vs ${event.teamAway}` : `${event.type} - ${event.category}`;
  
  const resultStyles = getResultStyles(event.scoreHome, event.scoreAway, clubName, event.teamHome, event.teamAway);


  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.back()}>
              <ArrowLeft className="h-6 w-6" />
              <span className="sr-only">Retour</span>
            </Button>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                {eventTypeIsMatch ? "Détails du match" : "Détails de l'événement"}
              </h1>
              <p className="text-muted-foreground">
                  {eventTypeIsMatch ? "Consultez les informations du match." : "Consultez les informations de l'événement."}
              </p>
            </div>
        </div>
      </div>
      
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-3 text-2xl">
                    <Trophy />
                    <span>{eventTitle}</span>
                </CardTitle>
                <CardDescription>
                   {event.type}
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <DetailItem icon={Calendar} label="Date" value={format(event.date, "eeee d MMMM yyyy", { locale: fr })} />
                  <DetailItem icon={Clock} label="Heure" value={format(event.date, "HH:mm", { locale: fr })} />
                  <DetailItem icon={Users} label="Catégorie" value={event.category} />
                   {event.location && (
                     <DetailItem icon={MapPin} label="Lieu" value={event.location} />
                   )}
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
                            <p className="text-sm text-muted-foreground">{event.teamHome}</p>
                            <p className="text-4xl font-bold">{event.scoreHome ?? '-'}</p>
                        </div>
                         <div className="text-2xl font-bold text-muted-foreground">vs</div>
                        <div className="text-center">
                            <p className="text-sm text-muted-foreground">{event.teamAway}</p>
                            <p className="text-4xl font-bold">{event.scoreAway ?? '-'}</p>
                        </div>
                        <Badge className={cn("ml-auto text-base", resultStyles.className)}>
                           {resultStyles.label}
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
                    {event.scorers && event.scorers.length > 0 ? (
                        <div className="space-y-3">
                            <h4 className="font-semibold flex items-center gap-2"><Goal className="h-5 w-5" />Buteurs</h4>
                            <ul className="list-disc pl-5 text-sm space-y-1">
                                {event.scorers.map((scorer, index) => (
                                    <li key={index}>{scorer.playerName} ({scorer.goals} but{scorer.goals > 1 ? 's' : ''})</li>
                                ))}
                            </ul>
                        </div>
                    ) : (<div></div>)}
                     {event.assisters && event.assisters.length > 0 ? (
                        <div className="space-y-3">
                            <h4 className="font-semibold flex items-center gap-2"><Footprints className="h-5 w-5" />Passeurs</h4>
                             <ul className="list-disc pl-5 text-sm space-y-1">
                                {event.assisters.map((assister, index) => (
                                    <li key={index}>{assister.playerName} ({assister.assists} passe{assister.assists > 1 ? 's' : ''})</li>
                                ))}
                            </ul>
                        </div>
                    ): (<div></div>)}
                </CardContent>
            </Card>
        )}
    </div>
  );
}
