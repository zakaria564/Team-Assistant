
"use client"

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardFooter } from "@/components/ui/card";
import { Loader2, ArrowLeft, Download } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function PaymentReceiptPage(props: { params: Promise<{ id: string }> }) {
  const resolvedParams = React.use(props.params);
  const paymentId = resolvedParams.id;
  const router = useRouter();
  const [user, loadingUser] = useAuthState(auth);
  
  const [payment, setPayment] = useState<any>(null);
  const [clubInfo, setClubInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [loadingPdf, setLoadingPdf] = useState(false);
  
  useEffect(() => {
    if (!paymentId || loadingUser) return;

    const fetchDetails = async () => {
      if (!user) return;
      try {
        const paymentRef = doc(db, "payments", paymentId);
        const clubRef = doc(db, "clubs", user.uid);
        const [paymentSnap, clubSnap] = await Promise.all([getDoc(paymentRef), getDoc(clubRef)]);

        if (paymentSnap.exists()) {
          const data = paymentSnap.data();
          const playerSnap = await getDoc(doc(db, "players", data.playerId));
          setPayment({
            id: paymentSnap.id,
            ...data,
            playerName: playerSnap.exists() ? playerSnap.data().name : "Joueur inconnu"
          });
        } else {
          router.push('/dashboard/payments');
        }

        if (clubSnap.exists()) {
            setClubInfo(clubSnap.data());
        }
      } catch (error) { console.error(error); }
      finally { setLoading(false); }
    };

    fetchDetails();
  }, [paymentId, user, loadingUser, router]);

  const handleDownloadPdf = () => {
    setLoadingPdf(true);
    const cardElement = document.getElementById("printable-receipt");
    if (cardElement) {
        html2canvas(cardElement, { scale: 2, useCORS: true }).then((canvas) => {
            const pdf = new jsPDF('p', 'pt', 'a4');
            const imgData = canvas.toDataURL('image/png');
            pdf.addImage(imgData, 'PNG', 0, 0, pdf.internal.pageSize.getWidth(), pdf.internal.pageSize.getHeight());
            pdf.save(`recu_${payment?.id.substring(0, 7)}.pdf`);
        }).finally(() => setLoadingPdf(false));
    }
  };

  if (loading || loadingUser) return <div className="flex justify-center items-center h-screen"><Loader2 className="animate-spin text-primary" /></div>;
  if (!payment) return null;
  
  const amountPaid = payment.transactions?.reduce((sum: number, t: any) => sum + t.amount, 0) || 0;
  const clubInitial = clubInfo?.clubName?.charAt(0)?.toUpperCase() || "C";

  return (
    <div className="bg-muted/40 p-2 sm:p-8 flex flex-col items-center">
      <div className="w-full max-w-4xl space-y-4">
        <div className="flex justify-between items-center print:hidden">
          <Button variant="outline" onClick={() => router.back()}><ArrowLeft className="mr-2 h-4 w-4" /> Retour</Button>
          <Button onClick={handleDownloadPdf} disabled={loadingPdf}>
            {loadingPdf ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
            Télécharger
          </Button>
        </div>

        <Card id="printable-receipt" className="bg-white">
          <header className="p-6 border-b">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12"><AvatarImage src={clubInfo?.logoUrl} /><AvatarFallback>{clubInitial}</AvatarFallback></Avatar>
                <div>
                  <h1 className="text-2xl font-bold">{clubInfo?.clubName || "Votre Club"}</h1>
                  <p className="text-sm text-muted-foreground">{clubInfo?.address}</p>
                </div>
              </div>
              <div className="text-right">
                <h2 className="text-xl font-bold text-primary">REÇU DE PAIEMENT</h2>
                <p className="text-sm text-muted-foreground">Date: {format(new Date(), "dd MMMM yyyy", { locale: fr })}</p>
              </div>
            </div>
          </header>
          <div className="p-6 space-y-6">
            <div className="bg-gray-50 p-4 rounded-lg grid sm:grid-cols-2 gap-4">
              <div><h3 className="text-sm font-semibold text-gray-600">Reçu pour :</h3><p className="font-bold">{payment.playerName}</p></div>
              <div><h3 className="text-sm font-semibold text-gray-600">Description :</h3><p>{payment.description}</p></div>
            </div>
            <Table>
              <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Méthode</TableHead><TableHead className="text-right">Montant</TableHead></TableRow></TableHeader>
              <TableBody>
                {payment.transactions?.map((t: any, i: number) => (
                  <TableRow key={i}>
                    <TableCell>{t.date?.seconds ? format(new Date(t.date.seconds * 1000), "dd/MM/yy", { locale: fr }) : 'N/A'}</TableCell>
                    <TableCell>{t.method}</TableCell>
                    <TableCell className="text-right font-medium">{t.amount.toFixed(2)} MAD</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="flex flex-col items-end gap-2">
              <div className="w-full max-w-xs space-y-1">
                <div className="flex justify-between"><span>Total Dû :</span><span>{payment.totalAmount.toFixed(2)} MAD</span></div>
                <div className="flex justify-between font-bold text-primary"><span>Montant restant :</span><span>{(payment.totalAmount - amountPaid).toFixed(2)} MAD</span></div>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
