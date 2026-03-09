"use client"

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loader2, ArrowLeft, Download, Printer, Banknote, ShieldCheck } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

export default function SalaryReceiptPage({ params, searchParams }: { params: Promise<{ id: string }>, searchParams: Promise<any> }) {
  const { id: salaryId } = React.use(params);
  const _sParams = React.use(searchParams);
  const router = useRouter();
  const [user, loadingUser] = useAuthState(auth);
  const { toast } = useToast();
  
  const [salary, setSalary] = useState<any>(null);
  const [clubInfo, setClubInfo] = useState<any>(null);
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
          
          setSalary({ id: salarySnap.id, ...data, coachName: coachSnap.exists() ? coachSnap.data().name : "Entraîneur" });
          if (clubSnap.exists()) setClubInfo(clubSnap.data());
        } else {
          router.push('/dashboard/salaries');
        }
      } catch (error) { console.error(error); }
      finally { setLoading(false); }
    };

    fetchDetails();
  }, [salaryId, user, loadingUser, router]);

  const handleDownloadPdf = () => {
    setLoadingPdf(true);
    const element = document.getElementById("printable-receipt");
    if (element) {
        html2canvas(element, { 
            scale: 3, 
            useCORS: true, 
            backgroundColor: "#ffffff",
            logging: false,
            allowTaint: true
        }).then((canvas) => {
            const pdf = new jsPDF('p', 'pt', 'a4');
            const imgWidth = 595.28;
            const imgHeight = (canvas.height * imgWidth) / canvas.width;
            pdf.addImage(canvas.toDataURL('image/png', 1.0), 'PNG', 0, 0, imgWidth, imgHeight);
            pdf.save(`fiche_paie_${salary?.coachName.replace(/ /g, "_")}.pdf`);
        }).catch((err) => {
            console.error("Erreur PDF:", err);
            toast({
                variant: "destructive",
                title: "Erreur de génération",
                description: "Impossible de générer le PDF. Vérifiez la connexion Internet."
            });
        }).finally(() => setLoadingPdf(false));
    }
  };

  if (loading || loadingUser) return <div className="flex justify-center items-center h-screen"><Loader2 className="animate-spin text-primary" /></div>;
  if (!salary) return null;
  
  const amountPaid = salary.transactions?.reduce((sum: number, t: any) => sum + (t.amount || 0), 0) || 0;
  const remaining = salary.totalAmount - amountPaid;
  const clubInitial = clubInfo?.clubName?.charAt(0)?.toUpperCase() || "C";

  // Professional Receipt ID: RC-E-YYYYMM-SHORTID
  const dateObj = salary.createdAt?.seconds ? new Date(salary.createdAt.seconds * 1000) : new Date();
  const professionalId = `RC-E-${format(dateObj, "yyyyMM")}-${salary.id.substring(0, 4).toUpperCase()}`;

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
            
            <Card id="printable-receipt" className="bg-white text-slate-900 border-none shadow-2xl overflow-hidden">
                 <header className="p-10 bg-slate-900 text-white flex flex-row justify-between items-center">
                    <div className="flex items-center gap-6">
                        <div className="h-20 w-24 border-2 border-slate-700 shadow-xl rounded-lg overflow-hidden bg-white flex items-center justify-center">
                            {clubInfo?.logoUrl ? (
                                <img 
                                    src={clubInfo.logoUrl} 
                                    alt="Logo" 
                                    className="h-full w-full object-contain"
                                    crossOrigin="anonymous"
                                />
                            ) : (
                                <div className="h-full w-full bg-primary text-white flex items-center justify-center text-3xl font-black">
                                    {clubInitial}
                                </div>
                            )}
                        </div>
                        <div className="space-y-1">
                            <h1 className="text-2xl font-black uppercase tracking-tighter text-primary leading-tight">{clubInfo?.clubName || "VOTRE CLUB"}</h1>
                            <div className="text-slate-400 text-sm font-medium">
                                <p>{clubInfo?.address || "Adresse du club"}</p>
                            </div>
                        </div>
                    </div>
                    <div className="text-right space-y-1">
                        <h2 className="text-4xl font-black uppercase italic tracking-tight text-white">FICHE DE PAIE</h2>
                        <div className="pt-2">
                            <p className="text-primary font-bold text-sm tracking-widest">N° {professionalId}</p>
                            <p className="text-slate-500 text-xs font-semibold">Généré le {format(new Date(), "dd/MM/yyyy")}</p>
                        </div>
                    </div>
                </header>

                <div className="p-10 space-y-10">
                    <div className="grid sm:grid-cols-2 gap-12">
                        <div className="bg-slate-50 p-6 rounded-xl border border-slate-100">
                            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Bénéficiaire</h3>
                            <p className="text-2xl font-black text-slate-800">{salary.coachName}</p>
                            <p className="text-slate-500 font-bold mt-1 uppercase text-xs">Entraîneur du club</p>
                        </div>
                        <div className="bg-slate-50 p-6 rounded-xl border border-slate-100 text-right sm:text-left">
                            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Période / Motif</h3>
                            <p className="text-xl font-bold text-slate-800">{salary.description}</p>
                            <p className="text-slate-500 font-semibold mt-1 text-xs">Saison 2024-2025</p>
                        </div>
                    </div>
                    
                    <div className="rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                        <Table>
                            <TableHeader className="bg-slate-50">
                                <TableRow className="border-b border-slate-200">
                                    <TableHead className="px-6 font-bold text-slate-700">Désignation du paiement</TableHead>
                                    <TableHead className="font-bold text-slate-700">Date Versement</TableHead>
                                    <TableHead className="font-bold text-slate-700">Méthode</TableHead>
                                    <TableHead className="text-right px-6 font-bold text-slate-700">Montant</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {salary.transactions?.map((t: any, i: number) => (
                                    <TableRow key={i} className="border-b border-slate-100 last:border-0">
                                        <TableCell className="px-6 py-4 font-bold text-slate-800">Versement #{i+1}</TableCell>
                                        <TableCell className="text-slate-600">{t.date?.seconds ? format(new Date(t.date.seconds * 1000), "dd/MM/yyyy") : 'N/A'}</TableCell>
                                        <TableCell className="text-slate-600 font-medium">{t.method}</TableCell>
                                        <TableCell className="text-right px-6 font-black text-slate-900">{t.amount.toFixed(2)} MAD</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>

                    <div className="flex justify-end">
                        <div className="w-full max-w-xs space-y-3 bg-slate-50 p-6 rounded-xl border border-slate-100">
                            <div className="flex justify-between text-slate-500 font-bold text-sm">
                                <span>Salaire Brut Total :</span>
                                <span>{salary.totalAmount.toFixed(2)} MAD</span>
                            </div>
                            <div className="flex justify-between text-green-600 font-black text-base">
                                <span>Déjà versé :</span>
                                <span>{amountPaid.toFixed(2)} MAD</span>
                            </div>
                            <Separator className="bg-slate-200" />
                            <div className={cn(
                                "flex justify-between items-center font-bold text-base",
                                remaining > 0 ? "text-red-500" : "text-slate-600"
                            )}>
                                <span className="text-sm uppercase tracking-tighter">RESTE À VERSER :</span>
                                <span>{remaining.toFixed(2)} MAD</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-center pt-16">
                        <div className="text-center space-y-24 w-full max-w-md">
                            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Cachet et Signature</p>
                            <div className="border-t border-slate-200 pt-4 flex flex-col items-center gap-2">
                                <div className="flex items-center gap-1 text-slate-300">
                                    <ShieldCheck className="h-4 w-4" />
                                    <span className="text-[8px] font-black uppercase tracking-[0.2em]">Document Inaltérable</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <footer className="p-8 bg-slate-50 border-t flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="bg-green-100 text-green-700 px-4 py-1.5 rounded-full font-black text-[10px] tracking-widest">
                            STATUT: {salary.status.toUpperCase()}
                        </div>
                    </div>
                    <div className="text-[8px] text-slate-400 font-bold uppercase tracking-widest italic">
                        Document informatique certifié - Team Assistant v2.0
                    </div>
                </footer>
            </Card>
        </div>
    </div>
  );
}
