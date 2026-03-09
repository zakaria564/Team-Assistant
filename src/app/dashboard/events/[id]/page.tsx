"use client";

import React, { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, ArrowLeft, Calendar as CalendarIcon, Clock, MapPin, Trophy } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export default function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const eventId = resolvedParams.id;
  const router = useRouter();
  const [event, setEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!eventId) return;
    const fetchEvent = async () => {
      setLoading(true);
      try {
        const snap = await getDoc(doc(db, "events", eventId));
        if (snap.exists()) setEvent({ id: snap.id, ...snap.data(), date: snap.data().date.toDate() });
        else router.push('/dashboard/events');
      } catch (e) { 
        console.error(e); 
      } finally { 
        setLoading(false); 
      }
    };
    fetchEvent();
  }, [eventId, router]);

  if (loading) return <div className="flex justify-center items-center h-full"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
  if (!event) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}><ArrowLeft className="h-6 w-6" /></Button>
        <h1 className="text-3xl font-bold tracking-tight">Détails de l'événement</h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Trophy /> {event.type}</CardTitle>
          <CardDescription>{event.teamHome ? `${event.teamHome} vs ${event.teamAway}` : event.category}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid md:grid-cols-3 gap-6">
            <div className="flex items-center gap-3"><CalendarIcon className="text-muted-foreground" /> <span>{format(event.date, "dd MMMM yyyy", { locale: fr })}</span></div>
            <div className="flex items-center gap-3"><Clock className="text-muted-foreground" /> <span>{format(event.date, "HH:mm")}</span></div>
            <div className="flex items-center gap-3"><MapPin className="text-muted-foreground" /> <span>{event.location || 'Lieu non spécifié'}</span></div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
