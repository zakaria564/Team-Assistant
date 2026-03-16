"use client"

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, Download, ShieldCheck, Fingerprint } from "lucide-react";
import { format } from "date-fns";
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
      <div className="w-full max-w-2xl space-y-4 text-center">
        <div className="flex justify-between items-center gap-4 mb-2 px-2">
          <Button variant="outline" size="sm" onClick={() => router.back()} className="h-9 font-bold"><ArrowLeft className="mr-2 h-4 w-4" /> Retour</Button>
          <Button size="sm" onClick={handleDownloadPdf} disabled={loadingPdf} className="h-9 font-black uppercase tracking-widest bg-primary hover:bg-primary/90 text-white">
              {loadingPdf ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
              Exporter PDF
          </Button>
        </div>

        <div className="w-full overflow-x-auto pb-8 scrollbar-thin bg-muted/20 rounded-xl p-2">
            <div className="min-w-[600px] flex justify-center">
                <div id="printable-receipt" className="bg-white text-slate-900 border shadow-2xl flex flex-col" style={{ width: '600px' }}>
                    <header className="p-4 bg-slate-900 text-white flex flex-row justify-between items-center gap-4 border-b-4 border-primary">
                        <div className="flex flex-row items-center gap-3 text-left">
                            <div className="h-12 w-14 border border-slate-700 shadow-xl rounded-lg overflow-hidden bg-white flex items-center justify-center shrink-0">
                                {clubInfo?.logoUrl ? (
                                    <img src={clubInfo.logoUrl} alt="Logo" className="h-full w-full object-contain p-1" />
                                ) : (
                                    <div className="h-full w-full bg-primary text-white flex items-center justify-center text-xl font-black">
                                        {clubInitial}
                                    </div>
                                )}
                            </div>
                            <div className="space-y-0.5">
                                <h1 className="text-base font-black uppercase tracking-tighter text-white leading-none">{clubInfo?.clubName || "VOTRE CLUB"}</h1>
                                <div className="text-slate-400 text-[8px] font-semibold leading-tight max-w-[180px]">
                                    <p className="break-words">{clubInfo?.address || "Siège Social"}</p>
                                </div>
                            </div>
                        </div>
                        <div className="text-right space-y-0.5">
                            <h2 className="text-xl font-black uppercase italic tracking-tighter text-white leading-none">REÇU</h2>
                            <div className="pt-0.5">
                                <p className="text-primary font-black text-[8px] tracking-[0.2em] uppercase">REF: {receiptRef}</p>
                                <p className="text-slate-500 text-[8px] font-bold">Le {format(new Date(), "dd/MM/yyyy")}</p>
                            </div>
                        </div>
                    </header>

                    <div className="px-6 py-4 space-y-6 flex-grow">
                        <div className="grid grid-cols-2 gap-4 text-left">
                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 shadow-sm">
                                <h3 className="text-[7px] font-black uppercase tracking-[0.2em] text-slate-400 mb-3">Bénéficiaire (Joueur)</h3>
                                <div className="space-y-1.5">
                                    <p className="text-lg font-black text-slate-900 uppercase tracking-tighter">{payment.playerName}</p>
                                    <div className="flex flex-col gap-1">
                                        <p className="text-slate-600 font-bold text-[10px]">
                                            <span className="uppercase text-[6px] text-slate-400 font-black tracking-widest block leading-none mb-0.5">Catégorie</span> {payment.playerCategory}
                                        </p>
                                        <p className="text-slate-700 font-black text-[8px] flex items-center gap-1.5 bg-white px-1.5 py-0.5 rounded-lg border border-slate-200 w-fit">
                                            <Fingerprint className="h-2.5 w-2.5 text-primary" />
                                            <span>ID : {payment.playerProfessionalId}</span>
                                        </p>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 shadow-sm">
                                <h3 className="text-[7px] font-black uppercase tracking-[0.2em] text-slate-400 mb-3">Motif du règlement</h3>
                                <div className="space-y-1">
                                    <p className="text-base font-black text-slate-900 tracking-tight leading-tight">{payment.description}</p>
                                    <p className="text-primary font-black text-[8px] uppercase tracking-widest italic">Saison Sportive En Cours</p>
                                </div>
                            </div>
                        </div>

                        <div className="rounded-xl border-2 border-slate-200 overflow-hidden shadow-md">
                            <Table className="w-full">
                                <TableHeader className="bg-slate-100">
                                    <TableRow className="border-b-2 border-slate-200">
                                        <TableHead className="font-black text-slate-900 h-8 px-4 uppercase tracking-widest text-[7px]">Désignation</TableHead>
                                        <TableHead className="font-black text-slate-900 h-8 uppercase tracking-widest text-[7px]">Date</TableHead>
                                        <TableHead className="font-black text-slate-900 h-8 uppercase tracking-widest text-[7px]">Mode</TableHead>
                                        <TableHead className="text-right font-black text-slate-900 h-8 px-4 uppercase tracking-widest text-[7px]">Montant</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {payment.transactions?.map((t: any, i: number) => (
                                    <TableRow key={i} className="border-b border-slate-100 last:border-0 h-10 hover:bg-slate-50">
                                        <TableCell className="px-4 py-1 font-bold text-slate-900 text-[10px]">Versement N°{i+1}</TableCell>
                                        <TableCell className="py-1 text-slate-600 font-bold text-[10px]">{t.date?.seconds ? format(new Date(t.date.seconds * 1000), "dd/MM/yyyy") : 'N/A'}</TableCell>
                                        <TableCell className="py-1 text-slate-700 font-black italic text-[10px]">{t.method}</TableCell>
                                        <TableCell className="text-right py-1 px-4 font-black text-slate-900 text-[11px]">{t.amount.toFixed(2)} MAD</TableCell>
                                    </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>

                        <div className="flex justify-end pt-2">
                            <div className="w-full max-w-[220px] space-y-2 bg-slate-900 p-4 rounded-xl shadow-xl text-left border-b-4 border-primary">
                                <div className="flex justify-between text-slate-400 font-bold text-[7px] uppercase tracking-widest">
                                    <span>Montant Dû</span>
                                    <span>{payment.totalAmount.toFixed(2)} MAD</span>
                                </div>
                                <div className="flex justify-between text-white font-black text-base tracking-tighter">
                                    <span>Total Payé</span>
                                    <span className="text-primary">{amountPaid.toFixed(2)} MAD</span>
                                </div>
                                <Separator className="bg-slate-700 h-0.5" />
                                <div className="flex justify-between text-slate-400 font-bold text-[7px] uppercase tracking-widest pt-0.5">
                                    <span>Reste à régler</span>
                                    <span className={cn(remaining > 0.01 ? "text-red-400" : "text-green-400")}>{remaining.toFixed(2)} MAD</span>
                                </div>
                            </div>
                        </div>

                        <div className="py-12 flex flex-col items-center border-t border-slate-100 mt-4">
                            <div className="text-center space-y-8 w-full flex flex-col items-center">
                                <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-600 italic">Cachet du Club & Signature</p>
                                <div className="w-40 border-b-2 border-slate-300"></div>
                            </div>
                        </div>
                    </div>

                    <footer className="p-4 bg-slate-900 text-white flex justify-between items-center gap-4 mt-auto">
                        <div className="text-[7px] opacity-50 font-black uppercase tracking-widest text-left">
                            <p>© {new Date().getFullYear()} {clubInfo?.clubName || "Club Sportif"} - Team Assistant Pro</p>
                        </div>
                        <div className="text-primary font-black uppercase tracking-[0.2em] text-[7px] italic text-right border-l-2 border-primary/30 pl-4 leading-none">
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
