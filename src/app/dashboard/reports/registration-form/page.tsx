"use client";

import { Button } from "@/components/ui/button";
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
            const imgData = canvas.toDataURL('image/png', 1.0);
            const ratio = canvas.width / canvas.height;
            const width = pdfWidth - 40; 
            const height = width / ratio;

            pdf.addImage(imgData, 'PNG', 20, 20, width, height);
            
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
    <div className="flex flex-col items-center w-full">
        <div className="w-full max-w-2xl space-y-4 text-center">
            
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-2 px-2">
                <Button variant="outline" size="sm" onClick={() => router.back()} className="w-full sm:w-auto h-9 font-bold">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Retour
                </Button>
                
                <Tabs value={formType} onValueChange={(v) => setFormType(v as any)} className="w-full sm:w-auto">
                    <TabsList className="grid w-full grid-cols-3 h-9">
                        <TabsTrigger value="junior" className="flex items-center gap-2 text-[10px] font-black uppercase">
                            <Users className="h-3 w-3" /> Jr
                        </TabsTrigger>
                        <TabsTrigger value="adult" className="flex items-center gap-2 text-[10px] font-black uppercase">
                            <User className="h-3 w-3" /> Ad
                        </TabsTrigger>
                        <TabsTrigger value="checklist" className="flex items-center gap-2 text-[10px] font-black uppercase">
                            <ClipboardList className="h-3 w-3" /> Docs
                        </TabsTrigger>
                    </TabsList>
                </Tabs>

                <Button onClick={handleDownloadPdf} disabled={loadingPdf} size="sm" className="w-full sm:w-auto h-9 font-black uppercase bg-primary hover:bg-primary/90 text-white">
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
            
            <div className="w-full overflow-x-auto pb-8 scrollbar-thin bg-muted/20 rounded-xl p-2">
                <div className="min-w-[600px] flex justify-center">
                    <div className="mx-auto bg-white text-black border shadow-2xl flex flex-col" id="printable-form" style={{ width: '600px', minHeight: '840px' }}>
                        <header className="text-center space-y-2 p-4 border-b-4 border-slate-900 shrink-0">
                            {loadingClub || loadingUser ? (
                            <div className="flex flex-col items-center gap-2">
                                    <Skeleton className="h-10 w-10 rounded-full bg-gray-200" />
                                    <Skeleton className="h-5 w-3/4 mx-auto bg-gray-200" />
                                </div>
                            ) : (
                                <div className="flex flex-col items-center gap-2">
                                    <Avatar className="h-10 w-10 border border-primary/20 bg-white shadow-sm p-1">
                                        <AvatarImage src={clubLogoUrl || undefined} alt="Club Logo" className="object-contain" />
                                        <AvatarFallback className="bg-primary text-white text-lg font-black">{clubInitial}</AvatarFallback>
                                    </Avatar>
                                    <div className="space-y-0.5">
                                        <h1 className="text-sm font-black uppercase tracking-tight leading-none">
                                            {formType === 'checklist' ? 'PIÈCES À FOURNIR POUR LE DOSSIER' : `FICHE D'INSCRIPTION ${formType === 'adult' ? 'ADULTE' : 'JUNIOR'}`}
                                        </h1>
                                        <p className="text-primary font-black tracking-[0.3em] uppercase text-[10px] italic">{clubName}</p>
                                    </div>
                                </div>
                            )}
                            <div className="flex items-center justify-center font-bold text-[8px] bg-slate-50 py-1 rounded-lg border border-dashed border-slate-300">
                                <span className="px-4 font-black uppercase tracking-tighter">SAISON SPORTIVE : 20 . . . / 20 . . .</span>
                            </div>
                        </header>

                        <div className="p-6 space-y-6 text-left flex flex-col flex-grow">
                            {formType === 'checklist' ? (
                                <div className="space-y-6 py-4">
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-2 mb-2">
                                            <ClipboardList className="h-4 w-4 text-primary" />
                                            <h3 className="font-black text-sm uppercase tracking-tight italic">DOCUMENTS OBLIGATOIRES</h3>
                                        </div>
                                        <ul className="grid grid-cols-1 gap-3">
                                            {[
                                                { t: "2 Photos d'identité", d: "Format récent, fond clair uniforme." },
                                                { t: "Copie de la CIN (Recto-Verso)", d: "Joueur (si majeur) ou tuteur légal." },
                                                { t: "Certificat médical", d: "Aptitude à la pratique du football de compétition." },
                                                { t: "Attestation d'assurance", d: "Couvrant la pratique sportive pour la saison." },
                                                { t: "Frais d'adhésion", d: "Selon la grille tarifaire de la catégorie." },
                                                { t: "Extrait d'acte de naissance", d: "Obligatoire pour les catégories juniors." }
                                            ].map((item, i) => (
                                                <li key={i} className="flex items-start gap-3 p-3 border rounded-xl bg-slate-50 shadow-sm">
                                                    <div className="h-5 w-5 border-2 border-primary rounded shrink-0 mt-0.5 flex items-center justify-center font-black text-primary text-[10px] italic">!</div>
                                                    <div>
                                                        <p className="font-black text-[10px] uppercase tracking-tight text-slate-900 leading-none mb-1">{item.t}</p>
                                                        <p className="text-[8px] text-muted-foreground font-semibold italic leading-tight">{item.d}</p>
                                                    </div>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <div className="space-y-4">
                                        <h3 className="font-black text-[8px] uppercase tracking-[0.15em] bg-slate-900 text-white px-3 py-1.5 w-fit rounded shadow-sm italic">I. IDENTITÉ DU JOUEUR</h3>
                                        <div className="space-y-4 text-[9px] font-medium">
                                            <div className="flex items-center"><div>NOM ET PRÉNOM :</div><DottedLine /></div>
                                            <div className="flex items-center"><div>DATE ET LIEU DE NAISSANCE :</div><DottedLine /></div>
                                            <div className="grid grid-cols-2 gap-x-6">
                                                <div className="flex items-center"><div>NATIONALITÉ :</div><DottedLine /></div>
                                                <div className="flex items-center"><div>GENRE :</div><DottedLine /></div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-x-6">
                                                <div className="flex items-center"><div>N° CIN :</div><DottedLine /></div>
                                                <div className="flex items-center"><div>N° LICENCE :</div><DottedLine /></div>
                                            </div>
                                            <div className="flex items-center"><div>ADRESSE RÉSIDENTIELLE :</div><DottedLine /></div>
                                            <div className="grid grid-cols-2 gap-x-6">
                                                <div className="flex items-center"><div>TÉLÉPHONE :</div><DottedLine /></div>
                                                <div className="flex items-center"><div>E-MAIL :</div><DottedLine /></div>
                                            </div>
                                        </div>
                                    </div>

                                    {formType === 'junior' && (
                                        <div className="space-y-4 pt-2">
                                            <h3 className="font-black text-[8px] uppercase tracking-[0.15em] bg-slate-900 text-white px-3 py-1.5 w-fit rounded shadow-sm italic">II. RESPONSABLE LÉGAL</h3>
                                            <div className="space-y-4 text-[9px] font-medium">
                                                <div className="flex items-center"><div>NOM ET PRÉNOM :</div><DottedLine /></div>
                                                <div className="grid grid-cols-2 gap-x-6">
                                                    <div className="flex items-center"><div>LIEN DE PARENTÉ :</div><DottedLine /></div>
                                                    <div className="flex items-center"><div>N° DE CIN :</div><DottedLine /></div>
                                                </div>
                                                <div className="grid grid-cols-2 gap-x-6">
                                                    <div className="flex items-center"><div>TÉLÉPHONE :</div><DottedLine /></div>
                                                    <div className="flex items-center"><div>E-MAIL :</div><DottedLine /></div>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    <div className="space-y-4 pt-2">
                                        <h3 className="font-black text-[8px] uppercase tracking-[0.15em] bg-slate-900 text-white px-3 py-1.5 w-fit rounded shadow-sm italic">III. AUTORISATION ET DÉCLARATION</h3>
                                        <div className="space-y-3 text-[8px] leading-relaxed italic text-slate-700">
                                            <p>Je soussigné(e) certifie que les informations ci-dessus sont exactes et m'engage à respecter scrupuleusement le règlement intérieur et les valeurs sportives du club.</p>
                                            <p className="font-black text-black border-l-4 border-primary pl-4 not-italic py-2 bg-primary/5 uppercase tracking-tighter text-[7px]">AVIS IMPORTANT : Cette fiche d'inscription doit impérativement être légalisée auprès des autorités compétentes pour être valide.</p>
                                        </div>
                                    </div>
                                </>
                            )}
                            
                            <div className="mt-auto pt-8 flex flex-col items-center gap-6">
                                <div className="w-full flex flex-row justify-between items-start gap-10 px-4">
                                    <div className="space-y-4 pt-2 text-left">
                                        <div className="flex items-center">
                                            <span className="font-bold text-[10px]">Fait à</span><div className="w-24 border-b border-dotted border-gray-400 mx-1"></div>
                                        </div>
                                        <div className="flex items-center">
                                            <span className="font-bold text-[10px]">Le</span><div className="w-24 border-b border-dotted border-gray-400 mx-1"></div>
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-center gap-2">
                                        <div className="text-center w-40 h-24 border-2 border-slate-200 rounded-xl p-3 flex flex-col items-center bg-slate-50/50 shadow-inner">
                                            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-600 mb-auto">Cachet du Club & Signature</p>
                                            <div className="w-32 border-b border-slate-200 mb-1"></div>
                                        </div>
                                        <p className="text-[7px] font-bold text-slate-300 italic text-center uppercase tracking-widest leading-none">Signature du parent ou du joueur majeur</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <footer className="p-4 bg-slate-900 text-white flex justify-between items-center mt-auto border-t-2 border-primary shrink-0">
                            <p className="text-[7px] font-black uppercase tracking-[0.15em] opacity-50">© {new Date().getFullYear()} {clubName} - ADMINISTRATION SPORTIVE</p>
                            <div className="flex items-center gap-1 text-primary font-black uppercase tracking-widest italic text-[7px]">
                                <ShieldCheck className="h-3 w-3" />
                                Document Officiel
                            </div>
                        </footer>
                    </div>
                </div>
            </div>
        </div>
    </div>
  );
}