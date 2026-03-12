
"use client";

import React, { useState, useEffect } from "react";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, ArrowLeft, Trophy, UserPlus, Star, Award } from "lucide-react";
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

interface PlayerStat {
    playerId: string;
    playerName: string;
    playerPhotoUrl?: string;
    teamName: string;
    value: number;
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
        <div className="rounded-xl border overflow-hidden">
            <div className="overflow-x-auto">
                <Table>
                    <TableHeader className="bg-slate-50">
                        <TableRow>
                            <TableHead className="w-[40px] sm:w-[50px] text-center font-black px-2">POS</TableHead>
                            <TableHead className="font-black min-w-[120px]">ÉQUIPE</TableHead>
                            <TableHead className="text-center font-black px-2">MJ</TableHead>
                            <TableHead className="text-center font-black hidden sm:table-cell px-2">G</TableHead>
                            <TableHead className="text-center font-black hidden sm:table-cell px-2">N</TableHead>
                            <TableHead className="text-center font-black hidden sm:table-cell px-2">P</TableHead>
                            <TableHead className="text-center font-black px-2">DIFF</TableHead>
                            <TableHead className="text-center font-black bg-primary/10 text-primary px-2">PTS</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {rankings.map((team, index) => (
                            <TableRow key={team.name} className={team.name.toLowerCase() === clubName.toLowerCase() ? "bg-primary/5 border-l-4 border-l-primary font-bold" : ""}>
                                <TableCell className="text-center font-mono text-xs sm:text-sm px-2">{index + 1}</TableCell>
                                <TableCell className="px-2 sm:px-4">
                                    <div className="flex items-center gap-2 sm:gap-3">
                                        <Avatar className="h-6 w-6 sm:h-8 sm:w-8 border shrink-0">
                                            <AvatarImage src={team.logoUrl} alt={team.name} />
                                            <AvatarFallback className="text-[8px] sm:text-[10px]">{team.name.charAt(0)}</AvatarFallback>
                                        </Avatar>
                                        <span className="truncate max-w-[80px] sm:max-w-none uppercase tracking-tighter text-xs sm:text-sm">{team.name}</span>
                                    </div>
                                </TableCell>
                                <TableCell className="text-center text-xs sm:text-sm px-2">{team.played}</TableCell>
                                <TableCell className="text-center hidden sm:table-cell text-xs sm:text-sm px-2">{team.wins}</TableCell>
                                <TableCell className="text-center hidden sm:table-cell text-xs sm:text-sm px-2">{team.draws}</TableCell>
                                <TableCell className="text-center hidden sm:table-cell text-xs sm:text-sm px-2">{team.losses}</TableCell>
                                <TableCell className="text-center font-medium text-xs sm:text-sm px-2">{team.goalDifference > 0 ? `+${team.goalDifference}` : team.goalDifference}</TableCell>
                                <TableCell className="text-center font-black text-sm sm:text-lg bg-primary/5 text-primary px-2">{team.points}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
};

const PlayerStatsTable = ({ stats, label }: { stats: PlayerStat[], label: string }) => {
    if (stats.length === 0) return <div className="text-center text-muted-foreground py-20"><p>Aucune donnée enregistrée.</p></div>;
    return (
        <div className="overflow-x-auto">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-[50px] sm:w-[60px] text-center font-black">RANG</TableHead>
                        <TableHead className="font-black">JOUEUR</TableHead>
                        <TableHead className="hidden md:table-cell font-black">ÉQUIPE</TableHead>
                        <TableHead className="text-right font-black">{label.toUpperCase()}</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {stats.map((item, index) => (
                        <TableRow key={item.playerId + index}>
                            <TableCell className="font-black text-center text-lg sm:text-xl italic text-slate-200">#{index + 1}</TableCell>
                            <TableCell>
                                <div className="flex items-center gap-2 sm:gap-4">
                                    <Avatar className="h-10 w-10 sm:h-12 sm:w-12 border-2 border-primary/10 shadow-sm shrink-0">
                                        <AvatarImage src={item.playerPhotoUrl} />
                                        <AvatarFallback className="text-xs">{item.playerName.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                    <div className="flex flex-col min-w-0">
                                        <span className="font-black uppercase tracking-tighter text-xs sm:text-sm leading-none mb-1 truncate">{item.playerName}</span>
                                        <span className="text-[8px] sm:text-[10px] text-muted-foreground font-bold uppercase truncate md:hidden">{item.teamName}</span>
                                    </div>
                                </div>
                            </TableCell>
                            <TableCell className="hidden md:table-cell text-xs font-bold uppercase text-muted-foreground">{item.teamName}</TableCell>
                            <TableCell className="font-black text-right text-2xl sm:text-3xl text-primary italic pr-4 sm:pr-6 tabular-nums">{item.value}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
};

export default function RankingsPage() {
    const [user] = useAuthState(auth);
    const router = useRouter();
    const [data, setData] = useState<{ general: TeamStats[], scorers: PlayerStat[], assisters: PlayerStat[] }>({ 
        general: [], 
        scorers: [],
        assisters: []
    });
    const [loading, setLoading] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState<string>("");
    const [selectedCompetition, setSelectedCompetition] = useState<string>("Match de Championnat");
    const [clubName, setClubName] = useState("Votre Club");

    useEffect(() => {
        if (!user || !selectedCategory) return;
        
        const fetchRankings = async () => {
            setLoading(true);
            try {
                // 1. Infos Club
                const clubDoc = await getDoc(doc(db, "clubs", user.uid));
                const localClubName = clubDoc.exists() ? clubDoc.data().clubName : "Votre Club";
                const clubLogo = clubDoc.exists() ? clubDoc.data().logoUrl : undefined;
                setClubName(localClubName);

                // 2. Adversaires & Joueurs
                const [oppSnap, playersSnap] = await Promise.all([
                    getDocs(query(collection(db, "opponents"), where("userId", "==", user.uid))),
                    getDocs(query(collection(db, "players"), where("userId", "==", user.uid)))
                ]);

                const allTeamsMap = new Map<string, { logoUrl?: string }>();
                oppSnap.docs.forEach(d => allTeamsMap.set(d.data().name.toLowerCase(), { logoUrl: d.data().logoUrl }));
                allTeamsMap.set(localClubName.toLowerCase(), { logoUrl: clubLogo });

                const playersMap = new Map<string, any>();
                playersSnap.docs.forEach(d => playersMap.set(d.id, d.data()));

                // 3. Matchs
                const eventsSnap = await getDocs(query(
                    collection(db, "events"), 
                    where("userId", "==", user.uid), 
                    where("category", "==", selectedCategory), 
                    where("type", "==", selectedCompetition)
                ));
                const events = eventsSnap.docs.map(d => d.data());

                const stats: Record<string, TeamStats> = {};
                const scorersMap: Record<string, PlayerStat> = {};
                const assistersMap: Record<string, PlayerStat> = {};

                const initTeam = (n: string) => {
                    if (!n) return;
                    if (!stats[n]) {
                        const teamData = allTeamsMap.get(n.toLowerCase());
                        stats[n] = { name: n, logoUrl: teamData?.logoUrl, played: 0, wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0, goalDifference: 0, points: 0 };
                    }
                };

                const processPlayerStat = (item: any, map: Record<string, PlayerStat>) => {
                    const id = item.isOpponent ? `opp_${item.playerName}` : item.playerId;
                    if (!id) return;
                    if (!map[id]) {
                        const pData = !item.isOpponent ? playersMap.get(id) : null;
                        map[id] = {
                            playerId: id,
                            playerName: item.playerName,
                            playerPhotoUrl: pData?.photoUrl,
                            teamName: item.teamName,
                            value: 0
                        };
                    }
                    map[id].value++;
                };

                events.forEach(ev => {
                    if (ev.scoreHome === undefined || ev.status !== "Terminé") return;
                    
                    initTeam(ev.teamHome); 
                    initTeam(ev.teamAway);
                    
                    const tHome = stats[ev.teamHome];
                    const tAway = stats[ev.teamAway];

                    tHome.played++; tAway.played++;
                    tHome.goalsFor += ev.scoreHome; tHome.goalsAgainst += ev.scoreAway;
                    tAway.goalsFor += ev.scoreAway; tAway.goalsAgainst += ev.scoreHome;

                    if (ev.scoreHome > ev.scoreAway) { 
                        tHome.wins++; tHome.points += 3; tAway.losses++; 
                    } else if (ev.scoreAway > ev.scoreHome) { 
                        tAway.wins++; tAway.points += 3; tHome.losses++; 
                    } else { 
                        tHome.draws++; tHome.points++; tAway.draws++; tAway.points++; 
                    }

                    // Buteurs & Passeurs
                    ev.scorers?.forEach((s: any) => processPlayerStat(s, scorersMap));
                    ev.assisters?.forEach((a: any) => processPlayerStat(a, assistersMap));
                });

                const sortedGeneral = Object.values(stats)
                    .map(t => ({...t, goalDifference: t.goalsFor - t.goalsAgainst}))
                    .sort((a,b) => b.points - a.points || b.goalDifference - a.goalDifference || b.goalsFor - a.goalsFor);

                setData({ 
                    general: sortedGeneral, 
                    scorers: Object.values(scorersMap).sort((a,b) => b.value - a.value),
                    assisters: Object.values(assistersMap).sort((a,b) => b.value - a.value)
                });

            } catch (error) {
                console.error("Error calculating rankings:", error);
            } finally { 
                setLoading(false); 
            }
        };
        fetchRankings();
    }, [user, selectedCategory, selectedCompetition]);

    return (
        <div className="space-y-6 px-2 sm:px-0">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => router.back()} className="shrink-0"><ArrowLeft className="h-5 w-5 sm:h-6 sm:w-6" /></Button>
                <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tighter italic text-primary truncate">Classements & Stats</h1>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="shadow-sm">
                    <CardHeader className="pb-3 p-4 sm:p-6">
                        <CardDescription className="font-bold uppercase text-[8px] sm:text-[10px] tracking-widest text-primary">Configuration</CardDescription>
                        <CardTitle className="text-base sm:text-lg font-black uppercase tracking-tight">Compétition</CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
                        <Select onValueChange={setSelectedCompetition} value={selectedCompetition}>
                            <SelectTrigger className="w-full font-bold h-9 sm:h-10 text-xs sm:text-sm">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {competitionTypes.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </CardContent>
                </Card>

                <Card className="shadow-sm">
                    <CardHeader className="pb-3 p-4 sm:p-6">
                        <CardDescription className="font-bold uppercase text-[8px] sm:text-[10px] tracking-widest text-primary">Groupe</CardDescription>
                        <CardTitle className="text-base sm:text-lg font-black uppercase tracking-tight">Catégorie d'âge</CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
                        <Select onValueChange={setSelectedCategory} value={selectedCategory}>
                            <SelectTrigger className="w-full font-bold h-9 sm:h-10 text-xs sm:text-sm">
                                <SelectValue placeholder="Choisir une catégorie" />
                            </SelectTrigger>
                            <SelectContent>
                                {playerCategories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </CardContent>
                </Card>
            </div>

            <Card className="shadow-xl border-t-8 border-primary overflow-hidden">
                <CardContent className="p-2 sm:p-6 pt-4 sm:pt-6">
                    {loading ? (
                        <div className="flex justify-center py-24"><Loader2 className="animate-spin h-10 w-10 sm:h-12 sm:w-12 text-primary" /></div>
                    ) : selectedCategory ? (
                        <Tabs defaultValue="general" className="w-full">
                            <TabsList className="grid w-full grid-cols-3 mb-6 sm:mb-10 bg-muted/50 p-1 rounded-lg sm:rounded-xl h-auto">
                                <TabsTrigger value="general" className="rounded-md sm:rounded-lg font-black uppercase text-[8px] sm:text-[10px] tracking-widest py-2 sm:py-3 data-[state=active]:bg-white data-[state=active]:shadow-sm">
                                    <Trophy className="h-3 w-3 sm:h-3.5 sm:w-3.5 mr-1 sm:mr-2 text-yellow-500 shrink-0" /> <span className="truncate">Ligue</span>
                                </TabsTrigger>
                                <TabsTrigger value="scorers" className="rounded-md sm:rounded-lg font-black uppercase text-[8px] sm:text-[10px] tracking-widest py-2 sm:py-3 data-[state=active]:bg-white data-[state=active]:shadow-sm">
                                    <Star className="h-3 w-3 sm:h-3.5 sm:w-3.5 mr-1 sm:mr-2 text-primary fill-primary shrink-0" /> <span className="truncate">Buteurs</span>
                                </TabsTrigger>
                                <TabsTrigger value="assisters" className="rounded-md sm:rounded-lg font-black uppercase text-[8px] sm:text-[10px] tracking-widest py-2 sm:py-3 data-[state=active]:bg-white data-[state=active]:shadow-sm">
                                    <Award className="h-3 w-3 sm:h-3.5 sm:w-3.5 mr-1 sm:mr-2 text-accent fill-accent shrink-0" /> <span className="truncate">Passes</span>
                                </TabsTrigger>
                            </TabsList>
                            
                            <TabsContent value="general">
                                <RankingTable rankings={data.general} clubName={clubName} />
                            </TabsContent>
                            
                            <TabsContent value="scorers">
                                <PlayerStatsTable stats={data.scorers} label="Buts" />
                            </TabsContent>

                            <TabsContent value="assisters">
                                <PlayerStatsTable stats={data.assisters} label="Passes" />
                            </TabsContent>
                        </Tabs>
                    ) : (
                        <div className="text-center py-16 sm:py-24 space-y-4 px-4">
                            <div className="h-16 w-16 sm:h-20 sm:w-20 bg-muted rounded-full flex items-center justify-center mx-auto">
                                <Trophy className="h-8 w-8 sm:h-10 sm:w-10 text-muted-foreground opacity-20" />
                            </div>
                            <p className="text-muted-foreground italic font-medium text-sm sm:text-base max-w-xs mx-auto">
                                Veuillez sélectionner une catégorie et une compétition pour générer les statistiques.
                            </p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
