
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PlusCircle, Download } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

export default function PaymentsPage() {
  const payments = [
    { id: "PAY-001", player: "Léo Martin", category: "U12", amount: "1500.00 MAD", status: "Payé", date: "15/05/2024" },
    { id: "PAY-002", player: "Emma Petit", category: "U15", amount: "1500.00 MAD", status: "En attente", date: "12/05/2024" },
    { id: "PAY-003", player: "Gabriel Roy", category: "Seniors", amount: "2000.00 MAD", status: "Payé", date: "10/05/2024" },
    { id: "PAY-004", player: "Chloé Girard", category: "U17", amount: "1800.00 MAD", status: "En retard", date: "01/05/2024" },
    { id: "PAY-005", player: "Lucas Dubois", category: "U12", amount: "1500.00 MAD", status: "Payé", date: "28/04/2024" },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
            <h1 className="text-3xl font-bold tracking-tight">Paiements</h1>
            <p className="text-muted-foreground">Suivez et gérez les paiements des cotisations.</p>
        </div>
        <div className="flex gap-2">
            <Button variant="outline">
                <Download className="mr-2 h-4 w-4" />
                Exporter
            </Button>
            <Button asChild>
              <Link href="/dashboard/payments/add">
                <PlusCircle className="mr-2 h-4 w-4" />
                Ajouter un paiement
              </Link>
            </Button>
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Suivi des paiements</CardTitle>
          <CardDescription>Liste des dernières transactions et statuts de paiement.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID Transaction</TableHead>
                <TableHead>Joueur</TableHead>
                <TableHead>Catégorie</TableHead>
                <TableHead>Montant</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Statut</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.map((payment) => (
                <TableRow key={payment.id}>
                  <TableCell className="font-medium">{payment.id}</TableCell>
                  <TableCell>{payment.player}</TableCell>
                  <TableCell>{payment.category}</TableCell>
                  <TableCell>{payment.amount}</TableCell>
                  <TableCell>{payment.date}</TableCell>
                  <TableCell>
                    <Badge 
                        variant={
                            payment.status === 'Payé' ? 'default' : 
                            payment.status === 'En retard' ? 'destructive' : 'secondary'
                        }
                        className={
                            payment.status === 'Payé' ? 'bg-green-500/80 hover:bg-green-500 text-white' : ''
                        }
                    >
                        {payment.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
