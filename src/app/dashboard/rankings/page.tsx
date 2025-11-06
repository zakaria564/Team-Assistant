
"use client";

import { useState, useEffect } from "react";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, ArrowLeft } from "lucide-react";
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

interface Event {
    id: string;
    type: string;
    teamHome: string;
    teamAway: string;
    category: string;
    date: { seconds: number, nanoseconds: number };
    scoreHome?: number;
    scoreAway?: number;
    scorers?: { playerId: string, playerName: string, goals: number }[];
}

interface Player {
    id: string;
    name: string;
    photoUrl?: string;
}

interface Opponent {
  id: string;
  name: string;
  logoUrl?: string;
}

const playerCategories = [
    "Seniors", "Seniors F",
    "U19", "U19 F",
    "U18", "U18 F",
    "U17", "U17 F",
    "U16", "U16 F",
    "U15", "U15 F",
    "U14", "U14 F",
    "U13", "U13 F",
    "U12", "U12 F",
    "U11", "U11 F",
    "U10", "U10 F",
    "U9", "U9 F",
    "U8", "U8 F",
    "U7", "U7 F",
    "Vétérans"
];

const competitionTypes = [
    "Match de Championnat",
    "Match de Coupe",
    "Tournoi"
];


const RankingTable = ({ rankings, clubName }: { rankings: TeamStats[], clubName: string }) => {
    if (rankings.length === 0) {
        return (
            <div className="text-center text-muted-foreground py-20">
                <p>Aucune donnée de match trouvée pour cette sélection.</p>
            </div>
        );
    }
    
    const clubNameFeminine = `${clubName} (F)`;

    return (
        <>
            {/* Mobile View */}
            <div className="sm:hidden">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[40px] text-center">Pos</TableHead>
                            <TableHead>Équipe</TableHead>
                            <TableHead className="text-center">J</TableHead>
                            <TableHead className="text-right">Pts</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {rankings.map((team, index) => (
                            <TableRow key={team.name} className={team.name.toLowerCase() === clubName.toLowerCase() || team.name.toLowerCase() === clubNameFeminine.toLowerCase() ? "bg-primary/10" : ""}>
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
                                <TableCell className="text-center">{team.played}</TableCell>
                                <TableCell className="font-bold text-right">{team.points}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
           
            {/* Desktop View */}
            <div className="hidden sm:block">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="text-center">Pos</TableHead>
                            <TableHead>Équipe</TableHead>
                            <TableHead className="font-bold text-center">Pts</TableHead>
                            <TableHead className="text-center">J</TableHead>
                            <TableHead className="text-center hidden sm:table-cell">G</TableHead>
                            <TableHead className="text-center hidden sm:table-cell">N</TableHead>
                            <TableHead className="text-center hidden sm:table-cell">P</TableHead>
                            <TableHead className="text-center hidden md:table-cell">BP</TableHead>
                            <TableHead className="text-center hidden md:table-cell">BC</TableHead>
                            <TableHead className="text-center">Diff</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {rankings.map((team, index) => (
                            <TableRow key={team.name} className={team.name.toLowerCase() === clubName.toLowerCase() || team.name.toLowerCase() === clubNameFeminine.toLowerCase() ? "bg-primary/10" : ""}>
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
                                <TableCell className="text-center hidden md:table-cell">{team.goalsFor}</TableCell>
                                <TableCell className="text-center hidden md:table-cell">{team.goalsAgainst}</TableCell>
                                <TableCell className="text-center">{team.goalDifference}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
       </>
    );
};

const ScorersTable = ({ scorers }: { scorers: Scorer[] }) => {
    if (scorers.length === 0) {
        return (
            <div className="text-center text-muted-foreground py-20">
                <p>Aucun buteur trouvé pour cette sélection.</p>
            </div>
        );
    }

    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead className="text-center">Pos</TableHead>
                    <TableHead>Joueur</TableHead>
                    <TableHead className="hidden sm:table-cell">Équipe</TableHead>
                    <TableHead className="text-right">Buts</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {scorers.map((scorer, index) => (
                    <TableRow key={scorer.playerId}>
                        <TableCell className="font-bold text-center">{index + 1}</TableCell>
                        <TableCell>
                            <div className="flex items-center gap-2 font-medium">
                                <Avatar className="h-8 w-8">
                                    <AvatarImage src={scorer.playerPhotoUrl} alt={scorer.playerName} />
                                    <AvatarFallback>{scorer.playerName.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <span>{scorer.playerName}</span>
                            </div>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">{scorer.teamName}</TableCell>
                        <TableCell className="font-bold text-right">{scorer.goals}</TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    );
};


export default function RankingsPage() {
    const [user, loadingUser] = useAuthState(auth);
    const router = useRouter();
    const [rankings, setRankings] = useState<{ general: TeamStats[], home: TeamStats[], away: TeamStats[], scorers: Scorer[] }>({ general: [], home: [], away: [], scorers: [] });
    const [loading, setLoading] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState<string>("");
    const [selectedCompetition, setSelectedCompetition] = useState<string>("Match de Championnat");
    const [clubName, setClubName] = useState("Votre Club");

    useEffect(() => {
        if (!user || !selectedCategory || !selectedCompetition) {
            setRankings({ general: [], home: [], away: [], scorers: [] });
            if (user) setLoading(false);
            return;
        }

        const fetchRankings = async () => {
            setLoading(true);

            try {
                const clubDocRef = doc(db, "clubs", user.uid);
                const opponentsQuery = query(collection(db, "opponents"), where("userId", "==", user.uid));
                const playersQuery = query(collection(db, "players"), where("userId", "==", user.uid));
                const eventsQuery = query(
                    collection(db, "events"),
                    where("userId", "==", user.uid),
                    where("type", "==", selectedCompetition),
                    where("category", "==", selectedCategory)
                );

                const [clubDoc, opponentsSnapshot, eventsSnapshot, playersSnapshot] = await Promise.all([
                    getDoc(clubDocRef),
                    getDocs(opponentsQuery),
                    getDocs(eventsQuery),
                    getDocs(playersQuery)
                ]);
                
                let localClubName = "Votre Club";
                if (clubDoc.exists() && clubDoc.data().clubName) {
                    localClubName = clubDoc.data().clubName;
                }
                setClubName(localClubName);
                const clubLogo = clubDoc.exists() ? clubDoc.data().logoUrl : undefined;
                const normalizedClubName = localClubName.toLowerCase();

                const allTeamsMap = new Map<string, { logoUrl?: string }>();
                opponentsSnapshot.docs.forEach(doc => {
                    const opponent = doc.data() as Opponent;
                    allTeamsMap.set(opponent.name.toLowerCase(), { logoUrl: opponent.logoUrl });
                });

                const playersMap = new Map<string, Player>();
                playersSnapshot.docs.forEach(doc => {
                    playersMap.set(doc.id, { id: doc.id, ...doc.data() } as Player);
                });
                
                const events = eventsSnapshot.docs.map(doc => doc.data() as Event);

                const generalStats: { [key: string]: TeamStats } = {};
                const homeStats: { [key: string]: TeamStats } = {};
                const awayStats: { [key: string]: TeamStats } = {};
                const scorersStats: { [key: string]: Scorer } = {};

                const initializeTeam = (teamName: string, statsObject: { [key: string]: TeamStats }) => {
                    if (!statsObject[teamName]) {
                        const baseName = teamName.replace(/\s*\(F\)\s*/, "").trim();
                        const isClubTeam = baseName.toLowerCase() === normalizedClubName;
                        const teamData = isClubTeam ? { logoUrl: clubLogo } : allTeamsMap.get(baseName.toLowerCase());
                        
                        statsObject[teamName] = {
                            name: teamName,
                            logoUrl: teamData?.logoUrl,
                            played: 0, wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0, goalDifference: 0, points: 0
                        };
                    }
                };
                
                events.forEach(event => {
                    if (typeof event.scoreHome !== 'number' || typeof event.scoreAway !== 'number') return;
                    
                    const { teamHome, teamAway, scoreHome, scoreAway, scorers } = event;
                    if (!teamHome || !teamAway) return;

                    // Initialize teams in all stat objects
                    [generalStats, homeStats, awayStats].forEach(stats => {
                        initializeTeam(teamHome, stats);
                        initializeTeam(teamAway, stats);
                    });

                    // --- Scorers Stats ---
                    if (scorers) {
                        scorers.forEach(scorer => {
                            if (!scorersStats[scorer.playerId]) {
                                const player = playersMap.get(scorer.playerId);
                                const playerTeam = player ? localClubName : 'Adversaire'; // Simplified team name logic
                                scorersStats[scorer.playerId] = {
                                    playerId: scorer.playerId,
                                    playerName: scorer.playerName,
                                    playerPhotoUrl: player?.photoUrl,
                                    teamName: playerTeam,
                                    goals: 0
                                };
                            }
                            scorersStats[scorer.playerId].goals += scorer.goals;
                        });
                    }

                    // --- General Stats ---
                    generalStats[teamHome].played++;
                    generalStats[teamAway].played++;
                    generalStats[teamHome].goalsFor += scoreHome;
                    generalStats[teamHome].goalsAgainst += scoreAway;
                    generalStats[teamAway].goalsFor += scoreAway;
                    generalStats[teamAway].goalsAgainst += scoreHome;
                    
                    // --- Home Stats ---
                    homeStats[teamHome].played++;
                    homeStats[teamHome].goalsFor += scoreHome;
                    homeStats[teamHome].goalsAgainst += scoreAway;

                    // --- Away Stats ---
                    awayStats[teamAway].played++;
                    awayStats[teamAway].goalsFor += scoreAway;
                    awayStats[teamAway].goalsAgainst += scoreHome;

                    // --- Points Logic ---
                    if (scoreHome > scoreAway) {
                        generalStats[teamHome].wins++;
                        generalStats[teamHome].points += 3;
                        generalStats[teamAway].losses++;

                        homeStats[teamHome].wins++;
                        homeStats[teamHome].points += 3;
                        awayStats[teamAway].losses++;
                    } else if (scoreAway > scoreHome) {
                        generalStats[teamAway].wins++;
                        generalStats[teamAway].points += 3;
                        generalStats[teamHome].losses++;

                        awayStats[teamAway].wins++;
                        awayStats[teamAway].points += 3;
                        homeStats[teamHome].losses++;
                    } else {
                        generalStats[teamHome].draws++;
                        generalStats[teamHome].points += 1;
                        generalStats[teamAway].draws++;
                        generalStats[teamAway].points += 1;
                        
                        homeStats[teamHome].draws++;
                        homeStats[teamHome].points += 1;
                        awayStats[teamAway].draws++;
                        awayStats[teamAway].points += 1;
                    }
                });

                const sortAndFilter = (stats: { [key: string]: TeamStats }): TeamStats[] => {
                     return Object.values(stats)
                        .map(team => ({...team, goalDifference: team.goalsFor - team.goalsAgainst }))
                        .filter(team => team.played > 0)
                        .sort((a, b) => {
                            if (b.points !== a.points) return b.points - a.points;
                            if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
                            return b.goalsFor - a.goalsFor;
                        });
                }
                
                const sortedScorers = Object.values(scorersStats).sort((a, b) => b.goals - a.goals);

                setRankings({
                    general: sortAndFilter(generalStats),
                    home: sortAndFilter(homeStats),
                    away: sortAndFilter(awayStats),
                    scorers: sortedScorers,
                });
            } catch (error) {
                console.error("Error fetching ranking data:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchRankings();

    }, [user, selectedCategory, selectedCompetition]);

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => router.back()}>
                        <ArrowLeft className="h-6 w-6" />
                        <span className="sr-only">Retour</span>
                    </Button>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Classement</h1>
                        <p className="text-muted-foreground">
                            Consultez le classement par compétition et par catégorie.
                        </p>
                    </div>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Classement - {selectedCompetition}</CardTitle>
                    <CardDescription>Sélectionnez une compétition et une catégorie pour afficher le classement.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex flex-col md:flex-row gap-4">
                        <Select onValueChange={setSelectedCompetition} value={selectedCompetition}>
                            <SelectTrigger className="w-full md:w-[280px]">
                                <SelectValue placeholder="Sélectionner une compétition" />
                            </SelectTrigger>
                            <SelectContent>
                                {competitionTypes.map(comp => (
                                    <SelectItem key={comp} value={comp}>{comp}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Select onValueChange={setSelectedCategory} value={selectedCategory}>
                            <SelectTrigger className="w-full md:w-[280px]">
                                <SelectValue placeholder="Sélectionner une catégorie" />
                            </SelectTrigger>
                            <SelectContent>
                                {playerCategories.map(cat => (
                                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    
                    {loading || loadingUser ? (
                        <div className="flex justify-center items-center py-20">
                            <Loader2 className="h-10 w-10 animate-spin text-primary" />
                        </div>
                    ) : selectedCategory ? (
                       <Tabs defaultValue="general" className="w-full">
                           <TabsList className="grid w-full grid-cols-4">
                               <TabsTrigger value="general">Général</TabsTrigger>
                               <TabsTrigger value="home">Domicile</TabsTrigger>
                               <TabsTrigger value="away">Extérieur</TabsTrigger>
                               <TabsTrigger value="scorers">Buteurs</TabsTrigger>
                           </TabsList>
                           <TabsContent value="general">
                               <RankingTable rankings={rankings.general} clubName={clubName} />
                           </TabsContent>
                           <TabsContent value="home">
                               <RankingTable rankings={rankings.home} clubName={clubName} />
                           </TabsContent>
                           <TabsContent value="away">
                               <RankingTable rankings={rankings.away} clubName={clubName} />
                           </TabsContent>
                            <TabsContent value="scorers">
                               <ScorersTable scorers={rankings.scorers} />
                           </TabsContent>
                       </Tabs>
                    ) : (
                        <div className="text-center text-muted-foreground py-20">
                            <p>Veuillez sélectionner une catégorie pour voir le classement.</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
