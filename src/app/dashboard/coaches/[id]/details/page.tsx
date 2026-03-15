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

const DetailItem = ({ icon: Icon, label, value, children }: { icon: React.ElementType, label: string, value?: string, children?: React.ReactNode }) => (
  <div className="flex items-start gap-4 mb-6 text-left">
    <div className="mt-1 bg-slate-100 p-2.5 rounded-lg border border-slate-200 flex items-center justify-center shrink-0 shadow-sm">
        <Icon className="h-4 w-4 text-slate-700" />
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">{label}</p>
      <div className={`text-base font-bold text-slate-900 break-words leading-tight`}>
        {value || children || "Non spécifié"}
      </div>
    </div>
  </div>
);

const SectionTitle = ({ title, icon: Icon }: { title: string, icon?: React.ElementType }) => (
    <div className="mb-8 flex items-center gap-3 border-b-4 border-primary/10 pb-3">
        {Icon && <Icon className="h-5 w-5 text-primary" />}
        <h2 className="text-sm font-black uppercase tracking-[0.15em] text-slate-900">{title}</h2>
    </div>
);

export default function CoachDetailsPdfPage({ params: paramsPromise }: { params: Promise<{ id: string }> }) {
  const params = React.use(paramsPromise);
  const coachId = params.id;
  
  const router = useRouter();
  const [user, loadingUser] = useAuthState(auth);
  const { toast } = useToast();
  
  const [coach, setCoach] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingPdf, setLoadingPdf] = useState(false);
  const [clubName, setClubName] = useState("Votre Club");
  const [clubLogoUrl, setClubLogoUrl] = useState<string | null>(null);
  const [clubAddress, setClubAddress] = useState("");
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const handleResize = () => {
      const containerWidth = window.innerWidth - 32;
      if (containerWidth < 800) {
        setScale(Math.min(containerWidth / 800, 1));
      } else {
        setScale(1);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!coachId) return;
    const fetchCoachAndClub = async () => {
      if (!user && !loadingUser) { setLoading(false); return; }
      if (!user) return;
      setLoading(true);
      try {
        const coachSnap = await getDoc(doc(db, "coaches", coachId));
        if (coachSnap.exists()) { setCoach({ id: coachSnap.id, ...coachSnap.data() }); }
        else { router.push("/dashboard/coaches"); }
        const clubDoc = await getDoc(doc(db, "clubs", user.uid));
        if (clubDoc.exists()) {
          const clubData = clubDoc.data();
          setClubName(clubData.clubName || "Votre Club");
          setClubLogoUrl(clubData.logoUrl || null);
          setClubAddress(clubData.address || "");
        }
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    fetchCoachAndClub();
  }, [coachId, user, loadingUser, router]);
  
  const handleDownloadPdf = async () => {
    setLoadingPdf(true);
    const element = document.getElementById("printable-details");
    if (element) {
        try {
            const images = Array.from(element.getElementsByTagName('img'));
            await Promise.all(images.map(img => {
                if (img.complete) return Promise.resolve();
                return new Promise((resolve) => { img.onload = resolve; img.onerror = resolve; });
            }));
            await new Promise(r => setTimeout(r, 1500));
            const canvas = await html2canvas(element, { 
                scale: 3, 
                useCORS: true, 
                backgroundColor: '#ffffff', 
                logging: false,
                allowTaint: true
            });
            const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
            const imgWidth = pdf.internal.pageSize.getWidth();
            const imgHeight = (canvas.height * imgWidth) / canvas.width;
            pdf.addImage(canvas.toDataURL('image/png', 1.0), 'PNG', 0, 0, imgWidth, imgHeight);
            pdf.save(`fiche_coach_${coach?.name?.replace(/ /g, "_")}.pdf`);
        } catch (err) { toast({ variant: "destructive", title: "Erreur PDF" }); }
        finally { setLoadingPdf(false); }
    }
  };

  if (loading || loadingUser) return <div className="flex justify-center items-center h-screen bg-slate-50"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
  if (!coach) return null;
  
  const coachInitial = coach.name?.charAt(0)?.toUpperCase() || "E";
  const clubInitial = clubName?.charAt(0)?.toUpperCase() || "C";
  const displayId = coach.professionalId || `CH-REF-${coach.id.substring(0, 6).toUpperCase()}`;

  return (
    <div className="bg-slate-100 min-h-screen p-2 sm:p-8 flex flex-col items-center overflow-x-hidden w-full">
       <div className="w-full max-w-4xl space-y-6 text-center overflow-x-hidden">
        <div className="flex justify-between items-center print:hidden gap-4 mb-4">
          <Button variant="outline" size="sm" onClick={() => router.back()} className="h-10 font-bold"><ArrowLeft className="mr-2 h-4 w-4" /> Retour</Button>
          <Button size="sm" onClick={handleDownloadPdf} disabled={loadingPdf} className="h-10 font-black uppercase tracking-widest">
            {loadingPdf ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileDown className="mr-2 h-4 w-4" />}
            Exporter Fiche HD
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
                className="bg-white shadow-2xl rounded-xl overflow-hidden"
            >
                <div id="printable-details" className="bg-white text-slate-900 border-none flex flex-col mx-auto overflow-hidden" style={{ width: '800px', minHeight: '1120px' }}>
                    <header className="p-12 bg-slate-900 text-white flex flex-row justify-between items-center gap-8 mb-8">
                        <div className="flex flex-row items-center gap-8 text-left">
                            <div className="h-24 w-28 border-2 border-slate-700 shadow-2xl rounded-xl overflow-hidden bg-white flex items-center justify-center shrink-0">
                                {clubLogoUrl ? (
                                    <img src={clubLogoUrl} alt="Logo" className="h-full w-full object-contain p-2" />
                                ) : (
                                    <div className="h-full w-full bg-primary text-white flex items-center justify-center text-5xl font-black">
                                        {clubInitial}
                                    </div>
                                )}
                            </div>
                            <div className="space-y-2">
                                <h1 className="text-3xl font-black uppercase tracking-tighter text-white leading-none">{clubName}</h1>
                                <div className="text-slate-400 text-base font-semibold leading-tight max-w-[350px]">
                                    <p className="break-words">{clubAddress || "Siège du club"}</p>
                                </div>
                            </div>
                        </div>
                        <div className="text-right space-y-2">
                            <h2 className="text-5xl font-black uppercase italic tracking-tighter text-white">FICHE</h2>
                            <div className="pt-2">
                                <p className="text-primary font-black text-xs uppercase tracking-[0.3em]">OFFICIELLE ENTRAÎNEUR</p>
                                <p className="text-slate-500 text-sm font-bold mt-1">Émise le {format(new Date(), 'dd/MM/yyyy')}</p>
                            </div>
                        </div>
                    </header>
                    
                    <div className="px-12 pb-12 flex-grow flex flex-col">
                        <section className="flex flex-row items-center gap-12 mb-12 bg-slate-50 p-10 rounded-2xl border-2 border-slate-100 shadow-sm">
                            <div className="flex flex-col items-center gap-4 shrink-0">
                                <div className="h-40 w-40 border-4 border-white shadow-xl rounded-full overflow-hidden bg-white flex items-center justify-center relative">
                                    {coach.photoUrl ? <img src={coach.photoUrl} alt={coach.name} className="h-full w-full object-cover" /> : <AvatarFallback className="text-5xl font-black bg-slate-200 text-slate-400">{coachInitial}</AvatarFallback>}
                                </div>
                                <div className="bg-slate-900 text-white px-4 py-1.5 rounded-full font-mono text-[10px] font-black tracking-widest flex items-center gap-2 shadow-lg border border-slate-700">
                                    <Fingerprint className="h-3.5 w-3.5 text-primary" />{displayId}
                                </div>
                            </div>
                            <div className="flex-1 min-w-0">
                                <h1 className="text-4xl font-black text-slate-900 uppercase tracking-tighter leading-none mb-10 break-words text-left">{coach.name}</h1>
                                <div className="grid grid-cols-2 gap-6">
                                    <div className="flex flex-col items-center justify-center text-center p-3 bg-white rounded-xl border border-slate-100 shadow-sm">
                                        <span className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2">Catégorie Affectée</span>
                                        <Badge className="bg-slate-900 text-white text-xs px-3 py-1 font-black uppercase tracking-widest rounded-md justify-center w-full border-none shadow-sm">{coach.category}</Badge>
                                    </div>
                                    <div className="flex flex-col items-center justify-center text-center p-3 bg-white rounded-xl border border-slate-100 shadow-sm">
                                        <span className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2">Spécialité Technique</span>
                                        <span className="text-slate-800 font-black text-[11px] uppercase flex items-center justify-center gap-2 bg-slate-50 px-3 py-1 rounded-md border border-slate-100 shadow-sm w-full"><Star className="h-3.5 w-3.5 text-primary fill-primary" /> {coach.specialty || "Entraîneur"}</span>
                                    </div>
                                </div>
                            </div>
                        </section>

                        <main className="flex flex-row gap-12 mb-8">
                            <div className="w-1/2 space-y-10">
                                <div>
                                    <SectionTitle title="État Civil & Contact" icon={User} />
                                    <DetailItem icon={Flag} label="Nationalité" value={coach.nationality} />
                                    <DetailItem icon={Fingerprint} label="N° CIN / ID" value={coach.cin} />
                                    <DetailItem icon={Mail} label="Email personnel" value={coach.email} />
                                    <DetailItem icon={Phone} label="Téléphone mobile" value={coach.phone} />
                                    <DetailItem icon={Home} label="Adresse Résidentielle" value={coach.address} />
                                </div>
                            </div>
                            <div className="w-1/2 space-y-10">
                                <div>
                                    <SectionTitle title="Parcours Professionnel" icon={Shield} />
                                    <DetailItem icon={Shield} label="Catégorie Assignée" value={coach.category} />
                                    <DetailItem icon={LogIn} label="Date d'entrée au club" value={coach.entryDate ? format(new Date(coach.entryDate), 'dd/MM/yyyy', { locale: fr }) : undefined} />
                                    <DetailItem icon={LogOut} label="Date de fin de mission" value={coach.exitDate ? format(new Date(coach.exitDate), 'dd/MM/yyyy', { locale: fr }) : "En poste"} />
                                </div>
                            </div>
                        </main>

                        <footer className="mt-auto pt-10 border-t-2 border-slate-100 flex flex-col items-center">
                            <div className="text-center space-y-20 mb-16 pt-8 w-full flex flex-col items-center">
                                <p className="text-[11px] font-black uppercase tracking-[0.4em] text-slate-400 italic">Cachet du Club & Signature Administrative</p>
                                <div className="w-72 border-b-4 border-slate-200 shadow-sm"></div>
                            </div>
                            <div className="w-full flex flex-row justify-between items-end gap-12 text-left">
                                <div className="space-y-2">
                                    <div className="flex items-center gap-3 text-slate-300">
                                        <ShieldCheck className="h-5 w-5" />
                                        <span className="text-[10px] font-black uppercase tracking-widest italic">Certification Électronique de Fonction</span>
                                    </div>
                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">© {new Date().getFullYear()} {clubName} - Système Team Assistant</p>
                                </div>
                                <div className="text-xs font-black uppercase tracking-[0.2em] text-primary italic border-b-2 border-primary">Document Officiel</div>
                            </div>
                        </footer>
                    </div>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
}
