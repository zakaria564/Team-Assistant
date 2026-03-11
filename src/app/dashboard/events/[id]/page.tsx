
"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, ArrowLeft, Calendar as CalendarIcon, Clock, MapPin, Trophy, Users, CheckCircle2, UserPlus, Pencil } from "lucide-react";
import { format, isPast } from "date-fns";
import { fr } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AddScoreForm } from "@/components/events/add-score-form";

export default function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: eventId } = React.use(params);
  const router = useRouter();
  const [event, setEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isScoreDialogOpen, setIsScoreDialogOpen] = useState(false);

  const fetchEvent = useCallback(async () => {
    if (!eventId) return;
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
  }, [eventId, router]);

  useEffect(() => {
    fetchEvent();
  }, [fetchEvent]);

  if (loading) return <div className="flex justify-center items-center h-full py-20"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
  if (!event) return null;

  const isMatch = event.type.includes("Match") || event.type.includes("Tournoi");
  const isFinished = event.status === 'Terminé' || event.scoreHome !== undefined;
  const isMatchPast = isPast(event.date);

  // Combine scorers and assisters for timeline
  const timelineEvents = [
      ...(event.scorers || []).map((s: any) => ({ ...s, type: 'goal' })),
      ...(event.assisters || []).map((a: any) => ({ ...a, type: 'assist' }))
  ].sort((a, b) => (a.minute || 0) - (b.minute || 0));

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}><ArrowLeft className="h-6 w-6" /></Button>
          <h1 className="text-3xl font-bold tracking-tight">Feuille de Match</h1>
        </div>
        {!isFinished && isMatch && isMatchPast && (
            <Button onClick={() => setIsScoreDialogOpen(true)} className="font-black uppercase gap-2">
                <Pencil className="h-4 w-4" /> Saisir le résultat
            </Button>
        )}
      </div>

      <div className="grid gap-6">
        <Card className="overflow-hidden border-t-8 border-primary shadow-xl">
            <CardHeader className="bg-muted/30 pb-10">
                <div className="flex justify-between items-center mb-6">
                    <Badge className="bg-primary text-white border-none uppercase tracking-widest text-[10px] font-black px-3 py-1">{event.type}</Badge>
                    {isFinished ? (
                        <Badge variant="secondary" className="bg-green-100 text-green-800 gap-1 font-black"><CheckCircle2 className="h-3 w-3" /> TERMINÉ</Badge>
                    ) : (
                        <Badge variant="outline" className="font-bold">{event.status || "PRÉVU"}</Badge>
                    )}
                </div>
                
                {isMatch ? (
                    <div className="flex flex-col items-center gap-8 py-4">
                        <div className="flex items-center justify-center gap-10 w-full">
                            <div className="flex flex-col items-center flex-1 space-y-3">
                                <div className="h-20 w-20 bg-white shadow-md rounded-full flex items-center justify-center border-4 border-slate-100">
                                    <Trophy className="h-10 w-10 text-slate-300" />
                                </div>
                                <span className="text-xl font-black uppercase text-center leading-tight tracking-tighter">{event.teamHome}</span>
                            </div>
                            
                            <div className="flex flex-col items-center gap-3">
                                {isFinished ? (
                                    <div className="bg-slate-900 text-white text-6xl font-black px-8 py-4 rounded-2xl shadow-2xl italic tracking-tighter border-b-4 border-primary">
                                        {event.scoreHome} - {event.scoreAway}
                                    </div>
                                ) : (
                                    <div className="text-4xl font-black text-slate-300 italic">VS</div>
                                )}
                                <span className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em]">Score Officiel</span>
                            </div>

                            <div className="flex flex-col items-center flex-1 space-y-3">
                                <div className="h-20 w-20 bg-white shadow-md rounded-full flex items-center justify-center border-4 border-slate-100">
                                    <Trophy className="h-10 w-10 text-slate-300" />
                                </div>
                                <span className="text-xl font-black uppercase text-center leading-tight tracking-tighter">{event.teamAway}</span>
                            </div>
                        </div>
                    </div>
                ) : (
                    <CardTitle className="text-4xl font-black uppercase tracking-tighter text-center py-6">{event.type}</CardTitle>
                )}
            </CardHeader>
            
            <CardContent className="grid sm:grid-cols-3 gap-8 pt-10 border-t">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-primary/10 rounded-xl"><CalendarIcon className="h-6 w-6 text-primary" /></div>
                    <div>
                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Date</p>
                        <p className="font-bold text-lg">{format(event.date, "dd MMMM yyyy", { locale: fr })}</p>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-primary/10 rounded-xl"><Clock className="h-6 w-6 text-primary" /></div>
                    <div>
                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Coup d'envoi</p>
                        <p className="font-bold text-lg">{format(event.date, "HH:mm")}</p>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-primary/10 rounded-xl"><MapPin className="h-6 w-6 text-primary" /></div>
                    <div>
                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Lieu</p>
                        <p className="font-bold text-lg">{event.location || 'Non spécifié'}</p>
                    </div>
                </div>
            </CardContent>
        </Card>

        {!isFinished && isMatch && isMatchPast && (
            <Button 
                variant="default" 
                size="lg" 
                onClick={() => setIsScoreDialogOpen(true)}
                className="w-full h-16 bg-primary text-white font-black text-xl uppercase tracking-widest shadow-lg hover:scale-[1.02] transition-transform"
            >
                <Pencil className="mr-3 h-6 w-6" /> Saisir le résultat final
            </Button>
        )}

        {isFinished && isMatch && timelineEvents.length > 0 && (
            <Card className="shadow-lg">
                <CardHeader className="border-b"><CardTitle className="text-xs font-black uppercase tracking-[0.2em] flex items-center gap-3"><Clock className="h-4 w-4 text-primary" /> Chronologie des Actions</CardTitle></CardHeader>
                <CardContent className="pt-8">
                    <div className="space-y-6 max-w-lg mx-auto">
                        {timelineEvents.map((item: any, idx: number) => (
                            <div key={idx} className="flex items-center gap-6 group">
                                <div className="w-12 text-right font-black text-primary text-xl italic tracking-tighter">{item.minute ? `${item.minute}'` : "--'"}</div>
                                <div className="relative flex flex-col items-center">
                                    <div className={`h-4 w-4 rounded-full border-2 border-white shadow-sm ${item.type === 'goal' ? 'bg-primary' : 'bg-accent'}`} />
                                    {idx !== timelineEvents.length - 1 && <div className="w-0.5 h-12 bg-slate-100" />}
                                </div>
                                <div className={`flex-1 flex items-center justify-between p-4 rounded-xl border-2 transition-all ${item.type === 'goal' ? 'bg-primary/5 border-primary/10' : 'bg-accent/5 border-accent/10'}`}>
                                    <div className="flex flex-col">
                                        <span className="font-black text-slate-800 uppercase text-sm tracking-tight">{item.playerName}</span>
                                        <span className="text-[9px] text-muted-foreground font-black uppercase tracking-widest">
                                            {item.teamName} • {item.type === 'goal' ? 'But Marqué' : 'Passé décisive'}
                                        </span>
                                    </div>
                                    {item.type === 'goal' ? (
                                        <Trophy className="h-5 w-5 text-yellow-500 fill-yellow-500" />
                                    ) : (
                                        <UserPlus className="h-5 w-5 text-accent" />
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        )}

        <Card className="shadow-md">
            <CardHeader className="border-b"><CardTitle className="text-xs font-black uppercase tracking-[0.2em] flex items-center gap-3"><Users className="h-4 w-4 text-primary" /> Groupe Concerné</CardTitle></CardHeader>
            <CardContent className="pt-6">
                <Badge variant="outline" className="text-lg font-black py-2 px-6 border-2">{event.category}</Badge>
            </CardContent>
        </Card>
      </div>

      <Dialog open={isScoreDialogOpen} onOpenChange={setIsScoreDialogOpen}>
        <DialogContent className="max-w-2xl">
            <DialogHeader>
                <DialogTitle>Résultat & Statistiques</DialogTitle>
                <DialogDescription>Enregistrez le score et les buteurs du match.</DialogDescription>
            </DialogHeader>
            {event && <AddScoreForm event={event} onFinished={() => {
                setIsScoreDialogOpen(false);
                fetchEvent();
            }} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
