
"use client"

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardFooter } from "@/components/ui/card";
import { Loader2, ArrowLeft, Download, Printer } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function SalaryReceiptPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = React.use(params);
  const salaryId = resolvedParams.id;
  const router = useRouter();
  const [user, loadingUser] = useAuthState(auth);
  
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
        html2canvas(element, { scale: 2, useCORS: true }).then((canvas) => {
            const pdf = new jsPDF('p', 'pt', 'a4');
            pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, 595, (canvas.height * 595) / canvas.width);
            pdf.save(`fiche_paie_${salary?.coachName.replace(/ /g, "_")}.pdf`);
        }).finally(() => setLoadingPdf(false));
    }
  };

  if (loading || loadingUser) return <div className="flex justify-center items-center h-screen"><Loader2 className="animate-spin text-primary" /></div>;
  if (!salary) return null;
  
  const amountPaid = salary.transactions?.reduce((sum: number, t: any) => sum + (t.amount || 0), 0) || 0;

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
            
            <Card id="printable-receipt" className="bg-white text-gray-900 border-none shadow-xl overflow-hidden">
                 <header className="p-8 bg-primary text-white flex justify-between items-start">
                    <div>
                        <h1 className="text-3xl font-black uppercase">{clubInfo?.clubName || "VOTRE CLUB"}</h1>
                        <p className="text-primary-foreground/80">{clubInfo?.address}</p>
                    </div>
                    <div className="text-right">
                        <h2 className="text-2xl font-bold">FICHE DE PAIE</h2>
                        <p className="text-primary-foreground/80">Date : {format(new Date(), "dd MMMM yyyy", { locale: fr })}</p>
                    </div>
                </header>
                <div className="p-8 space-y-8">
                    <div className="grid sm:grid-cols-2 gap-8">
                        <div>
                            <h3 className="text-sm font-bold text-muted-foreground uppercase mb-2">Entraîneur</h3>
                            <p className="text-xl font-bold">{salary.coachName}</p>
                        </div>
                        <div className="text-right sm:text-left">
                            <h3 className="text-sm font-bold text-muted-foreground uppercase mb-2">Période / Description</h3>
                            <p className="text-lg font-medium">{salary.description}</p>
                        </div>
                    </div>
                    
                    <Table className="border rounded-md">
                        <TableHeader className="bg-muted/50">
                            <TableRow>
                                <TableHead>Date Versement</TableHead>
                                <TableHead>Mode de Paiement</TableHead>
                                <TableHead className="text-right">Montant</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {salary.transactions?.map((t: any, i: number) => (
                                <TableRow key={i}>
                                    <TableCell>{t.date?.seconds ? format(new Date(t.date.seconds * 1000), "dd/MM/yyyy") : 'N/A'}</TableCell>
                                    <TableCell>{t.method}</TableCell>
                                    <TableCell className="text-right font-bold">{t.amount.toFixed(2)} MAD</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>

                    <div className="flex justify-end">
                        <div className="w-full max-w-xs space-y-2">
                            <div className="flex justify-between text-muted-foreground"><span>Salaire Total :</span><span>{salary.totalAmount.toFixed(2)} MAD</span></div>
                            <div className="flex justify-between text-green-600 font-bold"><span>Total Versé :</span><span>{amountPaid.toFixed(2)} MAD</span></div>
                            <Separator />
                            <div className="flex justify-between text-xl font-black text-primary"><span>Reste :</span><span>{(salary.totalAmount - amountPaid).toFixed(2)} MAD</span></div>
                        </div>
                    </div>
                </div>
                <footer className="p-8 bg-gray-50 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <span className="font-bold">Statut :</span>
                        <Badge className={salary.status === 'Payé' ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'}>{salary.status}</Badge>
                    </div>
                    <div className="text-xs text-muted-foreground italic">Document généré électroniquement par Team Assistant.</div>
                </footer>
            </Card>
        </div>
    </div>
  );
}
