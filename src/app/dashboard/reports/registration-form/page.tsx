
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { ArrowLeft, Printer, Download, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { db, auth } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { useAuthState } from "react-firebase-hooks/auth";
import { Skeleton } from "@/components/ui/skeleton";


export default function RegistrationFormPage() {
  const router = useRouter();
  const [user, loadingUser] = useAuthState(auth);
  const [clubName, setClubName] = useState("");
  const [loadingClub, setLoadingClub] = useState(true);
  const [loadingPdf, setLoadingPdf] = useState(false);

  useEffect(() => {
    const fetchClubName = async () => {
      if (!user) {
        if (!loadingUser) {
          setLoadingClub(false);
        }
        return;
      }
      try {
        const clubDocRef = doc(db, "clubs", user.uid);
        const docSnap = await getDoc(clubDocRef);
        if (docSnap.exists() && docSnap.data().clubName) {
          setClubName(docSnap.data().clubName);
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
    
    fetchClubName();
  }, [user, loadingUser]);

  
  const handleDownloadPdf = () => {
    setLoadingPdf(true);
    const formElement = document.getElementById("printable-form");
    if (formElement) {
        html2canvas(formElement, {
            scale: 2, // Augmente la résolution pour une meilleure qualité
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
            
            const width = pdfWidth - 40; // Marge de 20pt de chaque côté
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


  return (
    <div className="bg-muted/40 p-4 sm:p-8 flex flex-col items-center min-h-screen">
        <div className="w-full max-w-4xl space-y-4">
            <div className="flex justify-between items-center print:hidden">
                <Button variant="outline" onClick={() => router.back()}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> Retour
                </Button>
                <div className="flex gap-2">
                    <Button onClick={handleDownloadPdf} disabled={loadingPdf}>
                        {loadingPdf ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Téléchargement...
                            </>
                        ) : (
                             <>
                                <Download className="mr-2 h-4 w-4" />
                                Télécharger en PDF
                             </>
                        )}
                    </Button>
                </div>
            </div>
            
            <Card className="w-full max-w-4xl mx-auto print:shadow-none print:border-none bg-white text-black" id="printable-form">
                 <CardHeader className="text-center space-y-4">
                    {loadingClub || loadingUser ? (
                        <Skeleton className="h-8 w-3/4 mx-auto bg-gray-200" />
                    ) : (
                        <CardTitle className="flex flex-col sm:flex-row items-center justify-center gap-x-2 text-2xl font-bold uppercase">
                            <span>FICHE D'INSCRIPTION</span>
                            <span className="hidden sm:inline">-</span>
                            <span>{clubName}</span>
                        </CardTitle>
                    )}
                    <p className="font-semibold">Saison sportive : ........................</p>
                </CardHeader>
                <CardContent className="p-6 space-y-8">
                    <div className="space-y-4">
                        <h3 className="font-bold text-lg border-b pb-2 border-black/20">I. INFORMATIONS DU JOUEUR</h3>
                        <div className="space-y-4 text-base">
                            <p>Nom et Prénom : ............................................................................................................................................</p>
                            <p>Date et Lieu de naissance : .........................................................................................................................</p>
                             <div className="grid grid-cols-2">
                                <p>Nationalité : .................................................................</p>
                                <p>Sexe : ..........................................................................</p>
                            </div>
                            <p>N° CIN (si applicable) : ...........................................................................................................................</p>
                            <p>Adresse : ......................................................................................................................................................</p>
                             <div className="grid grid-cols-2">
                                <p>Téléphone : ......................................................................</p>
                                <p>Adresse e-mail : ................................................................</p>
                             </div>
                        </div>
                    </div>

                     <div className="space-y-4">
                        <h3 className="font-bold text-lg border-b pb-2 border-black/20">II. INFORMATIONS DU PARENT / TUTEUR LÉGAL (POUR LES MINEURS)</h3>
                        <div className="space-y-4 text-base">
                            <p>Nom et Prénom : ............................................................................................................................................</p>
                            <p>Lien de parenté : (Père / Mère / Tuteur) : ..................................................................................................</p>
                            <p>N° de CIN : ........................................................................................................................................................</p>
                            <div className="grid grid-cols-2">
                                <p>Téléphone : ......................................................................</p>
                                <p>Adresse e-mail : ................................................................</p>
                            </div>
                        </div>
                    </div>
                    
                     <div className="space-y-4">
                        <h3 className="font-bold text-lg border-b pb-2 border-black/20">III. AUTORISATION ET DÉCLARATION</h3>
                        <div className="space-y-4 text-sm">
                            <p>
                                Je soussigné(e), ......................................................................................................................., certifie que les informations ci-dessus sont exactes. 
                                J'autorise mon enfant, ......................................................................................................................., à participer aux activités sportives, aux entraînements et aux matchs organisés par le club.
                            </p>
                            <p className="font-semibold">
                                Je prends également connaissance que cette fiche, une fois remplie et signée, devra être légalisée auprès de la commune urbaine pour être valide.
                            </p>
                            <div className="pt-8">
                                <p>Fait à ........................................................................., le ..............................................................</p>
                                <p className="pt-12 text-center">Signature du parent / tuteur (légalisée) :</p>
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
  );
}
