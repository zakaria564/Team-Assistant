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

export default function SalaryReceiptPage({ params }: PageProps) {
  const resolvedParams = React.use(params);
  const salaryId = resolvedParams.id;
  
  const router = useRouter();
  const [user, loadingUser] = useAuthState(auth);
  const { toast } = useToast();
  
  const [salary, setSalary] = useState<any | null>(null);
  const [clubInfo, setClubInfo] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingPdf, setLoadingPdf] = useState(false);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const handleResize = () => {
      const containerWidth = window.innerWidth - 32;
      if (containerWidth < 1000) {
        setScale(Math.min(containerWidth / 1000, 1));
      } else {
        setScale(1);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  useEffect(() => {
    if (!salaryId || loadingUser) return;

    const fetchDetails = async () => {
      if (!user) return;
      try {
        const salarySnap = await getDoc(doc(db, "salaries", salaryId));
        if (salarySnap.exists()) {
          const data = salarySnap.data();
          const coachSnap = await getDoc(doc(db, "coaches", data.coachId));
          const clubSnap = await getDoc(doc(db, "clubs", user.uid));
          
          setSalary({ 
            id: salarySnap.id, 
            ...data, 
            coachName: coachSnap.exists() ? coachSnap.data().name : "Entraîneur",
            coachProfessionalId: coachSnap.exists() ? coachSnap.data().professionalId : "N/A"
          });
          if (clubSnap.exists()) setClubInfo(clubSnap.data());
        } else {
          router.push('/dashboard/salaries');
        }
      } catch (error) { console.error(error); }
      finally { setLoading(false); }
    };

    fetchDetails();
  }, [salaryId, user, loadingUser, router]);

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
                scale: 3, 
                useCORS: true, 
                allowTaint: true,
                backgroundColor: "#ffffff",
                logging: false
            });

            const pdf = new jsPDF('p', 'pt', 'a4');
            const imgData = canvas.toDataURL('image/png', 1.0);
            const imgWidth = pdf.internal.pageSize.getWidth();
            const imgHeight = (canvas.height * imgWidth) / canvas.width;
            pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
            pdf.save(`fiche_paie_${salary?.coachName.replace(/ /g, "_")}.pdf`);
        } catch (err) {
            console.error("Erreur PDF:", err);
            toast({ variant: "destructive", title: "Erreur de génération" });
        } finally {
            setLoadingPdf(false);
        }
    }
  };

  if (loading || loadingUser) return <div className="flex justify-center items-center h-screen"><Loader2 className="animate-spin text-primary" /></div>;
  if (!salary) return null;
  
  const amountPaid = salary.transactions?.reduce((sum: number, t: any) => sum + (t.amount || 0), 0) || 0;
  const remaining = salary.totalAmount - amountPaid;
  const clubInitial = clubInfo?.clubName?.charAt(0)?.toUpperCase() || "C";

  const dateObj = salary.createdAt?.seconds ? new Date(salary.createdAt.seconds * 1000) : new Date();
  const professionalId = `RC-E-${format(dateObj, "yyyyMM")}-${salary.id.substring(0, 4).toUpperCase()}`;

  return (
    <div className="bg-slate-100 p-2 sm:p-8 flex flex-col items-center min-h-screen overflow-x-hidden w-full">
        <div className="w-full max-w-5xl space-y-4 text-center overflow-x-hidden">
            <div className="flex justify-between items-center print:hidden gap-4 mb-4">
                <Button variant="outline" size="sm" onClick={() => router.back()} className="h-10 font-bold"><ArrowLeft className="mr-2 h-4 w-4" /> Retour</Button>
                <Button size="sm" onClick={handleDownloadPdf} disabled={loadingPdf} className="h-10 font-black uppercase tracking-widest">
                    {loadingPdf ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                    Exporter Fiche
                </Button>
            </div>
            
            <div className="w-full flex justify-center overflow-hidden">
                <div 
                    style={{ 
                        transform: `scale(${scale})`, 
                        transformOrigin: 'top center',
                        width: '1000px',
                        height: `${1414 * scale}px`,
                        transition: 'transform 0.2s ease-out'
                    }}
                    className="bg-white shadow-2xl rounded-xl overflow-hidden"
                >
                    <div id="printable-receipt" className="bg-white text-slate-900 border-none flex flex-col mx-auto overflow-hidden" style={{ width: '1000px', minHeight: '1414px' }}>
                        <header className="p-12 bg-slate-900 text-white flex flex-row justify-between items-center gap-8 mb-10">
                            <div className="flex flex-row items-center gap-10 text-left">
                                <div className="h-28 w-32 border-2 border-slate-700 shadow-2xl rounded-xl overflow-hidden bg-white flex items-center justify-center shrink-0">
                                    {clubInfo?.logoUrl ? (
                                        <img src={clubInfo.logoUrl} alt="Logo" className="h-full w-full object-contain p-2" />
                                    ) : (
                                        <div className="h-full w-full bg-primary text-white flex items-center justify-center text-6xl font-black">
                                            {clubInitial}
                                        </div>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <h1 className="text-3xl font-black uppercase tracking-tighter text-white leading-none">{clubInfo?.clubName || "VOTRE CLUB"}</h1>
                                    <div className="text-slate-400 text-lg font-semibold leading-tight max-w-[450px]">
                                        <p className="break-words">{clubInfo?.address || "Adresse officielle"}</p>
                                    </div>
                                </div>
                            </div>
                            <div className="text-right space-y-2">
                                <h2 className="text-6xl font-black uppercase italic tracking-tighter text-white">FICHE DE PAIE</h2>
                                <div className="pt-2">
                                    <p className="text-primary font-black text-lg tracking-[0.2em] uppercase">REF: {professionalId}</p>
                                    <p className="text-slate-500 text-base font-bold mt-1">Générée le {format(new Date(), "dd/MM/yyyy")}</p>
                                </div>
                            </div>
                        </header>

                        <div className="p-16 space-y-12 text-left flex-grow">
                            <div className="grid grid-cols-2 gap-16">
                                <div className="bg-slate-50 p-10 rounded-3xl border-2 border-slate-100 shadow-sm">
                                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.3em] mb-8">Bénéficiaire (Entraîneur)</h3>
                                    <div className="space-y-4">
                                        <p className="text-4xl font-black text-slate-900 uppercase tracking-tighter">{salary.coachName}</p>
                                        <div className="flex flex-col gap-3">
                                            <p className="text-slate-500 font-black uppercase text-[11px] tracking-widest">Entraîneur Officiel Du Club</p>
                                            <p className="text-slate-700 font-black text-sm flex items-center gap-4 bg-white px-4 py-3 rounded-xl border border-slate-200 w-fit mt-2 shadow-sm">
                                                <Fingerprint className="h-5 w-5 text-primary" />
                                                <span>ID : {salary.coachProfessionalId}</span>
                                            </p>
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-slate-50 p-10 rounded-3xl border-2 border-slate-100 shadow-sm">
                                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.3em] mb-8">Période / Motif</h3>
                                    <div className="space-y-3">
                                        <p className="text-3xl font-black text-slate-900 tracking-tight leading-tight">{salary.description}</p>
                                        <p className="text-primary font-black text-sm uppercase tracking-widest mt-4 italic">Saison Sportive En Cours</p>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="rounded-3xl border-2 border-slate-200 overflow-hidden shadow-lg">
                                <Table className="w-full">
                                    <TableHeader className="bg-slate-100">
                                        <TableRow className="border-b-2 border-slate-200">
                                            <TableHead className="px-10 font-black text-slate-900 uppercase tracking-widest text-[12px] h-16">Désignation du paiement</TableHead>
                                            <TableHead className="font-black text-slate-900 uppercase tracking-widest text-[12px] h-16">Date Versement</TableHead>
                                            <TableHead className="font-black text-slate-900 uppercase tracking-widest text-[12px] h-16">Méthode de règlement</TableHead>
                                            <TableHead className="text-right px-10 font-black text-slate-900 uppercase tracking-widest text-[12px] h-16">Montant</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {salary.transactions?.map((t: any, i: number) => (
                                            <TableRow key={i} className="border-b border-slate-100 last:border-0 h-20 hover:bg-slate-50">
                                                <TableCell className="px-10 py-6 font-bold text-slate-900 text-lg">Versement Salaire N°{i+1}</TableCell>
                                                <TableCell className="py-6 text-slate-600 font-bold text-lg">{t.date?.seconds ? format(new Date(t.date.seconds * 1000), "dd/MM/yyyy") : 'N/A'}</TableCell>
                                                <TableCell className="py-6 text-slate-700 font-black italic text-lg">{t.method}</TableCell>
                                                <TableCell className="text-right px-10 font-black text-slate-900 text-2xl">{t.amount.toFixed(2)} MAD</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>

                            <div className="flex justify-end pt-6">
                                <div className="w-full max-w-md space-y-5 bg-slate-900 p-10 rounded-3xl shadow-2xl text-left border-b-8 border-primary">
                                    <div className="flex justify-between text-slate-400 font-bold text-sm uppercase tracking-widest">
                                        <span>Salaire Brut Total</span>
                                        <span>{salary.totalAmount.toFixed(2)} MAD</span>
                                    </div>
                                    <div className="flex justify-between text-white font-black text-3xl tracking-tighter">
                                        <span>Déjà versé au bénéficiaire</span>
                                        <span className="text-primary">{amountPaid.toFixed(2)} MAD</span>
                                    </div>
                                    <Separator className="bg-slate-700 h-0.5" />
                                    <div className={cn(
                                        "flex justify-between items-center font-black text-2xl pt-2",
                                        remaining > 0.01 ? "text-red-400" : "text-green-400"
                                    )}>
                                        <span className="uppercase tracking-tighter italic text-xs">SOLDE RESTANT À VERSER :</span>
                                        <span>{remaining.toFixed(2)} MAD</span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-col items-center pt-16">
                                <div className="text-center space-y-24 w-full max-w-xl border-t-2 border-slate-100 pt-12">
                                    <p className="text-xs font-black uppercase tracking-[0.5em] text-slate-400 italic">Signature Administrative & Cachet</p>
                                    <div className="w-full flex flex-col items-center gap-8">
                                        <div className="w-80 border-b-4 border-slate-200 shadow-sm"></div>
                                        <div className="flex items-center gap-4 text-slate-300">
                                            <ShieldCheck className="h-8 w-8" />
                                            <span className="text-[11px] font-black uppercase tracking-widest italic">Document Officiel Certifié Conforme</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <footer className="p-12 bg-slate-50 border-t-2 flex flex-row justify-between items-center gap-8 mt-auto">
                            <div className="flex items-center gap-6">
                                <div className="bg-green-100 text-green-800 px-6 py-3 rounded-2xl font-black text-[12px] tracking-widest border-2 border-green-200 uppercase shadow-sm">
                                    STATUT FINAL: {salary.status.toUpperCase()}
                                </div>
                            </div>
                            <div className="text-[11px] text-slate-400 font-black uppercase tracking-widest italic text-right border-l-2 border-slate-200 pl-8">
                                Système Team Assistant - Gestion Pro
                            </div>
                        </footer>
                    </div>
                </div>
            </div>
        </div>
    </div>
  );
}
