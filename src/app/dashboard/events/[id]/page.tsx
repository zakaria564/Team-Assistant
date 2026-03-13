"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, ArrowLeft, Calendar as CalendarIcon, Clock, MapPin, Trophy, Users, CheckCircle2, UserPlus, Pencil } from "lucide-react";
import { format, isPast } from "date-fns";
import { fr } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AddScoreForm } from "@/components/events/add-score-form";
import { useAuthState } from "react-firebase-hooks/auth";

export default function EventDetailPage(props: { params: Promise<{ id: string }> }) {
  const params = React.use(props.params);
  const eventId = params.id;
  
  const router = useRouter();
  const [user] = useAuthState(auth);
  const [event, setEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isScoreDialogOpen, setIsScoreDialogOpen] = useState(false);
  const [teamLogos, setTeamLogos] = useState<{ [key: string]: string | null }>({});

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

  useEffect(() => {
    if (!event || !user) return;

    const fetchLogos = async () => {
        const logos: { [key: string]: string | null } = {};
        
        const clubDoc = await getDoc(doc(db, "clubs", user.uid));
        if (clubDoc.exists()) {
            const clubData = clubDoc.data();
            logos[clubData.clubName] = clubData.logoUrl || null;
        }

        const teams = [event.teamHome, event.teamAway];
        for (const teamName of teams) {
            if (logos[teamName] === undefined) {
                const q = query(collection(db, "opponents"), where("userId", "==", user.uid), where("name", "==", teamName));
                const oppSnap = await getDocs(q);
                if (!oppSnap.empty) {
                    logos[teamName] = oppSnap.docs[0].data().logoUrl || null;
                }
            }
        }
        setTeamLogos(logos);
    };

    fetchLogos();
  }, [event, user]);

  if (loading) return <div className="flex justify-center items-center h-full py-20"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
  if (!event) return null;

  const isMatch = event.type.includes("Match") || event.type.includes("Tournoi");
  const isFinished = event.status === 'Terminé' || event.scoreHome !== undefined;
  const isMatchPast = isPast(event.date);

  const timelineEvents = [
      ...(event.scorers || []).map((s: any) => ({ ...s, type: 'goal' })),
      ...(event.assisters || []).map((a: any) => ({ ...a, type: 'assist' }))
  ].sort((a, b) => (a.minute || 0) - (b.minute || 0));

  const TeamLogo = ({ name }: { name: string }) => (
    <div className="h-16 w-16 sm:h-24 sm:w-24 bg-white shadow-md rounded-full flex items-center justify-center border-2 sm:border-4 border-slate-100 overflow-hidden p-1.5 sm:p-2">
        {teamLogos[name] ? (
            <img src={teamLogos[name]!} alt={name} className="h-full w-full object-contain" crossOrigin="anonymous" />
        ) : (
            <Trophy className="h-8 w-8 sm:h-10 sm:w-10 text-slate-300" />
        )}
    </div>
  );

  return (
    <div className="space-y-6 max-w-4xl mx-auto px-2 sm:px-0">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 sm:gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}><ArrowLeft className="h-5 w-5 sm:h-6 sm:w-6" /></Button>
          <h1 className="text-xl sm:text-3xl font-bold tracking-tight">Feuille de Match</h1>
        </div>
        {!isFinished && isMatch && isMatchPast && (
            <Button onClick={() => setIsScoreDialogOpen(true)} className="font-black uppercase gap-2 text-[10px] sm:text-sm px-3 h-9 sm:h-10">
                <Pencil className="h-3 w-3 sm:h-4 sm:w-4" /> Saisir le score
            </Button>
        )}
      </div>

      <div className="grid gap-6">
        <Card className="overflow-hidden border-t-8 border-primary shadow-xl">
            <CardHeader className="bg-muted/30 pb-6 sm:pb-10">
                <div className="flex justify-between items-center mb-4 sm:mb-6">
                    <Badge className="bg-primary text-white border-none uppercase tracking-widest text-[8px] sm:text-[10px] font-black px-2 sm:px-3 py-1">{event.type}</Badge>
                    {isFinished ? (
                        <Badge variant="secondary" className="bg-green-100 text-green-800 gap-1 font-black text-[10px] sm:text-sm"><CheckCircle2 className="h-3 w-3" /> TERMINÉ</Badge>
                    ) : (
                        <Badge variant="outline" className="font-bold text-[10px] sm:text-sm">{event.status || "PRÉVU"}</Badge>
                    )}
                </div>
                
                {isMatch ? (
                    <div className="flex flex-col items-center gap-4 sm:gap-8 py-2 sm:py-4">
                        <div className="flex items-center justify-center gap-4 sm:gap-10 w-full">
                            <div className="flex flex-col items-center flex-1 space-y-2 sm:space-y-3">
                                <TeamLogo name={event.teamHome} />
                                <span className="text-sm sm:text-xl font-black uppercase text-center leading-tight tracking-tighter line-clamp-2">{event.teamHome}</span>
                            </div>
                            
                            <div className="flex flex-col items-center gap-2 sm:gap-3">
                                {isFinished ? (
                                    <div className="bg-slate-900 text-white text-3xl sm:text-6xl font-black px-4 sm:px-8 py-2 sm:py-4 rounded-xl sm:rounded-2xl shadow-2xl italic tracking-tighter border-b-2 sm:border-b-4 border-primary">
                                        {event.scoreHome} - {event.scoreAway}
                                    </div>
                                ) : (
                                    <div className="text-2xl sm:text-4xl font-black text-slate-300 italic">VS</div>
                                )}
                                <span className="text-[7px] sm:text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] sm:tracking-[0.3em] text-center">Score Final</span>
                            </div>

                            <div className="flex flex-col items-center flex-1 space-y-2 sm:space-y-3">
                                <TeamLogo name={event.teamAway} />
                                <span className="text-sm sm:text-xl font-black uppercase text-center leading-tight tracking-tighter line-clamp-2">{event.teamAway}</span>
                            </div>
                        </div>
                    </div>
                ) : (
                    <CardTitle className="text-2xl sm:text-4xl font-black uppercase tracking-tighter text-center py-4 sm:py-6">{event.type}</CardTitle>
                )}
            </CardHeader>
            
            <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-8 pt-6 sm:pt-10 border-t">
                <div className="flex items-center gap-3 sm:gap-4">
                    <div className="p-2 sm:p-3 bg-primary/10 rounded-lg sm:rounded-xl"><CalendarIcon className="h-5 w-5 sm:h-6 sm:w-6 text-primary" /></div>
                    <div>
                        <p className="text-[8px] sm:text-[10px] font-black text-muted-foreground uppercase tracking-widest">Date</p>
                        <p className="font-bold text-sm sm:text-lg">{format(event.date, "dd MMM yyyy", { locale: fr })}</p>
                    </div>
                </div>
                <div className="flex items-center gap-3 sm:gap-4">
                    <div className="p-2 sm:p-3 bg-primary/10 rounded-lg sm:rounded-xl"><Clock className="h-5 w-5 sm:h-6 sm:w-6 text-primary" /></div>
                    <div>
                        <p className="text-[8px] sm:text-[10px] font-black text-muted-foreground uppercase tracking-widest">Coup d'envoi</p>
                        <p className="font-bold text-sm sm:text-lg">{format(event.date, "HH:mm")}</p>
                    </div>
                </div>
                <div className="flex items-center gap-3 sm:gap-4">
                    <div className="p-2 sm:p-3 bg-primary/10 rounded-lg sm:rounded-xl"><MapPin className="h-5 w-5 sm:h-6 sm:w-6 text-primary" /></div>
                    <div>
                        <p className="text-[8px] sm:text-[10px] font-black text-muted-foreground uppercase tracking-widest">Lieu</p>
                        <p className="font-bold text-sm sm:text-lg truncate max-w-[120px] sm:max-w-none">{event.location || 'Non spécifié'}</p>
                    </div>
                </div>
            </CardContent>
        </Card>

        {!isFinished && isMatch && isMatchPast && (
            <Button 
                variant="default" 
                size="lg" 
                onClick={() => setIsScoreDialogOpen(true)}
                className="w-full h-12 sm:h-16 bg-primary text-white font-black text-lg sm:text-xl uppercase tracking-widest shadow-lg hover:scale-[1.01] transition-transform"
            >
                <Pencil className="mr-2 sm:mr-3 h-5 w-5 sm:h-6 sm:w-6" /> Saisir le résultat
            </Button>
        )}

        {isFinished && isMatch && timelineEvents.length > 0 && (
            <Card className="shadow-lg">
                <CardHeader className="border-b"><CardTitle className="text-[10px] sm:text-xs font-black uppercase tracking-[0.2em] flex items-center gap-2 sm:gap-3"><Clock className="h-4 w-4 text-primary" /> Chronologie des Actions</CardTitle></CardHeader>
                <CardContent className="pt-6 sm:pt-8">
                    <div className="space-y-4 sm:space-y-6 max-w-lg mx-auto">
                        {timelineEvents.map((item: any, idx: number) => (
                            <div key={idx} className="flex items-center gap-3 sm:gap-6 group">
                                <div className="w-8 sm:w-12 text-right font-black text-primary text-base sm:text-xl italic tracking-tighter">{item.minute ? `${item.minute}'` : "--'"}</div>
                                <div className="relative flex flex-col items-center">
                                    <div className={`h-3 w-3 sm:h-4 sm:w-4 rounded-full border-2 border-white shadow-sm ${item.type === 'goal' ? 'bg-primary' : 'bg-accent'}`} />
                                    {idx !== timelineEvents.length - 1 && <div className="w-0.5 h-10 sm:h-12 bg-slate-100" />}
                                </div>
                                <div className={`flex-1 flex items-center justify-between p-3 sm:p-4 rounded-lg sm:rounded-xl border-2 transition-all ${item.type === 'goal' ? 'bg-primary/5 border-primary/10' : 'bg-accent/5 border-accent/10'}`}>
                                    <div className="flex flex-col min-w-0">
                                        <span className="font-black text-slate-800 uppercase text-xs sm:text-sm tracking-tight truncate">{item.playerName}</span>
                                        <span className="text-[7px] sm:text-[9px] text-muted-foreground font-black uppercase tracking-widest truncate">
                                            {item.teamName} • {item.type === 'goal' ? 'But' : 'Passé'}
                                        </span>
                                    </div>
                                    {item.type === 'goal' ? (
                                        <Trophy className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-500 fill-yellow-500 shrink-0 ml-2" />
                                    ) : (
                                        <UserPlus className="h-4 w-4 sm:h-5 sm:w-5 text-accent shrink-0 ml-2" />
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        )}

        <Card className="shadow-md">
            <CardHeader className="border-b"><CardTitle className="text-[10px] sm:text-xs font-black uppercase tracking-[0.2em] flex items-center gap-2 sm:gap-3"><Users className="h-4 w-4 text-primary" /> Groupe Concerné</CardTitle></CardHeader>
            <CardContent className="pt-4 sm:pt-6">
                <Badge variant="outline" className="text-base sm:text-lg font-black py-1 sm:py-2 px-4 sm:px-6 border-2">{event.category}</Badge>
            </CardContent>
        </Card>
      </div>

      <Dialog open={isScoreDialogOpen} onOpenChange={setIsScoreDialogOpen}>
        <DialogContent className="max-w-2xl p-0 overflow-hidden sm:rounded-2xl">
            <DialogHeader className="p-6 pb-0">
                <DialogTitle>Résultat & Statistiques</DialogTitle>
                <DialogDescription>Enregistrez le score et les buteurs du match.</DialogDescription>
            </DialogHeader>
            <div className="p-6 pt-2">
                {event && <AddScoreForm event={event} onFinished={() => {
                    setIsScoreDialogOpen(false);
                    fetchEvent();
                }} />}
            </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
