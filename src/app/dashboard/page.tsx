
"use client";

import { KpiCard } from "@/components/kpi-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users, DollarSign, Activity, ArrowUpRight, Loader2 } from "lucide-react";
import Link from 'next/link';
import { Badge } from "@/components/ui/badge";
import { useEffect, useState } from "react";
import { collection, query, where, orderBy, limit, getDocs, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { format, subDays, startOfDay } from "date-fns";
import { fr } from "date-fns/locale";
import { PlayersByCategoryChart } from "@/components/dashboard/players-by-category-chart";

interface Event {
  id: string;
  type: "Match" | "Entraînement";
  team: string;
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
  const [upcomingEvents, setUpcomingEvents] = useState<Event[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [playerCount, setPlayerCount] = useState(0);
  const [loadingStats, setLoadingStats] = useState(true);
  const [playersByCategory, setPlayersByCategory] = useState<ChartData[]>([]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoadingEvents(true);
      setLoadingStats(true);
      try {
        // Fetch upcoming events
        const startDate = startOfDay(new Date());
        const eventsQuery = query(
          collection(db, "events"),
          where("date", ">=", startDate),
          orderBy("date", "asc"),
          limit(5)
        );
        const eventsSnapshot = await getDocs(eventsQuery);
        const eventsData = eventsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          date: doc.data().date.toDate(),
        } as Event));
        setUpcomingEvents(eventsData);

        // Fetch players data for stats
        const playersSnapshot = await getDocs(collection(db, "players"));
        setPlayerCount(playersSnapshot.size);
        
        const playersData = playersSnapshot.docs.map(doc => doc.data() as Player);
        const categoryCounts = playersData.reduce((acc, player) => {
            acc[player.category] = (acc[player.category] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        const colors = [
            'hsl(var(--primary))',
            'hsl(var(--accent))',
            'hsl(24, 9.8%, 10%)',
            'hsl(60, 4.8%, 95.9%)',
            'hsl(120, 75%, 53%)',
            'hsl(280, 75%, 53%)',
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
  }, []);

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="grid gap-4 md:grid-cols-2 md:gap-8 lg:grid-cols-3">
        <KpiCard 
          title="Total Joueurs"
          value={loadingStats ? "..." : playerCount.toString()}
          icon={Users}
          description="Nombre total de joueurs inscrits"
          loading={loadingStats}
        />
         <Card className="md:col-span-1 lg:col-span-2">
           <CardHeader>
            <CardTitle>Répartition des Joueurs par Catégorie</CardTitle>
            <CardDescription>Visualisez la distribution des joueurs dans les différentes catégories.</CardDescription>
           </CardHeader>
           <CardContent>
            {loadingStats ? (
                <div className="flex items-center justify-center h-[300px]">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            ) : (
                <PlayersByCategoryChart data={playersByCategory} />
            )}
           </CardContent>
         </Card>
      </div>
      <div className="grid gap-4 md:gap-8 lg:grid-cols-1">
        <Card>
          <CardHeader className="flex flex-row items-center">
            <div className="grid gap-2">
              <CardTitle>Événements à venir</CardTitle>
              <CardDescription>
                Les 5 prochains matchs et entraînements de vos équipes.
              </CardDescription>
            </div>
            <Button asChild size="sm" className="ml-auto gap-1">
              <Link href="/dashboard/events">
                Voir tout
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {loadingEvents ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Équipe</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Adversaire</TableHead>
                    <TableHead>Lieu</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Heure</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {upcomingEvents.length > 0 ? (
                    upcomingEvents.map(event => (
                      <TableRow key={event.id}>
                        <TableCell>
                          <div className="font-medium">{event.team}</div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className={event.type.includes('Match') ? 'bg-primary/20 text-primary' : 'bg-accent/20 text-accent-foreground'}>
                            {event.type}
                          </Badge>
                        </TableCell>
                        <TableCell>{event.type.includes('Match') ? event.opponent : "N/A"}</TableCell>
                        <TableCell>{event.location}</TableCell>
                        <TableCell>{format(event.date, "dd/MM/yyyy", { locale: fr })}</TableCell>
                        <TableCell>{format(event.date, "HH:mm", { locale: fr })}</TableCell>
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
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
