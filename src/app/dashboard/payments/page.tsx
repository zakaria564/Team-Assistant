
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
  playerName?: string; // Add playerName
  amount: number;
  status: 'Payé' | 'En attente' | 'En retard';
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
        // Fetch all players to map their IDs to names
        const playersQuery = query(collection(db, "players"));
        const playersSnapshot = await getDocs(playersQuery);
        const playersMap = new Map<string, string>();
        playersSnapshot.forEach(doc => {
            playersMap.set(doc.id, doc.data().name);
        });

        // Fetch all payments
        const paymentsQuery = query(collection(db, "payments"), orderBy("createdAt", "desc"));
        const paymentsSnapshot = await getDocs(paymentsQuery);
        const paymentsData = paymentsSnapshot.docs.map(doc => {
            const data = doc.data() as Payment;
            return { 
                id: doc.id, 
                ...data,
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
                  <TableHead>Montant</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Méthode</TableHead>
                  <TableHead>Statut</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.length > 0 ? (
                    payments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell className="font-medium">{payment.playerName}</TableCell>
                      <TableCell>{payment.description}</TableCell>
                      <TableCell>{payment.amount.toFixed(2)} MAD</TableCell>
                      <TableCell>{format(new Date(payment.createdAt.seconds * 1000), "dd/MM/yyyy")}</TableCell>
                      <TableCell>{payment.method}</TableCell>
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
                  ))
                ) : (
                   <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground">
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
