
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
    teamHome: string;
    teamAway: string;
    category: string;
    date: { seconds: number, nanoseconds: number };
    scoreHome?: number;
    scoreAway?: number;
}

interface Opponent {
  id: string;
  name: string;
  logoUrl?: string;
}

const playerCategories = [
    "Seniors", "Seniors F", "U19", "U18", "U17", "U17 F", "U16", "U15", "U15 F", "U14", "U13", "U13 F", "U12", "U11", "U11 F", "U10", "U9", "U8", "U7", "Vétérans", "École de foot"
];

const competitionTypes = [
    "Match de Championnat",
    "Match de Coupe",
    "Tournoi"
];


export default function RankingsPage() {
    const [user, loadingUser] = useAuthState(auth);
    const router = useRouter();
    const [rankings, setRankings] = useState<TeamStats[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState<string>("");
    const [selectedCompetition, setSelectedCompetition] = useState<string>("Match de Championnat");
    const [clubName, setClubName] = useState("Votre Club");
    const [clubLogoUrl, setClubLogoUrl] = useState<string | undefined>(undefined);

    useEffect(() => {
        if (!user || !selectedCategory || !selectedCompetition) {
            setRankings([]);
            if (user) setLoading(false);
            return;
        }

        const fetchRankings = async () => {
            setLoading(true);

            try {
                // 1. Fetch all necessary data in parallel
                const clubDocRef = doc(db, "clubs", user.uid);
                const opponentsQuery = query(collection(db, "opponents"), where("userId", "==", user.uid));
                const eventsQuery = query(
                    collection(db, "events"),
                    where("userId", "==", user.uid),
                    where("type", "==", selectedCompetition),
                    where("category", "==", selectedCategory)
                );

                const [clubDoc, opponentsSnapshot, eventsSnapshot] = await Promise.all([
                    getDoc(clubDocRef),
                    getDocs(opponentsQuery),
                    getDocs(eventsQuery)
                ]);

                // 2. Process team data into a reliable map
                const allTeamsMap = new Map<string, { logoUrl?: string }>();
                
                // Add user's club to the map first
                let localClubName = "Votre Club";
                if (clubDoc.exists()) {
                    const clubData = clubDoc.data();
                    if(clubData.clubName) {
                        localClubName = clubData.clubName;
                    }
                    allTeamsMap.set(localClubName, { logoUrl: clubData.logoUrl });
                } else {
                    allTeamsMap.set(localClubName, { logoUrl: undefined });
                }
                setClubName(localClubName);

                // Add opponents to the map
                opponentsSnapshot.docs.forEach(doc => {
                    const opponent = doc.data() as Opponent;
                    allTeamsMap.set(opponent.name, { logoUrl: opponent.logoUrl });
                });
                
                const events = eventsSnapshot.docs.map(doc => doc.data() as Event);

                const teamStats: { [key: string]: TeamStats } = {};

                // Helper to initialize team stats from our reliable map
                const initializeTeam = (teamName: string) => {
                    if (!teamStats[teamName]) {
                        const teamData = allTeamsMap.get(teamName);
                        teamStats[teamName] = {
                            name: teamName,
                            logoUrl: teamData?.logoUrl, // Use logo from the map
                            played: 0, wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0, goalDifference: 0, points: 0
                        };
                    }
                };
                
                // 3. Calculate stats from events
                events.forEach(event => {
                    if (typeof event.scoreHome !== 'number' || typeof event.scoreAway !== 'number') {
                        return; // Skip events without a final score
                    }
                    
                    const { teamHome, teamAway, scoreHome, scoreAway } = event;
                    
                    if (!teamHome || !teamAway) return;

                    initializeTeam(teamHome);
                    initializeTeam(teamAway);

                    teamStats[teamHome].played++;
                    teamStats[teamAway].played++;
                    teamStats[teamHome].goalsFor += scoreHome;
                    teamStats[teamHome].goalsAgainst += scoreAway;
                    teamStats[teamAway].goalsFor += scoreAway;
                    teamStats[teamAway].goalsAgainst += scoreHome;

                    if (scoreHome > scoreAway) {
                        teamStats[teamHome].wins++;
                        teamStats[teamHome].points += 3;
                        teamStats[teamAway].losses++;
                    } else if (scoreAway > scoreHome) {
                        teamStats[teamAway].wins++;
                        teamStats[teamAway].points += 3;
                        teamStats[teamHome].losses++;
                    } else {
                        teamStats[teamHome].draws++;
                        teamStats[teamHome].points += 1;
                        teamStats[teamAway].draws++;
                        teamStats[teamAway].points += 1;
                    }
                });

                // 4. Sort and set the final rankings
                const rankedTeams = Object.values(teamStats).map(team => ({
                    ...team,
                    goalDifference: team.goalsFor - team.goalsAgainst,
                })).sort((a, b) => {
                    if (b.points !== a.points) return b.points - a.points;
                    if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
                    return b.goalsFor - a.goalsFor;
                });
                
                const finalRankings = rankedTeams.filter(team => team.played > 0);

                setRankings(finalRankings);
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
                    ) : selectedCategory && rankings.length > 0 ? (
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
                                            <TableRow key={team.name} className={team.name === clubName ? "bg-primary/10" : ""}>
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
                                            <TableRow key={team.name} className={team.name === clubName ? "bg-primary/10" : ""}>
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
                    ) : (
                        <div className="text-center text-muted-foreground py-20">
                            <p>{selectedCategory ? `Aucune donnée de match trouvée pour "${selectedCompetition}" dans la catégorie "${selectedCategory}".` : "Veuillez sélectionner une catégorie pour voir le classement."}</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
