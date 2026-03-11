
"use client";

import React, { useState, useEffect } from "react";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, ArrowLeft, Trophy, UserPlus, Star } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface TeamStats {
    name: string;
    logoUrl?: string;
    played: number;
    wins: number;
    draws: number;
    losses: number;
    goalsFor: number;
    goalsAgainst: number;
    goalDifference: number;
    points: number;
}

interface Scorer {
    playerId: string;
    playerName: string;
    playerPhotoUrl?: string;
    teamName: string;
    goals: number;
}

interface Assister {
    playerId: string;
    playerName: string;
    playerPhotoUrl?: string;
    teamName: string;
    assists: number;
}

const playerCategories = [
    "Seniors", "Seniors F", "U19", "U19 F", "U18", "U18 F", "U17", "U17 F", "U16", "U16 F", 
    "U15", "U15 F", "U14", "U14 F", "U13", "U13 F", "U12", "U12 F", "U11", "U11 F", 
    "U10", "U10 F", "U9", "U9 F", "U8", "U8 F", "U7", "U7 F", "Vétérans"
];

const competitionTypes = [
    "Match de Championnat",
    "Match de Coupe",
    "Tournoi"
];

const RankingTable = ({ rankings, clubName }: { rankings: TeamStats[], clubName: string }) => {
    if (rankings.length === 0) return <div className="text-center text-muted-foreground py-20"><p>Aucun match terminé pour cette sélection.</p></div>;
    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead className="w-[40px] text-center">Pos</TableHead>
                    <TableHead>Équipe</TableHead>
                    <TableHead className="font-bold text-center">Pts</TableHead>
                    <TableHead className="text-center">J</TableHead>
                    <TableHead className="text-center hidden sm:table-cell">G</TableHead>
                    <TableHead className="text-center hidden sm:table-cell">N</TableHead>
                    <TableHead className="text-center hidden sm:table-cell">P</TableHead>
                    <TableHead className="text-center">Diff</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {rankings.map((team, index) => (
                    <TableRow key={team.name} className={team.name.toLowerCase() === clubName.toLowerCase() ? "bg-primary/10" : ""}>
                        <TableCell className="font-bold text-center">{index + 1}</TableCell>
                        <TableCell>
                            <div className="flex items-center gap-2 font-medium">
                                <Avatar className="h-6 w-6">
                                    <AvatarImage src={team.logoUrl} alt={team.name} />
                                    <AvatarFallback>{team.name.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <span>{team.name}</span>
                            </div>
                        </TableCell>
                        <TableCell className="font-bold text-center">{team.points}</TableCell>
                        <TableCell className="text-center">{team.played}</TableCell>
                        <TableCell className="text-center hidden sm:table-cell">{team.wins}</TableCell>
                        <TableCell className="text-center hidden sm:table-cell">{team.draws}</TableCell>
                        <TableCell className="text-center hidden sm:table-cell">{team.losses}</TableCell>
                        <TableCell className="text-center">{team.goalDifference}</TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    );
};

const ScorersTable = ({ scorers }: { scorers: Scorer[] }) => {
    if (scorers.length === 0) return <div className="text-center text-muted-foreground py-20"><p>Aucun buteur enregistré.</p></div>;
    return (
        <Table>
            <TableHeader><TableRow><TableHead className="w-[40px] text-center">Rang</TableHead><TableHead>Joueur</TableHead><TableHead className="hidden sm:table-cell">Équipe</TableHead><TableHead className="text-right">Buts</TableHead></TableRow></TableHeader>
            <TableBody>
                {scorers.map((scorer, index) => (
                    <TableRow key={scorer.playerId + index}>
                        <TableCell className="font-black text-center text-lg italic text-slate-300">#{index + 1}</TableCell>
                        <TableCell>
                            <div className="flex items-center gap-4 font-medium">
                                <Avatar className="h-10 w-10 border-2 border-primary/20"><AvatarImage src={scorer.playerPhotoUrl} /><AvatarFallback>{scorer.playerName.charAt(0)}</AvatarFallback></Avatar>
                                <div className="flex flex-col">
                                    <span className="font-bold uppercase tracking-tight text-sm">{scorer.playerName}</span>
                                    <span className="text-[10px] text-muted-foreground font-bold uppercase sm:hidden">{scorer.teamName}</span>
                                </div>
                            </div>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell text-xs font-bold uppercase text-muted-foreground">{scorer.teamName}</TableCell>
                        <TableCell className="font-black text-right text-2xl text-primary italic pr-6">{scorer.goals}</TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    );
};

export default function RankingsPage() {
    const [user] = useAuthState(auth);
    const router = useRouter();
    const [rankings, setRankings] = useState<any>({ general: [], scorers: [], assisters: [] });
    const [loading, setLoading] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState<string>("");
    const [selectedCompetition, setSelectedCompetition] = useState<string>("Match de Championnat");
    const [clubName, setClubName] = useState("Votre Club");

    useEffect(() => {
        if (!user || !selectedCategory) return;
        const fetchRankings = async () => {
            setLoading(true);
            try {
                const clubDoc = await getDoc(doc(db, "clubs", user.uid));
                const localClubName = clubDoc.exists() ? clubDoc.data().clubName : "Votre Club";
                const clubLogo = clubDoc.exists() ? clubDoc.data().logoUrl : undefined;
                setClubName(localClubName);

                const oppSnap = await getDocs(query(collection(db, "opponents"), where("userId", "==", user.uid)));
                const allTeamsMap = new Map<string, { logoUrl?: string }>();
                oppSnap.docs.forEach(d => allTeamsMap.set(d.data().name.toLowerCase(), { logoUrl: d.data().logoUrl }));
                allTeamsMap.set(localClubName.toLowerCase(), { logoUrl: clubLogo });

                const playersSnap = await getDocs(query(collection(db, "players"), where("userId", "==", user.uid)));
                const playersMap = new Map<string, any>();
                playersSnap.docs.forEach(d => playersMap.set(d.id, d.data()));

                const eventsSnap = await getDocs(query(collection(db, "events"), where("userId", "==", user.uid), where("category", "==", selectedCategory), where("type", "==", selectedCompetition)));
                const events = eventsSnap.docs.map(d => d.data());

                const stats: Record<string, TeamStats> = {};
                const scorers: Record<string, Scorer> = {};
                const assisters: Record<string, Assister> = {};

                const initTeam = (n: string) => {
                    if (!stats[n]) {
                        const data = allTeamsMap.get(n.toLowerCase());
                        stats[n] = { name: n, logoUrl: data?.logoUrl, played: 0, wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0, goalDifference: 0, points: 0 };
                    }
                };

                events.forEach(ev => {
                    if (ev.scoreHome === undefined || ev.status === "Prévu") return;
                    initTeam(ev.teamHome); initTeam(ev.teamAway);
                    
                    stats[ev.teamHome].played++; stats[ev.teamAway].played++;
                    stats[ev.teamHome].goalsFor += ev.scoreHome; stats[ev.teamHome].goalsAgainst += ev.scoreAway;
                    stats[ev.teamAway].goalsFor += ev.scoreAway; stats[ev.teamAway].goalsAgainst += ev.scoreHome;

                    if (ev.scoreHome > ev.scoreAway) { stats[ev.teamHome].wins++; stats[ev.teamHome].points += 3; stats[ev.teamAway].losses++; }
                    else if (ev.scoreAway > ev.scoreHome) { stats[ev.teamAway].wins++; stats[ev.teamAway].points += 3; stats[ev.teamHome].losses++; }
                    else { stats[ev.teamHome].draws++; stats[ev.teamHome].points++; stats[ev.teamAway].draws++; stats[ev.teamAway].points++; }

                    ev.scorers?.forEach((s: any) => {
                        const scorerId = s.playerId || `temp_${s.playerName}`;
                        if (!scorers[scorerId]) {
                            const p = playersMap.get(s.playerId);
                            scorers[scorerId] = { playerId: scorerId, playerName: s.playerName, playerPhotoUrl: p?.photoUrl, teamName: s.isOpponent ? 'Adversaire' : localClubName, goals: 0 };
                        }
                        scorers[scorerId].goals++;
                    });

                    ev.assisters?.forEach((a: any) => {
                        const assisterId = a.playerId || `temp_${a.playerName}`;
                        if (!assisters[assisterId]) {
                            const p = playersMap.get(a.playerId);
                            assisters[assisterId] = { playerId: assisterId, playerName: a.playerName, playerPhotoUrl: p?.photoUrl, teamName: a.isOpponent ? 'Adversaire' : localClubName, assists: 0 };
                        }
                        assisters[assisterId].assists++;
                    });
                });

                const sorted = Object.values(stats).map(t => ({...t, goalDifference: t.goalsFor - t.goalsAgainst})).sort((a,b) => b.points - a.points || b.goalDifference - a.goalDifference);
                setRankings({ 
                    general: sorted, 
                    scorers: Object.values(scorers).sort((a,b) => b.goals - a.goals),
                    assisters: Object.values(assisters).sort((a,b) => b.assists - a.assists)
                });
            } finally { setLoading(false); }
        };
        fetchRankings();
    }, [user, selectedCategory, selectedCompetition]);

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => router.back()}><ArrowLeft className="h-6 w-6" /></Button>
                <h1 className="text-3xl font-black uppercase tracking-tighter italic text-primary">Tableau des Performances</h1>
            </div>
            <Card className="shadow-lg border-t-4 border-primary">
                <CardHeader>
                    <div className="flex flex-col md:flex-row gap-4">
                        <Select onValueChange={setSelectedCompetition} value={selectedCompetition}><SelectTrigger className="w-full md:w-[280px] font-bold"><SelectValue /></SelectTrigger><SelectContent>{competitionTypes.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select>
                        <Select onValueChange={setSelectedCategory} value={selectedCategory}><SelectTrigger className="w-full md:w-[280px] font-bold"><SelectValue placeholder="Choisir une catégorie" /></SelectTrigger><SelectContent>{playerCategories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select>
                    </div>
                </CardHeader>
                <CardContent>
                    {loading ? <div className="flex justify-center py-20"><Loader2 className="animate-spin h-10 w-10 text-primary" /></div> : selectedCategory ? (
                        <Tabs defaultValue="general" className="w-full">
                            <TabsList className="grid w-full grid-cols-2 mb-8 bg-muted/50 p-1 rounded-xl">
                                <TabsTrigger value="general" className="rounded-lg font-black uppercase text-[10px] tracking-widest"><Trophy className="h-3 w-3 mr-2" /> Classement Équipes</TabsTrigger>
                                <TabsTrigger value="scorers" className="rounded-lg font-black uppercase text-[10px] tracking-widest"><Star className="h-3 w-3 mr-2" /> Top Buteurs</TabsTrigger>
                            </TabsList>
                            <TabsContent value="general"><RankingTable rankings={rankings.general} clubName={clubName} /></TabsContent>
                            <TabsContent value="scorers"><ScorersTable scorers={rankings.scorers} /></TabsContent>
                        </Tabs>
                    ) : <div className="text-center py-24 text-muted-foreground italic font-medium">Sélectionnez une catégorie pour afficher les données.</div>}
                </CardContent>
            </Card>
        </div>
    );
}
