
"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Search, BarChart, Pencil } from "lucide-react";
import Link from "next/link";
import { collection, getDocs, query, where, orderBy } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useAuthState } from "react-firebase-hooks/auth";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface MatchEvent {
  id: string;
  type: string;
  team: string;
  opponent: string;
  date: { seconds: number, nanoseconds: number };
  location: string;
  scoreTeam?: number;
  scoreOpponent?: number;
}

const getResultBadgeClass = (scoreTeam?: number, scoreOpponent?: number) => {
    if (scoreTeam === undefined || scoreTeam === null || scoreOpponent === undefined || scoreOpponent === null) {
      return "bg-gray-100 text-gray-800 border-gray-300"; // En attente
    }
    if (scoreTeam > scoreOpponent) {
      return "bg-green-100 text-green-800 border-green-300"; // Victoire
    }
    if (scoreTeam < scoreOpponent) {
      return "bg-red-100 text-red-800 border-red-300"; // Défaite
    }
    return "bg-yellow-100 text-yellow-800 border-yellow-300"; // Nul
  };
  
const getResultLabel = (scoreTeam?: number, scoreOpponent?: number) => {
    if (scoreTeam === undefined || scoreTeam === null || scoreOpponent === undefined || scoreOpponent === null) {
        return "En attente";
    }
    if (scoreTeam > scoreOpponent) return "Victoire";
    if (scoreTeam < scoreOpponent) return "Défaite";
    return "Match Nul";
};

export default function ResultsPage() {
  const [user, loadingUser] = useAuthState(auth);
  const [matches, setMatches] = useState<MatchEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [searchCategory, setSearchCategory] = useState("team");

  useEffect(() => {
    const fetchMatches = async () => {
      if (!user) {
        if (!loadingUser) setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const q = query(
            collection(db, "events"), 
            where("userId", "==", user.uid),
            orderBy("date", "desc")
        );
        const querySnapshot = await getDocs(q);
        
        const eventsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MatchEvent));
        
        const matchTypes = ["Match de Championnat", "Match Amical", "Match de Coupe", "Tournoi"];
        const matchesData = eventsData.filter(event => 
            matchTypes.includes(event.type) && 
            new Date(event.date.seconds * 1000) <= new Date()
        );

        setMatches(matchesData);
      } catch (error: any) {
        console.error("Error fetching matches: ", error);
        toast({
          variant: "destructive",
          title: "Erreur de chargement",
          description: "Impossible de charger les résultats. Veuillez vérifier vos règles de sécurité et index Firestore.",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchMatches();
  }, [user, loadingUser, toast]);

  const filteredMatches = useMemo(() => {
    if (!searchTerm) return matches;
    const lowercasedSearchTerm = searchTerm.toLowerCase();

    return matches.filter(match => {
      const valueToSearch = searchCategory === 'team' ? match.team : match.opponent;
      return valueToSearch.toLowerCase().includes(lowercasedSearchTerm);
    });
  }, [matches, searchTerm, searchCategory]);

  return (
    <>
      <div>
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Résultats des Matchs</h1>
            <p className="text-muted-foreground">Consultez et gérez les résultats des matchs passés.</p>
          </div>
        </div>

        <div className="flex flex-col md:flex-row items-center gap-4 mb-4">
              <div className="relative w-full md:max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input 
                      placeholder="Rechercher une équipe..."
                      className="pl-10"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                  />
              </div>
              <Select value={searchCategory} onValueChange={setSearchCategory}>
                  <SelectTrigger className="w-full md:w-[180px]">
                      <SelectValue placeholder="Critère" />
                  </SelectTrigger>
                  <SelectContent>
                      <SelectItem value="team">Mes équipes</SelectItem>
                      <SelectItem value="opponent">Adversaires</SelectItem>
                  </SelectContent>
              </Select>
          </div>

        <Card>
          <CardHeader>
            <CardTitle>Liste des matchs</CardTitle>
            <CardDescription>Retrouvez ici tous les matchs passés du club.</CardDescription>
          </CardHeader>
          <CardContent>
            {loading || loadingUser ? (
              <div className="flex justify-center items-center py-10">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <div className="w-full overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Compétition</TableHead>
                      <TableHead>Match</TableHead>
                      <TableHead>Score</TableHead>
                      <TableHead>Résultat</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredMatches.length > 0 ? (
                      filteredMatches.map((match) => (
                        <TableRow key={match.id}>
                          <TableCell>
                            {format(new Date(match.date.seconds * 1000), "dd/MM/yyyy", { locale: fr })}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{match.type}</Badge>
                          </TableCell>
                          <TableCell className="font-medium">
                            {match.team} vs {match.opponent}
                          </TableCell>
                          <TableCell>
                            {(match.scoreTeam !== undefined && match.scoreTeam !== null) ? (
                                <span className="font-bold">{match.scoreTeam} - {match.scoreOpponent}</span>
                            ) : (
                                <span className="text-muted-foreground"> - </span>
                            )}
                          </TableCell>
                           <TableCell>
                                <Badge className={cn("text-xs", getResultBadgeClass(match.scoreTeam, match.scoreOpponent))}>
                                {getResultLabel(match.scoreTeam, match.scoreOpponent)}
                                </Badge>
                           </TableCell>
                          <TableCell className="text-right">
                             <Button asChild variant="outline" size="sm">
                                <Link href={`/dashboard/events/${match.id}/edit`}>
                                    <Pencil className="mr-2 h-3 w-3"/>
                                    {(match.scoreTeam !== undefined && match.scoreTeam !== null) ? "Modifier" : "Ajouter"}
                                </Link>
                             </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                          <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                            {searchTerm ? "Aucun match ne correspond à votre recherche." : "Aucun résultat de match trouvé."}
                          </TableCell>
                        </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
