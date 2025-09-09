
"use client";

import { KpiCard } from "@/components/kpi-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users, DollarSign, Activity, ArrowUpRight, Loader2, ClipboardList } from "lucide-react";
import Link from 'next/link';
import { Badge } from "@/components/ui/badge";
import { useEffect, useState } from "react";
import { collection, query, where, orderBy, limit, getDocs, Timestamp } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { format, subDays, startOfDay, isAfter } from "date-fns";
import { fr } from "date-fns/locale";
import { PlayersByCategoryChart } from "@/components/dashboard/players-by-category-chart";
import { cn } from "@/lib/utils";
import { useAuthState } from "react-firebase-hooks/auth";
import { useRouter } from "next/navigation";

interface Event {
  id: string;
  type: "Match" | "Entraînement";
  team: string;
  category: string;
  opponent?: string;
  date: Date;
  location: string;
}

interface Player {
    id: string;
    category: string;
}

interface ChartData {
    name: string;
    value: number;
    fill: string;
}

export default function Dashboard() {
  const [user, loadingUser] = useAuthState(auth);
  const router = useRouter();
  const [upcomingEvents, setUpcomingEvents] = useState<Event[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [playerCount, setPlayerCount] = useState(0);
  const [coachCount, setCoachCount] = useState(0);
  const [loadingStats, setLoadingStats] = useState(true);
  const [playersByCategory, setPlayersByCategory] = useState<ChartData[]>([]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!user) {
        if (!loadingUser) {
          setLoadingEvents(false);
          setLoadingStats(false);
        }
        return;
      };

      setLoadingEvents(true);
      setLoadingStats(true);

      try {
        // Fetch upcoming events for the current user
        const today = startOfDay(new Date());
        const eventsQuery = query(
          collection(db, "events"),
          where("userId", "==", user.uid)
        );
        const eventsSnapshot = await getDocs(eventsQuery);
        const eventsData = eventsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          date: doc.data().date.toDate(),
        } as Event));
        
        const futureEvents = eventsData
          .filter(event => isAfter(event.date, today))
          .sort((a, b) => a.date.getTime() - b.date.getTime())
          .slice(0, 5);

        setUpcomingEvents(futureEvents);

        // Fetch players data for stats for the current user
        const playersQuery = query(collection(db, "players"), where("userId", "==", user.uid));
        const playersSnapshot = await getDocs(playersQuery);
        setPlayerCount(playersSnapshot.size);
        
        // Fetch coaches data for stats for the current user
        const coachesQuery = query(collection(db, "coaches"), where("userId", "==", user.uid));
        const coachesSnapshot = await getDocs(coachesQuery);
        setCoachCount(coachesSnapshot.size);
        
        const playersData = playersSnapshot.docs.map(doc => doc.data() as Player);
        const categoryCounts = playersData.reduce((acc, player) => {
            const category = player.category || "Sans catégorie";
            acc[category] = (acc[category] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        const colors = [
            '#0088FE',
            '#00C49F',
            '#FFBB28',
            '#FF8042',
            '#8884d8',
            '#82ca9d',
            '#ffc658',
        ];

        const chartData = Object.entries(categoryCounts).map(([category, total], index) => ({
            name: category,
            value: total,
            fill: colors[index % colors.length]
        }));
        setPlayersByCategory(chartData);


      } catch (error) {
        console.error("Error fetching dashboard data: ", error);
        // Optionally show a toast message here
      } finally {
        setLoadingEvents(false);
        setLoadingStats(false);
      }
    };

    fetchDashboardData();
  }, [user, loadingUser]);

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
         <div className="grid gap-4 md:col-span-1 lg:col-span-1">
            <KpiCard 
              title="Total Joueurs"
              value={loadingStats ? "..." : playerCount.toString()}
              icon={Users}
              description="Nombre total de joueurs inscrits"
              loading={loadingStats || loadingUser}
            />
             <KpiCard 
              title="Total Entraîneurs"
              value={loadingStats ? "..." : coachCount.toString()}
              icon={ClipboardList}
              description="Nombre total d'entraîneurs actifs"
              loading={loadingStats || loadingUser}
            />
        </div>
         <Card className="md:col-span-1 lg:col-span-2">
           <CardHeader>
            <CardTitle>Répartition des Joueurs par Catégorie</CardTitle>
            <CardDescription>Visualisez la distribution des joueurs dans les différentes catégories.</CardDescription>
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
                    Aucune donnée de joueur à afficher.
                </div>
            )}
           </CardContent>
         </Card>
      </div>
      <div className="grid gap-4 md:gap-8 lg:grid-cols-1">
        <Card>
          <CardHeader className="flex flex-col md:flex-row items-start md:items-center">
            <div className="grid gap-2 flex-1">
              <CardTitle>Événements à venir</CardTitle>
              <CardDescription>
                Les 5 prochains matchs et entraînements de vos équipes.
              </CardDescription>
            </div>
            <Button asChild size="sm" className="ml-auto gap-1 w-full md:w-auto mt-4 md:mt-0">
              <Link href="/dashboard/events">
                Voir tout
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="w-full overflow-x-auto">
              {loadingEvents || loadingUser ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Équipe</TableHead>
                      <TableHead className="hidden sm:table-cell">Adversaire</TableHead>
                      <TableHead className="hidden md:table-cell">Lieu</TableHead>
                      <TableHead className="hidden lg:table-cell">Date</TableHead>
                      <TableHead className="hidden lg:table-cell">Heure</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {upcomingEvents.length > 0 ? (
                      upcomingEvents.map(event => (
                        <TableRow 
                            key={event.id} 
                            className="cursor-pointer"
                            onClick={() => router.push(`/dashboard/events/${event.id}`)}
                        >
                           <TableCell>
                            <Badge variant="secondary" className={cn('whitespace-nowrap', event.type.includes('Match') ? 'bg-primary/20 text-primary' : 'bg-accent/20 text-accent-foreground')}>
                              {event.type}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">{event.team.replace(/^Club\s/i, '')}</div>
                            <div className="text-sm text-muted-foreground md:hidden">{event.opponent}</div>
                          </TableCell>
                          <TableCell className="hidden sm:table-cell">{event.type.includes('Match') ? event.opponent : "N/A"}</TableCell>
                          <TableCell className="hidden md:table-cell">{event.location}</TableCell>
                          <TableCell className="hidden lg:table-cell">{format(event.date, "dd/MM/yyyy", { locale: fr })}</TableCell>
                          <TableCell className="hidden lg:table-cell">{format(event.date, "HH:mm", { locale: fr })}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                          Aucun événement à venir.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
