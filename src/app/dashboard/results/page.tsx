
"use client";

import { useState, useEffect } from "react";
import { collection, query, where, getDocs, doc, getDoc, orderBy } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, ArrowLeft, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface MatchEvent {
    id: string;
    type: string;
    teamHome: string;
    teamAway: string;
    category: string;
    date: Date;
    scoreHome: number;
    scoreAway: number;
}

interface GroupedResults {
    [category: string]: MatchEvent[];
}

const getResultBadgeClass = (scoreHome?: number, scoreAway?: number) => {
    if (typeof scoreHome !== 'number' || typeof scoreAway !== 'number') return "bg-gray-100 text-gray-800 border-gray-300";
    if (scoreHome > scoreAway) return "bg-green-100 text-green-800 border-green-300";
    if (scoreHome < scoreAway) return "bg-red-100 text-red-800 border-red-300";
    return "bg-yellow-100 text-yellow-800 border-yellow-300";
};

const getResultLabel = (scoreHome?: number, scoreAway?: number, teamName?: string, homeTeam?: string, awayTeam?: string) => {
    if (typeof scoreHome !== 'number' || typeof scoreAway !== 'number' || !teamName || !homeTeam || !awayTeam) return "Terminé";
    if (scoreHome === scoreAway) return "Match Nul";
    if (homeTeam !== teamName && awayTeam !== teamName) return "Terminé";
    if (teamName === homeTeam) return scoreHome > scoreAway ? "Victoire" : "Défaite";
    if (teamName === awayTeam) return scoreAway > scoreHome ? "Victoire" : "Défaite";
    return "Terminé";
};


export default function ResultsPage() {
    const [user, loadingUser] = useAuthState(auth);
    const router = useRouter();
    const [groupedResults, setGroupedResults] = useState<GroupedResults>({});
    const [loading, setLoading] = useState(true);
    const [clubName, setClubName] = useState("Votre Club");

    useEffect(() => {
        if (!user) {
            if (!loadingUser) setLoading(false);
            return;
        }

        const fetchResults = async () => {
            setLoading(true);
            try {
                const clubDocRef = doc(db, "clubs", user.uid);
                const eventsQuery = query(
                    collection(db, "events"),
                    where("userId", "==", user.uid),
                    orderBy("date", "desc")
                );

                const [clubDoc, eventsSnapshot] = await Promise.all([
                    getDoc(clubDocRef),
                    getDocs(eventsQuery)
                ]);

                if (clubDoc.exists() && clubDoc.data().clubName) {
                    setClubName(clubDoc.data().clubName);
                }

                const pastMatches = eventsSnapshot.docs
                    .map(doc => ({ id: doc.id, ...doc.data(), date: doc.data().date.toDate() } as MatchEvent))
                    .filter(event => 
                        (event.type.includes("Match") || event.type.includes("Tournoi")) &&
                        typeof event.scoreHome === 'number' &&
                        typeof event.scoreAway === 'number' &&
                        event.date < new Date()
                    );
                
                const grouped = pastMatches.reduce((acc, match) => {
                    const category = match.category || "Sans catégorie";
                    if(!acc[category]) {
                        acc[category] = [];
                    }
                    acc[category].push(match);
                    return acc;
                }, {} as GroupedResults);
                
                setGroupedResults(grouped);

            } catch (error) {
                console.error("Error fetching results:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchResults();
    }, [user, loadingUser]);

    const sortedCategories = Object.keys(groupedResults).sort();

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => router.back()}>
                        <ArrowLeft className="h-6 w-6" />
                        <span className="sr-only">Retour</span>
                    </Button>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Résultats</h1>
                        <p className="text-muted-foreground">
                            Consultez les résultats de tous les matchs passés.
                        </p>
                    </div>
                </div>
            </div>

            {loading || loadingUser ? (
                <div className="flex justify-center items-center py-20">
                    <Loader2 className="h-10 w-10 animate-spin text-primary" />
                </div>
            ) : sortedCategories.length > 0 ? (
                <div className="space-y-8">
                {sortedCategories.map(category => (
                    <Card key={category}>
                        <CardHeader>
                            <CardTitle>{category}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {groupedResults[category].map(match => (
                                <div key={match.id} onClick={() => router.push(`/dashboard/events/${match.id}`)} className="cursor-pointer p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                                    <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                                        <div className="flex-1">
                                            <p className="text-xs text-muted-foreground">{format(match.date, "eeee dd MMMM yyyy", { locale: fr })}</p>
                                            <p className="font-semibold text-lg">{match.teamHome} vs {match.teamAway}</p>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <div className="text-2xl font-bold text-center">
                                                <span>{match.scoreHome} - {match.scoreAway}</span>
                                            </div>
                                             <Badge className={cn("text-sm", getResultBadgeClass(match.scoreHome, match.scoreAway))}>
                                                {getResultLabel(match.scoreHome, match.scoreAway, clubName, match.teamHome, match.teamAway)}
                                            </Badge>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                ))}
                </div>
            ) : (
                <Card>
                    <CardContent className="py-20 text-center text-muted-foreground">
                        <p>Aucun résultat de match n'est encore disponible.</p>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
