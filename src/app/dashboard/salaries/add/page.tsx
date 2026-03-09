
"use client";

import { AddSalaryForm } from "@/components/salaries/add-salary-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

export default function AddSalaryPage() {
  const router = useRouter();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}><ArrowLeft className="h-6 w-6" /></Button>
        <div>
            <h1 className="text-3xl font-bold tracking-tight">Ajouter un Salaire</h1>
            <p className="text-muted-foreground">Enregistrez une nouvelle fiche de paie pour un entraîneur.</p>
        </div>
      </div>
      <Card>
        <CardHeader>
            <CardTitle>Détails du Salaire</CardTitle>
            <CardDescription>Remplissez les informations ci-dessous.</CardDescription>
        </CardHeader>
        <CardContent><AddSalaryForm /></CardContent>
      </Card>
    </div>
  );
}
