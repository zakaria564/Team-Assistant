
"use client"

import React from "react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Loader2, ArrowLeft, Trophy, Download } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";


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

interface ClubInfo {
    name: string;
    address: string;
    email: string;
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


export default function PaymentReceiptPage({ params }: { params: { id: string } }) {
  const { id: paymentId } = React.use(params);
  const router = useRouter();
  const [user, loadingUser] = useAuthState(auth);
  
  const [payment, setPayment] = useState<Payment | null>(null);
  const [clubInfo, setClubInfo] = useState<ClubInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingPdf, setLoadingPdf] = useState(false);
  
  useEffect(() => {
    if (!paymentId) return;

    const fetchPaymentAndClubInfo = async () => {
      if (!user) {
        if (!loadingUser) setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const paymentRef = doc(db, "payments", paymentId as string);
        const clubRef = doc(db, "clubs", user.uid);
        
        const [paymentSnap, clubSnap] = await Promise.all([getDoc(paymentRef), getDoc(clubRef)]);

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

        if (clubSnap.exists()) {
            const clubData = clubSnap.data();
            setClubInfo({
                name: clubData.clubName || "Votre Club",
                address: clubData.address || "Adresse non configurée",
                email: clubData.contactEmail || "Email non configuré",
            });
        } else {
             setClubInfo({
                name: "Votre Club",
                address: "Adresse non configurée",
                email: "Email non configuré",
            });
        }

      } catch (error) {
        console.error("Error fetching details:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPaymentAndClubInfo();
  }, [paymentId, user, loadingUser, router]);

  const handleDownloadPdf = () => {
    setLoadingPdf(true);
    const cardElement = document.getElementById("printable-receipt");
    if (cardElement) {
        const originalWidth = cardElement.style.width;
        cardElement.style.width = '800px';

        html2canvas(cardElement, {
            scale: 2,
            useCORS: true,
            backgroundColor: '#ffffff',
        }).then((canvas) => {
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'pt',
                format: 'a4'
            });

            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();
            
            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
            pdf.save(`recu_paiement_${payment?.id.substring(0, 7)}.pdf`);
        }).finally(() => {
            if (cardElement) {
               cardElement.style.width = originalWidth;
            }
            setLoadingPdf(false);
        });
    } else {
        console.error("Element to print not found.");
        setLoadingPdf(false);
    }
  };


  if (loading || loadingUser) {
    return (
      <div className="flex justify-center items-center h-screen bg-muted/40">
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
    <div className="bg-muted/40 p-4 sm:p-8 flex flex-col items-center">
        <div className="w-full max-w-4xl space-y-4">
            <div className="flex justify-between items-center print:hidden">
                <Button variant="outline" onClick={() => router.back()}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> Retour
                </Button>
                 <Button onClick={handleDownloadPdf} disabled={loadingPdf}>
                    {loadingPdf ? (
                    <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Téléchargement...
                    </>
                    ) : (
                    <>
                        <Download className="mr-2 h-4 w-4" />
                        Télécharger en PDF
                    </>
                    )}
                </Button>
            </div>
            
            <Card id="printable-receipt" className="w-full max-w-4xl mx-auto print:shadow-none print:border-none bg-white text-gray-800">
                 <CardHeader className="p-6">
                    <div className="flex flex-col sm:flex-row justify-between items-start">
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <Trophy className="h-10 w-10 text-primary" />
                                <h1 className="text-3xl font-bold text-gray-900">{clubInfo?.name}</h1>
                            </div>
                            <p className="text-muted-foreground">{clubInfo?.address}</p>
                            <p className="text-muted-foreground">{clubInfo?.email}</p>
                        </div>
                        <div className="text-left sm:text-right mt-4 sm:mt-0">
                            <h2 className="text-3xl font-bold text-primary">REÇU DE PAIEMENT</h2>
                            <p className="text-muted-foreground">Reçu #{payment.id.substring(0, 7).toUpperCase()}</p>
                            <p className="text-muted-foreground">Date: {format(new Date(), "dd MMMM yyyy", { locale: fr })}</p>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-6">
                    <div className="grid sm:grid-cols-2 gap-6 mb-8 p-4 bg-gray-50 rounded-lg">
                        <div className="space-y-1">
                            <h3 className="text-sm font-semibold text-gray-600">Reçu pour :</h3>
                            <p className="font-bold text-lg text-gray-900">{payment.playerName}</p>
                        </div>
                         <div className="space-y-1">
                            <h3 className="text-sm font-semibold text-gray-600">Description du paiement :</h3>
                            <p className="text-gray-800">{payment.description}</p>
                        </div>
                    </div>
                    
                    <div className="w-full overflow-x-auto mb-6">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="text-gray-600">Date du versement</TableHead>
                                    <TableHead className="text-gray-600">Méthode</TableHead>
                                    <TableHead className="text-right text-gray-600">Montant</TableHead>
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
                        <div className="w-full max-w-sm space-y-3">
                             <div className="flex justify-between">
                                <span className="text-muted-foreground">Montant total dû :</span>
                                <span className="font-medium">{payment.totalAmount.toFixed(2)} MAD</span>
                             </div>
                             <div className="flex justify-between">
                                <span className="text-muted-foreground">Total payé :</span>
                                <span className="font-medium">{amountPaid.toFixed(2)} MAD</span>
                             </div>
                             <Separator />
                              <div className="flex justify-between font-bold text-lg text-primary">
                                <span>Montant restant :</span>
                                <span>{amountRemaining.toFixed(2)} MAD</span>
                              </div>
                        </div>
                    </div>
                </CardContent>
                <CardFooter className="p-6 flex-col items-start gap-4 bg-gray-50/50 mt-6">
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
