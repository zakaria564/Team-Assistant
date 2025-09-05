
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { FileDown, Users, CalendarCheck, Trophy } from "lucide-react";

export default function ReportsPage() {
  const reportTypes = [
    {
      title: "Cartes des joueurs",
      description: "Générez un PDF avec les cartes de tous les joueurs.",
      icon: <Users className="h-6 w-6 text-primary" />,
    },
    {
      title: "Présence aux entraînements",
      description: "Exportez le registre des présences pour une période donnée.",
      icon: <CalendarCheck className="h-6 w-6 text-primary" />,
    },
    {
      title: "Résultats des matchs",
      description: "Créez un rapport des résultats de tous les matchs de la saison.",
      icon: <Trophy className="h-6 w-6 text-primary" />,
    },
    {
      title: "Rapport mensuel",
      description: "Générez un rapport financier et d'activité complet pour le mois.",
      icon: <FileDown className="h-6 w-6 text-primary" />,
    }
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Rapports & Exports</h1>
        <p className="text-muted-foreground">Générez des rapports et exportez les données de votre club.</p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {reportTypes.map((report) => (
          <Card key={report.title}>
            <CardHeader className="flex flex-row items-center gap-4 space-y-0">
              {report.icon}
              <div className="grid gap-1">
                <CardTitle>{report.title}</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="grid gap-2">
              <CardDescription>{report.description}</CardDescription>
              <Button variant="outline" className="mt-2 w-full sm:w-auto">
                <FileDown className="mr-2 h-4 w-4" />
                Générer le PDF
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
