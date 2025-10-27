
"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { AddEventForm } from "@/components/events/add-event-form";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ArrowLeft, Loader2, Info } from "lucide-react";
import { isPast } from "date-fns";

interface Event {
    id: string;
    type: any;
    category: string;
    date: Date;
    location?: string;
    teamHome?: string;
    teamAway?: string;
    scoreHome?: number;
    scoreAway?: number;
}

export default function EditEventPage({ params }: { params: { id: string } }) {
  const { id: eventId } = React.use(params);
  const router = useRouter();
  
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLocked, setIsLocked] = useState(false);
  const [scoreEntryOnly, setScoreEntryOnly] = useState(false);

   useEffect(() => {
    if (!eventId) return;

    const fetchEvent = async () => {
      setLoading(true);
      try {
        const docRef = doc(db, "events", eventId as string);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          const date = data.date?.toDate ? data.date.toDate() : new Date();
          
          const eventIsPast = isPast(date);
          const scoreExists = typeof data.scoreHome === 'number';
          const isMatch = data.type?.includes("Match") || data.type?.includes("Tournoi");

          if (eventIsPast && scoreExists) {
            setIsLocked(true);
          }
          if (eventIsPast && !scoreExists && isMatch) {
            setScoreEntryOnly(true);
          }
          
          setEvent({ 
              id: docSnap.id, 
              ...data,
              date: date
            } as Event);
        } else {
          console.log("No such document!");
          router.push("/dashboard/events");
        }
      } catch (error) {
        console.error("Error fetching event:", error);
        router.push("/dashboard/events");
      } finally {
        setLoading(false);
      }
    };

    fetchEvent();
  }, [eventId, router]);


  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
         <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-6 w-6" />
          <span className="sr-only">Retour</span>
        </Button>
        <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {scoreEntryOnly ? "Ajouter le score final" : "Modifier l'événement"}
            </h1>
            <p className="text-muted-foreground">
              {scoreEntryOnly ? "Enregistrez le résultat et les statistiques du match." : "Mettez à jour les informations de l'événement."}
            </p>
        </div>
      </div>
      <Card>
        <CardHeader>
            <CardTitle>Détails de l'événement</CardTitle>
            <CardDescription>
              {scoreEntryOnly ? "Seuls les champs de score sont modifiables." : "Modifiez les champs ci-dessous et enregistrez."}
            </CardDescription>
        </CardHeader>
        <CardContent>
            {loading ? (
                <div className="flex justify-center items-center py-20">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            ) : isLocked ? (
                 <Alert>
                    <Info className="h-4 w-4" />
                    <AlertTitle>Modification verrouillée</AlertTitle>
                    <AlertDescription>
                        Vous ne pouvez plus modifier cet événement car le score final a déjà été enregistré.
                    </AlertDescription>
                </Alert>
            ) : event ? (
                <AddEventForm event={event} scoreEntryOnly={scoreEntryOnly} />
            ) : (
                <p className="p-6">Événement non trouvé.</p>
            )}
        </CardContent>
      </Card>
    </div>
  );
}
