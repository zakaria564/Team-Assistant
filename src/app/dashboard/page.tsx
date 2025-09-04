
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

interface Event {
  id: string;
  type: "Match" | "Entraînement";
  team: string;
  opponent?: string;
  date: Date;
  location: string;
}

export default function Dashboard() {
  const [upcomingEvents, setUpcomingEvents] = useState<Event[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [playerCount, setPlayerCount] = useState(0);
  const [loadingStats, setLoadingStats] = useState(true);

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

        // Fetch player count
        const playersSnapshot = await getDocs(collection(db, "players"));
        setPlayerCount(playersSnapshot.size);

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
      <div className="grid gap-4 md:grid-cols-2 md:gap-8 lg:grid-cols-2">
        <KpiCard 
          title="Total Joueurs"
          value={loadingStats ? "..." : playerCount.toString()}
          icon={Users}
          description="Nombre total de joueurs inscrits"
          loading={loadingStats}
        />
        {/* The revenue card was here */}
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
                          <Badge variant="secondary" className={event.type === 'Match' ? 'bg-primary/20 text-primary' : 'bg-accent/20 text-accent-foreground'}>
                            {event.type}
                          </Badge>
                        </TableCell>
                        <TableCell>{event.type === 'Match' ? event.opponent : "N/A"}</TableCell>
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
