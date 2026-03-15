"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, User, Phone, Mail, Flag, Star, ClipboardList, LogIn, LogOut, FileDown, Fingerprint, MapPin, ShieldCheck, Cake, Shield, VenetianMask } from "lucide-react";
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { Badge } from "@/components/ui/badge";
import { AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";

const DetailItem = ({ icon: Icon, label, value, children }: { icon: React.ElementType, label: string, value?: string, children?: React.ReactNode }) => (
  <div className="flex items-start gap-4 mb-6 text-left">
    <div className="mt-1 bg-slate-100 p-2.5 rounded-lg border border-slate-200 flex items-center justify-center shrink-0 shadow-sm">
        <Icon className="h-4 w-4 text-slate-700" />
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">{label}</p>
      <div className="text-base font-bold text-slate-900 break-words leading-tight">
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

const toTitleCase = (str: string) => {
  if (!str) return '';
  return str.toLowerCase().split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
};

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default function PlayerDetailsPdfPage(props: PageProps) {
  const params = React.use(props.params);
  const playerId = params.id;
  
  const router = useRouter();
  const [user, loadingUser] = useAuthState(auth);
  const { toast } = useToast();
  
  const [player, setPlayer] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingPdf, setLoadingPdf] = useState(false);
  const [clubName, setClubName] = useState("Votre Club");
  const [clubLogoUrl, setClubLogoUrl] = useState<string | null>(null);
  const [clubAddress, setClubAddress] = useState("");
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const handleResize = () => {
      const containerWidth = window.innerWidth - 32;
      if (containerWidth < 1000) {
        setScale(Math.min(containerWidth / 1000, 1));
      } else {
        setScale(1);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!playerId) return;
    const fetchPlayerAndClub = async () => {
      if (!user && !loadingUser) { setLoading(false); return; }
      if (!user) return;
      setLoading(true);
      try {
        const playerSnap = await getDoc(doc(db, "players", playerId));
        if (playerSnap.exists()) {
          const data = { id: playerSnap.id, ...playerSnap.data() };
          if(data.coachId && data.coachId !== 'none' && data.coachId !== '') {
            const coachSnap = await getDoc(doc(db, "coaches", data.coachId));
            if(coachSnap.exists()) data.coachName = coachSnap.data().name;
          }
          setPlayer(data);
        } else { router.push("/dashboard/players"); }
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
    fetchPlayerAndClub();
  }, [playerId, user, loadingUser, router]);
  
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
            pdf.save(`fiche_${player?.name?.replace(/ /g, "_")}.pdf`);
        } catch (err) { toast({ variant: "destructive", title: "Erreur PDF" }); }
        finally { setLoadingPdf(false); }
    }
  };

  if (loading || loadingUser) return <div className="flex justify-center items-center h-screen bg-slate-50"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
  if (!player) return null;
  
  const playerInitial = player.name?.charAt(0)?.toUpperCase() || "P";
  const clubInitial = clubName?.charAt(0)?.toUpperCase() || "C";
  const displayId = player.professionalId || `PL-REF-${player.id.substring(0, 6).toUpperCase()}`;

  return (
    <div className="bg-slate-100 min-h-screen p-2 sm:p-8 flex flex-col items-center overflow-x-hidden w-full">
       <div className="w-full max-w-5xl space-y-6 text-center overflow-x-hidden">
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
                    width: '1000px',
                    height: `${1414 * scale}px`,
                    transition: 'transform 0.2s ease-out'
                }}
                className="bg-white shadow-2xl rounded-xl overflow-hidden"
            >
                <div id="printable-details" className="bg-white text-slate-900 border-none flex flex-col mx-auto overflow-hidden" style={{ width: '1000px', minHeight: '1414px' }}>
                    <header className="p-12 bg-slate-900 text-white flex flex-row justify-between items-center gap-8 mb-8">
                        <div className="flex flex-row items-center gap-10 text-left">
                            <div className="h-28 w-32 border-2 border-slate-700 shadow-2xl rounded-xl overflow-hidden bg-white flex items-center justify-center shrink-0">
                                {clubLogoUrl ? (
                                    <img src={clubLogoUrl} alt="Logo" className="h-full w-full object-contain p-2" />
                                ) : (
                                    <div className="h-full w-full bg-primary text-white flex items-center justify-center text-6xl font-black">
                                        {clubInitial}
                                    </div>
                                )}
                            </div>
                            <div className="space-y-2">
                                <h1 className="text-4xl font-black uppercase tracking-tighter text-white leading-none">{clubName}</h1>
                                <div className="text-slate-400 text-lg font-semibold leading-tight max-w-[450px]">
                                    <p className="break-words">{clubAddress || "Siège Social"}</p>
                                </div>
                            </div>
                        </div>
                        <div className="text-right space-y-2">
                            <h2 className="text-6xl font-black uppercase italic tracking-tighter text-white">FICHE</h2>
                            <div className="pt-2">
                                <p className="text-primary font-black text-sm uppercase tracking-[0.3em]">OFFICIELLE JOUEUR</p>
                                <p className="text-slate-500 text-base font-bold mt-1">Saison {new Date().getFullYear()}</p>
                            </div>
                        </div>
                    </header>
                    
                    <div className="px-16 pb-12 flex-grow flex flex-col">
                        <section className="flex flex-row items-center gap-16 mb-12 bg-slate-50 p-12 rounded-3xl border-2 border-slate-100 shadow-sm">
                            <div className="flex flex-col items-center gap-6 shrink-0">
                                <div className="h-48 w-48 border-4 border-white shadow-xl rounded-full overflow-hidden bg-white flex items-center justify-center relative">
                                    {player.photoUrl ? <img src={player.photoUrl} alt={player.name} className="h-full w-full object-cover" /> : <AvatarFallback className="text-6xl font-black bg-slate-200 text-slate-400">{playerInitial}</AvatarFallback>}
                                </div>
                                <div className="bg-slate-900 text-white px-6 py-2 rounded-full font-mono text-xs font-black tracking-widest flex items-center gap-3 shadow-lg border border-slate-700">
                                    <Fingerprint className="h-4 w-4 text-primary" />{displayId}
                                </div>
                            </div>
                            <div className="flex-1 min-w-0">
                                <h1 className="text-5xl font-black text-slate-900 uppercase tracking-tighter leading-none mb-10 break-words text-left">{player.name}</h1>
                                <div className="grid grid-cols-3 gap-8">
                                    <div className="flex flex-col items-center justify-center text-center p-4 bg-white rounded-2xl border border-slate-100 shadow-sm">
                                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2">Catégorie</span>
                                        <Badge className="bg-slate-900 text-white text-sm px-4 py-1.5 font-black uppercase tracking-widest rounded-md justify-center w-full border-none shadow-sm">{player.category}</Badge>
                                    </div>
                                    <div className="flex flex-col items-center justify-center text-center p-4 bg-white rounded-2xl border border-slate-100 shadow-sm">
                                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2">Poste</span>
                                        <span className="text-slate-800 font-black text-xs uppercase flex items-center justify-center gap-2"><Star className="h-4 w-4 text-primary fill-primary" /> {player.position || "Joueur"}</span>
                                    </div>
                                    <div className="flex flex-col items-center justify-center text-center p-4 bg-primary rounded-2xl shadow-md">
                                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/70 mb-1">Numéro</span>
                                        <span className="text-white font-black text-3xl italic">#{player.number || "--"}</span>
                                    </div>
                                </div>
                            </div>
                        </section>

                        <main className="flex flex-row gap-16 mb-8">
                            <div className="w-1/2 space-y-12">
                                <div>
                                    <SectionTitle title="État Civil & Contact" icon={User} />
                                    <DetailItem icon={Cake} label="Date de naissance" value={player.birthDate ? format(new Date(player.birthDate), 'dd MMMM yyyy', { locale: fr }) : undefined} />
                                    <DetailItem icon={VenetianMask} label="Genre" value={player.gender} />
                                    <DetailItem icon={Flag} label="Nationalité" value={player.nationality} />
                                    <DetailItem icon={Fingerprint} label="N° CIN / ID" value={player.cin} />
                                    <DetailItem icon={Mail} label="Email personnel" value={player.email} />
                                    <DetailItem icon={Phone} label="Téléphone mobile" value={player.phone} />
                                    <DetailItem icon={MapPin} label="Adresse Résidentielle" value={player.address} />
                                </div>
                            </div>
                            <div className="w-1/2 space-y-12">
                                <div>
                                    <SectionTitle title="Parcours Sportif" icon={Shield} />
                                    <DetailItem icon={ClipboardList} label="Entraîneur Responsable" value={player.coachName ? toTitleCase(player.coachName) : "Non assigné"} />
                                    <DetailItem icon={LogIn} label="Date d'intégration" value={player.entryDate ? format(new Date(player.entryDate), 'dd/MM/yyyy', { locale: fr }) : undefined} />
                                    <DetailItem icon={LogOut} label="Fin de mission" value={player.exitDate ? format(new Date(player.exitDate), 'dd/MM/yyyy', { locale: fr }) : "En cours"} />
                                </div>
                                {player.tutorName && (
                                    <div className="pt-6">
                                        <SectionTitle title="Responsable Légal" icon={VenetianMask} />
                                        <DetailItem icon={User} label="Nom du tuteur" value={toTitleCase(player.tutorName)} />
                                        <DetailItem icon={Fingerprint} label="N° CIN Tuteur" value={player.tutorCin} />
                                        <DetailItem icon={Phone} label="Contact d'urgence" value={player.tutorPhone} />
                                    </div>
                                )}
                            </div>
                        </main>

                        <footer className="mt-auto pt-12 border-t-2 border-slate-100 flex flex-col items-center">
                            <div className="text-center space-y-24 mb-20 pt-10 w-full flex flex-col items-center">
                                <p className="text-xs font-black uppercase tracking-[0.4em] text-slate-400 italic">Cachet du Club & Signature Administrative</p>
                                <div className="w-80 border-b-4 border-slate-200 shadow-sm"></div>
                            </div>
                            <div className="w-full flex flex-row justify-between items-end gap-12 text-left">
                                <div className="space-y-2">
                                    <div className="flex items-center gap-4 text-slate-300">
                                        <ShieldCheck className="h-8 w-8" />
                                        <span className="text-[11px] font-black uppercase tracking-widest italic">Certification Électronique Certifiée</span>
                                    </div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">© {new Date().getFullYear()} {clubName} - Système Team Assistant Pro</p>
                                </div>
                                <div className="text-sm font-black uppercase tracking-[0.2em] text-primary italic border-b-2 border-primary">Document Officiel</div>
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
