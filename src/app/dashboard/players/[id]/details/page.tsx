"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, User, Phone, Mail, Home, Flag, Shirt, Cake, Shield, Star, ClipboardList, LogIn, LogOut, FileDown, Fingerprint, VenetianMask, FileText, Globe, MapPin, ShieldCheck } from "lucide-react";
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

const DetailItem = ({ icon: Icon, label, value, href, children }: { icon: React.ElementType, label: string, value?: string, href?: string, children?: React.ReactNode }) => (
  <div className="flex items-start gap-3 break-inside-avoid">
    <div className="mt-1 bg-primary/5 p-1.5 rounded-md">
        <Icon className="h-4 w-4 text-primary" />
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-0.5">{label}</p>
      <div className="text-sm font-bold text-slate-800 break-words">
        {href ? (
          <span className="text-primary underline decoration-primary/30">
            {value || children}
          </span>
        ) : (
          value || children || "Non spécifié"
        )}
      </div>
    </div>
  </div>
);

const SectionTitle = ({ title, icon: Icon }: { title: string, icon?: React.ElementType }) => (
    <div className="col-span-full mb-4 flex items-center gap-2 border-b-2 border-slate-100 pb-2">
        {Icon && <Icon className="h-5 w-5 text-primary" />}
        <h2 className="text-sm font-black uppercase tracking-[0.15em] text-slate-900">{title}</h2>
    </div>
);

const toTitleCase = (str: string) => {
  if (!str) return '';
  return str.toLowerCase().split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
};


export default function PlayerDetailsPdfPage(props: { params: Promise<{ id: string }>, searchParams: Promise<any> }) {
  const { id: playerId } = React.use(props.params);
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
            const imgData = canvas.toDataURL('image/png');
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
            pdf.addImage(imgData, 'PNG', x, 0, imgWidth, imgHeight);
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
      <div className="flex justify-center items-center h-screen bg-muted/40">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!player) return null;
  
  const playerInitial = player.name?.charAt(0)?.toUpperCase() || "P";
  const clubInitial = clubName?.charAt(0)?.toUpperCase() || "C";


  return (
    <div className="bg-slate-100 min-h-screen p-4 sm:p-8">
       <div className="w-full max-w-4xl mx-auto space-y-6">
        <div className="flex justify-between items-center print:hidden">
          <Button variant="outline" onClick={() => router.back()} className="shadow-sm">
            <ArrowLeft className="mr-2 h-4 w-4" /> Retour
          </Button>
          <Button onClick={handleDownloadPdf} disabled={loadingPdf} className="shadow-md">
            {loadingPdf ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Génération en cours...
              </>
            ) : (
              <>
                <FileDown className="mr-2 h-4 w-4" />
                Télécharger la Fiche Officielle
              </>
            )}
          </Button>
        </div>

        <div id="printable-details" className="bg-white p-10 sm:p-12 shadow-xl text-slate-900 border-t-[12px] border-primary flex flex-col" style={{ minHeight: '1120px' }}>
            {/* OFFICIAL HEADER */}
            <header className="flex flex-row justify-between items-start mb-12 border-b-2 border-slate-100 pb-8">
                 <div className="flex items-center gap-6">
                    <div className="h-20 w-20 border-2 border-slate-100 rounded-xl overflow-hidden bg-white flex items-center justify-center p-1 shrink-0 shadow-sm">
                        {clubLogoUrl ? (
                            <img src={clubLogoUrl} alt="Logo" className="h-full w-full object-contain" />
                        ) : (
                            <div className="h-full w-full bg-primary text-white flex items-center justify-center text-3xl font-black">{clubInitial}</div>
                        )}
                    </div>
                    <div className="space-y-1">
                        <h1 className="text-2xl font-black uppercase tracking-tighter text-slate-900 leading-tight">{clubName}</h1>
                        <p className="text-primary font-black text-xs uppercase tracking-[0.25em] opacity-80">Fiche Officielle du Joueur</p>
                    </div>
                </div>
                <div className="text-right flex flex-col items-end">
                    <div className="bg-slate-900 text-white px-4 py-2 rounded-lg mb-2">
                        <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Identifiant Unique</p>
                        <p className="text-sm font-mono font-bold tracking-tighter">{player.professionalId || "N/A"}</p>
                    </div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Document émis le {format(new Date(), 'dd/MM/yyyy')}</p>
                </div>
            </header>
            
            {/* PLAYER PROFILE HEADER */}
            <section className="flex flex-row items-center gap-10 mb-12 bg-slate-50/50 p-8 rounded-2xl border border-slate-100">
                 <div className="relative shrink-0">
                    <Avatar className="h-40 w-40 border-[6px] border-white shadow-xl">
                        <AvatarImage src={player.photoUrl} alt={player.name} className="object-cover" />
                        <AvatarFallback className="text-6xl font-black bg-slate-200 text-slate-400">{playerInitial}</AvatarFallback>
                    </Avatar>
                    <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-primary text-white text-[10px] font-black uppercase px-4 py-1 rounded-full shadow-lg border-2 border-white">
                        {player.status}
                    </div>
                </div>
                <div className="space-y-2">
                    <h1 className="text-5xl font-black text-slate-900 uppercase tracking-tighter leading-none">{player.name}</h1>
                    <div className="flex items-center gap-4">
                        <Badge className="bg-slate-900 text-white hover:bg-slate-900 text-xs px-3 py-1 font-bold uppercase tracking-widest">{player.category}</Badge>
                        <span className="text-slate-400 font-bold text-xs uppercase tracking-widest flex items-center gap-1">
                            <Star className="h-3 w-3 text-primary fill-primary" /> {player.position || "N/A"}
                        </span>
                        {player.number && (
                            <span className="bg-primary/10 text-primary px-3 py-1 rounded-md text-sm font-black">#{player.number}</span>
                        )}
                    </div>
                </div>
            </section>

            {/* CONTENT GRID */}
            <main className="grid grid-cols-2 gap-x-16 gap-y-12 mb-auto">
                {/* PERSO */}
                <div className="space-y-8">
                    <SectionTitle title="État Civil & Contact" icon={User} />
                    <div className="grid grid-cols-1 gap-y-6">
                        <DetailItem icon={Cake} label="Date de naissance" value={player.birthDate ? format(new Date(player.birthDate), 'dd MMMM yyyy', { locale: fr }) : undefined} />
                        <DetailItem icon={VenetianMask} label="Genre" value={player.gender} />
                        <DetailItem icon={Flag} label="Nationalité" value={player.nationality} />
                        <DetailItem icon={Fingerprint} label="N° CIN" value={player.cin} />
                        <DetailItem icon={Mail} label="Email personnel" value={player.email} />
                        <DetailItem icon={Phone} label="Téléphone" value={player.phone} />
                        <DetailItem icon={MapPin} label="Adresse Résidentielle" value={player.address} />
                    </div>
                </div>

                {/* SPORTIVE */}
                <div className="space-y-8">
                    <SectionTitle title="Parcours Sportif" icon={Shield} />
                    <div className="grid grid-cols-1 gap-y-6">
                        <DetailItem icon={Shield} label="Catégorie actuelle" value={player.category} />
                        <DetailItem icon={Star} label="Poste de prédilection" value={player.position} />
                        <DetailItem icon={Shirt} label="Numéro attribué" value={player.number ? `Maillot n° ${player.number}` : undefined} />
                        <DetailItem icon={ClipboardList} label="Coach référent" value={player.coachName ? toTitleCase(player.coachName) : "Non assigné"} />
                        <DetailItem icon={LogIn} label="Date d'intégration" value={player.entryDate ? format(new Date(player.entryDate), 'dd/MM/yyyy', { locale: fr }) : undefined} />
                        <DetailItem icon={LogOut} label="Fin de contrat" value={player.exitDate ? format(new Date(player.exitDate), 'dd/MM/yyyy', { locale: fr }) : "Indéterminée"} />
                    </div>
                </div>

                {/* TUTOR */}
                {player.tutorName && (
                    <div className="space-y-8">
                        <SectionTitle title="Responsable Légal" icon={VenetianMask} />
                        <div className="grid grid-cols-1 gap-y-6">
                            <DetailItem icon={User} label="Nom du tuteur" value={toTitleCase(player.tutorName)} />
                            <DetailItem icon={Fingerprint} label="N° CIN du tuteur" value={player.tutorCin} />
                            <DetailItem icon={Phone} label="Téléphone d'urgence" value={player.tutorPhone} />
                            <DetailItem icon={Mail} label="Email de contact" value={player.tutorEmail} />
                        </div>
                    </div>
                )}

                {/* DOCUMENTS */}
                {player.documents && player.documents.length > 0 && (
                    <div className="space-y-8">
                        <SectionTitle title="Dossier Administratif" icon={FileText} />
                        <div className="grid grid-cols-1 gap-y-4">
                            {player.documents.map((doc: any, index: number) => (
                                <div key={index} className="flex items-center justify-between p-3 bg-slate-50 border border-slate-100 rounded-lg">
                                    <div className="flex items-center gap-3">
                                        <FileText className="h-4 w-4 text-slate-400" />
                                        <div>
                                            <p className="text-xs font-bold text-slate-700">{doc.name}</p>
                                            {doc.validityDate && (
                                                <p className="text-[9px] font-bold text-primary uppercase">Expire le {format(new Date(doc.validityDate), 'dd/MM/yyyy')}</p>
                                            )}
                                        </div>
                                    </div>
                                    <Badge variant="outline" className="text-[8px] uppercase font-black text-slate-400 border-slate-200">Enregistré</Badge>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </main>

            {/* OFFICIAL FOOTER */}
            <footer className="mt-20 pt-12 border-t-2 border-slate-100 flex flex-row justify-between items-end">
                <div className="space-y-4">
                    <div className="flex items-center gap-2 text-slate-300">
                        <ShieldCheck className="h-5 w-5" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Document certifié par l'administration du club</span>
                    </div>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">© {new Date().getFullYear()} {clubName} - Système Team Assistant</p>
                </div>
                <div className="text-center space-y-16">
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Cachet et Signature</p>
                    <div className="h-20"></div>
                </div>
            </footer>
        </div>
      </div>
    </div>
  );
}
