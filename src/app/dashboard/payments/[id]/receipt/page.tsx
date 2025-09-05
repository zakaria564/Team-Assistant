
"use client"

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Loader2, ArrowLeft, Printer, Trophy, Share2, Download } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";


interface Payment {
  id: string;
  playerId: string;
  playerName?: string;
  totalAmount: number;
  status: 'Payé' | 'Partiel' | 'En attente' | 'En retard';
  createdAt: { seconds: number, nanoseconds: number };
  description: string;
  transactions: { amount: number; date: { seconds: number, nanoseconds: number }; method: string; }[];
}

const getBadgeClass = (status?: Payment['status']) => {
     switch (status) {
        case 'Payé': return 'bg-green-100 text-green-800 border-green-300';
        case 'Partiel': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
        case 'En attente': return 'bg-gray-100 text-gray-800 border-gray-300';
        case 'En retard': return 'bg-red-100 text-red-800 border-red-300';
        default: return '';
    }
}


export default function PaymentReceiptPage() {
  const params = useParams();
  const router = useRouter();
  const paymentId = params.id as string;
  
  const [payment, setPayment] = useState<Payment | null>(null);
  const [loading, setLoading] = useState(true);
  
  const handlePrint = () => {
    window.print();
  };

  useEffect(() => {
    if (!paymentId) return;

    const fetchPayment = async () => {
      setLoading(true);
      try {
        const paymentRef = doc(db, "payments", paymentId);
        const paymentSnap = await getDoc(paymentRef);

        if (paymentSnap.exists()) {
          const paymentData = { id: paymentSnap.id, ...paymentSnap.data() } as Omit<Payment, 'playerName'>;
          
          const playerRef = doc(db, "players", paymentData.playerId);
          const playerSnap = await getDoc(playerRef);

          setPayment({
            ...paymentData,
            playerName: playerSnap.exists() ? playerSnap.data().name : "Joueur inconnu"
          });

        } else {
          console.log("No such payment document!");
          router.push('/dashboard/payments');
        }
      } catch (error) {
        console.error("Error fetching payment details:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPayment();
  }, [paymentId, router]);
  
  const handleShare = async () => {
    if (payment && navigator.share) {
      try {
        await navigator.share({
          title: `Reçu de paiement: ${payment.description}`,
          text: `Voici le reçu pour le paiement de ${payment.playerName}.`,
          url: window.location.href,
        });
      } catch (error: any) {
        // Fallback to print if share fails, but ignore user cancellation.
        if (error.name !== 'AbortError') {
          console.error("Erreur lors du partage, retour à l'impression:", error);
          window.print();
        }
      }
    } else {
      // Fallback for browsers that don't support navigator.share
      window.print();
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-muted">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!payment) {
    return (
      <div className="text-center p-8">
        <p>Reçu non trouvé.</p>
        <Button onClick={() => router.push("/dashboard/payments")} className="mt-4">Retour à la liste</Button>
      </div>
    );
  }
  
  const amountPaid = payment.transactions?.reduce((sum, t) => sum + t.amount, 0) || 0;
  const amountRemaining = payment.totalAmount - amountPaid;

  return (
    <div className="bg-muted min-h-screen p-4 sm:p-8 flex flex-col items-center">
        <div className="w-full max-w-4xl space-y-4">
            <div className="flex justify-between items-center print:hidden">
                <Button variant="outline" onClick={() => router.back()}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> Retour
                </Button>
                <div className="flex gap-2">
                    <Button onClick={handleShare}>
                        <Share2 className="mr-2 h-4 w-4" /> Partager
                    </Button>
                     <Button variant="secondary" onClick={handlePrint}>
                        <Download className="mr-2 h-4 w-4" /> Exporter
                    </Button>
                </div>
            </div>
            
            <Card className="w-full max-w-4xl mx-auto print:shadow-none print:border-none">
                 <CardHeader className="bg-muted/30 print:bg-transparent">
                    <div className="flex flex-col sm:flex-row justify-between items-start">
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <Trophy className="h-8 w-8 text-primary" />
                                <h1 className="text-2xl font-bold">Team Assistant Club</h1>
                            </div>
                            <p className="text-muted-foreground">123 Rue du Stade, 75000 Ville</p>
                            <p className="text-muted-foreground">contact@team-assistant.com</p>
                        </div>
                        <div className="text-left sm:text-right mt-4 sm:mt-0">
                            <h2 className="text-3xl font-bold text-primary">REÇU DE PAIEMENT</h2>
                            <p className="text-muted-foreground">Reçu #{payment.id.substring(0, 7).toUpperCase()}</p>
                            <p className="text-muted-foreground">Date: {format(new Date(), "dd MMMM yyyy", { locale: fr })}</p>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-6">
                    <div className="grid sm:grid-cols-2 gap-6 mb-6">
                        <div className="space-y-1">
                            <h3 className="font-semibold">Reçu pour :</h3>
                            <p className="font-bold text-lg">{payment.playerName}</p>
                        </div>
                         <div className="space-y-1">
                            <h3 className="font-semibold">Description du paiement :</h3>
                            <p>{payment.description}</p>
                        </div>
                    </div>
                    
                    <div className="w-full overflow-x-auto mb-6">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Date du versement</TableHead>
                                    <TableHead>Méthode</TableHead>
                                    <TableHead className="text-right">Montant</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {payment.transactions?.length > 0 ? (
                                payment.transactions.map((transaction, index) => (
                                    <TableRow key={index}>
                                    <TableCell>{format(new Date(transaction.date.seconds * 1000), "dd/MM/yyyy", { locale: fr })}</TableCell>
                                    <TableCell>{transaction.method}</TableCell>
                                    <TableCell className="text-right font-medium">{transaction.amount.toFixed(2)} MAD</TableCell>
                                    </TableRow>
                                ))
                                ) : (
                                <TableRow>
                                    <TableCell colSpan={3} className="text-center text-muted-foreground py-6">
                                    Aucun versement enregistré.
                                    </TableCell>
                                </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>

                    <div className="flex justify-end">
                        <div className="w-full max-w-sm space-y-2">
                             <div className="flex justify-between">
                                <span className="text-muted-foreground">Montant total dû :</span>
                                <span className="font-medium">{payment.totalAmount.toFixed(2)} MAD</span>
                             </div>
                             <div className="flex justify-between">
                                <span className="text-muted-foreground">Total payé :</span>
                                <span className="font-medium">{amountPaid.toFixed(2)} MAD</span>
                             </div>
                             <Separator />
                              <div className="flex justify-between font-bold text-lg">
                                <span>Montant restant :</span>
                                <span>{amountRemaining.toFixed(2)} MAD</span>
                             </div>
                        </div>
                    </div>
                </CardContent>
                <CardFooter className="bg-muted/30 print:bg-transparent p-6 flex-col items-start gap-4">
                    <div className="flex items-center gap-2">
                        <span className="font-semibold">Statut du paiement:</span>
                        <Badge className={cn("text-base", getBadgeClass(payment.status))}>
                            {payment.status}
                        </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                        Merci pour votre paiement. Ce reçu est une confirmation des versements enregistrés à ce jour.
                    </p>
                </CardFooter>
            </Card>
        </div>
        <style jsx global>{`
            @media print {
                body {
                    background-color: #fff !important;
                }
                .print\\:hidden {
                    display: none;
                }
                .print\\:shadow-none {
                    box-shadow: none;
                }
                .print\\:border-none {
                    border: none;
                }
                 .print\\:bg-transparent {
                    background-color: transparent;
                }
            }
        `}</style>
    </div>
  );
}
