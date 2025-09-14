
"use client";

import { KpiCard } from "@/components/kpi-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users, DollarSign, Activity, ArrowUpRight, Loader2, ClipboardList, AlertTriangle } from "lucide-react";
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

export default function Dashboard() {
  const [user, loadingUser] = useAuthState(auth);
  const router = useRouter();
  const [playerCount, setPlayerCount] = useState(0);
  const [coachCount, setCoachCount] = useState(0);
  const [loadingStats, setLoadingStats] = useState(true);
  const [playersByCategory, setPlayersByCategory] = useState<ChartData[]>([]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!user) {
        if (!loadingUser) {
          setLoadingStats(false);
        }
        return;
      };

      setLoadingStats(true);

      try {
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
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Fonctionnalité temporairement désactivée</AlertTitle>
              <AlertDescription>
                La section des événements à venir est en cours de maintenance en raison d'un problème de base de données. Veuillez consulter la page Événements en attendant.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
