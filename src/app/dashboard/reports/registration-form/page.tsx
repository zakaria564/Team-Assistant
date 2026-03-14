
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Download, Loader2, User, Users, ClipboardList } from "lucide-react";
import { useRouter } from "next/navigation";
import React, { useState, useEffect } from "react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { db, auth } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { useAuthState } from "react-firebase-hooks/auth";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function RegistrationFormPage() {
  const router = useRouter();
  const [user, loadingUser] = useAuthState(auth);
  const [clubName, setClubName] = useState("");
  const [clubLogoUrl, setClubLogoUrl] = useState<string | null>(null);
  const [loadingClub, setLoadingClub] = useState(true);
  const [loadingPdf, setLoadingPdf] = useState(false);
  const [formType, setFormType] = useState<"junior" | "adult" | "checklist">("junior");

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
            useCORS: true,
            backgroundColor: "#ffffff"
        }).then((canvas) => {
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

            pdf.addImage(canvas.toDataURL('image/png'), 'PNG', x, y, width, finalHeight);
            
            let fileName = "document.pdf";
            if (formType === 'junior') fileName = "fiche-inscription-junior.pdf";
            else if (formType === 'adult') fileName = "fiche-inscription-adulte.pdf";
            else fileName = "pieces-a-fournir.pdf";

            pdf.save(fileName);
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
            <div className="w-full max-w-3xl space-y-6">
                
                {/* Contrôles non imprimables */}
                <div className="flex flex-col sm:flex-row justify-between items-center gap-4 print:hidden">
                    <Button variant="outline" size="sm" onClick={() => router.back()} className="w-full sm:w-auto">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Retour
                    </Button>
                    
                    <Tabs value={formType} onValueChange={(v) => setFormType(v as any)} className="w-full sm:w-auto">
                        <TabsList className="grid w-full grid-cols-3">
                            <TabsTrigger value="junior" className="flex items-center gap-2 text-[10px] sm:text-sm">
                                <Users className="h-3 w-3 sm:h-4 sm:w-4" /> Jr
                            </TabsTrigger>
                            <TabsTrigger value="adult" className="flex items-center gap-2 text-[10px] sm:text-sm">
                                <User className="h-3 w-3 sm:h-4 sm:w-4" /> Ad
                            </TabsTrigger>
                            <TabsTrigger value="checklist" className="flex items-center gap-2 text-[10px] sm:text-sm">
                                <ClipboardList className="h-3 w-3 sm:h-4 sm:w-4" /> Docs
                            </TabsTrigger>
                        </TabsList>
                    </Tabs>

                    <Button onClick={handleDownloadPdf} disabled={loadingPdf} size="sm" className="w-full sm:w-auto">
                        {loadingPdf ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ...
                            </>
                        ) : (
                            <>
                                <Download className="mr-2 h-4 w-4" />
                                <span className="sm:inline">Télécharger</span>
                            </>
                        )}
                    </Button>
                </div>
                
                {/* Formulaire Imprimable */}
                <div className="w-full overflow-x-auto rounded-xl shadow-xl">
                    <Card className="mx-auto print:shadow-none print:border-none bg-white text-black" id="printable-form" style={{ width: '800px', minHeight: '1120px' }}>
                        <CardHeader className="text-center space-y-4 p-6 sm:p-8 border-b">
                            {loadingClub || loadingUser ? (
                            <div className="flex flex-col items-center gap-4">
                                    <Skeleton className="h-16 w-16 rounded-full bg-gray-200" />
                                    <Skeleton className="h-8 w-3/4 mx-auto bg-gray-200" />
                                </div>
                            ) : (
                                <div className="flex flex-col items-center gap-3">
                                    <Avatar className="h-16 w-16 sm:h-20 sm:w-20 border-2 border-primary/20">
                                        <AvatarImage src={clubLogoUrl || undefined} alt="Club Logo" />
                                        <AvatarFallback className="bg-primary text-white text-2xl font-bold">{clubInitial}</AvatarFallback>
                                    </Avatar>
                                    <div className="space-y-1">
                                        <CardTitle className="text-2xl font-black uppercase tracking-tight">
                                            {formType === 'checklist' ? 'PIÈCES À FOURNIR POUR LE DOSSIER' : `FICHE D'INSCRIPTION ${formType === 'adult' ? 'ADULTE' : 'JUNIOR'}`}
                                        </CardTitle>
                                        <p className="text-primary font-bold tracking-[0.2em] uppercase text-sm">{clubName}</p>
                                    </div>
                                </div>
                            )}
                            <div className="flex items-center justify-center font-bold text-sm bg-slate-50 py-2 rounded-md border border-dashed border-slate-300">
                                <span className="px-4">SAISON SPORTIVE : 20 . . . / 20 . . .</span>
                            </div>
                        </CardHeader>

                        <CardContent className="p-8 sm:p-10 space-y-8">
                            {formType === 'checklist' ? (
                                <div className="space-y-10 py-10">
                                    <div className="space-y-6">
                                        <div className="flex items-center gap-3 mb-6">
                                            <ClipboardList className="h-6 w-6 text-primary" />
                                            <h3 className="font-black text-lg uppercase tracking-tight">LISTE DES DOCUMENTS OBLIGATOIRES</h3>
                                        </div>
                                        <ul className="space-y-6">
                                            {[
                                                { t: "2 Photos d'identité", d: "Format récent, fond clair." },
                                                { t: "Copie de la CIN (Recto-Verso)", d: "Joueur ou tuteur légal." },
                                                { t: "Certificat médical", d: "Aptitude à la pratique du sport." },
                                                { t: "Attestation d'assurance", d: "Couvrant la saison en cours." },
                                                { t: "Frais d'adhésion", d: "Selon la catégorie." },
                                                { t: "Extrait d'acte de naissance", d: "Pour les juniors." }
                                            ].map((item, i) => (
                                                <li key={i} className="flex items-start gap-4 p-4 border rounded-lg bg-slate-50">
                                                    <div className="h-6 w-6 border-2 border-primary rounded-md shrink-0 mt-1"></div>
                                                    <div>
                                                        <p className="font-black text-sm uppercase">{item.t}</p>
                                                        <p className="text-xs text-muted-foreground font-medium">{item.d}</p>
                                                    </div>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <div className="space-y-4">
                                        <h3 className="font-black text-sm uppercase tracking-wider bg-slate-900 text-white px-4 py-2 w-fit rounded inline-flex items-center justify-center leading-none text-center min-h-[32px]">I. INFORMATIONS DU JOUEUR</h3>
                                        <div className="space-y-4 text-sm">
                                            <div className="flex items-center"><div>Nom et Prénom :</div><DottedLine /></div>
                                            <div className="flex items-center"><div>Date et Lieu de naissance :</div><DottedLine /></div>
                                            <div className="grid grid-cols-2 gap-x-8">
                                                <div className="flex items-center"><div>Nationalité :</div><DottedLine /></div>
                                                <div className="flex items-center"><div>Genre :</div><DottedLine /></div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-x-8">
                                                <div className="flex items-center"><div>N° CIN :</div><DottedLine /></div>
                                                <div className="flex items-center"><div>N° Lic. :</div><DottedLine /></div>
                                            </div>
                                            <div className="flex items-center"><div>Adresse Résidentielle :</div><DottedLine /></div>
                                            <div className="grid grid-cols-2 gap-x-8">
                                                <div className="flex items-center"><div>Téléphone :</div><DottedLine /></div>
                                                <div className="flex items-center"><div>Adresse e-mail :</div><DottedLine /></div>
                                            </div>
                                        </div>
                                    </div>

                                    {formType === 'junior' && (
                                        <div className="space-y-4">
                                            <h3 className="font-black text-sm uppercase tracking-wider bg-slate-900 text-white px-4 py-2 w-fit rounded inline-flex items-center justify-center leading-none text-center min-h-[32px]">II. RESPONSABLE LÉGAL (TUTEUR)</h3>
                                            <div className="space-y-4 text-sm">
                                                <div className="flex items-center"><div>Nom et Prénom :</div><DottedLine /></div>
                                                <div className="grid grid-cols-2 gap-x-8">
                                                    <div className="flex items-center"><div>Lien de parenté :</div><DottedLine /></div>
                                                    <div className="flex items-center"><div>N° de CIN :</div><DottedLine /></div>
                                                </div>
                                                <div className="grid grid-cols-2 gap-x-8">
                                                    <div className="flex items-center"><div>Téléphone :</div><DottedLine /></div>
                                                    <div className="flex items-center"><div>E-mail :</div><DottedLine /></div>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    <div className="space-y-4">
                                        <h3 className="font-black text-sm uppercase tracking-wider bg-slate-900 text-white px-4 py-2 w-fit rounded inline-flex items-center justify-center leading-none text-center min-h-[32px]">III. AUTORISATION ET DÉCLARATION</h3>
                                        <div className="space-y-4 text-xs sm:text-sm leading-relaxed italic text-slate-700">
                                            <p>Je soussigné(e) certifie que les informations ci-dessus sont exactes et m'engage à respecter le règlement intérieur du club.</p>
                                            <p className="font-bold text-black border-l-4 border-primary pl-3 not-italic">IMPORTANT : Cette fiche doit impérativement être légalisée auprès des autorités compétentes.</p>
                                            <div className="pt-4 flex flex-row justify-between items-start gap-10">
                                                <div className="space-y-2">
                                                    <div className="flex items-center">
                                                        <span>Fait à</span><div className="w-32 border-b border-dotted border-gray-400 mx-1"></div>,
                                                        <span className="ml-2">le</span><div className="w-32 border-b border-dotted border-gray-400 mx-1"></div>
                                                    </div>
                                                </div>
                                                <div className="text-center w-64 h-32 border border-slate-200 rounded p-2 flex flex-col items-center">
                                                    <p className="text-[10px] font-bold uppercase text-slate-400 mb-auto">Signature (Légalisée)</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </>
                            )}
                        </CardContent>
                        
                        <footer className="p-6 bg-slate-900 text-white flex justify-between items-center rounded-b-lg">
                            <p className="text-[9px] font-bold uppercase tracking-[0.2em] opacity-50">© {new Date().getFullYear()} {clubName}</p>
                            <p className="text-[9px] font-black uppercase tracking-widest italic text-primary">Document Officiel</p>
                        </footer>
                    </Card>
                </div>
            </div>
        </div>
    </div>
  );
}
