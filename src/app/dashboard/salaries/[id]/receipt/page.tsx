
"use client"

import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Loader2, ArrowLeft, Trophy, Download } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";


interface Salary {
  id: string;
  coachId: string;
  coachName?: string;
  totalAmount: number;
  status: 'Payé' | 'Partiel' | 'En attente' | 'En retard';
  createdAt: { seconds: number, nanoseconds: number };
  description: string;
  transactions: { amount: number; date: { seconds: number, nanoseconds: number }; method: string; }[];
}

interface ClubInfo {
    name: string;
    logoUrl: string | null;
    address: string;
    email: string;
}

const getBadgeClass = (status?: Salary['status']) => {
     switch (status) {
        case 'Payé': return 'bg-green-100 text-green-800 border-green-300';
        case 'Partiel': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
        case 'En attente': return 'bg-gray-100 text-gray-800 border-gray-300';
        case 'En retard': return 'bg-red-100 text-red-800 border-red-300';
        default: return '';
    }
}


export default function SalaryReceiptPage() {
  const params = useParams();
  const salaryId = params.id;
  const router = useRouter();
  const [user, loadingUser] = useAuthState(auth);
  
  const [salary, setSalary] = useState<Salary | null>(null);
  const [clubInfo, setClubInfo] = useState<ClubInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingPdf, setLoadingPdf] = useState(false);
  
  useEffect(() => {
    if (!salaryId) return;

    const fetchSalaryAndClubInfo = async () => {
      if (!user) {
        if (!loadingUser) setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const salaryRef = doc(db, "salaries", salaryId as string);
        const clubRef = doc(db, "clubs", user.uid);
        
        const [salarySnap, clubSnap] = await Promise.all([getDoc(salaryRef), getDoc(clubRef)]);

        if (salarySnap.exists()) {
          const salaryData = { id: salarySnap.id, ...salarySnap.data() } as Omit<Salary, 'coachName'>;
          
          const coachRef = doc(db, "coaches", salaryData.coachId);
          const coachSnap = await getDoc(coachRef);

          setSalary({
            ...salaryData,
            coachName: coachSnap.exists() ? coachSnap.data().name : "Entraîneur inconnu"
          });
        } else {
          console.log("No such salary document!");
          router.push('/dashboard/salaries');
        }

        if (clubSnap.exists()) {
            const clubData = clubSnap.data();
            setClubInfo({
                name: clubData.clubName || "Votre Club",
                logoUrl: clubData.logoUrl || null,
                address: clubData.address || "Adresse non configurée",
                email: clubData.contactEmail || "Email non configuré",
            });
        } else {
             setClubInfo({
                name: "Votre Club",
                logoUrl: null,
                address: "Adresse non configurée",
                email: "Email non configuré",
            });
        }

      } catch (error) {
        console.error("Error fetching details:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchSalaryAndClubInfo();
  }, [salaryId, user, loadingUser, router]);

  const handleDownloadPdf = () => {
    setLoadingPdf(true);
    const cardElement = document.getElementById("printable-receipt");
    if (cardElement) {
        const originalWidth = cardElement.style.width;
        cardElement.style.width = '800px';

        html2canvas(cardElement, {
            scale: 2,
            useCORS: true,
            backgroundColor: '#ffffff',
        }).then((canvas) => {
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'pt',
                format: 'a4'
            });

            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();
            
            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
            pdf.save(`fiche_paie_${salary?.id.substring(0, 7)}.pdf`);
        }).finally(() => {
            if (cardElement) {
               cardElement.style.width = originalWidth;
            }
            setLoadingPdf(false);
        });
    } else {
        console.error("Element to print not found.");
        setLoadingPdf(false);
    }
  };


  if (loading || loadingUser) {
    return (
      <div className="flex justify-center items-center h-screen bg-muted/40">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!salary) {
    return (
      <div className="text-center p-8">
        <p>Reçu non trouvé.</p>
        <Button onClick={() => router.push("/dashboard/salaries")} className="mt-4">Retour à la liste</Button>
      </div>
    );
  }
  
  const amountPaid = salary.transactions?.reduce((sum, t) => sum + t.amount, 0) || 0;
  const amountRemaining = salary.totalAmount - amountPaid;
  const clubInitial = clubInfo?.name?.charAt(0)?.toUpperCase() || "C";


  return (
    <div className="bg-muted/40 p-2 sm:p-8 flex flex-col items-center">
        <div className="w-full max-w-4xl space-y-4">
            <div className="flex justify-between items-center print:hidden">
                <Button variant="outline" onClick={() => router.back()}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> Retour
                </Button>
                 <Button onClick={handleDownloadPdf} disabled={loadingPdf}>
                    {loadingPdf ? (
                    <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Téléchargement...
                    </>
                    ) : (
                    <>
                        <Download className="mr-2 h-4 w-4" />
                        Télécharger
                    </>
                    )}
                </Button>
            </div>
            
            <Card id="printable-receipt" className="w-full max-w-4xl mx-auto print:shadow-none print:border-none bg-white text-gray-800">
                 <CardHeader className="p-4 sm:p-6">
                    <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <Avatar className="h-12 w-12">
                                    <AvatarImage src={clubInfo?.logoUrl || ''} alt={clubInfo?.name} />
                                    <AvatarFallback className="text-xl">{clubInitial}</AvatarFallback>
                                </Avatar>
                                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{clubInfo?.name}</h1>
                            </div>
                            <p className="text-sm text-muted-foreground break-words">{clubInfo?.address}</p>
                            <p className="text-sm text-muted-foreground break-words">{clubInfo?.email}</p>
                        </div>
                        <div className="text-left sm:text-right mt-4 sm:mt-0 shrink-0">
                            <h2 className="text-xl sm:text-2xl font-bold text-primary">FICHE DE PAIE</h2>
                            <p className="text-sm text-muted-foreground">Référence #{salary.id.substring(0, 7).toUpperCase()}</p>
                            <p className="text-sm text-muted-foreground">Date: {format(new Date(), "dd MMMM yyyy", { locale: fr })}</p>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-4 sm:p-6">
                    <div className="grid sm:grid-cols-2 gap-4 sm:gap-6 mb-6 p-4 bg-gray-50 rounded-lg">
                        <div className="space-y-1">
                            <h3 className="text-sm font-semibold text-gray-600">Salarié :</h3>
                            <p className="font-bold text-base sm:text-lg text-gray-900">{salary.coachName}</p>
                        </div>
                         <div className="space-y-1">
                            <h3 className="text-sm font-semibold text-gray-600">Description du paiement :</h3>
                            <p className="text-sm sm:text-base text-gray-800">{salary.description}</p>
                        </div>
                    </div>
                    
                    <div className="w-full mb-6 overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="text-gray-600">Date</TableHead>
                                    <TableHead className="text-gray-600">Méthode</TableHead>
                                    <TableHead className="text-right text-gray-600">Montant</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {salary.transactions?.length > 0 ? (
                                salary.transactions.map((transaction, index) => (
                                    <TableRow key={index}>
                                    <TableCell className="text-xs sm:text-sm">{format(new Date(transaction.date.seconds * 1000), "dd/MM/yy", { locale: fr })}</TableCell>
                                    <TableCell className="text-xs sm:text-sm">{transaction.method}</TableCell>
                                    <TableCell className="text-right font-medium text-xs sm:text-sm">{transaction.amount.toFixed(2)} MAD</TableCell>
                                    </TableRow>
                                ))
                                ) : (
                                <TableRow>
                                    <TableCell colSpan={3} className="text-center text-muted-foreground py-6">
                                    Aucun versement enregistré.
                                    </TableCell>
                                </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>

                    <div className="flex flex-col items-end mt-6">
                        <div className="w-full sm:max-w-xs space-y-2 text-sm">
                             <div className="flex justify-between">
                                <span className="text-muted-foreground">Montant total dû :</span>
                                <span className="font-medium">{salary.totalAmount.toFixed(2)} MAD</span>
                             </div>
                             <div className="flex justify-between">
                                <span className="text-muted-foreground">Total payé :</span>
                                <span className="font-medium">{amountPaid.toFixed(2)} MAD</span>
                             </div>
                             <Separator />
                              <div className="flex justify-between font-bold text-base text-primary">
                                <span>Montant restant :</span>
                                <span>{amountRemaining.toFixed(2)} MAD</span>
                              </div>
                        </div>
                    </div>
                </CardContent>
                <CardFooter className="p-4 sm:p-6 flex-col items-start gap-4 bg-gray-50/50 mt-6">
                    <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm sm:text-base">Statut du paiement:</span>
                        <Badge className={cn("text-sm sm:text-base", getBadgeClass(salary.status))}>
                            {salary.status}
                        </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                        Ce document est généré automatiquement et confirme les versements enregistrés à ce jour.
                    </p>
                </CardFooter>
            </Card>
        </div>
        <style jsx global>{`
            @media print {
                body {
                    background-color: #fff !important;
                }
                .print\\:hidden {
                    display: none;
                }
                .print\\:shadow-none {
                    box-shadow: none;
                }
                .print\\:border-none {
                    border: none;
                }
                 .print\\:bg-transparent {
                    background-color: transparent;
                }
            }
        `}</style>
    </div>
  );
}
