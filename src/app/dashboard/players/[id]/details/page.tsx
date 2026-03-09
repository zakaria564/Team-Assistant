
"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, User, Phone, Mail, Home, Flag, Shirt, Cake, Shield, Star, ClipboardList, LogIn, LogOut, FileDown, Fingerprint, VenetianMask } from "lucide-react";
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { Separator } from "@/components/ui/separator";

const DetailItem = ({ icon: Icon, label, value, href, children }: { icon: React.ElementType, label: string, value?: string, href?: string, children?: React.ReactNode }) => (
  <div className="flex items-start gap-3 break-inside-avoid">
    <Icon className="h-5 w-5 text-muted-foreground mt-1" />
    <div>
      <p className="text-sm text-muted-foreground">{label}</p>
      <div className="text-base font-medium text-gray-800">
        {href ? (
          <a href={href} target="_blank" rel="noopener noreferrer" className="hover:underline text-primary">
            {value || children}
          </a>
        ) : (
          value || children || "Non spécifié"
        )}
      </div>
    </div>
  </div>
);

const SectionTitle = ({ title }: { title: string }) => (
    <h2 className="text-lg font-semibold text-gray-800 border-b-2 border-primary/20 pb-2 mb-4 col-span-full">{title}</h2>
);

const toTitleCase = (str: string) => {
  if (!str) return '';
  return str.toLowerCase().split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
};


export default function PlayerDetailsPdfPage({ params, searchParams }: { params: Promise<{ id: string }>, searchParams: Promise<any> }) {
  const { id: playerId } = React.use(params);
  const _sParams = React.use(searchParams);
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
            pdf.save(`fiche_details_${player?.name?.replace(/ /g, "_")}.pdf`);
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
    <div className="bg-muted/40 min-h-screen p-4 sm:p-8">
       <div className="w-full max-w-4xl mx-auto space-y-4">
        <div className="flex justify-between items-center print:hidden">
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Retour
          </Button>
          <Button onClick={handleDownloadPdf} disabled={loadingPdf}>
            {loadingPdf ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Chargement...
              </>
            ) : (
              <>
                <FileDown className="mr-2 h-4 w-4" />
                Télécharger
              </>
            )}
          </Button>
        </div>

        <div id="printable-details" className="bg-white p-6 sm:p-8 rounded-lg shadow-sm text-gray-900">
            {/* Header */}
            <header className="flex flex-col sm:flex-row justify-between items-start pb-6 mb-6 border-b-2 border-gray-200">
                 <div className="flex items-center gap-4">
                    <Avatar className="h-12 w-12">
                        <AvatarImage src={clubLogoUrl || ''} alt={clubName} />
                        <AvatarFallback className="text-xl">{clubInitial}</AvatarFallback>
                    </Avatar>
                    <div>
                        <h1 className="text-2xl font-bold text-primary">{toTitleCase(clubName)}</h1>
                        <p className="text-muted-foreground text-sm">Fiche d'information du joueur</p>
                    </div>
                </div>
                <div className="text-left sm:text-right mt-4 sm:mt-0">
                    <p className="text-xs font-mono font-bold text-primary">ID: {player.professionalId || "N/A"}</p>
                    <p className="text-sm">Généré le: {format(new Date(), 'dd/MM/yyyy')}</p>
                </div>
            </header>
            
            {/* Player Info Header */}
            <section className="flex flex-col sm:flex-row items-center gap-6 pb-6">
                 <Avatar className="h-32 w-32 border-4 border-primary shadow-md">
                    <AvatarImage src={player.photoUrl} alt={player.name} />
                    <AvatarFallback className="text-5xl">{playerInitial}</AvatarFallback>
                </Avatar>
                <div className="text-center sm:text-left">
                    <h1 className="text-4xl font-bold text-gray-800">{toTitleCase(player.name)}</h1>
                    <Badge variant="outline" className="mt-2 font-mono">{player.professionalId || "N/A"}</Badge>
                </div>
            </section>
            
            <Separator className="my-6" />

            {/* Main Content */}
            <main className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                    <SectionTitle title="Informations Personnelles" />
                    <DetailItem icon={User} label="Nom complet" value={toTitleCase(player.name)} />
                    <DetailItem icon={Cake} label="Date de naissance" value={player.birthDate ? format(new Date(player.birthDate), 'dd/MM/yyyy', { locale: fr }) : undefined} />
                    <DetailItem icon={VenetianMask} label="Genre" value={player.gender} />
                    <DetailItem icon={Flag} label="Nationalité" value={player.nationality} />
                    <DetailItem icon={Fingerprint} label="N° CIN" value={player.cin} />
                    <DetailItem icon={Home} label="Adresse" value={player.address} />
                    <DetailItem icon={Phone} label="Téléphone" value={player.phone} />
                    <DetailItem icon={Mail} label="Email" value={player.email}/>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                    <SectionTitle title="Informations Sportives" />
                    <DetailItem icon={Shield} label="Catégorie" value={player.category} />
                    <DetailItem icon={Star} label="Poste Principal" value={player.position} />
                    <DetailItem icon={Shirt} label="Numéro de maillot" value={player.number?.toString()} />
                    <DetailItem icon={ClipboardList} label="Entraîneur assigné" value={player.coachName ? toTitleCase(player.coachName) : undefined} />
                    <DetailItem icon={LogIn} label="Date d'entrée au club" value={player.entryDate ? format(new Date(player.entryDate), 'dd/MM/yyyy', { locale: fr }) : undefined} />
                    <DetailItem icon={LogOut} label="Date de sortie du club" value={player.exitDate ? format(new Date(player.exitDate), 'dd/MM/yyyy', { locale: fr }) : undefined} />
                </div>
            </main>
        </div>
      </div>
    </div>
  );
}
