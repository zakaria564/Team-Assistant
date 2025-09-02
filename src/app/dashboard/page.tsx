
import { KpiCard } from "@/components/kpi-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users, DollarSign, CalendarClock, Activity, ArrowUpRight } from "lucide-react";
import Link from 'next/link';
import { Badge } from "@/components/ui/badge";

export default function Dashboard() {
  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="grid gap-4 md:grid-cols-2 md:gap-8 lg:grid-cols-4">
        <KpiCard 
          title="Total Joueurs"
          value="125"
          icon={Users}
          description="+12 depuis le mois dernier"
        />
        <KpiCard 
          title="Revenus du Mois"
          value="2,540€"
          icon={DollarSign}
          description="+20.1% vs mois dernier"
        />
        <KpiCard 
          title="Prochain Entraînement"
          value="Demain, 18:00"
          icon={CalendarClock}
          description="Catégorie U15"
        />
        <KpiCard 
          title="Taux de Présence"
          value="92.5%"
          icon={Activity}
          description="Moyenne sur tous les entraînements"
        />
      </div>
      <div className="grid gap-4 md:gap-8 lg:grid-cols-2 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader className="flex flex-row items-center">
            <div className="grid gap-2">
              <CardTitle>Événements à venir</CardTitle>
              <CardDescription>
                Liste des prochains matchs et entraînements de vos équipes.
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
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Équipe</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Adversaire/Lieu</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell>
                    <div className="font-medium">Seniors A</div>
                  </TableCell>
                  <TableCell>
                     <Badge variant="secondary" className="bg-primary/20 text-primary">Match</Badge>
                  </TableCell>
                  <TableCell>FC Rive Droite</TableCell>
                  <TableCell>25/05/2024 - 15:00</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>
                    <div className="font-medium">U17</div>
                  </TableCell>
                   <TableCell>
                     <Badge variant="secondary" className="bg-primary/20 text-primary">Match</Badge>
                  </TableCell>
                  <TableCell>AS Monts d'Or</TableCell>
                  <TableCell>25/05/2024 - 10:30</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>
                    <div className="font-medium">U15</div>
                  </TableCell>
                   <TableCell>
                     <Badge variant="secondary" className="bg-accent/20 text-accent-foreground">Entraînement</Badge>
                  </TableCell>
                  <TableCell>Stade Principal</TableCell>
                  <TableCell>27/05/2024 - 18:00</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>
                    <div className="font-medium">U15</div>
                  </TableCell>
                   <TableCell>
                     <Badge variant="secondary" className="bg-primary/20 text-primary">Match</Badge>
                  </TableCell>
                  <TableCell>Olympique Ouest</TableCell>
                  <TableCell>26/05/2024 - 11:00</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Activité Récente</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="flex items-center gap-4">
              <div className="grid gap-1">
                <p className="text-sm font-medium leading-none">Nouveau joueur ajouté</p>
                <p className="text-sm text-muted-foreground">Léo Martin a rejoint les U12.</p>
              </div>
              <div className="ml-auto text-sm text-muted-foreground">Il y a 2h</div>
            </div>
             <div className="flex items-center gap-4">
              <div className="grid gap-1">
                <p className="text-sm font-medium leading-none">Paiement reçu</p>
                <p className="text-sm text-muted-foreground">Famille Dupont - Inscription annuelle.</p>
              </div>
              <div className="ml-auto text-sm text-muted-foreground">Hier</div>
            </div>
             <div className="flex items-center gap-4">
              <div className="grid gap-1">
                <p className="text-sm font-medium leading-none">Résultat de match</p>
                <p className="text-sm text-muted-foreground">Victoire des Seniors A (3-1).</p>
              </div>
              <div className="ml-auto text-sm text-muted-foreground">Il y a 2 jours</div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
