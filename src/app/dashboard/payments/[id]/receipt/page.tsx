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
            scale: 3, 
            useCORS: true,
            backgroundColor: "#ffffff",
            logging: false,
            allowTaint: true,
            imageTimeout: 15000,
        }).then((canvas) => {
            const pdf = new jsPDF('p', 'pt', 'a4');
            const imgData = canvas.toDataURL('image/png', 1.0);
            const imgWidth = 595.28; 
            const imgHeight = (canvas.height * imgWidth) / canvas.width;
            
            pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
            pdf.save(`recu_${payment?.playerName.replace(/ /g, "_")}.pdf`);
        }).catch((err) => {
            console.error("Erreur PDF:", err);
            toast({
                variant: "destructive",
                title: "Erreur de génération",
                description: "Impossible de générer le PDF. Vérifiez votre connexion."
            });
        }).finally(() => setLoadingPdf(false));
    }
  };

  if (loading || loadingUser) return <div className="flex justify-center items-center h-screen"><Loader2 className="animate-spin text-primary" /></div>;
  if (!payment) return null;
  
  const amountPaid = payment.transactions?.reduce((sum: number, t: any) => sum + t.amount, 0) || 0;
  const remaining = payment.totalAmount - amountPaid;
  const clubInitial = clubInfo?.clubName?.charAt(0)?.toUpperCase() || "C";

  const dateObj = payment.createdAt?.seconds ? new Date(payment.createdAt.seconds * 1000) : new Date();
  const professionalId = `RC-J-${format(dateObj, "yyyyMM")}-${payment.id.substring(0, 4).toUpperCase()}`;

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

        <Card id="printable-receipt" className="bg-white text-slate-900 shadow-2xl border-none overflow-hidden" style={{ minHeight: '842pt' }}>
          <header className="p-10 bg-slate-50 border-b-2 border-slate-200 flex flex-row justify-between items-center" style={{ backgroundColor: '#f8fafc' }}>
            <div className="flex items-center gap-6">
              <div className="h-24 w-24 border-2 border-white shadow-md rounded-lg overflow-hidden bg-white flex items-center justify-center shrink-0">
                {clubInfo?.logoUrl ? (
                    <img 
                        src={clubInfo.logoUrl} 
                        alt="Logo" 
                        className="h-full w-full object-contain"
                        crossOrigin="anonymous"
                    />
                ) : (
                    <div className="h-full w-full bg-primary text-white flex items-center justify-center text-4xl font-black" style={{ backgroundColor: 'hsl(199, 75%, 53%)' }}>
                        {clubInitial}
                    </div>
                )}
              </div>
              <div className="space-y-1">
                <h1 className="text-2xl font-black uppercase tracking-tight text-primary leading-tight" style={{ color: 'hsl(199, 75%, 53%)' }}>{clubInfo?.clubName || "Votre Club"}</h1>
                <div className="text-slate-500 text-sm font-medium">
                    <p>{clubInfo?.address || "Adresse non renseignée"}</p>
                    {clubInfo?.clubPhone && <p>Tél: {clubInfo.clubPhone}</p>}
                </div>
              </div>
            </div>
            <div className="text-right space-y-1">
              <h2 className="text-4xl font-black text-slate-800 tracking-tighter uppercase italic">REÇU</h2>
              <div className="pt-2">
                <p className="text-slate-600 font-bold text-sm">REF: {professionalId}</p>
                <p className="text-slate-400 text-xs font-semibold">Date : {format(new Date(), "dd/MM/yyyy")}</p>
              </div>
            </div>
          </header>

          <div className="p-10 space-y-10">
            <div className="grid grid-cols-2 gap-12">
              <div className="space-y-4">
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 border-b pb-2">Informations Joueur</h3>
                <div>
                    <p className="text-xl font-bold text-slate-800">{payment.playerName}</p>
                    <p className="text-slate-500 font-semibold text-sm">Catégorie : {payment.playerCategory}</p>
                </div>
              </div>
              <div className="space-y-4 text-right">
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 border-b pb-2">Détails de la Cotisation</h3>
                <div>
                    <p className="text-lg font-bold text-slate-800">{payment.description}</p>
                    <p className="text-slate-500 text-sm">Saison Sportive</p>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <Table>
                <TableHeader className="bg-slate-50">
                    <TableRow className="border-b border-slate-200">
                        <TableHead className="font-bold text-slate-700 h-12 px-6">Désignation</TableHead>
                        <TableHead className="font-bold text-slate-700 h-12">Date</TableHead>
                        <TableHead className="font-bold text-slate-700 h-12">Mode</TableHead>
                        <TableHead className="text-right font-bold text-slate-700 h-12 px-6">Montant</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {payment.transactions?.map((t: any, i: number) => (
                    <TableRow key={i} className="border-b border-slate-100 last:border-0">
                        <TableCell className="px-6 py-4 font-bold text-slate-800">Versement partiel #{i+1}</TableCell>
                        <TableCell className="py-4 text-slate-600">{t.date?.seconds ? format(new Date(t.date.seconds * 1000), "dd/MM/yyyy") : 'N/A'}</TableCell>
                        <TableCell className="py-4 text-slate-600 font-medium">{t.method}</TableCell>
                        <TableCell className="text-right py-4 px-6 font-black text-slate-900">{t.amount.toFixed(2)} MAD</TableCell>
                    </TableRow>
                    ))}
                </TableBody>
                </Table>
            </div>

            <div className="flex justify-end pt-4">
              <div className="w-full max-w-sm space-y-3 bg-slate-50 p-6 rounded-xl border border-slate-100">
                <div className="flex justify-between text-slate-500 font-bold text-sm">
                    <span>Montant Total Dû :</span>
                    <span>{payment.totalAmount.toFixed(2)} MAD</span>
                </div>
                <div className="flex justify-between text-green-600 font-black text-base">
                    <span>Total Réglé à ce jour :</span>
                    <span>{amountPaid.toFixed(2)} MAD</span>
                </div>
                <Separator className="bg-slate-200" />
                <div className={cn(
                    "flex justify-between items-center font-bold text-base",
                    remaining > 0 ? "text-red-500" : "text-slate-600"
                )} style={{ color: remaining > 0 ? '#ef4444' : '#475569' }}>
                    <span>RESTE À PAYER :</span>
                    <span>{remaining.toFixed(2)} MAD</span>
                </div>
              </div>
            </div>

            <div className="flex justify-center pt-24">
                <div className="text-center space-y-24 w-full max-w-md border-t-2 border-slate-100 pt-8">
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Cachet et Signature</p>
                    <div className="pt-4 flex flex-col items-center gap-2">
                        <div className="flex items-center gap-1 text-slate-300">
                            <ShieldCheck className="h-4 w-4" />
                            <span className="text-[8px] font-black uppercase tracking-widest italic">Document certifié par {clubInfo?.clubName || "le club"}</span>
                        </div>
                    </div>
                </div>
            </div>
          </div>

          <footer className="p-8 bg-slate-900 text-white flex justify-between items-center mt-auto" style={{ backgroundColor: '#0f172a' }}>
            <div className="text-[9px] opacity-40 font-bold uppercase tracking-widest">
                <p>© {new Date().getFullYear()} Team Assistant - Système de Gestion Sportive</p>
            </div>
            <div className="flex items-center gap-2 text-primary font-black uppercase tracking-widest text-[9px] italic">
                Validité garantie par l'administration
            </div>
          </footer>
        </Card>
      </div>
    </div>
  );
}
