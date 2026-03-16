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

type PageProps = {
  params: Promise<{ id: string }>;
};

export default function PaymentReceiptPage({ params }: PageProps) {
  const { id: paymentId } = React.use(params);
  
  const router = useRouter();
  const [user, loadingUser] = useAuthState(auth);
  const { toast } = useToast();
  
  const [payment, setPayment] = useState<any | null>(null);
  const [clubInfo, setClubInfo] = useState<any | null>(null);
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

            await new Promise(r => setTimeout(r, 1000));

            const canvas = await html2canvas(element, { 
                scale: 2, 
                useCORS: true,
                backgroundColor: "#ffffff",
                logging: false,
                allowTaint: true
            });

            const pdf = new jsPDF('p', 'pt', 'a4');
            const imgData = canvas.toDataURL('image/png', 1.0);
            const imgWidth = pdf.internal.pageSize.getWidth(); 
            const imgHeight = (canvas.height * imgWidth) / canvas.width;
            
            pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
            pdf.save(`recu_${payment?.playerName.replace(/ /g, "_")}.pdf`);
        } catch (err) {
            console.error("Erreur PDF:", err);
            toast({ variant: "destructive", title: "Erreur de génération" });
        } finally {
            setLoadingPdf(false);
        }
    }
  };

  if (loading || loadingUser) return <div className="flex justify-center items-center py-20"><Loader2 className="animate-spin text-primary" /></div>;
  if (!payment) return null;
  
  const amountPaid = payment.transactions?.reduce((sum: number, t: any) => sum + (t.amount || 0), 0) || 0;
  const remaining = payment.totalAmount - amountPaid;
  const clubInitial = clubInfo?.clubName?.charAt(0)?.toUpperCase() || "C";

  const dateObj = payment.createdAt?.seconds ? new Date(payment.createdAt.seconds * 1000) : new Date();
  const receiptRef = `RC-J-${format(dateObj, "yyyyMM")}-${payment.id.substring(0, 4).toUpperCase()}`;

  return (
    <div className="flex flex-col items-center w-full">
      <div className="w-full max-w-5xl space-y-4 text-center">
        <div className="flex justify-between items-center gap-4 mb-4">
          <Button variant="outline" size="sm" onClick={() => router.back()} className="h-10 font-bold"><ArrowLeft className="mr-2 h-4 w-4" /> Retour</Button>
          <Button size="sm" onClick={handleDownloadPdf} disabled={loadingPdf} className="h-10 font-black uppercase tracking-widest">
              {loadingPdf ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
              Exporter Fiche
          </Button>
        </div>

        <div className="w-full overflow-x-auto pb-8 scrollbar-thin bg-muted/20 rounded-xl p-2">
            <div className="min-w-[800px] flex justify-center">
                <div id="printable-receipt" className="bg-white text-slate-900 border shadow-2xl flex flex-col overflow-hidden" style={{ width: '800px', minHeight: '1131px' }}>
                    <header className="p-8 bg-slate-900 text-white flex flex-row justify-between items-center gap-6 mb-8">
                        <div className="flex flex-row items-center gap-8 text-left">
                            <div className="h-20 w-24 border-2 border-slate-700 shadow-2xl rounded-lg overflow-hidden bg-white flex items-center justify-center shrink-0">
                                {clubInfo?.logoUrl ? (
                                    <img src={clubInfo.logoUrl} alt="Logo" className="h-full w-full object-contain p-1.5" />
                                ) : (
                                    <div className="h-full w-full bg-primary text-white flex items-center justify-center text-4xl font-black">
                                        {clubInitial}
                                    </div>
                                )}
                            </div>
                            <div className="space-y-1">
                                <h1 className="text-2xl font-black uppercase tracking-tighter text-white leading-none">{clubInfo?.clubName || "VOTRE CLUB"}</h1>
                                <div className="text-slate-400 text-sm font-semibold leading-tight max-w-[350px]">
                                    <p className="break-words">{clubInfo?.address || "Siège Social"}</p>
                                </div>
                            </div>
                        </div>
                        <div className="text-right space-y-1">
                            <h2 className="text-4xl font-black uppercase italic tracking-tighter text-white">REÇU</h2>
                            <div className="pt-1">
                                <p className="text-primary font-black text-sm tracking-[0.2em] uppercase">REF: {receiptRef}</p>
                                <p className="text-slate-500 text-xs font-bold mt-0.5">Date : {format(new Date(), "dd/MM/yyyy")}</p>
                            </div>
                        </div>
                    </header>

                    <div className="px-12 py-8 space-y-10 flex-grow">
                        <div className="grid grid-cols-2 gap-10 text-left">
                            <div className="bg-slate-50 p-8 rounded-2xl border-2 border-slate-100 shadow-sm">
                                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-6">Bénéficiaire (Joueur)</h3>
                                <div className="space-y-3">
                                    <p className="text-3xl font-black text-slate-900 uppercase tracking-tighter">{payment.playerName}</p>
                                    <div className="flex flex-col gap-2">
                                        <p className="text-slate-600 font-bold text-base">
                                            <span className="uppercase text-[8px] text-slate-400 font-black tracking-widest block mb-0.5">Catégorie</span> {payment.playerCategory}
                                        </p>
                                        <p className="text-slate-700 font-black text-xs flex items-center gap-3 bg-white px-3 py-2 rounded-lg border border-slate-200 w-fit mt-1 shadow-sm">
                                            <Fingerprint className="h-4 w-4 text-primary" />
                                            <span>ID : {payment.playerProfessionalId}</span>
                                        </p>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-slate-50 p-8 rounded-2xl border-2 border-slate-100 shadow-sm">
                                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-6">Description du paiement</h3>
                                <div className="space-y-2">
                                    <p className="text-2xl font-black text-slate-900 tracking-tight leading-tight">{payment.description}</p>
                                    <p className="text-primary font-black text-xs uppercase tracking-widest mt-2 italic">Saison Sportive En Cours</p>
                                </div>
                            </div>
                        </div>

                        <div className="rounded-2xl border-2 border-slate-200 shadow-lg overflow-hidden">
                            <Table className="w-full">
                                <TableHeader className="bg-slate-100">
                                    <TableRow className="border-b-2 border-slate-200">
                                        <TableHead className="font-black text-slate-900 h-14 px-8 uppercase tracking-widest text-[10px]">Désignation</TableHead>
                                        <TableHead className="font-black text-slate-900 h-14 uppercase tracking-widest text-[10px]">Date Versement</TableHead>
                                        <TableHead className="font-black text-slate-900 h-14 uppercase tracking-widest text-[10px]">Mode de règlement</TableHead>
                                        <TableHead className="text-right font-black text-slate-900 h-14 px-8 uppercase tracking-widest text-[10px]">Montant Versé</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {payment.transactions?.map((t: any, i: number) => (
                                    <TableRow key={i} className="border-b border-slate-100 last:border-0 h-16 hover:bg-slate-50">
                                        <TableCell className="px-8 py-4 font-bold text-slate-900 text-base">Versement N°{i+1}</TableCell>
                                        <TableCell className="py-4 text-slate-600 font-bold text-base">{t.date?.seconds ? format(new Date(t.date.seconds * 1000), "dd/MM/yyyy") : 'N/A'}</TableCell>
                                        <TableCell className="py-4 text-slate-700 font-black italic text-base">{t.method}</TableCell>
                                        <TableCell className="text-right py-4 px-8 font-black text-slate-900 text-xl">{t.amount.toFixed(2)} MAD</TableCell>
                                    </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>

                        <div className="flex justify-end pt-4">
                            <div className="w-full max-w-sm space-y-4 bg-slate-900 p-8 rounded-2xl shadow-2xl text-left border-b-8 border-primary">
                                <div className="flex justify-between text-slate-400 font-bold text-[10px] uppercase tracking-widest">
                                    <span>Montant Total Dû</span>
                                    <span>{payment.totalAmount.toFixed(2)} MAD</span>
                                </div>
                                <div className="flex justify-between text-white font-black text-2xl tracking-tighter">
                                    <span>Payé à ce jour</span>
                                    <span className="text-primary">{amountPaid.toFixed(2)} MAD</span>
                                </div>
                                <Separator className="bg-slate-700 h-0.5" />
                                <div className="flex justify-between text-slate-400 font-bold text-[10px] uppercase tracking-widest pt-1">
                                    <span>Reste à régler</span>
                                    <span className={cn(remaining > 0.01 ? "text-red-400" : "text-green-400")}>{remaining.toFixed(2)} MAD</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col items-center pt-12">
                            <div className="text-center space-y-16 w-full max-w-lg border-t-2 border-slate-100 pt-10">
                                <p className="text-[9px] font-black uppercase tracking-[0.5em] text-slate-600 italic">Cachet du Club & Signature</p>
                                <div className="w-full flex flex-col items-center gap-6">
                                    <div className="w-64 border-b-4 border-slate-200 shadow-sm"></div>
                                    <div className="flex items-center gap-3 text-slate-300">
                                        <ShieldCheck className="h-6 w-6" />
                                        <span className="text-[9px] font-black uppercase tracking-widest italic">Document Officiel Certifié Conforme</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <footer className="p-8 bg-slate-900 text-white flex justify-between items-center gap-6 mt-auto">
                        <div className="text-[9px] opacity-50 font-black uppercase tracking-widest text-left">
                            <p>© {new Date().getFullYear()} {clubInfo?.clubName || "Club Sportif"} - Team Assistant Pro</p>
                        </div>
                        <div className="text-primary font-black uppercase tracking-[0.3em] text-[9px] italic text-right border-l-2 border-primary/30 pl-6">
                            Authenticité Garantie
                        </div>
                    </footer>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
}
