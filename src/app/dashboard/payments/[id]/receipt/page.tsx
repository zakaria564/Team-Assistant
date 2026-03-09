"use client"

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loader2, ArrowLeft, Download, Printer, ShieldCheck } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

export default function PaymentReceiptPage({ params, searchParams }: { params: Promise<{ id: string }>, searchParams: Promise<any> }) {
  const { id: paymentId } = React.use(params);
  const _sParams = React.use(searchParams);
  const router = useRouter();
  const [user, loadingUser] = useAuthState(auth);
  const { toast } = useToast();
  
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
          const playerData = playerSnap.exists() ? playerSnap.data() : null;
          
          setPayment({
            id: paymentSnap.id,
            ...data,
            playerName: playerData?.name || "Joueur inconnu",
            playerCategory: playerData?.category || "N/A"
          });
        } else {
          router.push('/dashboard/payments');
        }

        if (clubSnap.exists()) {
            setClubInfo(clubSnap.data());
        }
      } catch (error) { 
        console.error(error); 
      } finally { 
        setLoading(false); 
      }
    };

    fetchDetails();
  }, [paymentId, user, loadingUser, router]);

  const handleDownloadPdf = () => {
    setLoadingPdf(true);
    const element = document.getElementById("printable-receipt");
    if (element) {
        html2canvas(element, { 
            scale: 2, 
            useCORS: true,
            backgroundColor: "#ffffff",
            logging: false
        }).then((canvas) => {
            const pdf = new jsPDF('p', 'pt', 'a4');
            const imgData = canvas.toDataURL('image/png');
            const imgWidth = 595.28; 
            const imgHeight = (canvas.height * imgWidth) / canvas.width;
            
            pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
            pdf.save(`recu_paiement_${payment?.playerName.replace(/ /g, "_")}.pdf`);
        }).catch((err) => {
            console.error("Erreur PDF:", err);
            toast({
                variant: "destructive",
                title: "Erreur de génération",
                description: "Impossible de générer le PDF. Vérifiez que les images du club sont valides."
            });
        }).finally(() => setLoadingPdf(false));
    }
  };

  if (loading || loadingUser) return <div className="flex justify-center items-center h-screen"><Loader2 className="animate-spin text-primary" /></div>;
  if (!payment) return null;
  
  const amountPaid = payment.transactions?.reduce((sum: number, t: any) => sum + t.amount, 0) || 0;
  const remaining = payment.totalAmount - amountPaid;
  const clubInitial = clubInfo?.clubName?.charAt(0)?.toUpperCase() || "C";

  return (
    <div className="bg-muted/40 p-4 sm:p-8 flex flex-col items-center min-h-screen">
      <div className="w-full max-w-4xl space-y-4">
        <div className="flex justify-between items-center print:hidden">
          <Button variant="outline" onClick={() => router.back()}><ArrowLeft className="mr-2 h-4 w-4" /> Retour</Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => window.print()}><Printer className="mr-2 h-4 w-4" /> Imprimer</Button>
            <Button onClick={handleDownloadPdf} disabled={loadingPdf}>
                {loadingPdf ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                Télécharger PDF
            </Button>
          </div>
        </div>

        <Card id="printable-receipt" className="bg-white text-slate-900 shadow-2xl border-none overflow-hidden">
          <header className="p-10 bg-slate-50 border-b-4 border-primary flex justify-between items-start">
            <div className="flex items-center gap-6">
              <Avatar className="h-24 w-24 border-2 border-white shadow-lg">
                <AvatarImage src={clubInfo?.logoUrl} />
                <AvatarFallback className="text-3xl bg-primary text-white">{clubInitial}</AvatarFallback>
              </Avatar>
              <div>
                <h1 className="text-3xl font-black uppercase tracking-tighter text-primary">{clubInfo?.clubName || "Votre Club"}</h1>
                <p className="text-slate-500 font-medium max-w-xs">{clubInfo?.address || "Adresse non renseignée"}</p>
                {clubInfo?.clubPhone && <p className="text-slate-500 text-sm">Tél: {clubInfo.clubPhone}</p>}
              </div>
            </div>
            <div className="text-right">
              <div className="inline-block bg-primary text-white px-4 py-1 rounded-sm font-bold text-sm mb-2">DOCUMENT OFFICIEL</div>
              <h2 className="text-4xl font-black text-slate-800">REÇU</h2>
              <p className="text-slate-500 font-bold mt-1">N° {payment.id.substring(0, 8).toUpperCase()}</p>
              <p className="text-slate-400 text-sm">Date d'émission : {format(new Date(), "dd/MM/yyyy")}</p>
            </div>
          </header>

          <div className="p-10 space-y-10">
            <div className="grid grid-cols-2 gap-12">
              <div className="space-y-4">
                <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 border-b pb-2">Informations Joueur</h3>
                <div>
                    <p className="text-xl font-bold text-slate-800">{payment.playerName}</p>
                    <p className="text-slate-500 font-semibold">Catégorie : {payment.playerCategory}</p>
                </div>
              </div>
              <div className="space-y-4 text-right">
                <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 border-b pb-2">Détails de la Cotisation</h3>
                <div>
                    <p className="text-lg font-bold text-slate-800">{payment.description}</p>
                    <p className="text-slate-500">Période : {format(new Date(), "MMMM yyyy", { locale: fr })}</p>
                </div>
              </div>
            </div>

            <div className="rounded-xl border shadow-sm overflow-hidden">
                <Table>
                <TableHeader className="bg-slate-50">
                    <TableRow>
                        <TableHead className="font-bold text-slate-700 h-12 px-6">Désignation du Versement</TableHead>
                        <TableHead className="font-bold text-slate-700 h-12">Date</TableHead>
                        <TableHead className="font-bold text-slate-700 h-12">Mode</TableHead>
                        <TableHead className="text-right font-bold text-slate-700 h-12 px-6">Montant</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {payment.transactions?.map((t: any, i: number) => (
                    <TableRow key={i} className="border-b last:border-0">
                        <TableCell className="px-6 py-4 font-medium">Versement partiel #{i+1}</TableCell>
                        <TableCell className="py-4 text-slate-600">{t.date?.seconds ? format(new Date(t.date.seconds * 1000), "dd/MM/yyyy") : 'N/A'}</TableCell>
                        <TableCell className="py-4 text-slate-600">{t.method}</TableCell>
                        <TableCell className="text-right py-4 px-6 font-bold text-slate-800">{t.amount.toFixed(2)} MAD</TableCell>
                    </TableRow>
                    ))}
                </TableBody>
                </Table>
            </div>

            <div className="flex justify-end pt-4">
              <div className="w-full max-w-sm space-y-3">
                <div className="flex justify-between text-slate-500 font-medium">
                    <span>Montant Total Dû :</span>
                    <span>{payment.totalAmount.toFixed(2)} MAD</span>
                </div>
                <div className="flex justify-between text-green-600 font-bold text-lg">
                    <span>Total Réglé à ce jour :</span>
                    <span>{amountPaid.toFixed(2)} MAD</span>
                </div>
                <Separator className="bg-slate-200" />
                <div className={cn(
                    "flex justify-between items-center font-bold text-lg",
                    remaining > 0 ? "text-red-500" : "text-slate-600"
                )}>
                    <span>RESTE À PAYER :</span>
                    <span>{remaining.toFixed(2)} MAD</span>
                </div>
              </div>
            </div>

            <div className="flex justify-center pt-16">
                <div className="text-center space-y-24 w-full max-w-md">
                    <p className="text-xs font-black uppercase tracking-widest text-slate-400">Cachet et Signature</p>
                    <div className="border-t border-slate-200 pt-4 flex flex-col items-center gap-2">
                        <div className="flex items-center gap-1 text-primary/40">
                            <ShieldCheck className="h-4 w-4" />
                            <span className="text-[9px] uppercase font-bold tracking-tighter">Document certifié par {clubInfo?.clubName || "le club"}</span>
                        </div>
                    </div>
                </div>
            </div>
          </div>

          <footer className="p-8 bg-slate-900 text-white flex justify-between items-center">
            <div className="text-xs opacity-60">
                <p>© {new Date().getFullYear()} Team Assistant - Gestion Club Sportif</p>
                <p>Généré le {format(new Date(), "Pp", { locale: fr })}</p>
            </div>
            <div className="flex items-center gap-2 text-primary font-black uppercase tracking-widest text-[10px]">
                <ShieldCheck className="h-5 w-5" />
                Validité garantie par le club
            </div>
          </footer>
        </Card>
      </div>
    </div>
  );
}