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

export default function SalaryReceiptPage({ params }: PageProps) {
  const { id: salaryId } = React.use(params);
  
  const router = useRouter();
  const [user, loadingUser] = useAuthState(auth);
  const { toast } = useToast();
  
  const [salary, setSalary] = useState<any | null>(null);
  const [clubInfo, setClubInfo] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingPdf, setLoadingPdf] = useState(false);

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
            const canvas = await html2canvas(element, { 
                scale: 2, 
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

  if (loading || loadingUser) return <div className="flex justify-center items-center py-20"><Loader2 className="animate-spin text-primary" /></div>;
  if (!salary) return null;
  
  const amountPaid = salary.transactions?.reduce((sum: number, t: any) => sum + (t.amount || 0), 0) || 0;
  const remaining = salary.totalAmount - amountPaid;
  const clubInitial = clubInfo?.clubName?.charAt(0)?.toUpperCase() || "C";

  const dateObj = salary.createdAt?.seconds ? new Date(salary.createdAt.seconds * 1000) : new Date();
  const professionalId = `RC-E-${format(dateObj, "yyyyMM")}-${salary.id.substring(0, 4).toUpperCase()}`;

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
                    <div id="printable-receipt" className="bg-white text-slate-900 border shadow-2xl flex flex-col mx-auto" style={{ width: '600px', minHeight: '840px' }}>
                        <header className="p-4 bg-slate-900 text-white flex flex-row justify-between items-center gap-4 border-b-4 border-primary shrink-0">
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
                                        <p className="break-words">{clubInfo?.address || "Adresse officielle"}</p>
                                    </div>
                                </div>
                            </div>
                            <div className="text-right space-y-0.5">
                                <h2 className="text-xl font-black uppercase italic tracking-tighter text-white leading-none">FICHE DE PAIE</h2>
                                <div className="pt-0.5">
                                    <p className="text-primary font-black text-[8px] tracking-[0.2em] uppercase">REF: {professionalId}</p>
                                    <p className="text-slate-500 text-[8px] font-bold">Le {format(new Date(), "dd/MM/yyyy")}</p>
                                </div>
                            </div>
                        </header>

                        <div className="px-6 py-6 space-y-8 text-left flex-grow flex flex-col">
                            <div className="grid grid-cols-2 gap-6">
                                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 shadow-sm">
                                    <h3 className="text-[7px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">Bénéficiaire (Entraîneur)</h3>
                                    <div className="space-y-2">
                                        <p className="text-lg font-black text-slate-900 uppercase tracking-tighter">{salary.coachName}</p>
                                        <div className="flex flex-col gap-1.5">
                                            <p className="text-slate-500 font-black uppercase text-[7px] tracking-widest">Entraîneur Officiel</p>
                                            <p className="text-slate-700 font-black text-[8px] flex items-center gap-1.5 bg-white px-1.5 py-0.5 rounded-lg border border-slate-200 w-fit">
                                                <Fingerprint className="h-2.5 w-2.5 text-primary" />
                                                <span>ID : {salary.coachProfessionalId}</span>
                                            </p>
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 shadow-sm">
                                    <h3 className="text-[7px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">Période / Motif</h3>
                                    <div className="space-y-2">
                                        <p className="text-base font-black text-slate-900 tracking-tight leading-tight">{salary.description}</p>
                                        <p className="text-primary font-black text-[8px] uppercase tracking-widest italic">Saison Sportive En Cours</p>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="rounded-xl border-2 border-slate-200 overflow-hidden shadow-md">
                                <Table className="w-full">
                                    <TableHeader className="bg-slate-100">
                                        <TableRow className="border-b-2 border-slate-200">
                                            <TableHead className="px-4 font-black text-slate-900 uppercase tracking-widest text-[7px] h-10">Désignation</TableHead>
                                            <TableHead className="font-black text-slate-900 uppercase tracking-widest text-[7px] h-10">Date</TableHead>
                                            <TableHead className="font-black text-slate-900 uppercase tracking-widest text-[7px] h-10">Méthode</TableHead>
                                            <TableHead className="text-right px-4 font-black text-slate-900 uppercase tracking-widest text-[7px] h-10">Montant</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {salary.transactions?.map((t: any, i: number) => (
                                            <TableRow key={i} className="border-b border-slate-100 last:border-0 h-12 hover:bg-slate-50">
                                                <TableCell className="px-4 py-1 font-bold text-slate-900 text-[10px]">Versement Salaire N°{i+1}</TableCell>
                                                <TableCell className="py-1 text-slate-600 font-bold text-[10px]">{t.date?.seconds ? format(new Date(t.date.seconds * 1000), "dd/MM/yyyy") : 'N/A'}</TableCell>
                                                <TableCell className="py-1 text-slate-700 font-black italic text-[10px]">{t.method}</TableCell>
                                                <TableCell className="text-right px-4 py-1 font-black text-slate-900 text-[11px]">{t.amount.toFixed(2)} MAD</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>

                            <div className="flex justify-end pt-4">
                                <div className="w-full max-w-[220px] space-y-3 bg-slate-900 p-4 rounded-xl shadow-xl text-left border-b-4 border-primary">
                                    <div className="flex justify-between text-slate-400 font-bold text-[7px] uppercase tracking-widest">
                                        <span>Salaire Brut Total</span>
                                        <span>{salary.totalAmount.toFixed(2)} MAD</span>
                                    </div>
                                    <div className="flex justify-between text-white font-black text-base tracking-tighter">
                                        <span>Déjà versé</span>
                                        <span className="text-primary">{amountPaid.toFixed(2)} MAD</span>
                                    </div>
                                    <Separator className="bg-slate-700 h-0.5" />
                                    <div className={cn(
                                        "flex justify-between items-center font-black text-[11px] pt-0.5",
                                        remaining > 0.01 ? "text-red-400" : "text-green-400"
                                    )}>
                                        <span className="uppercase tracking-tighter italic text-[7px]">RESTE À VERSER :</span>
                                        <span>{remaining.toFixed(2)} MAD</span>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-auto pt-16 flex flex-col items-center">
                                <div className="text-center space-y-8 w-full flex flex-col items-center">
                                    <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-600 italic">Cachet du Club & Signature</p>
                                    <div className="w-40 border-b-2 border-slate-300"></div>
                                </div>
                            </div>
                        </div>

                        <footer className="p-4 bg-slate-900 text-white flex flex-row justify-between items-center gap-4 mt-12 shrink-0 border-t border-primary">
                            <div className="flex items-center gap-4">
                                <div className="bg-green-600 text-white px-2 py-1 rounded font-black text-[7px] tracking-widest uppercase shadow-sm">
                                    STATUT: {salary.status.toUpperCase()}
                                </div>
                            </div>
                            <div className="text-[7px] text-slate-400 font-black uppercase tracking-widest italic text-right border-l border-slate-700 pl-4">
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