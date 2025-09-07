
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { FileDown, Users, CalendarCheck, Trophy } from "lucide-react";
import Link from "next/link";

export default function ReportsPage() {
  const reportTypes = [
    {
      title: "Cartes des joueurs",
      description: "Générez un PDF avec les cartes de tous les joueurs.",
      icon: <Users className="h-6 w-6 text-primary" />,
      href: "#",
      buttonText: "Générer le PDF"
    },
    {
      title: "Présence aux entraînements",
      description: "Exportez le registre des présences pour une période donnée.",
      icon: <CalendarCheck className="h-6 w-6 text-primary" />,
       href: "#",
      buttonText: "Exporter les données"
    },
    {
      title: "Résultats des matchs",
      description: "Créez un rapport des résultats de tous les matchs de la saison.",
      icon: <Trophy className="h-6 w-6 text-primary" />,
       href: "#",
      buttonText: "Créer le rapport"
    },
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Rapports & Exports</h1>
        <p className="text-muted-foreground">Générez des rapports et exportez les données de votre club.</p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {reportTypes.map((report) => (
          <Card key={report.title} className="flex flex-col">
            <CardHeader className="flex flex-row items-center gap-4 space-y-0">
              {report.icon}
              <div className="grid gap-1">
                <CardTitle>{report.title}</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col justify-between gap-4">
              <CardDescription>{report.description}</CardDescription>
               <Button asChild variant="outline" className="w-full" disabled>
                <Link href={report.href}>
                  <FileDown className="mr-2 h-4 w-4" />
                  {report.buttonText}
                </Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
