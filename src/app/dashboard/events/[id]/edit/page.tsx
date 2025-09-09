
"use client";

import React from "react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { AddEventForm } from "@/components/events/add-event-form";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { ArrowLeft, Loader2 } from "lucide-react";

interface Event {
    id: string;
    type: any;
    team: string;
    category: string;
    opponent?: string;
    date: Date;
    location: string;
    scoreTeam?: number;
    scoreOpponent?: number;
}

export default function EditEventPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const eventId = params.id;
  
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);

   useEffect(() => {
    if (!eventId) return;

    const fetchEvent = async () => {
      setLoading(true);
      try {
        const docRef = doc(db, "events", eventId as string);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          // Ensure Firestore Timestamp is converted to JS Date
          const date = data.date?.toDate ? data.date.toDate() : new Date();
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
            <h1 className="text-3xl font-bold tracking-tight">Modifier l'événement</h1>
            <p className="text-muted-foreground">
              Mettez à jour les informations de l'événement.
            </p>
        </div>
      </div>
      <Card>
        <CardHeader>
            <CardTitle>Détails de l'événement</CardTitle>
            <CardDescription>Modifiez les champs ci-dessous et enregistrez.</CardDescription>
        </CardHeader>
        <CardContent>
            {loading ? (
                <div className="flex justify-center items-center py-20">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            ) : event ? (
                <AddEventForm event={event} />
            ) : (
                <p className="p-6">Événement non trouvé.</p>
            )}
        </CardContent>
      </Card>
    </div>
  );
}
