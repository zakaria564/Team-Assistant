
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { FileText, Users, BarChart } from "lucide-react";
import Link from "next/link";

const reports = [
    {
        title: "Fiche d'inscription vierge",
        description: "Générez un PDF de la fiche d'inscription pour un nouveau joueur.",
        icon: FileText,
        href: "/dashboard/reports/registration-form",
        cta: "Ouvrir la fiche",
        disabled: false,
    },
    {
        title: "Cartes des joueurs",
        description: "Générez un PDF avec les cartes de tous les joueurs inscrits.",
        icon: Users,
        href: "/dashboard/reports/player-cards",
        cta: "Générer le PDF",
        disabled: false,
    }
];


export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Rapports & Exports</h1>
        <p className="text-muted-foreground">
          Générez des rapports et exportez les données de votre club.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {reports.map((report) => (
            <Card key={report.title} className="flex flex-col">
                <CardHeader>
                    <div className="flex items-center gap-4">
                        <report.icon className="h-8 w-8 text-primary" />
                        <CardTitle>{report.title}</CardTitle>
                    </div>
                </CardHeader>
                <CardContent className="flex-grow">
                    <p className="text-muted-foreground">{report.description}</p>
                </CardContent>
                <CardFooter>
                    <Button asChild className="w-full" disabled={report.disabled}>
                        <Link href={report.href}>{report.cta}</Link>
                    </Button>
                </CardFooter>
            </Card>
        ))}
      </div>
    </div>
  );
}
