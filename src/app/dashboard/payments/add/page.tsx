
"use client";

import { AddPaymentForm } from "@/components/payments/add-payment-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

export default function AddPaymentPage() {
  const router = useRouter();

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-6 w-6" />
            <span className="sr-only">Retour</span>
        </Button>
        <div>
            <h1 className="text-3xl font-bold tracking-tight">Ajouter un paiement</h1>
            <p className="text-muted-foreground">
              Enregistrez un nouveau paiement de cotisation.
            </p>
        </div>
      </div>
      <Card>
        <CardHeader>
            <CardTitle>Détails du paiement</CardTitle>
            <CardDescription>Remplissez les informations ci-dessous.</CardDescription>
        </CardHeader>
        <CardContent>
            <AddPaymentForm />
        </CardContent>
      </Card>
    </div>
  );
}
