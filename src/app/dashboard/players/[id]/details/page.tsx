
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
  <div className="flex items-start gap-3 mb-4">
    <div className="mt-0.5 bg-slate-50 p-1.5 rounded border border-slate-100 flex items-center justify-center shrink-0">
        <Icon className="h-3.5 w-3.5 text-slate-600" />
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">{label}</p>
      <div className="text-sm font-bold text-slate-800 break-words leading-tight">
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

const toTitleCase = (str: string) => {
  if (!str) return '';
  return str.toLowerCase().split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
};

export default function PlayerDetailsPdfPage(props: { params: Promise<{ id: string }> }) {
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
          if(data.coachId) {
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
                scale: 2, 
                useCORS: true, 
                backgroundColor: '#ffffff', 
                logging: false,
                allowTaint: true
            });
            const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
            const imgWidth = pdf.internal.pageSize.getWidth();
            const imgHeight = (canvas.height * imgWidth) / canvas.width;
            pdf.addImage(canvas.toDataURL('image/png', 1.0), 'PNG', 0, 0, imgWidth, imgHeight);
            pdf.save(`fiche_officielle_${player?.name?.replace(/ /g, "_")}.pdf`);
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
    <div className="bg-slate-100 min-h-screen p-2 sm:p-8">
       <div className="w-full max-w-4xl mx-auto space-y-6">
        <div className="flex justify-between items-center print:hidden">
          <Button variant="outline" size="sm" onClick={() => router.back()}><ArrowLeft className="mr-2 h-4 w-4" /> Retour</Button>
          <Button size="sm" onClick={handleDownloadPdf} disabled={loadingPdf}>
            {loadingPdf ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileDown className="mr-2 h-4 w-4" />}
            <span className="ml-2">Télécharger la Fiche</span>
          </Button>
        </div>

        <div className="w-full overflow-x-auto">
            <div id="printable-details" className="bg-white text-slate-900 border-none flex flex-col mx-auto shadow-xl overflow-hidden" style={{ width: '800px', minHeight: '1120px' }}>
                <header className="p-6 sm:p-10 bg-slate-900 text-white flex flex-col sm:flex-row justify-between items-center gap-6 mb-10">
                    <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 text-center sm:text-left">
                        <div className="h-20 w-24 border-2 border-slate-700 shadow-xl rounded-lg overflow-hidden bg-white flex items-center justify-center shrink-0">
                            {clubLogoUrl ? (
                                <img 
                                    src={clubLogoUrl} 
                                    alt="Logo" 
                                    className="h-full w-full object-contain"
                                />
                            ) : (
                                <div className="h-full w-full bg-primary text-white flex items-center justify-center text-3xl sm:text-4xl font-black">
                                    {clubInitial}
                                </div>
                            )}
                        </div>
                        <div className="space-y-1">
                            <h1 className="text-xl sm:text-2xl font-black uppercase tracking-tighter text-white leading-tight">{clubName}</h1>
                            <div className="text-slate-400 text-[10px] sm:text-sm font-medium leading-tight">
                                <p className="max-w-[350px] break-words">{clubAddress || "Adresse du club"}</p>
                            </div>
                        </div>
                    </div>
                    <div className="text-center sm:text-right space-y-1">
                        <h2 className="text-3xl sm:text-4xl font-black uppercase italic tracking-tight text-white">FICHE</h2>
                        <div className="pt-2">
                            <p className="text-primary font-bold text-[10px] uppercase tracking-widest">OFFICIELLE DU JOUEUR</p>
                            <p className="text-slate-500 text-[10px] sm:text-xs font-semibold">Émise le {format(new Date(), 'dd/MM/yyyy')}</p>
                        </div>
                    </div>
                </header>
                
                <div className="px-6 sm:px-12 pb-12 flex-grow flex flex-col">
                    <section className="flex flex-row items-center gap-10 mb-12 bg-slate-50 p-8 rounded-xl border-2 border-slate-100">
                        <div className="flex flex-col items-center gap-3 shrink-0">
                            <div className="h-32 w-32 border-4 border-white shadow-sm rounded-full overflow-hidden bg-white flex items-center justify-center relative">
                                {player.photoUrl ? <img src={player.photoUrl} alt={player.name} className="h-full w-full object-contain" /> : <AvatarFallback className="text-4xl font-black bg-slate-200 text-slate-400">{playerInitial}</AvatarFallback>}
                            </div>
                            <div className="bg-slate-800 text-white px-3 py-1 rounded-full font-mono text-[9px] font-bold tracking-wider flex items-center gap-1.5 shadow-sm">
                                <Fingerprint className="h-3 w-3 text-primary" />{displayId}
                            </div>
                        </div>
                        <div className="flex-1 min-w-0">
                            <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tight leading-none mb-8 break-words">{player.name}</h1>
                            <div className="grid grid-cols-3 gap-4">
                                <div className="flex flex-col items-center justify-center text-center px-2">
                                    <span className="text-[7px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2">Catégorie</span>
                                    <Badge className="bg-slate-900 text-white text-[10px] px-1 py-1 font-bold uppercase tracking-wider rounded-sm justify-center w-full min-h-[24px] border-none shadow-sm flex items-center">{player.category}</Badge>
                                </div>
                                <div className="flex flex-col items-center justify-center text-center px-2">
                                    <span className="text-[7px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2">Poste de prédilection</span>
                                    <span className="text-slate-700 font-bold text-[10px] uppercase flex items-center justify-center gap-1.5 bg-white px-1 py-1 rounded-sm border border-slate-100 shadow-sm w-full min-h-[24px]"><Star className="h-3 w-3 text-primary fill-primary" /> {player.position || "Joueur"}</span>
                                </div>
                                <div className="flex flex-col items-center justify-center text-center px-2">
                                    <span className="text-[7px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2">Numéro de Maillot</span>
                                    <span className="bg-primary text-white px-1 py-0.5 rounded-sm font-black text-lg shadow-sm italic text-center w-full min-h-[24px] flex items-center justify-center">#{player.number || "--"}</span>
                                </div>
                            </div>
                        </div>
                    </section>

                    <main className="flex flex-row gap-12 flex-grow">
                        <div className="w-1/2 space-y-10">
                            <div>
                                <SectionTitle title="État Civil & Contact" icon={User} />
                                <DetailItem icon={Cake} label="Date de naissance" value={player.birthDate ? format(new Date(player.birthDate), 'dd MMMM yyyy', { locale: fr }) : undefined} />
                                <DetailItem icon={VenetianMask} label="Genre" value={player.gender} />
                                <DetailItem icon={Flag} label="Nationalité" value={player.nationality} />
                                <DetailItem icon={Fingerprint} label="N° CIN" value={player.cin} />
                                <DetailItem icon={Mail} label="Email" value={player.email} />
                                <DetailItem icon={Phone} label="Téléphone" value={player.phone} />
                                <DetailItem icon={MapPin} label="Adresse" value={player.address} />
                            </div>
                        </div>
                        <div className="w-1/2 space-y-10">
                            <div>
                                <SectionTitle title="Parcours Sportif" icon={Shield} />
                                <DetailItem icon={Star} label="Poste de prédilection" value={player.position} />
                                <DetailItem icon={ClipboardList} label="Entraîneur Responsable" value={player.coachName ? toTitleCase(player.coachName) : "Non assigné"} />
                                <DetailItem icon={LogIn} label="Date d'intégration" value={player.entryDate ? format(new Date(player.entryDate), 'dd/MM/yyyy', { locale: fr }) : undefined} />
                                <DetailItem icon={LogOut} label="Fin de mission" value={player.exitDate ? format(new Date(player.exitDate), 'dd/MM/yyyy', { locale: fr }) : "En cours"} />
                            </div>
                            {player.tutorName && (
                                <div className="pt-4">
                                    <SectionTitle title="Responsable Légal" icon={VenetianMask} />
                                    <DetailItem icon={User} label="Nom du tuteur" value={toTitleCase(player.tutorName)} />
                                    <DetailItem icon={Fingerprint} label="N° CIN Tuteur" value={player.tutorCin} />
                                    <DetailItem icon={Phone} label="Contact d'urgence" value={player.tutorPhone} />
                                </div>
                            )}
                        </div>
                    </main>

                    {player.documents && player.documents.length > 0 && (
                        <div className="mb-10">
                            <SectionTitle title="Documents Numérisés" icon={Shield} />
                            <div className="grid grid-cols-2 gap-4">
                                {player.documents.map((doc: any, i: number) => (
                                    <div key={i} className="flex items-center gap-3 p-3 border rounded-lg bg-slate-50">
                                        <div className="bg-primary/10 p-1.5 rounded"><Shield className="h-3.5 w-3.5 text-primary" /></div>
                                        <div>
                                            <p className="text-[10px] font-bold text-slate-800 uppercase">{doc.name}</p>
                                            {doc.validityDate && <p className="text-[8px] text-slate-400 font-bold uppercase">Expire le : {format(new Date(doc.validityDate), 'dd/MM/yyyy')}</p>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <footer className="mt-auto pt-8 border-t-2 border-slate-100 flex flex-row justify-between items-end gap-10">
                        <div className="space-y-3"><div className="flex items-center gap-2 text-slate-300"><ShieldCheck className="h-4 w-4" /><span className="text-[9px] font-black uppercase tracking-wider italic">Certification électronique administrative</span></div><p className="text-[8px] font-bold text-slate-400 uppercase">© {new Date().getFullYear()} {clubName} - Système Team Assistant</p></div>
                        <div className="text-center"><p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-16">Cachet du Club & Signature</p><div className="w-40 border-b-2 border-slate-200"></div></div>
                    </footer>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
}
