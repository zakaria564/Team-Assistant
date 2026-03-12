"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, FileDown, User, Phone, Mail, Home, Flag, Star, LogIn, LogOut, Fingerprint, Shield, ShieldCheck } from "lucide-react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { AvatarFallback } from "@/components/ui/avatar";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

interface Coach {
  id: string;
  name: string;
  category: string;
  status: "Actif" | "Inactif";
  photoUrl?: string;
  phone?: string;
  email: string;
  specialty?: string;
  entryDate?: string;
  exitDate?: string;
  nationality?: string;
  cin?: string;
  address?: string;
  professionalId?: string;
}

const DetailItem = ({ icon: Icon, label, value, children }: { icon: React.ElementType, label: string, value?: string, children?: React.ReactNode }) => (
  <div className="flex items-start gap-3 mb-4">
    <div className="mt-0.5 bg-slate-50 p-1.5 rounded border border-slate-100 flex items-center justify-center shrink-0">
        <Icon className="h-3.5 w-3.5 text-slate-600" />
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">{label}</p>
      <div className={`text-sm font-bold break-words leading-tight text-slate-800`}>
        {value || children || "Non spécifié"}
      </div>
    </div>
  </div>
);

const SectionTitle = ({ title, icon: Icon }: { title: string, icon?: React.ElementType }) => (
    <div className="mb-6 flex items-center gap-2 border-b-2 border-slate-100 pb-2">
        {Icon && <Icon className="h-4 w-4 text-primary" />}
        <h2 className="text-xs font-black uppercase tracking-[0.1em] text-slate-900">{title}</h2>
    </div>
);

export default function CoachDetailsPdfPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: coachId } = React.use(params);
  
  const router = useRouter();
  const [user, loadingUser] = useAuthState(auth);
  const { toast } = useToast();
  
  const [coach, setCoach] = useState<Coach | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingPdf, setLoadingPdf] = useState(false);
  const [clubName, setClubName] = useState("Votre Club");
  const [clubLogoUrl, setClubLogoUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!coachId) return;

    const fetchCoachAndClub = async () => {
      if (!user && !loadingUser) {
        setLoading(false);
        return;
      }
      if (!user) return;

      setLoading(true);
      try {
        const coachRef = doc(db, "coaches", coachId);
        const coachSnap = await getDoc(coachRef);

        if (coachSnap.exists()) {
          setCoach({ id: coachSnap.id, ...coachSnap.data() } as Coach);
        } else {
          router.push("/dashboard/coaches");
        }
        
        const clubDocRef = doc(db, "clubs", user.uid);
        const clubDoc = await getDoc(clubDocRef);
        if (clubDoc.exists()) {
          const clubData = clubDoc.data();
          setClubName(clubData.clubName || "Votre Club");
          setClubLogoUrl(clubData.logoUrl || null);
        }

      } catch (error) {
        console.error("Error fetching coach:", error);
        router.push("/dashboard/coaches");
      } finally {
        setLoading(false);
      }
    };

    fetchCoachAndClub();
  }, [coachId, user, loadingUser, router]);
  
  const handleDownloadPdf = () => {
    setLoadingPdf(true);
    const cardElement = document.getElementById("printable-details");
    if (cardElement) {
        window.scrollTo(0, 0);

        const originalWidth = cardElement.style.width;
        cardElement.style.width = '800px';

        setTimeout(() => {
            html2canvas(cardElement, {
                scale: 2,
                useCORS: true,
                allowTaint: false,
                backgroundColor: '#ffffff',
                logging: false,
            }).then((canvas) => {
                const pdf = new jsPDF({
                    orientation: 'portrait',
                    unit: 'pt',
                    format: 'a4'
                });

                const pdfWidth = pdf.internal.pageSize.getWidth();
                const pdfHeight = pdf.internal.pageSize.getHeight();
                const canvasAspectRatio = canvas.width / canvas.height;

                let imgWidth = pdfWidth;
                let imgHeight = pdfWidth / canvasAspectRatio;

                if (imgHeight > pdfHeight) {
                    imgHeight = pdfHeight;
                    imgWidth = imgHeight * canvasAspectRatio;
                }

                const x = (pdfWidth - imgWidth) / 2;
                pdf.addImage(canvas.toDataURL('image/png'), 'PNG', x, 0, imgWidth, imgHeight);
                pdf.save(`fiche_officielle_coach_${coach?.name?.replace(/ /g, "_")}.pdf`);
            }).catch((err) => {
                console.error("Erreur PDF:", err);
                toast({
                    variant: "destructive",
                    title: "Erreur",
                    description: "Le PDF n'a pas pu être généré."
                });
            }).finally(() => {
                if (cardElement) {
                  cardElement.style.width = originalWidth;
                }
                setLoadingPdf(false);
            });
        }, 500);
    }
  };


  if (loading || loadingUser) {
    return (
      <div className="flex justify-center items-center h-screen bg-slate-50">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!coach) return null;
  
  const coachInitial = coach.name?.charAt(0)?.toUpperCase() || "E";
  const clubInitial = clubName?.charAt(0)?.toUpperCase() || "C";
  const displayId = coach.professionalId || `CH-REF-${coach.id.substring(0, 6).toUpperCase()}`;


  return (
    <div className="bg-slate-100 min-h-screen p-2 sm:p-8">
       <div className="w-full max-w-4xl mx-auto space-y-6">
        <div className="flex justify-between items-center print:hidden">
          <Button variant="outline" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Retour
          </Button>
          <Button size="sm" onClick={handleDownloadPdf} disabled={loadingPdf}>
            {loadingPdf ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Génération...
              </>
            ) : (
              <>
                <FileDown className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Télécharger la Fiche</span>
                <span className="sm:hidden">Télécharger</span>
              </>
            )}
          </Button>
        </div>

        <div className="w-full overflow-x-auto">
            <div id="printable-details" className="bg-white p-6 sm:p-12 text-slate-900 border-t-8 border-primary flex flex-col mx-auto shadow-xl min-w-[320px]" style={{ width: '100%', maxWidth: '800px', minHeight: '1120px' }}>
                
                <header className="flex flex-row justify-between items-start mb-10 border-b-2 border-slate-100 pb-6">
                    <div className="flex items-center gap-3 sm:gap-5">
                        <div className="h-12 w-12 sm:h-16 sm:w-16 border-2 border-slate-200 rounded-lg overflow-hidden bg-white flex items-center justify-center p-1 shrink-0">
                            {clubLogoUrl ? (
                                <img src={clubLogoUrl} alt="Logo" className="h-full w-full object-contain" crossOrigin="anonymous" />
                            ) : (
                                <div className="h-full w-full bg-primary text-white flex items-center justify-center text-xl sm:text-2xl font-black">{clubInitial}</div>
                            )}
                        </div>
                        <div>
                            <h1 className="text-base sm:text-xl font-black uppercase tracking-tight text-slate-900 leading-none mb-1">{clubName}</h1>
                            <p className="text-primary font-bold text-[8px] sm:text-[10px] uppercase tracking-widest">Fiche Officielle de l'Entraîneur</p>
                        </div>
                    </div>
                    <div className="text-right hidden sm:block">
                        <p className="text-[9px] font-semibold text-slate-400 uppercase">Document émis le {format(new Date(), 'dd/MM/yyyy')}</p>
                    </div>
                </header>
                
                <section className="flex flex-col sm:flex-row items-center gap-6 sm:gap-10 mb-12 bg-slate-50 p-6 sm:p-8 rounded-xl border-2 border-slate-100 text-center sm:text-left">
                    <div className="flex flex-col items-center gap-4">
                        <div className="h-24 w-24 sm:h-32 sm:w-32 border-4 border-white shadow-md rounded-full overflow-hidden bg-slate-200 flex items-center justify-center relative">
                            {coach.photoUrl ? (
                                <img src={coach.photoUrl} alt={coach.name} className="h-full w-full object-contain" crossOrigin="anonymous" />
                            ) : (
                                <AvatarFallback className="text-4xl sm:text-5xl font-black bg-slate-200 text-slate-400">{coachInitial}</AvatarFallback>
                            )}
                        </div>
                        <div className="bg-white px-3 py-1 rounded border border-slate-300 font-mono text-[9px] font-bold text-slate-600 shadow-sm flex items-center gap-1.5">
                            <Fingerprint className="h-3 w-3 text-primary" />
                            {displayId}
                        </div>
                    </div>
                    <div className="space-y-3 flex-1 min-w-0">
                        <h1 className="text-2xl sm:text-4xl font-black text-slate-900 uppercase tracking-tighter leading-none truncate">{coach.name}</h1>
                        <div className="flex flex-wrap justify-center sm:justify-start items-center gap-3">
                            <Badge className="bg-slate-800 text-white text-[10px] px-2.5 py-0.5 font-bold uppercase tracking-wider">{coach.category}</Badge>
                            <span className="text-slate-500 font-bold text-xs uppercase flex items-center gap-1.5">
                                <Star className="h-3.5 w-3.5 text-primary fill-primary" /> {coach.specialty || "Entraîneur"}
                            </span>
                        </div>
                    </div>
                </section>

                <main className="flex flex-col sm:flex-row gap-10 sm:gap-12 flex-grow">
                    <div className="w-full sm:w-1/2 space-y-10">
                        <div>
                            <SectionTitle title="État Civil & Contact" icon={User} />
                            <DetailItem icon={Flag} label="Nationalité" value={coach.nationality} />
                            <DetailItem icon={Fingerprint} label="N° CIN" value={coach.cin} />
                            <DetailItem icon={Mail} label="Email personnel" value={coach.email} />
                            <DetailItem icon={Phone} label="Téléphone mobile" value={coach.phone} />
                            <DetailItem icon={Home} label="Adresse Résidentielle" value={coach.address} />
                        </div>
                    </div>

                    <div className="w-full sm:w-1/2 space-y-10">
                        <div>
                            <SectionTitle title="Parcours Sportif" icon={Shield} />
                            <DetailItem icon={Star} label="Spécialité Technique" value={coach.specialty} />
                            <DetailItem icon={Shield} label="Catégorie Assignée" value={coach.category} />
                            <DetailItem icon={LogIn} label="Date d'entrée au club" value={coach.entryDate ? format(new Date(coach.entryDate), 'dd/MM/yyyy', { locale: fr }) : undefined} />
                            <DetailItem icon={LogOut} label="Date de fin de mission" value={coach.exitDate ? format(new Date(coach.exitDate), 'dd/MM/yyyy', { locale: fr }) : "En poste"} />
                        </div>
                    </div>
                </main>

                <footer className="mt-12 pt-8 border-t-2 border-slate-100 flex flex-col sm:flex-row justify-between items-center sm:items-end gap-10">
                    <div className="space-y-3 text-center sm:text-left">
                        <div className="flex items-center gap-2 text-slate-300">
                            <ShieldCheck className="h-4 w-4" />
                            <span className="text-[9px] font-black uppercase tracking-wider italic">Certification électronique par l'administration</span>
                        </div>
                        <p className="text-[8px] font-bold text-slate-400 uppercase">© {new Date().getFullYear()} {clubName} - Système Team Assistant</p>
                    </div>
                    <div className="text-center">
                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-12 sm:mb-16">Cachet du Club & Signature</p>
                        <div className="w-40 border-b-2 border-slate-200"></div>
                    </div>
                </footer>
            </div>
        </div>
      </div>
    </div>
  );
}
