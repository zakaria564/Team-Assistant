"use client";

import { Button } from "@/components/ui/button";
import { ArrowLeft, Download, Loader2, User, Users, ClipboardList, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import React, { useState, useEffect } from "react";
import jspdf from "jspdf";
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
      if (!user) { if (!loadingUser) setLoadingClub(false); return; }
      try {
        const clubDocRef = doc(db, "clubs", user.uid);
        const docSnap = await getDoc(clubDocRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setClubName(data.clubName || "votre club");
          setClubLogoUrl(data.logoUrl || null);
        } else { setClubName("votre club"); }
      } catch (error) { console.error(error); setClubName("votre club"); } finally { setLoadingClub(false); }
    };
    if (user || !loadingUser) fetchClubInfo();
  }, [user, loadingUser]);

  const handleDownloadPdf = () => {
    setLoadingPdf(true);
    const formElement = document.getElementById("printable-form");
    if (formElement) {
        html2canvas(formElement, { scale: 3, useCORS: true, backgroundColor: "#0f172a" }).then((canvas) => {
            const pdf = new jspdf({ orientation: 'portrait', unit: 'pt', format: 'a4' });
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const imgData = canvas.toDataURL('image/png', 1.0);
            const ratio = canvas.width / canvas.height;
            const width = pdfWidth; const height = width / ratio;
            pdf.addImage(imgData, 'PNG', 0, 0, width, height);
            let fileName = formType === 'junior' ? "fiche-junior.pdf" : formType === 'adult' ? "fiche-adulte.pdf" : "pieces.pdf";
            pdf.save(fileName);
        }).finally(() => setLoadingPdf(false));
    } else setLoadingPdf(false);
  };

  const DottedLine = () => <div className="flex-grow border-b border-dotted border-gray-400 mx-1"></div>;
  const clubInitial = clubName?.charAt(0)?.toUpperCase() || "C";

  return (
    <div className="flex flex-col items-center w-full">
        <div className="w-full max-w-2xl space-y-4 text-center">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-2 px-2">
                <Button variant="outline" size="sm" onClick={() => router.back()} className="w-full sm:w-auto h-9 font-bold"><ArrowLeft className="mr-2 h-4 w-4" /> Retour</Button>
                <Tabs value={formType} onValueChange={(v) => setFormType(v as any)} className="w-full sm:w-auto">
                    <TabsList className="grid w-full grid-cols-3 h-9">
                        <TabsTrigger value="junior" className="text-[10px] font-black uppercase">Jr</TabsTrigger>
                        <TabsTrigger value="adult" className="text-[10px] font-black uppercase">Ad</TabsTrigger>
                        <TabsTrigger value="checklist" className="text-[10px] font-black uppercase">Docs</TabsTrigger>
                    </TabsList>
                </Tabs>
                <Button onClick={handleDownloadPdf} disabled={loadingPdf} size="sm" className="w-full sm:w-auto h-9 font-black uppercase bg-primary hover:bg-primary/90 text-white">
                    {loadingPdf ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <><Download className="mr-2 h-4 w-4" /> Exporter (HD)</>}
                </Button>
            </div>
            
            <div className="w-full overflow-x-auto pb-8 scrollbar-thin bg-muted/20 rounded-xl p-2">
                <div className="min-w-[595px] flex justify-center">
                    <div className="mx-auto bg-white text-black border shadow-2xl flex flex-col" id="printable-form" style={{ width: '595px', height: '842px' }}>
                        <header className="text-center space-y-2 p-4 border-b-4 border-slate-900 bg-slate-900 text-white shrink-0">
                            {loadingClub || loadingUser ? <div className="flex flex-col items-center gap-2"><Skeleton className="h-8 w-8 rounded-full bg-gray-200" /><Skeleton className="h-4 w-3/4 mx-auto bg-gray-200" /></div> : (
                                <div className="flex flex-col items-center gap-1.5">
                                    <Avatar className="h-8 w-8 border border-primary/20 bg-white shadow-sm p-1">
                                        <AvatarImage src={clubLogoUrl || undefined} alt="Logo" className="object-contain" />
                                        <AvatarFallback className="bg-primary text-white text-base font-black">{clubInitial}</AvatarFallback>
                                    </Avatar>
                                    <div className="space-y-0.5">
                                        <h1 className="text-xs font-black uppercase tracking-tight leading-none text-white">{formType === 'checklist' ? 'PIÈCES À FOURNIR' : `FICHE D'INSCRIPTION ${formType === 'adult' ? 'ADULTE' : 'JUNIOR'}`}</h1>
                                        <p className="text-primary font-black tracking-[0.3em] uppercase text-[8px] italic">{clubName}</p>
                                    </div>
                                </div>
                            )}
                            <div className="flex items-center justify-center font-bold text-[7px] bg-slate-800 py-1 rounded-lg border border-dashed border-slate-700">
                                <span className="px-4 font-black uppercase tracking-tighter text-slate-300">SAISON SPORTIVE : 20 . . . / 20 . . .</span>
                            </div>
                        </header>

                        <div className="p-6 space-y-2 text-left flex flex-col flex-grow">
                            {formType === 'checklist' ? (
                                <div className="space-y-2 py-2">
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2 mb-1"><ClipboardList className="h-3 w-3 text-primary" /><h3 className="font-black text-xs uppercase tracking-tight italic">DOCUMENTS OBLIGATOIRES</h3></div>
                                        <ul className="grid grid-cols-1 gap-2">
                                            {[{ t: "2 Photos d'identité", d: "Format récent, fond clair uniforme." }, { t: "Copie de la CIN", d: "Joueur ou tuteur légal." }, { t: "Certificat médical", d: "Aptitude à la pratique du football." }, { t: "Attestation d'assurance", d: "Couvrant la pratique sportive." }, { t: "Frais d'adhésion", d: "Selon la grille tarifaire." }, { t: "Acte de naissance", d: "Pour les catégories juniors." }].map((item, i) => (
                                                <li key={i} className="flex items-start gap-3 p-2 border rounded-xl bg-slate-50 shadow-sm">
                                                    <div className="h-4 w-4 border-2 border-primary rounded shrink-0 mt-0.5 flex items-center justify-center font-black text-primary text-[8px] italic">!</div>
                                                    <div><p className="font-black text-[9px] uppercase tracking-tight text-slate-900 leading-none mb-0.5">{item.t}</p><p className="text-[7px] text-muted-foreground font-semibold italic leading-tight">{item.d}</p></div>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <div className="space-y-2">
                                        <h3 className="font-black text-[7px] uppercase tracking-[0.15em] bg-slate-900 text-white px-3 py-1 w-fit rounded shadow-sm italic">I. IDENTITÉ DU JOUEUR</h3>
                                        <div className="space-y-3 text-[9px] font-medium">
                                            <div className="flex items-center"><div>NOM ET PRÉNOM :</div><DottedLine /></div>
                                            <div className="flex items-center"><div>DATE ET LIEU DE NAISSANCE :</div><DottedLine /></div>
                                            <div className="grid grid-cols-2 gap-x-6"><div className="flex items-center"><div>NATIONALITÉ :</div><DottedLine /></div><div className="flex items-center"><div>GENRE :</div><DottedLine /></div></div>
                                            <div className="grid grid-cols-2 gap-x-6"><div className="flex items-center"><div>N° CIN :</div><DottedLine /></div><div className="flex items-center"><div>N° LICENCE :</div><DottedLine /></div></div>
                                            <div className="flex items-center"><div>ADRESSE RÉSIDENTIELLE :</div><DottedLine /></div>
                                            <div className="grid grid-cols-2 gap-x-6"><div className="flex items-center"><div>TÉLÉPHONE :</div><DottedLine /></div><div className="flex items-center"><div>E-MAIL :</div><DottedLine /></div></div>
                                        </div>
                                    </div>
                                    {formType === 'junior' && (
                                        <div className="space-y-2 pt-2">
                                            <h3 className="font-black text-[7px] uppercase tracking-[0.15em] bg-slate-900 text-white px-3 py-1 w-fit rounded shadow-sm italic">II. RESPONSABLE LÉGAL</h3>
                                            <div className="space-y-3 text-[9px] font-medium">
                                                <div className="flex items-center"><div>NOM ET PRÉNOM :</div><DottedLine /></div>
                                                <div className="grid grid-cols-2 gap-x-6"><div className="flex items-center"><div>LIEN DE PARENTÉ :</div><DottedLine /></div><div className="flex items-center"><div>N° DE CIN :</div><DottedLine /></div></div>
                                                <div className="grid grid-cols-2 gap-x-6"><div className="flex items-center"><div>TÉLÉPHONE :</div><DottedLine /></div><div className="flex items-center"><div>E-MAIL :</div><DottedLine /></div></div>
                                            </div>
                                        </div>
                                    )}
                                    <div className="space-y-2 pt-2">
                                        <h3 className="font-black text-[7px] uppercase tracking-[0.15em] bg-slate-900 text-white px-3 py-1 w-fit rounded shadow-sm italic">III. DÉCLARATION</h3>
                                        <div className="space-y-2 text-[8px] leading-relaxed italic text-slate-700">
                                            <p>Je soussigné(e) certifie que les informations ci-dessus sont exactes et m'engage à respecter scrupuleusement le règlement intérieur et les valeurs du club.</p>
                                            <p className="font-black text-black border-l-4 border-primary pl-4 not-italic py-2 bg-primary/5 uppercase tracking-tighter text-[7px]">AVIS IMPORTANT : Cette fiche d'inscription doit impérativement être légalisée auprès des autorités compétentes pour être valide.</p>
                                        </div>
                                    </div>
                                </>
                            )}
                            <div className="pt-12 pb-4 flex flex-col items-center mt-auto">
                                <div className="w-full flex flex-row justify-between items-start gap-10 px-4">
                                    <div className="space-y-4 pt-2 text-left"><div className="flex items-center"><span className="font-bold text-[10px]">Fait à</span><div className="w-20 border-b border-dotted border-gray-400 mx-1"></div></div><div className="flex items-center"><span className="font-bold text-[10px]">Le</span><div className="w-20 border-b border-dotted border-gray-400 mx-1"></div></div></div>
                                    <div className="flex flex-col items-center gap-2"><div className="text-center w-36 h-16 border-2 border-slate-200 rounded-xl p-2 flex flex-col items-center bg-slate-50/50 shadow-inner"><p className="text-[8px] font-black uppercase tracking-[0.4em] text-slate-600 mb-auto">Cachet & Signature</p><div className="w-28 border-b border-slate-200 mb-1"></div></div></div>
                                </div>
                            </div>
                        </div>
                        
                        <footer className="p-4 bg-slate-900 text-white flex justify-between items-center mt-0 border-t-2 border-primary shrink-0">
                            <p className="text-[6px] font-black uppercase tracking-[0.15em] opacity-50">© {new Date().getFullYear()} {clubName} - ADMINISTRATION</p>
                            <div className="text-[7px] font-black uppercase tracking-[0.1em] text-primary italic border-b border-primary mb-1 w-fit ml-auto pb-0.5">Document Officiel</div>
                        </footer>
                    </div>
                </div>
            </div>
        </div>
    </div>
  );
}
