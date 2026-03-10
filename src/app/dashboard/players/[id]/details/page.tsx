
"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, User, Phone, Mail, Home, Flag, Shirt, Cake, Shield, Star, ClipboardList, LogIn, LogOut, FileDown, Fingerprint, VenetianMask, MapPin, ShieldCheck } from "lucide-react";
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { Badge } from "@/components/ui/badge";

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


export default function PlayerDetailsPdfPage(props: { params: Promise<{ id: string }>, searchParams: Promise<any> }) {
  const { params: paramsPromise } = props;
  const params = React.use(paramsPromise);
  const playerId = params.id;
  const router = useRouter();
  const [user, loadingUser] = useAuthState(auth);
  
  const [player, setPlayer] = useState<any>(null);
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
        if (clubDoc.exists() && clubDoc.data().clubName) {
          setClubName(clubDoc.data().clubName);
          setClubLogoUrl(clubDoc.data().logoUrl || null);
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
  
  const handleDownloadPdf = () => {
    setLoadingPdf(true);
    const cardElement = document.getElementById("printable-details");
    if (cardElement) {
        const originalWidth = cardElement.style.width;
        cardElement.style.width = '800px';

        html2canvas(cardElement, {
            scale: 2,
            useCORS: true,
            backgroundColor: '#ffffff',
            logging: false
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
            pdf.save(`fiche_officielle_${player?.name?.replace(/ /g, "_")}.pdf`);
        }).finally(() => {
            if (cardElement) {
                cardElement.style.width = originalWidth;
            }
            setLoadingPdf(false);
        });
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
  const displayId = player.professionalId || `PL-REF-${player.id.substring(0, 4).toUpperCase()}`;


  return (
    <div className="bg-slate-100 min-h-screen p-4 sm:p-8">
       <div className="w-full max-w-4xl mx-auto space-y-6">
        <div className="flex justify-between items-center print:hidden">
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Retour
          </Button>
          <Button onClick={handleDownloadPdf} disabled={loadingPdf}>
            {loadingPdf ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Génération...
              </>
            ) : (
              <>
                <FileDown className="mr-2 h-4 w-4" />
                Télécharger la Fiche
              </>
            )}
          </Button>
        </div>

        <div id="printable-details" className="bg-white p-12 text-slate-900 border-t-8 border-primary flex flex-col mx-auto" style={{ width: '800px', minHeight: '1120px' }}>
            
            <header className="flex flex-row justify-between items-start mb-10 border-b-2 border-slate-100 pb-6">
                 <div className="flex items-center gap-5">
                    <div className="h-16 w-16 border-2 border-slate-200 rounded-lg overflow-hidden bg-white flex items-center justify-center p-1 shrink-0">
                        {clubLogoUrl ? (
                            <img src={clubLogoUrl} alt="Logo" className="h-full w-full object-contain" />
                        ) : (
                            <div className="h-full w-full bg-primary text-white flex items-center justify-center text-2xl font-black">{clubInitial}</div>
                        )}
                    </div>
                    <div>
                        <h1 className="text-xl font-black uppercase tracking-tight text-slate-900 leading-none mb-1">{clubName}</h1>
                        <p className="text-primary font-bold text-[10px] uppercase tracking-widest">Fiche Officielle du Joueur</p>
                    </div>
                </div>
                <div className="text-right">
                    <div className="border-2 border-slate-800 px-3 py-1.5 rounded-md mb-1 inline-block bg-white shadow-sm">
                        <p className="text-[8px] font-black uppercase text-slate-600 tracking-wider mb-0.5">Identifiant Unique</p>
                        <p className="text-xs font-mono font-bold text-primary">{displayId}</p>
                    </div>
                    <p className="text-[9px] font-semibold text-slate-400 uppercase">Document émis le {format(new Date(), 'dd/MM/yyyy')}</p>
                </div>
            </header>
            
            <section className="flex flex-row items-center gap-10 mb-12 bg-slate-50 p-8 rounded-xl border-2 border-slate-100">
                 <div className="relative">
                    <Avatar className="h-32 w-32 border-4 border-white shadow-md">
                        <AvatarImage src={player.photoUrl} alt={player.name} className="object-cover" />
                        <AvatarFallback className="text-5xl font-black bg-slate-200 text-slate-400">{playerInitial}</AvatarFallback>
                    </Avatar>
                    <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-primary text-white text-[9px] font-black uppercase px-3 py-1 rounded-full border-2 border-white shadow-sm">
                        {player.status}
                    </div>
                </div>
                <div className="space-y-3">
                    <h1 className="text-4xl font-black text-slate-900 uppercase tracking-tighter leading-none">{player.name}</h1>
                    <div className="flex items-center gap-3">
                        <Badge className="bg-slate-800 text-white text-[10px] px-2.5 py-0.5 font-bold uppercase tracking-wider">{player.category}</Badge>
                        <span className="text-slate-500 font-bold text-xs uppercase flex items-center gap-1.5">
                            <Star className="h-3.5 w-3.5 text-primary fill-primary" /> {player.position || "N/A"}
                        </span>
                        {player.number && (
                            <span className="bg-primary/10 text-primary px-2.5 py-0.5 rounded font-black text-xs">MAILLOT #{player.number}</span>
                        )}
                    </div>
                    <div className="flex items-center gap-2 text-primary font-mono text-[10px] bg-white w-fit px-2 py-0.5 rounded border-2 border-slate-800 font-bold shadow-sm">
                        <Fingerprint className="h-3 w-3" />
                        {displayId}
                    </div>
                </div>
            </section>

            <main className="flex flex-row gap-12 flex-grow">
                {/* COLUMN LEFT: PERSO & CONTACT */}
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

                {/* COLUMN RIGHT: SPORT & TUTOR */}
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

            <footer className="mt-12 pt-8 border-t-2 border-slate-100 flex flex-row justify-between items-end">
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
  );
}
