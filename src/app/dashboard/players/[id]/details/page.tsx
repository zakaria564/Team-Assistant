
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

  useEffect(() => {
    if (!playerId) return;

    const fetchPlayerAndClub = async () => {
      if (!user && !loadingUser) {
        setLoading(false);
        return;
      }
      if (!user) return;

      setLoading(true);
      try {
        const playerRef = doc(db, "players", playerId);
        const playerSnap = await getDoc(playerRef);

        if (playerSnap.exists()) {
          const playerData = { id: playerSnap.id, ...playerSnap.data() };
          if(playerData.coachId) {
            const coachRef = doc(db, "coaches", playerData.coachId);
            const coachSnap = await getDoc(coachRef);
            if(coachSnap.exists()) {
              playerData.coachName = coachSnap.data().name;
            }
          }
          setPlayer(playerData);
        } else {
          router.push("/dashboard/players");
        }
        
        const clubDocRef = doc(db, "clubs", user.uid);
        const clubDoc = await getDoc(clubDocRef);
        if (clubDoc.exists()) {
          const clubData = clubDoc.data();
          setClubName(clubData.clubName || "Votre Club");
          setClubLogoUrl(clubData.logoUrl || null);
        }

      } catch (error) {
        console.error("Error fetching player:", error);
        router.push("/dashboard/players");
      } finally {
        setLoading(false);
      }
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
                return new Promise((resolve) => {
                    img.onload = resolve;
                    img.onerror = resolve; 
                });
            }));

            await new Promise(r => setTimeout(r, 1500));

            const canvas = await html2canvas(element, {
                scale: 2,
                useCORS: true,
                allowTaint: true,
                backgroundColor: '#ffffff',
                logging: false,
            });

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
            pdf.addImage(canvas.toDataURL('image/png', 1.0), 'PNG', x, 0, imgWidth, imgHeight);
            pdf.save(`fiche_officielle_${player?.name?.replace(/ /g, "_")}.pdf`);
        } catch (err) {
            console.error("Erreur PDF:", err);
            toast({ variant: "destructive", title: "Erreur", description: "Impossible de générer le PDF." });
        } finally {
            setLoadingPdf(false);
        }
    }
  };

  if (loading || loadingUser) {
    return (
      <div className="flex justify-center items-center h-screen bg-slate-50">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!player) return null;
  
  const playerInitial = player.name?.charAt(0)?.toUpperCase() || "P";
  const clubInitial = clubName?.charAt(0)?.toUpperCase() || "C";
  const displayId = player.professionalId || `PL-REF-${player.id.substring(0, 6).toUpperCase()}`;

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
            <div id="printable-details" className="bg-white p-6 sm:p-12 text-slate-900 border-t-8 border-primary flex flex-col mx-auto shadow-xl min-w-[320px]" style={{ width: '800px', minHeight: '1120px' }}>
                
                <header className="flex flex-row justify-between items-start mb-10 border-b-2 border-slate-100 pb-6">
                    <div className="flex items-center gap-3 sm:gap-5">
                        <div className="h-12 w-12 sm:h-16 sm:w-16 border-2 border-slate-200 rounded-lg overflow-hidden bg-white flex items-center justify-center p-1 shrink-0">
                            {clubLogoUrl ? (
                                <img src={clubLogoUrl} alt="Logo" className="h-full w-full object-contain" />
                            ) : (
                                <div className="h-full w-full bg-primary text-white flex items-center justify-center text-xl sm:text-2xl font-black">{clubInitial}</div>
                            )}
                        </div>
                        <div>
                            <h1 className="text-base sm:text-xl font-black uppercase tracking-tight text-slate-900 leading-none mb-1">{clubName}</h1>
                            <p className="text-primary font-bold tracking-widest text-[8px] sm:text-[10px] uppercase">Fiche Officielle du Joueur</p>
                        </div>
                    </div>
                    <div className="text-right hidden sm:block">
                        <p className="text-[9px] font-semibold text-slate-400 uppercase">Document émis le {format(new Date(), 'dd/MM/yyyy')}</p>
                    </div>
                </header>
                
                <section className="flex flex-row items-center gap-10 mb-12 bg-slate-50 p-8 rounded-xl border-2 border-slate-100">
                    <div className="flex flex-col items-center gap-3 shrink-0">
                        <div className="h-32 w-32 border-4 border-white shadow-sm rounded-full overflow-hidden bg-white flex items-center justify-center relative">
                            {player.photoUrl ? (
                                <img src={player.photoUrl} alt={player.name} className="h-full w-full object-contain" />
                            ) : (
                                <AvatarFallback className="text-4xl font-black bg-slate-200 text-slate-400">{playerInitial}</AvatarFallback>
                            )}
                        </div>
                        <div className="bg-slate-800 text-white px-3 py-1 rounded-full font-mono text-[9px] font-bold tracking-wider flex items-center gap-1.5 shadow-sm">
                            <Fingerprint className="h-3 w-3 text-primary" />
                            {displayId}
                        </div>
                    </div>
                    <div className="flex-1 min-w-0">
                        <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight leading-tight mb-8">
                            {player.name}
                        </h1>
                        <div className="grid grid-cols-3 divide-x-2 divide-slate-200">
                            <div className="flex flex-col items-center justify-center px-2 text-center">
                                <span className="text-[7px] font-black uppercase tracking-widest text-slate-400 mb-2">Catégorie</span>
                                <Badge className="bg-slate-900 text-white text-[10px] px-4 py-1 font-bold uppercase tracking-wider rounded-sm justify-center min-w-[100px] flex items-center border-none">
                                    {player.category}
                                </Badge>
                            </div>
                            <div className="flex flex-col items-center justify-center px-2 text-center">
                                <span className="text-[7px] font-black uppercase tracking-widest text-slate-400 mb-2">Poste</span>
                                <span className="text-slate-700 font-bold text-[10px] uppercase flex items-center justify-center gap-1.5 bg-white px-4 py-1 rounded-sm border border-slate-100 shadow-sm min-w-[100px]">
                                    <Star className="h-3 w-3 text-primary fill-primary" /> {player.position || "Joueur"}
                                </span>
                            </div>
                            <div className="flex flex-col items-center justify-center px-2 text-center">
                                <span className="text-[7px] font-black uppercase tracking-widest text-slate-400 mb-2">Numéro</span>
                                <span className="bg-primary text-white px-6 py-0.5 rounded-sm font-black text-lg shadow-sm italic text-center min-w-[60px] flex items-center justify-center">
                                    #{player.number || "--"}
                                </span>
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
                            <DetailItem icon={Mail} label="Email personnel" value={player.email} />
                            <DetailItem icon={Phone} label="Téléphone mobile" value={player.phone} />
                            <DetailItem icon={MapPin} label="Adresse Résidentielle" value={player.address} />
                        </div>
                    </div>

                    <div className="w-1/2 space-y-10">
                        <div>
                            <SectionTitle title="Parcours Sportif" icon={Shield} />
                            <DetailItem icon={Star} label="Poste de prédilection" value={player.position} />
                            <DetailItem icon={ClipboardList} label="Coach référent" value={player.coachName ? toTitleCase(player.coachName) : "Non assigné"} />
                            <DetailItem icon={LogIn} label="Date d'intégration" value={player.entryDate ? format(new Date(player.entryDate), 'dd/MM/yyyy', { locale: fr }) : undefined} />
                            <DetailItem icon={LogOut} label="Fin de validité" value={player.exitDate ? format(new Date(player.exitDate), 'dd/MM/yyyy', { locale: fr }) : "Non renseignée"} />
                        </div>

                        {player.tutorName && (
                            <div className="pt-4">
                                <SectionTitle title="Responsable Légal" icon={VenetianMask} />
                                <DetailItem icon={User} label="Nom du tuteur" value={toTitleCase(player.tutorName)} />
                                <DetailItem icon={Fingerprint} label="N° CIN du tuteur" value={player.tutorCin} />
                                <DetailItem icon={Phone} label="Téléphone d'urgence" value={player.tutorPhone} />
                                <DetailItem icon={Mail} label="Email de contact" value={player.tutorEmail} />
                            </div>
                        )}
                    </div>
                </main>

                <footer className="mt-auto pt-8 border-t-2 border-slate-100 flex flex-row justify-between items-end gap-10">
                    <div className="space-y-3">
                        <div className="flex items-center gap-2 text-slate-300">
                            <ShieldCheck className="h-4 w-4" />
                            <span className="text-[9px] font-black uppercase tracking-wider italic">Certification électronique par l'administration</span>
                        </div>
                        <p className="text-[8px] font-bold text-slate-400 uppercase">© {new Date().getFullYear()} {clubName} - Système Team Assistant</p>
                    </div>
                    <div className="text-center">
                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-16">Cachet du Club & Signature</p>
                        <div className="w-40 border-b-2 border-slate-200"></div>
                    </div>
                </footer>
            </div>
        </div>
      </div>
    </div>
  );
}
