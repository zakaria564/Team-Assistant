"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, User, Phone, Mail, Flag, Star, ClipboardList, LogIn, LogOut, FileDown, Fingerprint, MapPin, ShieldCheck, Cake, Shield, VenetianMask, Shirt } from "lucide-react";
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { Badge } from "@/components/ui/badge";
import { AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";

const DetailItem = ({ icon: Icon, label, value }: { icon: React.ElementType, label: string, value?: string }) => (
  <div className="flex items-start gap-3 mb-2 text-left">
    <div className="mt-0.5 bg-slate-100 p-1 rounded flex items-center justify-center shrink-0 border border-slate-200">
        <Icon className="h-2.5 w-2.5 text-slate-700" />
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-[7px] font-black uppercase tracking-wider text-slate-400 leading-none mb-0.5">{label}</p>
      <div className="text-[9px] font-bold text-slate-900 break-words leading-tight">
        {value || "Non spécifié"}
      </div>
    </div>
  </div>
);

const SectionTitle = ({ title, icon: Icon }: { title: string, icon?: React.ElementType }) => (
    <div className="mb-2 flex items-center gap-2 border-b-2 border-primary/10 pb-0.5">
        {Icon && <Icon className="h-2.5 w-2.5 text-primary" />}
        <h2 className="text-[8px] font-black uppercase tracking-[0.15em] text-slate-900">{title}</h2>
    </div>
);

type PageProps = {
  params: Promise<{ id: string }>;
};

export default function PlayerDetailsPdfPage({ params }: PageProps) {
  const unwrappedParams = React.use(params);
  const playerId = unwrappedParams.id;
  
  const router = useRouter();
  const [user, loadingUser] = useAuthState(auth);
  const { toast } = useToast();
  
  const [player, setPlayer] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingPdf, setLoadingPdf] = useState(false);
  const [clubName, setClubName] = useState("Votre Club");
  const [clubLogoUrl, setClubLogoUrl] = useState<string | null>(null);
  const [clubAddress, setClubAddress] = useState("");

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
            const canvas = await html2canvas(element, { scale: 2, useCORS: true, backgroundColor: '#0f172a', logging: false, allowTaint: true });
            const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
            const imgWidth = pdf.internal.pageSize.getWidth();
            const imgHeight = (canvas.height * imgWidth) / canvas.width;
            pdf.addImage(canvas.toDataURL('image/png', 1.0), 'PNG', 0, 0, imgWidth, imgHeight);
            pdf.save(`fiche_${player?.name?.replace(/ /g, "_")}.pdf`);
        } catch (err) { console.error(err); toast({ variant: "destructive", title: "Erreur PDF" }); }
        finally { setLoadingPdf(false); }
    }
  };

  if (loading || loadingUser) return <div className="flex justify-center items-center py-20"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
  if (!player) return null;
  
  const playerInitial = player.name?.charAt(0)?.toUpperCase() || "P";
  const clubInitial = clubName?.charAt(0)?.toUpperCase() || "C";
  const displayId = player.professionalId || `PL-REF-${player.id.substring(0, 6).toUpperCase()}`;

  return (
    <div className="flex flex-col items-center w-full">
       <div className="w-full max-w-2xl space-y-4 text-center">
        <div className="flex justify-between items-center gap-4 mb-2 px-2">
          <Button variant="outline" size="sm" onClick={() => router.back()} className="h-9 font-bold"><ArrowLeft className="mr-2 h-4 w-4" /> Retour</Button>
          <Button size="sm" onClick={handleDownloadPdf} disabled={loadingPdf} className="h-9 font-black uppercase tracking-widest bg-primary hover:bg-primary/90 text-white">
            {loadingPdf ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileDown className="mr-2 h-4 w-4" />}
            Exporter PDF
          </Button>
        </div>

        <div className="w-full overflow-x-auto pb-8 scrollbar-thin bg-muted/20 rounded-xl p-2">
            <div className="min-w-[600px] flex justify-center">
                <div id="printable-details" className="bg-white text-slate-900 border shadow-2xl flex flex-col" style={{ width: '600px', minHeight: '848px' }}>
                    <header className="p-4 bg-slate-900 text-white flex flex-row justify-between items-center gap-4 border-b-4 border-primary shrink-0">
                        <div className="flex flex-row items-center gap-3 text-left">
                            <div className="h-10 w-12 border border-slate-700 shadow-xl rounded-lg overflow-hidden bg-white flex items-center justify-center shrink-0">
                                {clubLogoUrl ? <img src={clubLogoUrl} alt="Logo" className="h-full w-full object-contain p-1" /> : <div className="h-full w-full bg-primary text-white flex items-center justify-center text-lg font-black">{clubInitial}</div>}
                            </div>
                            <div className="space-y-0.5">
                                <h1 className="text-xs font-black uppercase tracking-tight text-white leading-none">{clubName}</h1>
                                <div className="text-slate-400 text-[7px] font-semibold leading-tight max-w-[150px]"><p className="break-words">{clubAddress || "Siège Social"}</p></div>
                            </div>
                        </div>
                        <div className="text-right space-y-0.5">
                            <h2 className="text-lg font-black uppercase italic tracking-tighter text-white leading-none">FICHE</h2>
                            <div className="pt-0.5">
                                <p className="text-primary font-black text-[6px] uppercase tracking-[0.2em]">OFFICIELLE JOUEUR</p>
                                <p className="text-slate-500 text-[7px] font-bold">Saison {new Date().getFullYear()}</p>
                            </div>
                        </div>
                    </header>
                    
                    <div className="px-6 py-4 flex-grow flex flex-col">
                        <section className="flex flex-row items-center gap-6 mb-4 bg-slate-50 p-3 rounded-xl border border-slate-100 shadow-sm">
                            <div className="flex flex-col items-center gap-1.5 shrink-0">
                                <div className="h-16 w-16 border-2 border-white shadow-lg rounded-full overflow-hidden bg-white flex items-center justify-center relative">
                                    {player.photoUrl ? <img src={player.photoUrl} alt={player.name} className="h-full w-full object-contain bg-white" /> : <AvatarFallback className="text-2xl font-black bg-slate-200 text-slate-400">{playerInitial}</AvatarFallback>}
                                </div>
                                <div className="bg-slate-900 text-white px-1.5 py-0.5 rounded-full font-mono text-[6px] font-black tracking-widest flex items-center gap-1 shadow-md">
                                    <Fingerprint className="h-2 w-2 text-primary" />{displayId}
                                </div>
                            </div>
                            <div className="flex-1 min-w-0 text-left">
                                <h1 className="text-base font-black text-slate-900 uppercase tracking-tighter leading-none mb-2 break-words">{player.name}</h1>
                                <div className="grid grid-cols-3 gap-2">
                                    <div className="flex flex-col items-center justify-center text-center p-1 bg-white rounded-lg border border-slate-100 shadow-sm">
                                        <Badge className="bg-slate-900 text-white text-[7px] px-1 py-0.5 font-black uppercase tracking-widest rounded-sm w-full justify-center border-none">{player.category}</Badge>
                                    </div>
                                    <div className="flex flex-col items-center justify-center text-center p-1 bg-white rounded-lg border border-slate-100 shadow-sm">
                                        <span className="text-slate-800 font-black text-[7px] uppercase flex items-center justify-center gap-1 w-full"><Star className="h-2 w-2 text-primary fill-primary" /> {player.position || "Joueur"}</span>
                                    </div>
                                    <div className="flex flex-col items-center justify-center text-center p-1 bg-primary rounded-lg shadow-md">
                                        <span className="text-white font-black text-xs italic">#{player.number || "--"}</span>
                                    </div>
                                </div>
                            </div>
                        </section>

                        <main className="grid grid-cols-2 gap-6 mb-4">
                            <div className="space-y-2">
                                <div>
                                    <SectionTitle title="État Civil & Contact" icon={User} />
                                    <DetailItem icon={Cake} label="Naissance" value={player.birthDate ? format(new Date(player.birthDate), 'dd/MM/yyyy', { locale: fr }) : undefined} />
                                    <DetailItem icon={VenetianMask} label="Genre" value={player.gender} />
                                    <DetailItem icon={Flag} label="Nationalité" value={player.nationality} />
                                    <DetailItem icon={Fingerprint} label="N° CIN / ID" value={player.cin} />
                                    <DetailItem icon={Mail} label="Email" value={player.email} />
                                    <DetailItem icon={Phone} label="Téléphone" value={player.phone} />
                                    <DetailItem icon={MapPin} label="Adresse" value={player.address} />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <div>
                                    <SectionTitle title="Parcours Sportif" icon={Shield} />
                                    <DetailItem icon={ClipboardList} label="Coach" value={player.coachName || "Non assigné"} />
                                    <DetailItem icon={LogIn} label="Date d'entrée" value={player.entryDate ? format(new Date(player.entryDate), 'dd/MM/yyyy', { locale: fr }) : undefined} />
                                    <DetailItem icon={LogOut} label="Fin de mission" value={player.exitDate ? format(new Date(player.exitDate), 'dd/MM/yyyy', { locale: fr }) : "Actif"} />
                                </div>
                                {player.tutorName && (
                                    <div className="pt-2">
                                        <SectionTitle title="Responsable Légal" icon={VenetianMask} />
                                        <DetailItem icon={User} label="Nom du tuteur" value={player.tutorName} />
                                        <DetailItem icon={Fingerprint} label="N° CIN Tuteur" value={player.tutorCin} />
                                        <DetailItem icon={Mail} label="Email du tuteur" value={player.tutorEmail} />
                                        <DetailItem icon={Phone} label="Contact d'urgence" value={player.tutorPhone} />
                                    </div>
                                )}
                            </div>
                        </main>

                        <div className="pt-12 pb-4 flex flex-col items-center mt-auto">
                            <div className="text-center space-y-4 w-full flex flex-col items-center">
                                <p className="text-[9px] font-black uppercase tracking-[0.4em] text-slate-600 italic">Cachet du Club & Signature</p>
                                <div className="w-32 border-b-2 border-slate-300"></div>
                            </div>
                        </div>
                    </div>

                    <footer className="p-4 bg-slate-900 text-white flex flex-row justify-between items-end gap-4 text-left shrink-0 border-t border-primary mt-0">
                        <div className="space-y-0.5">
                            <div className="flex items-center gap-1 text-primary">
                                <ShieldCheck className="h-2.5 w-2.5" />
                                <span className="text-[6px] font-black uppercase tracking-widest italic">Certification Digitale Officielle</span>
                            </div>
                            <p className="text-[5px] font-bold text-slate-400 uppercase tracking-tighter">© {new Date().getFullYear()} {clubName} - Système Team Assistant Pro</p>
                        </div>
                        <div className="text-[7px] font-black uppercase tracking-[0.1em] text-primary italic border-b border-primary mb-1 w-fit ml-auto pb-0.5">Document Officiel</div>
                    </footer>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
}