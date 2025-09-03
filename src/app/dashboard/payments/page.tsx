
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PlusCircle, Download, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface Player {
  id: string;
  name: string;
}

interface Payment {
  id: string;
  playerId: string;
  playerName?: string;
  totalAmount: number;
  amountPaid: number;
  amountRemaining: number;
  status: 'Payé' | 'Partiel' | 'En attente' | 'En retard';
  createdAt: { seconds: number, nanoseconds: number };
  description: string;
  method: string;
}


export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchPayments = async () => {
      setLoading(true);
      try {
        const playersQuery = query(collection(db, "players"));
        const playersSnapshot = await getDocs(playersQuery);
        const playersMap = new Map<string, string>();
        playersSnapshot.forEach(doc => {
            playersMap.set(doc.id, doc.data().name);
        });

        const paymentsQuery = query(collection(db, "payments"), orderBy("createdAt", "desc"));
        const paymentsSnapshot = await getDocs(paymentsQuery);
        const paymentsData = paymentsSnapshot.docs.map(doc => {
            const data = doc.data() as any; // Use any to handle old data structure
            const amountPaid = data.amountPaid ?? data.amount ?? 0;
            const totalAmount = data.totalAmount ?? amountPaid;
            const amountRemaining = data.amountRemaining ?? (totalAmount - amountPaid);
            
            return { 
                id: doc.id, 
                ...data,
                totalAmount: totalAmount,
                amountPaid: amountPaid,
                amountRemaining: amountRemaining,
                playerName: playersMap.get(data.playerId) || "Joueur inconnu",
            } as Payment;
        });

        setPayments(paymentsData);

      } catch (error) {
        console.error("Error fetching payments: ", error);
        toast({
          variant: "destructive",
          title: "Erreur de chargement",
          description: "Impossible de charger les paiements. Vérifiez vos règles de sécurité Firestore.",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchPayments();
  }, [toast]);

  const getBadgeVariant = (status: Payment['status']) => {
    switch (status) {
        case 'Payé': return 'default';
        case 'Partiel': return 'secondary';
        case 'En retard': return 'destructive';
        default: return 'outline';
    }
  }

  const getBadgeClass = (status: Payment['status']) => {
     switch (status) {
        case 'Payé': return 'bg-green-100 text-green-800 border-green-300';
        case 'Partiel': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
        case 'En attente': return 'bg-gray-100 text-gray-800 border-gray-300';
        case 'En retard': return 'bg-red-100 text-red-800 border-red-300';
        default: return '';
    }
  }

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
          {loading ? (
             <div className="flex justify-center items-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Joueur</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Montant Payé</TableHead>
                  <TableHead className="text-right">Montant Restant</TableHead>
                  <TableHead className="text-right">Montant Total</TableHead>
                  <TableHead>Date et Heure</TableHead>
                  <TableHead>Statut</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.length > 0 ? (
                    payments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell className="font-medium">{payment.playerName}</TableCell>
                      <TableCell className="text-muted-foreground">{payment.description}</TableCell>
                      <TableCell className="text-right font-semibold text-green-600">{payment.amountPaid.toFixed(2)} MAD</TableCell>
                      <TableCell className="text-right font-semibold text-red-600">{payment.amountRemaining.toFixed(2)} MAD</TableCell>
                      <TableCell className="text-right">{payment.totalAmount.toFixed(2)} MAD</TableCell>
                      <TableCell className="text-muted-foreground">{format(new Date(payment.createdAt.seconds * 1000), "dd/MM/yyyy HH:mm")}</TableCell>
                      <TableCell>
                        <Badge 
                            variant={getBadgeVariant(payment.status)}
                            className={getBadgeClass(payment.status)}
                        >
                            {payment.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                   <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-10">
                        Aucun paiement trouvé.
                      </TableCell>
                    </TableRow>
                )}
              </TableBody>
            </Table>
           )}
        </CardContent>
      </Card>
    </div>
  );
}
