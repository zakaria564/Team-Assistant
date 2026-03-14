
"use client"

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loader2, ArrowLeft, Download, ShieldCheck, Fingerprint } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

export default function PaymentReceiptPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: paymentId } = React.use(params);
  
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
            playerCategory: playerData?.category || "N/A",
            playerProfessionalId: playerData?.professionalId || "N/A"
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

  const handleDownloadPdf = async () => {
    setLoadingPdf(true);
    const element = document.getElementById("printable-receipt");
    if (element) {
        try {
            const images = Array.from(element.getElementsByTagName('img'));
            await Promise.all(images.map(img => {
                if (img.complete) return Promise.resolve();
                return new Promise(resolve => {
                    img.onload = resolve;
                    img.onerror = resolve;
                });
            }));

            await new Promise(r => setTimeout(r, 1500));

            const canvas = await html2canvas(element, { 
                scale: 2, 
                useCORS: true,
                allowTaint: true,
                backgroundColor: "#ffffff",
                logging: false
            });

            const pdf = new jsPDF('p', 'pt', 'a4');
            const imgData = canvas.toDataURL('image/png', 1.0);
            const imgWidth = 595.28; 
            const imgHeight = (canvas.height * imgWidth) / canvas.width;
            
            pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
            pdf.save(`recu_${payment?.playerName.replace(/ /g, "_")}.pdf`);
        } catch (err) {
            console.error("Erreur PDF:", err);
            toast({ variant: "destructive", title: "Erreur de génération", description: "Le PDF n'a pas pu être généré." });
        } finally {
            setLoadingPdf(false);
        }
    }
  };

  if (loading || loadingUser) return <div className="flex justify-center items-center h-screen"><Loader2 className="animate-spin text-primary" /></div>;
  if (!payment) return null;
  
  const amountPaid = payment.transactions?.reduce((sum: number, t: any) => sum + t.amount, 0) || 0;
  const remaining = payment.totalAmount - amountPaid;
  const clubInitial = clubInfo?.clubName?.charAt(0)?.toUpperCase() || "C";

  const dateObj = payment.createdAt?.seconds ? new Date(payment.createdAt.seconds * 1000) : new Date();
  const receiptRef = `RC-J-${format(dateObj, "yyyyMM")}-${payment.id.substring(0, 4).toUpperCase()}`;

  return (
    <div className="bg-muted/40 p-2 sm:p-8 flex flex-col items-center min-h-screen">
      <div className="w-full max-w-4xl space-y-4">
        <div className="flex justify-between items-center print:hidden">
          <Button variant="outline" size="sm" onClick={() => router.back()}><ArrowLeft className="mr-2 h-4 w-4" /> Retour</Button>
          <Button size="sm" onClick={handleDownloadPdf} disabled={loadingPdf}>
              {loadingPdf ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
              <span className="hidden sm:inline ml-2">Télécharger PDF</span>
              <span className="sm:hidden ml-2">PDF</span>
          </Button>
        </div>

        <div className="w-full overflow-x-auto shadow-2xl rounded-xl">
            <Card id="printable-receipt" className="bg-white text-slate-900 border-none overflow-hidden mx-auto min-w-[320px]" style={{ minHeight: '1120px', width: '800px' }}>
            <header className="p-6 sm:p-10 bg-slate-900 text-white flex flex-col sm:flex-row justify-between items-center gap-6">
                <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 text-center sm:text-left">
                <div className="h-20 w-24 border-2 border-slate-700 shadow-xl rounded-lg overflow-hidden bg-white flex items-center justify-center shrink-0">
                    {clubInfo?.logoUrl ? (
                        <img 
                            src={clubInfo.logoUrl} 
                            alt="Logo" 
                            className="h-full w-full object-contain"
                        />
                    ) : (
                        <div className="h-full w-full bg-primary text-white flex items-center justify-center text-3xl sm:text-4xl font-black">
                            {clubInitial}
                        </div>
                    )}
                </div>
                <div className="space-y-1">
                    <h1 className="text-xl sm:text-2xl font-black uppercase tracking-tighter text-white leading-tight">{clubInfo?.clubName || "VOTRE CLUB"}</h1>
                    <div className="text-slate-400 text-[10px] sm:text-sm font-medium leading-tight">
                        <p className="max-w-[350px] break-words">{clubInfo?.address || "Adresse du club"}</p>
                        {clubInfo?.clubPhone && <p className="mt-1">Tél: {clubInfo.clubPhone}</p>}
                    </div>
                </div>
                </div>
                <div className="text-center sm:text-right space-y-1">
                <h2 className="text-3xl sm:text-4xl font-black uppercase italic tracking-tight text-white">REÇU</h2>
                <div className="pt-2">
                    <p className="text-primary font-bold text-xs sm:text-sm tracking-widest">REF: {receiptRef}</p>
                    <p className="text-slate-500 text-[10px] sm:text-xs font-semibold">Date : {format(new Date(), "dd/MM/yyyy")}</p>
                </div>
                </div>
            </header>

            <div className="p-6 sm:p-10 space-y-8 sm:space-y-10">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 sm:gap-12">
                <div className="bg-slate-50 p-4 sm:p-6 rounded-xl border border-slate-100">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2 sm:mb-4">Informations Joueur</h3>
                    <div className="space-y-2">
                        <p className="text-xl sm:text-2xl font-black text-slate-800">{payment.playerName}</p>
                        <div className="flex flex-col gap-1">
                            <p className="text-slate-500 font-semibold text-xs sm:text-sm flex items-center gap-2">
                                <span className="uppercase text-[10px] text-slate-400">Catégorie :</span> {payment.playerCategory}
                            </p>
                            <p className="text-slate-500 font-bold text-[10px] sm:text-xs flex items-center gap-2 bg-white px-2 py-1 rounded border border-slate-200 w-fit">
                                <Fingerprint className="h-3 w-3 text-primary" />
                                <span className="uppercase text-[10px] text-slate-400">ID Joueur :</span> {payment.playerProfessionalId}
                            </p>
                        </div>
                    </div>
                </div>
                <div className="bg-slate-50 p-4 sm:p-6 rounded-xl border border-slate-100">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2 sm:mb-4">Détails de la Cotisation</h3>
                    <div>
                        <p className="text-lg sm:text-xl font-bold text-slate-800">{payment.description}</p>
                        <p className="text-slate-500 text-[10px] sm:text-xs uppercase font-bold tracking-widest mt-1">Saison Sportive</p>
                    </div>
                </div>
                </div>

                <div className="rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <Table className="min-w-[500px] sm:min-w-full">
                        <TableHeader className="bg-slate-50">
                            <TableRow className="border-b border-slate-200">
                                <TableHead className="font-bold text-slate-700 h-12 px-4 sm:px-6">Désignation</TableHead>
                                <TableHead className="font-bold text-slate-700 h-12">Date</TableHead>
                                <TableHead className="font-bold text-slate-700 h-12">Mode</TableHead>
                                <TableHead className="text-right font-bold text-slate-700 h-12 px-4 sm:px-6">Montant</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {payment.transactions?.map((t: any, i: number) => (
                            <TableRow key={i} className="border-b border-slate-100 last:border-0">
                                <TableCell className="px-4 sm:px-6 py-3 sm:py-4 font-bold text-slate-800 text-xs sm:text-sm">Versement #{i+1}</TableCell>
                                <TableCell className="py-3 sm:py-4 text-slate-600 text-xs sm:text-sm">{t.date?.seconds ? format(new Date(t.date.seconds * 1000), "dd/MM/yyyy") : 'N/A'}</TableCell>
                                <TableCell className="py-3 sm:py-4 text-slate-600 font-medium text-xs sm:text-sm">{t.method}</TableCell>
                                <TableCell className="text-right py-3 sm:py-4 px-4 sm:px-6 font-black text-slate-900 text-sm sm:text-base">{t.amount.toFixed(2)} MAD</TableCell>
                            </TableRow>
                            ))}
                        </TableBody>
                        </Table>
                    </div>
                </div>

                <div className="flex justify-end">
                <div className="w-full sm:max-w-sm space-y-3 bg-slate-50 p-4 sm:p-6 rounded-xl border border-slate-100">
                    <div className="flex justify-between text-slate-500 font-bold text-xs sm:text-sm">
                        <span>Montant Total Dû :</span>
                        <span>{payment.totalAmount.toFixed(2)} MAD</span>
                    </div>
                    <div className="flex justify-between text-green-600 font-black text-sm sm:text-base">
                        <span>Total Réglé à ce jour :</span>
                        <span>{amountPaid.toFixed(2)} MAD</span>
                    </div>
                    <Separator className="bg-slate-200" />
                    <div className={cn(
                        "flex justify-between items-center font-black text-sm sm:text-base",
                        remaining > 0 ? "text-red-500" : "text-slate-600"
                    )}>
                        <span className="uppercase tracking-tighter">RESTE À PAYER :</span>
                        <span>{remaining.toFixed(2)} MAD</span>
                    </div>
                </div>
                </div>

                <div className="flex justify-center pt-16 sm:pt-24">
                    <div className="text-center space-y-16 sm:space-y-24 w-full max-w-md border-t-2 border-slate-100 pt-8">
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Cachet et Signature</p>
                        <div className="pt-4 flex flex-col items-center gap-2">
                            <div className="flex items-center gap-1 text-slate-300">
                                <ShieldCheck className="h-4 w-4" />
                                <span className="text-[8px] font-black uppercase tracking-widest italic">Document certifié par l'administration</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <footer className="p-6 sm:p-8 bg-slate-900 text-white flex justify-between items-center gap-4 mt-auto">
                <div className="text-[8px] sm:text-[9px] opacity-40 font-bold uppercase tracking-widest text-center sm:text-left">
                    <p>© {new Date().getFullYear()} {clubInfo?.clubName || "Club"} - Team Assistant</p>
                </div>
                <div className="flex items-center gap-2 text-primary font-black uppercase tracking-widest text-[8px] sm:text-[9px] italic text-center">
                    Authenticité garantie par le club
                </div>
            </footer>
            </Card>
        </div>
      </div>
    </div>
  );
}
