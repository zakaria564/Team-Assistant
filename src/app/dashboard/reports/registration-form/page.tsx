
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { ArrowLeft, Printer, Download, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import React, { useState, useEffect } from "react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { db, auth } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { useAuthState } from "react-firebase-hooks/auth";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";


export default function RegistrationFormPage() {
  const router = useRouter();
  const [user, loadingUser] = useAuthState(auth);
  const [clubName, setClubName] = useState("");
  const [clubLogoUrl, setClubLogoUrl] = useState<string | null>(null);
  const [loadingClub, setLoadingClub] = useState(true);
  const [loadingPdf, setLoadingPdf] = useState(false);

  useEffect(() => {
    const fetchClubInfo = async () => {
      if (!user) {
        if (!loadingUser) {
          setLoadingClub(false);
        }
        return;
      }
      try {
        const clubDocRef = doc(db, "clubs", user.uid);
        const docSnap = await getDoc(clubDocRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setClubName(data.clubName || "votre club");
          setClubLogoUrl(data.logoUrl || null);
        } else {
          setClubName("votre club");
        }
      } catch (error) {
        console.error("Error fetching club name: ", error);
        setClubName("votre club");
      } finally {
        setLoadingClub(false);
      }
    };
    
    if (user || !loadingUser) {
        fetchClubInfo();
    }
  }, [user, loadingUser]);

  
  const handleDownloadPdf = () => {
    setLoadingPdf(true);
    const formElement = document.getElementById("printable-form");
    if (formElement) {
        html2canvas(formElement, {
            scale: 2,
            useCORS: true
        }).then((canvas) => {
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'pt',
                format: 'a4'
            });

            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();
            const canvasWidth = canvas.width;
            const canvasHeight = canvas.height;
            const ratio = canvasWidth / canvasHeight;
            
            const width = pdfWidth - 40; 
            const height = width / ratio;
            
            let finalHeight = height;
            if (height > pdfHeight - 40) {
              finalHeight = pdfHeight - 40;
            }

            const x = (pdfWidth - width) / 2;
            const y = (pdfHeight - finalHeight) / 2;

            pdf.addImage(imgData, 'PNG', x, y, width, finalHeight);
            pdf.save("fiche-inscription.pdf");
        }).finally(() => {
            setLoadingPdf(false);
        });
    } else {
        console.error("L'élément à imprimer est introuvable.");
        setLoadingPdf(false);
    }
  };

  const DottedLine = () => <div className="flex-grow border-b border-dotted border-gray-400 mx-1"></div>;
  const clubInitial = clubName?.charAt(0)?.toUpperCase() || "C";


  return (
    <div className="overflow-x-hidden">
        <div className="bg-muted/40 p-2 sm:p-6 md:p-8 flex flex-col items-center min-h-screen">
            <div className="w-full max-w-2xl space-y-4">
                <div className="flex justify-between items-center print:hidden">
                    <Button variant="outline" size="sm" onClick={() => router.back()}>
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        <span className="hidden sm:inline">Retour</span>
                    </Button>
                    <div className="flex gap-2">
                        <Button onClick={handleDownloadPdf} disabled={loadingPdf} size="sm">
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
                </div>
                
                <Card className="w-full mx-auto print:shadow-none print:border-none bg-white text-black" id="printable-form">
                    <CardHeader className="text-center space-y-2 p-3 sm:p-4 md:p-6">
                        {loadingClub || loadingUser ? (
                           <div className="flex flex-col items-center gap-4">
                                <Skeleton className="h-12 w-12 rounded-full bg-gray-200" />
                                <Skeleton className="h-7 w-3/4 mx-auto bg-gray-200" />
                            </div>
                        ) : (
                            <div className="flex flex-col items-center gap-2">
                                <Avatar className="h-12 w-12 sm:h-16 sm:w-16">
                                    <AvatarImage src={clubLogoUrl || undefined} alt="Club Logo" />
                                    <AvatarFallback>{clubInitial}</AvatarFallback>
                                </Avatar>
                                <CardTitle className="flex flex-col sm:flex-row items-center justify-center gap-x-2 text-lg md:text-xl font-bold uppercase">
                                    <span className="break-words">FICHE D'INSCRIPTION</span>
                                    <span className="hidden sm:inline">-</span>
                                    <span className="break-all">{clubName}</span>
                                </CardTitle>
                            </div>
                        )}
                        <div className="flex items-center font-semibold text-sm">
                            <span className="shrink-0">Saison sportive :</span>
                            <DottedLine />
                        </div>
                    </CardHeader>
                    <CardContent className="p-3 sm:p-4 md:p-6 space-y-4">
                        <div className="space-y-3">
                            <h3 className="font-bold text-sm md:text-base border-b pb-1 border-black/20">I. INFORMATIONS DU JOUEUR</h3>
                            <div className="space-y-3 text-xs sm:text-sm">
                                <div className="flex items-center"><div className="break-words shrink-0">Nom et Prénom :</div><DottedLine /></div>
                                <div className="flex items-center"><div className="break-words shrink-0">Date et Lieu de naissance :</div><DottedLine /></div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
                                    <div className="flex items-center"><div className="break-words shrink-0">Nationalité :</div><DottedLine /></div>
                                    <div className="flex items-center"><div className="break-words shrink-0">Genre :</div><DottedLine /></div>
                                </div>
                                <div className="flex items-center"><div className="break-words shrink-0">N° CIN (si applicable) :</div><DottedLine /></div>
                                <div className="flex items-center"><div className="break-words shrink-0">Adresse :</div><DottedLine /></div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
                                    <div className="flex items-center"><div className="break-words shrink-0">Téléphone :</div><DottedLine /></div>
                                    <div className="flex items-center"><div className="break-words shrink-0">Adresse e-mail :</div><DottedLine /></div>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <h3 className="font-bold text-sm md:text-base border-b pb-1 border-black/20">II. INFORMATIONS DU PARENT / TUTEUR LÉGAL (POUR LES MINEURS)</h3>
                            <div className="space-y-3 text-xs sm:text-sm">
                                <div className="flex items-center"><div className="break-words shrink-0">Nom et Prénom :</div><DottedLine /></div>
                                <div className="flex items-center"><div className="break-words shrink-0">Lien de parenté :</div><DottedLine /></div>
                                <div className="flex items-center"><div className="break-words shrink-0">N° de CIN :</div><DottedLine /></div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
                                    <div className="flex items-center"><div className="break-words shrink-0">Téléphone :</div><DottedLine /></div>
                                    <div className="flex items-center"><div className="break-words shrink-0">Adresse e-mail :</div><DottedLine /></div>
                                </div>
                            </div>
                        </div>
                        
                        <div className="space-y-3">
                            <h3 className="font-bold text-sm md:text-base border-b pb-1 border-black/20">III. AUTORISATION ET DÉCLARATION</h3>
                            <div className="space-y-3 text-xs">
                                <p className="leading-relaxed break-words">
                                    Je soussigné(e), ...................................., certifie que les informations ci-dessus sont exactes. 
                                    J'autorise mon enfant, ...................................., à participer aux activités sportives, aux entraînements et aux matchs organisés par le club.
                                </p>
                                <p className="font-semibold leading-relaxed break-words">
                                    Je prends également connaissance que cette fiche, une fois remplie et signée, devra être légalisée auprès de la commune urbaine pour être valide.
                                </p>
                                <div className="pt-6 space-y-2">
                                    <div className="flex items-center">
                                        <span>Fait à</span><div className="w-24 border-b border-dotted border-gray-400 mx-1"></div>,
                                        <span className="ml-2">le</span><div className="w-24 border-b border-dotted border-gray-400 mx-1"></div>
                                    </div>
                                    <p className="pt-10 text-center">Signature du parent / tuteur (légalisée) :</p>
                                </div>
                            </div>
                        </div>
                    </CardContent>
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
                    @page {
                        size: A4;
                        margin: 20mm;
                    }
                }
            `}</style>
        </div>
    </div>
  );
}
