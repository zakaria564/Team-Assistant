
"use client";

import { useState, useEffect, useMemo } from "react";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Trophy, ArrowLeft } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";


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

interface Event {
    id: string;
    type: string;
    team: string;
    category: string;
    opponent?: string;
    date: { seconds: number, nanoseconds: number };
    location: string;
    scoreTeam?: number;
    scoreOpponent?: number;
}

interface Opponent {
  id: string;
  name: string;
  logoUrl?: string;
}


const playerCategories = [
    "Seniors", "Seniors F", "U19", "U18", "U17", "U17 F", "U16", "U15", "U15 F", "U14", "U13", "U13 F", "U12", "U11", "U11 F", "U10", "U9", "U8", "U7", "Vétérans", "École de foot"
];

export default function RankingsPage() {
    const [user, loadingUser] = useAuthState(auth);
    const router = useRouter();
    const [rankings, setRankings] = useState<TeamStats[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedCategory, setSelectedCategory] = useState<string>("");
    const [clubName, setClubName] = useState("Votre Club");
    const [opponents, setOpponents] = useState<Opponent[]>([]);

    useEffect(() => {
        if (!user) {
            if (!loadingUser) setLoading(false);
            return;
        }

        const fetchInitialData = async () => {
             // Fetch Club Name
            const clubDocRef = doc(db, "clubs", user.uid);
            const clubDoc = await getDoc(clubDocRef);
            if (clubDoc.exists() && clubDoc.data().clubName) {
                setClubName(clubDoc.data().clubName);
            }

            // Fetch Opponents
            const opponentsQuery = query(collection(db, "opponents"), where("userId", "==", user.uid));
            const opponentsSnapshot = await getDocs(opponentsQuery);
            const opponentsData = opponentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Opponent));
            setOpponents(opponentsData);
        };
        
        fetchInitialData();

    }, [user, loadingUser]);

     useEffect(() => {
        if (!user) return;

        const fetchRankings = async () => {
            if (!selectedCategory) {
                setRankings([]);
                setLoading(false);
                return;
            }
            setLoading(true);

            const eventsQuery = query(
                collection(db, "events"),
                where("userId", "==", user.uid),
                where("type", "==", "Match de Championnat"),
                where("category", "==", selectedCategory)
            );

            const querySnapshot = await getDocs(eventsQuery);
            const events = querySnapshot.docs.map(doc => doc.data() as Event);

            const teamStats: { [key: string]: TeamStats } = {};
            const opponentsMap = new Map(opponents.map(o => [o.name, o]));


            teamStats[clubName] = { name: clubName, played: 0, wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0, goalDifference: 0, points: 0 };

            events.forEach(event => {
                if (typeof event.scoreTeam !== 'number' || typeof event.scoreOpponent !== 'number') {
                    return; // Skip unfinished matches
                }
                
                const opponentName = event.opponent!;
                if (!teamStats[opponentName]) {
                    const opponentData = opponentsMap.get(opponentName);
                    teamStats[opponentName] = { 
                        name: opponentName, 
                        logoUrl: opponentData?.logoUrl,
                        played: 0, wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0, goalDifference: 0, points: 0 
                    };
                }

                const isHomeMatch = event.location === 'Domicile';
                const clubScore = event.scoreTeam;
                const opponentScore = event.scoreOpponent;

                // Club's perspective
                teamStats[clubName].played++;
                teamStats[clubName].goalsFor += clubScore;
                teamStats[clubName].goalsAgainst += opponentScore;

                // Opponent's perspective
                teamStats[opponentName].played++;
                teamStats[opponentName].goalsFor += opponentScore;
                teamStats[opponentName].goalsAgainst += clubScore;

                if (clubScore > opponentScore) {
                    teamStats[clubName].wins++;
                    teamStats[clubName].points += 3;
                    teamStats[opponentName].losses++;
                } else if (clubScore < opponentScore) {
                    teamStats[clubName].losses++;
                    teamStats[opponentName].wins++;
                    teamStats[opponentName].points += 3;
                } else {
                    teamStats[clubName].draws++;
                    teamStats[clubName].points += 1;
                    teamStats[opponentName].draws++;
                    teamStats[opponentName].points += 1;
                }
            });

            const rankedTeams = Object.values(teamStats).map(team => ({
                ...team,
                goalDifference: team.goalsFor - team.goalsAgainst,
            })).sort((a, b) => {
                if (b.points !== a.points) {
                    return b.points - a.points;
                }
                if (b.goalDifference !== a.goalDifference) {
                    return b.goalDifference - a.goalDifference;
                }
                return b.goalsFor - a.goalsFor;
            });

            setRankings(rankedTeams);
            setLoading(false);
        };
        
        fetchRankings();

    }, [user, selectedCategory, clubName, opponents]);

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
                            Consultez le classement du championnat par catégorie.
                        </p>
                    </div>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Classement du Championnat</CardTitle>
                    <CardDescription>Sélectionnez une catégorie pour afficher le classement.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
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
                    
                    {loading ? (
                        <div className="flex justify-center items-center py-20">
                            <Loader2 className="h-10 w-10 animate-spin text-primary" />
                        </div>
                    ) : selectedCategory && rankings.length > 0 ? (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="text-center">Pos</TableHead>
                                        <TableHead>Équipe</TableHead>
                                        <TableHead className="text-center">Pts</TableHead>
                                        <TableHead className="text-center">J</TableHead>
                                        <TableHead className="text-center">G</TableHead>
                                        <TableHead className="text-center">N</TableHead>
                                        <TableHead className="text-center">P</TableHead>
                                        <TableHead className="text-center">BP</TableHead>
                                        <TableHead className="text-center">BC</TableHead>
                                        <TableHead className="text-center">Diff</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {rankings.map((team, index) => (
                                        <TableRow key={team.name} className={team.name === clubName ? "bg-primary/10" : ""}>
                                            <TableCell className="font-bold text-center">{index + 1}</TableCell>
                                            <TableCell className="font-medium">{team.name}</TableCell>
                                            <TableCell className="font-bold text-center">{team.points}</TableCell>
                                            <TableCell className="text-center">{team.played}</TableCell>
                                            <TableCell className="text-center">{team.wins}</TableCell>
                                            <TableCell className="text-center">{team.draws}</TableCell>
                                            <TableCell className="text-center">{team.losses}</TableCell>
                                            <TableCell className="text-center">{team.goalsFor}</TableCell>
                                            <TableCell className="text-center">{team.goalsAgainst}</TableCell>
                                            <TableCell className="text-center">{team.goalDifference}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    ) : (
                        <div className="text-center text-muted-foreground py-20">
                            <p>{selectedCategory ? "Aucun match de championnat trouvé pour cette catégorie." : "Veuillez sélectionner une catégorie pour voir le classement."}</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
    
