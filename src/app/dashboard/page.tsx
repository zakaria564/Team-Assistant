
"use client";

import { KpiCard } from "@/components/kpi-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users, Trophy, ArrowUpRight, Loader2, ClipboardList, AlertTriangle } from "lucide-react";
import Link from 'next/link';
import { useEffect, useState } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { format, startOfDay, compareAsc } from "date-fns";
import { fr } from "date-fns/locale";
import { PlayersByCategoryChart } from "@/components/dashboard/players-by-category-chart";
import { useAuthState } from "react-firebase-hooks/auth";
import { useRouter } from "next/navigation";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface Player {
    id: string;
    category: string;
}

interface ChartData {
    name: string;
    value: number;
    fill: string;
}

interface Event {
  id: string;
  type: string;
  teamHome: string;
  teamAway: string;
  category: string;
  date: Date;
}

export default function Dashboard() {
  const [user, loadingUser] = useAuthState(auth);
  const router = useRouter();
  const [playerCount, setPlayerCount] = useState(0);
  const [coachCount, setCoachCount] = useState(0);
  const [loadingStats, setLoadingStats] = useState(true);
  const [playersByCategory, setPlayersByCategory] = useState<ChartData[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<Event[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [eventsError, setEventsError] = useState(false);

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!user) {
        if (!loadingUser) {
          setLoadingStats(false);
          setLoadingEvents(false);
        }
        return;
      };

      setLoadingStats(true);

      try {
        const playersQuery = query(collection(db, "players"), where("userId", "==", user.uid));
        const playersSnapshot = await getDocs(playersQuery);
        setPlayerCount(playersSnapshot.size);
        
        const coachesQuery = query(collection(db, "coaches"), where("userId", "==", user.uid));
        const coachesSnapshot = await getDocs(coachesQuery);
        setCoachCount(coachesSnapshot.size);
        
        const playersData = playersSnapshot.docs.map(doc => doc.data() as Player);
        const categoryCounts = playersData.reduce((acc, player) => {
            const category = player.category || "Sans catégorie";
            acc[category] = (acc[category] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        const colors = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658'];
        const chartData = Object.entries(categoryCounts).map(([category, total], index) => ({
            name: category,
            value: total,
            fill: colors[index % colors.length]
        }));
        setPlayersByCategory(chartData);

      } catch (error) {
        console.error("Error fetching dashboard data: ", error);
      } finally {
        setLoadingStats(false);
      }
    };
    
    const fetchUpcomingEvents = async () => {
        if (!user) {
            if (!loadingUser) setLoadingEvents(false);
            return;
        }
        setLoadingEvents(true);
        setEventsError(false);
        try {
            const eventsQuery = query(collection(db, "events"), where("userId", "==", user.uid));
            const querySnapshot = await getDocs(eventsQuery);
            const today = startOfDay(new Date());

            const eventsData = querySnapshot.docs.map(doc => ({ 
                id: doc.id,
                ...doc.data(),
                date: doc.data().date.toDate() 
            } as Event))
            .filter(event => event.date >= today);
            
            eventsData.sort((a, b) => compareAsc(a.date, b.date));
            setUpcomingEvents(eventsData.slice(0, 5));
        } catch (error) {
            console.error("Error fetching upcoming events: ", error);
            setEventsError(true);
        } finally {
            setLoadingEvents(false);
        }
    };

    fetchDashboardData();
    fetchUpcomingEvents();
  }, [user, loadingUser]);

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-4">
          <div>
            <h1 className="text-3xl font-black uppercase tracking-tighter italic">Tableau de bord</h1>
            <p className="text-muted-foreground font-medium">Suivez l'activité et les performances de votre club.</p>
          </div>
          <div className="flex gap-2 w-full md:w-auto">
              <Button asChild variant="outline" className="flex-1 md:flex-none font-bold uppercase tracking-widest text-[10px]">
                  <Link href="/dashboard/rankings">
                      <Trophy className="mr-2 h-4 w-4" /> Classements
                  </Link>
              </Button>
              <Button asChild className="flex-1 md:flex-none font-bold uppercase tracking-widest text-[10px]">
                  <Link href="/dashboard/events/add">
                      Ajouter Match
                  </Link>
              </Button>
          </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
         <div className="grid gap-4 md:col-span-1 lg:col-span-1">
            <KpiCard 
              title="Total Joueurs"
              value={loadingStats ? "..." : playerCount.toString()}
              icon={Users}
              description="Joueurs actifs inscrits"
              loading={loadingStats || loadingUser}
            />
             <KpiCard 
              title="Total Entraîneurs"
              value={loadingStats ? "..." : coachCount.toString()}
              icon={ClipboardList}
              description="Effectif technique"
              loading={loadingStats || loadingUser}
            />
        </div>
         <Card className="md:col-span-1 lg:col-span-2">
           <CardHeader>
            <CardTitle>Effectif par Catégorie</CardTitle>
            <CardDescription>Distribution visuelle de vos joueurs.</CardDescription>
           </CardHeader>
           <CardContent>
            {loadingStats || loadingUser ? (
                <div className="flex items-center justify-center h-[300px]">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            ) : playersByCategory.length > 0 ? (
                <PlayersByCategoryChart data={playersByCategory} />
            ) : (
                <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                    Aucune donnée disponible.
                </div>
            )}
           </CardContent>
         </Card>
      </div>

      <div className="grid gap-4 md:gap-8 lg:grid-cols-1">
        <Card>
          <CardHeader className="flex flex-col md:flex-row items-start md:items-center">
            <div className="grid gap-2 flex-1">
              <CardTitle>Calendrier Proche</CardTitle>
              <CardDescription>Les prochains rendez-vous de vos équipes.</CardDescription>
            </div>
            <Button asChild size="sm" variant="ghost" className="ml-auto gap-1">
              <Link href="/dashboard/events">Voir tout <ArrowUpRight className="h-4 w-4" /></Link>
            </Button>
          </CardHeader>
          <CardContent>
            {loadingEvents ? (
                 <div className="flex items-center justify-center h-[200px]"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
            ) : eventsError ? (
                <Alert variant="destructive"><AlertTriangle className="h-4 w-4" /><AlertTitle>Erreur</AlertTitle><AlertDescription>Impossible de charger les événements.</AlertDescription></Alert>
            ) : upcomingEvents.length > 0 ? (
                <Table>
                <TableHeader>
                    <TableRow>
                    <TableHead>Match / Événement</TableHead>
                    <TableHead className="hidden sm:table-cell">Date</TableHead>
                    <TableHead className="hidden md:table-cell text-center">Heure</TableHead>
                    <TableHead className="text-right">Groupe</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {upcomingEvents.map(event => (
                        <TableRow key={event.id} onClick={() => router.push(`/dashboard/events/${event.id}`)} className="cursor-pointer">
                            <TableCell>
                                <div className="font-bold uppercase tracking-tight">{event.type}</div>
                                <div className="text-xs text-muted-foreground">{event.teamHome} vs {event.teamAway}</div>
                            </TableCell>
                            <TableCell className="hidden sm:table-cell font-medium">{format(event.date, "dd MMMM yyyy", { locale: fr })}</TableCell>
                             <TableCell className="hidden md:table-cell text-center font-mono">{format(event.date, "HH:mm")}</TableCell>
                            <TableCell className="text-right font-black">{event.category}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
                </Table>
            ) : (
                <div className="flex items-center justify-center h-[200px] text-muted-foreground italic">Aucun événement planifié.</div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
