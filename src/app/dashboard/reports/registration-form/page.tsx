
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Download, Loader2, User, Users, ClipboardList, ShieldCheck } from "lucide-react";
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
  const [scale, setScale] = useState(1);

  // Auto-scale logic for mobile zero-zoom
  useEffect(() => {
    const handleResize = () => {
      const containerWidth = window.innerWidth - 32;
      if (containerWidth < 800) setScale(containerWidth / 800);
      else setScale(1);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
        console.error("Error fetching club info: ", error);
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
            <div className="w-full max-w-3xl space-y-6 text-center">
                
                <div className="flex flex-col sm:flex-row justify-between items-center gap-4 print:hidden">
                    <Button variant="outline" size="sm" onClick={() => router.back()} className="w-full sm:w-auto h-10 font-bold">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Retour
                    </Button>
                    
                    <Tabs value={formType} onValueChange={(v) => setFormType(v as any)} className="w-full sm:w-auto">
                        <TabsList className="grid w-full grid-cols-3 h-10">
                            <TabsTrigger value="junior" className="flex items-center gap-2 text-[10px] sm:text-xs font-black uppercase">
                                <Users className="h-3 w-3 sm:h-4 sm:w-4" /> Jr
                            </TabsTrigger>
                            <TabsTrigger value="adult" className="flex items-center gap-2 text-[10px] sm:text-xs font-black uppercase">
                                <User className="h-3 w-3 sm:h-4 sm:w-4" /> Ad
                            </TabsTrigger>
                            <TabsTrigger value="checklist" className="flex items-center gap-2 text-[10px] sm:text-xs font-black uppercase">
                                <ClipboardList className="h-3 w-3 sm:h-4 sm:w-4" /> Docs
                            </TabsTrigger>
                        </TabsList>
                    </Tabs>

                    <Button onClick={handleDownloadPdf} disabled={loadingPdf} size="sm" className="w-full sm:w-auto h-10 font-black uppercase">
                        {loadingPdf ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ...
                            </>
                        ) : (
                            <>
                                <Download className="mr-2 h-4 w-4" />
                                <span className="ml-2 font-black">Exporter</span>
                            </>
                        )}
                    </Button>
                </div>
                
                <div className="w-full flex justify-center overflow-hidden">
                    <div 
                        style={{ 
                            transform: `scale(${scale})`, 
                            transformOrigin: 'top center',
                            width: '800px',
                            height: `${1120 * scale}px`,
                            transition: 'transform 0.2s ease-out'
                        }}
                        className="bg-white shadow-2xl rounded-xl"
                    >
                        <Card className="mx-auto print:shadow-none print:border-none bg-white text-black border-none" id="printable-form" style={{ width: '800px', minHeight: '1120px' }}>
                            <CardHeader className="text-center space-y-4 p-10 border-b">
                                {loadingClub || loadingUser ? (
                                <div className="flex flex-col items-center gap-4">
                                        <Skeleton className="h-16 w-16 rounded-full bg-gray-200" />
                                        <Skeleton className="h-8 w-3/4 mx-auto bg-gray-200" />
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center gap-3">
                                        <Avatar className="h-20 w-20 border-2 border-primary/20 bg-white shadow-sm p-1">
                                            <AvatarImage src={clubLogoUrl || undefined} alt="Club Logo" className="object-contain" />
                                            <AvatarFallback className="bg-primary text-white text-3xl font-black">{clubInitial}</AvatarFallback>
                                        </Avatar>
                                        <div className="space-y-1">
                                            <CardTitle className="text-2xl font-black uppercase tracking-tight">
                                                {formType === 'checklist' ? 'PIÈCES À FOURNIR POUR LE DOSSIER' : `FICHE D'INSCRIPTION ${formType === 'adult' ? 'ADULTE' : 'JUNIOR'}`}
                                            </CardTitle>
                                            <p className="text-primary font-black tracking-[0.3em] uppercase text-sm italic">{clubName}</p>
                                        </div>
                                    </div>
                                )}
                                <div className="flex items-center justify-center font-bold text-sm bg-slate-50 py-3 rounded-md border border-dashed border-slate-300">
                                    <span className="px-4 font-black uppercase tracking-tighter">SAISON SPORTIVE : 20 . . . / 20 . . .</span>
                                </div>
                            </CardHeader>

                            <CardContent className="p-12 space-y-10 text-left flex flex-col h-full min-h-[800px]">
                                {formType === 'checklist' ? (
                                    <div className="space-y-10 py-10">
                                        <div className="space-y-6">
                                            <div className="flex items-center gap-3 mb-8">
                                                <ClipboardList className="h-8 w-8 text-primary" />
                                                <h3 className="font-black text-xl uppercase tracking-tight italic">LISTE DES DOCUMENTS OBLIGATOIRES</h3>
                                            </div>
                                            <ul className="grid grid-cols-1 gap-6">
                                                {[
                                                    { t: "2 Photos d'identité", d: "Format récent, fond clair uniforme." },
                                                    { t: "Copie de la CIN (Recto-Verso)", d: "Joueur (si majeur) ou tuteur légal." },
                                                    { t: "Certificat médical", d: "Aptitude à la pratique du football de compétition." },
                                                    { t: "Attestation d'assurance", d: "Couvrant la pratique sportive pour la saison." },
                                                    { t: "Frais d'adhésion", d: "Selon la grille tarifaire de la catégorie." },
                                                    { t: "Extrait d'acte de naissance", d: "Obligatoire pour les catégories juniors." }
                                                ].map((item, i) => (
                                                    <li key={i} className="flex items-start gap-6 p-5 border rounded-xl bg-slate-50 shadow-sm">
                                                        <div className="h-8 w-8 border-2 border-primary rounded-lg shrink-0 mt-1 flex items-center justify-center font-black text-primary italic">!</div>
                                                        <div>
                                                            <p className="font-black text-base uppercase tracking-tight text-slate-900">{item.t}</p>
                                                            <p className="text-sm text-muted-foreground font-semibold italic">{item.d}</p>
                                                        </div>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <div className="space-y-6">
                                            <h3 className="font-black text-sm uppercase tracking-[0.2em] bg-slate-900 text-white px-6 py-2.5 w-fit rounded shadow-md italic">I. IDENTITÉ DU JOUEUR</h3>
                                            <div className="space-y-6 text-sm font-medium">
                                                <div className="flex items-center"><div>NOM ET PRÉNOM :</div><DottedLine /></div>
                                                <div className="flex items-center"><div>DATE ET LIEU DE NAISSANCE :</div><DottedLine /></div>
                                                <div className="grid grid-cols-2 gap-x-12">
                                                    <div className="flex items-center"><div>NATIONALITÉ :</div><DottedLine /></div>
                                                    <div className="flex items-center"><div>GENRE :</div><DottedLine /></div>
                                                </div>
                                                <div className="grid grid-cols-2 gap-x-12">
                                                    <div className="flex items-center"><div>N° CIN :</div><DottedLine /></div>
                                                    <div className="flex items-center"><div>N° LICENCE :</div><DottedLine /></div>
                                                </div>
                                                <div className="flex items-center"><div>ADRESSE RÉSIDENTIELLE :</div><DottedLine /></div>
                                                <div className="grid grid-cols-2 gap-x-12">
                                                    <div className="flex items-center"><div>TÉLÉPHONE :</div><DottedLine /></div>
                                                    <div className="flex items-center"><div>ADRESSE E-MAIL :</div><DottedLine /></div>
                                                </div>
                                            </div>
                                        </div>

                                        {formType === 'junior' && (
                                            <div className="space-y-6 pt-4">
                                                <h3 className="font-black text-sm uppercase tracking-[0.2em] bg-slate-900 text-white px-6 py-2.5 w-fit rounded shadow-md italic">II. RESPONSABLE LÉGAL (TUTEUR)</h3>
                                                <div className="space-y-6 text-sm font-medium">
                                                    <div className="flex items-center"><div>NOM ET PRÉNOM :</div><DottedLine /></div>
                                                    <div className="grid grid-cols-2 gap-x-12">
                                                        <div className="flex items-center"><div>LIEN DE PARENTÉ :</div><DottedLine /></div>
                                                        <div className="flex items-center"><div>N° DE CIN :</div><DottedLine /></div>
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-x-12">
                                                        <div className="flex items-center"><div>TÉLÉPHONE :</div><DottedLine /></div>
                                                        <div className="flex items-center"><div>E-MAIL :</div><DottedLine /></div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        <div className="space-y-6 pt-4 flex-grow flex flex-col">
                                            <h3 className="font-black text-sm uppercase tracking-[0.2em] bg-slate-900 text-white px-6 py-2.5 w-fit rounded shadow-md italic">III. AUTORISATION ET DÉCLARATION</h3>
                                            <div className="space-y-6 text-sm leading-relaxed italic text-slate-700">
                                                <p>Je soussigné(e) certifie que les informations ci-dessus sont exactes et m'engage à respecter scrupuleusement le règlement intérieur et les valeurs sportives du club.</p>
                                                <p className="font-black text-black border-l-4 border-primary pl-4 not-italic py-1 bg-primary/5 uppercase tracking-tighter text-xs">AVIS IMPORTANT : Cette fiche d'inscription doit impérativement être légalisée auprès des autorités compétentes pour être valide.</p>
                                            </div>
                                        </div>
                                    </>
                                )}
                                
                                <div className="mt-auto pt-12 flex flex-col items-center gap-8">
                                    <div className="w-full flex flex-row justify-between items-start gap-12">
                                        <div className="space-y-4 pt-4 text-left">
                                            <div className="flex items-center">
                                                <span className="font-bold">Fait à</span><div className="w-40 border-b border-dotted border-gray-400 mx-2"></div>
                                            </div>
                                            <div className="flex items-center">
                                                <span className="font-bold">Le</span><div className="w-40 border-b border-dotted border-gray-400 mx-2"></div>
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-center gap-2">
                                            <div className="text-center w-72 h-40 border-2 border-slate-200 rounded-xl p-4 flex flex-col items-center bg-slate-50/50 shadow-inner">
                                                <p className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-400 mb-auto">Cachet & Signature (Légalisée)</p>
                                                <div className="w-48 border-b-2 border-slate-200 mb-2"></div>
                                            </div>
                                            <p className="text-[8px] font-bold text-slate-300 italic text-center uppercase tracking-widest">Signature du parent ou du joueur majeur</p>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                            
                            <footer className="p-8 bg-slate-900 text-white flex justify-between items-center rounded-b-lg mt-auto">
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-50">© {new Date().getFullYear()} {clubName} - ADMINISTRATION SPORTIVE</p>
                                <div className="flex items-center gap-2 text-primary font-black uppercase tracking-widest italic text-[10px]">
                                    <ShieldCheck className="h-4 w-4" />
                                    Document Officiel De l'Académie
                                </div>
                            </footer>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    </div>
  );
}
