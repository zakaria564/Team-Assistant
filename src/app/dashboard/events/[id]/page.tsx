
"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, ArrowLeft, Calendar as CalendarIcon, Clock, MapPin, Trophy, Users, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

export default function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: eventId } = React.use(params);
  const router = useRouter();
  const [event, setEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!eventId) return;
    const fetchEvent = async () => {
      setLoading(true);
      try {
        const snap = await getDoc(doc(db, "events", eventId));
        if (snap.exists()) {
            const data = snap.data();
            setEvent({ id: snap.id, ...data, date: data.date.toDate() });
        }
        else router.push('/dashboard/events');
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    fetchEvent();
  }, [eventId, router]);

  if (loading) return <div className="flex justify-center items-center h-full py-20"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
  if (!event) return null;

  const isMatch = event.type.includes("Match") || event.type.includes("Tournoi");
  const isFinished = event.status === 'Terminé' || event.scoreHome !== undefined;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}><ArrowLeft className="h-6 w-6" /></Button>
        <h1 className="text-3xl font-bold tracking-tight">Détails de l'événement</h1>
      </div>

      <div className="grid gap-6">
        <Card className="overflow-hidden border-t-8 border-primary">
            <CardHeader className="bg-muted/30 pb-8">
                <div className="flex justify-between items-center mb-4">
                    <Badge className="bg-primary/10 text-primary border-primary/20 uppercase tracking-widest text-[10px]">{event.type}</Badge>
                    {isFinished ? (
                        <Badge variant="secondary" className="bg-green-100 text-green-800 gap-1"><CheckCircle2 className="h-3 w-3" /> Terminé</Badge>
                    ) : (
                        <Badge variant="outline">{event.status || "Prévu"}</Badge>
                    )}
                </div>
                
                {isMatch ? (
                    <div className="flex flex-col items-center gap-6 py-4">
                        <div className="flex items-center justify-center gap-8 w-full">
                            <div className="flex flex-col items-center flex-1">
                                <div className="h-16 w-16 bg-slate-100 rounded-full flex items-center justify-center border-2 border-slate-200 mb-2">
                                    <Trophy className="h-8 w-8 text-slate-400" />
                                </div>
                                <span className="text-lg font-black uppercase text-center leading-tight">{event.teamHome}</span>
                            </div>
                            
                            <div className="flex flex-col items-center gap-2">
                                {isFinished ? (
                                    <div className="bg-slate-900 text-white text-5xl font-black px-6 py-3 rounded-xl shadow-xl italic tracking-tighter">
                                        {event.scoreHome} - {event.scoreAway}
                                    </div>
                                ) : (
                                    <div className="text-3xl font-black text-slate-300">VS</div>
                                )}
                                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Score Final</span>
                            </div>

                            <div className="flex flex-col items-center flex-1">
                                <div className="h-16 w-16 bg-slate-100 rounded-full flex items-center justify-center border-2 border-slate-200 mb-2">
                                    <Trophy className="h-8 w-8 text-slate-400" />
                                </div>
                                <span className="text-lg font-black uppercase text-center leading-tight">{event.teamAway}</span>
                            </div>
                        </div>
                    </div>
                ) : (
                    <CardTitle className="text-3xl font-black uppercase tracking-tighter text-center">{event.type}</CardTitle>
                )}
            </CardHeader>
            
            <CardContent className="grid sm:grid-cols-3 gap-6 pt-8">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-slate-100 rounded-lg"><CalendarIcon className="h-5 w-5 text-primary" /></div>
                    <div>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase">Date</p>
                        <p className="font-bold">{format(event.date, "dd MMMM yyyy", { locale: fr })}</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-slate-100 rounded-lg"><Clock className="h-5 w-5 text-primary" /></div>
                    <div>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase">Heure</p>
                        <p className="font-bold">{format(event.date, "HH:mm")}</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-slate-100 rounded-lg"><MapPin className="h-5 w-5 text-primary" /></div>
                    <div>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase">Lieu</p>
                        <p className="font-bold">{event.location || 'Non spécifié'}</p>
                    </div>
                </div>
            </CardContent>
        </Card>

        {isFinished && isMatch && event.scorers && event.scorers.length > 0 && (
            <Card>
                <CardHeader><CardTitle className="text-sm uppercase tracking-widest flex items-center gap-2"><Clock className="h-4 w-4" /> Timeline du Match</CardTitle></CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {event.scorers.sort((a: any, b: any) => (a.minute || 0) - (b.minute || 0)).map((scorer: any, idx: number) => (
                            <div key={idx} className="flex items-center gap-4 group">
                                <div className="w-10 text-right font-black text-primary italic">{scorer.minute}'</div>
                                <div className="h-2 w-2 rounded-full bg-primary" />
                                <div className="flex-1 flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-transparent group-hover:border-primary/20 transition-colors">
                                    <div className="flex flex-col">
                                        <span className="font-bold text-slate-800 uppercase text-sm">{scorer.playerName}</span>
                                        <span className="text-[10px] text-muted-foreground font-bold">BUT !</span>
                                    </div>
                                    <Trophy className="h-4 w-4 text-yellow-500" />
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        )}

        <Card>
            <CardHeader><CardTitle className="text-sm uppercase tracking-widest flex items-center gap-2"><Users className="h-4 w-4" /> Groupe Concerné</CardTitle></CardHeader>
            <CardContent>
                <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-base py-1 px-4">{event.category}</Badge>
                </div>
            </CardContent>
        </Card>
      </div>
    </div>
  );
}
