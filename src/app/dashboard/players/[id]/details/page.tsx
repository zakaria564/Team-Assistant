
"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, ArrowLeft, User, Phone, Mail, Home, Flag, Shirt, Cake, Shield, Star, ClipboardList, LogIn, LogOut, FileDown, Fingerprint, VenetianMask } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

type PlayerStatus = "Actif" | "Inactif" | "Blessé" | "Suspendu";

interface Player {
  id: string;
  name: string;
  gender: "Masculin" | "Féminin";
  category: string;
  number: number;
  status: PlayerStatus;
  photoUrl?: string;
  position?: string;
  birthDate?: string;
  address?: string;
  nationality?: string;
  cin?: string;
  phone?: string;
  email?: string;
  tutorName?: string;
  tutorCin?: string;
  tutorPhone?: string;
  tutorEmail?: string;
  coachId?: string;
  coachName?: string;
  entryDate?: string;
  exitDate?: string;
}

const DetailItem = ({ icon: Icon, label, value, href, children }: { icon: React.ElementType, label: string, value?: string, href?: string, children?: React.ReactNode }) => (
  <div className="flex items-start gap-3 break-inside-avoid">
    <Icon className="h-5 w-5 text-muted-foreground mt-1" />
    <div>
      <p className="text-sm text-muted-foreground">{label}</p>
      <div className="text-base font-medium">
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

const getStatusBadgeClass = (status?: PlayerStatus) => {
    switch (status) {
        case 'Actif': return 'bg-green-100 text-green-800 border-green-300';
        case 'Inactif': return 'bg-gray-100 text-gray-800 border-gray-300';
        case 'Blessé': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
        case 'Suspendu': return 'bg-red-100 text-red-800 border-red-300';
        default: return '';
    }
}

export default function PlayerDetailsPdfPage({ params }: { params: { id: string } }) {
  const { id: playerId } = React.use(params);
  const router = useRouter();
  
  const [player, setPlayer] = useState<Player | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingPdf, setLoadingPdf] = useState(false);

  useEffect(() => {
    if (!playerId) return;

    const fetchPlayer = async () => {
      setLoading(true);
      try {
        const playerRef = doc(db, "players", playerId as string);
        const playerSnap = await getDoc(playerRef);

        if (playerSnap.exists()) {
          const playerData = { id: playerSnap.id, ...playerSnap.data() } as Player;
          
          if(playerData.coachId) {
            const coachRef = doc(db, "coaches", playerData.coachId);
            const coachSnap = await getDoc(coachRef);
            if(coachSnap.exists()) {
              playerData.coachName = coachSnap.data().name;
            }
          }
          
          setPlayer(playerData);
        } else {
          console.log("No such document!");
          router.push("/dashboard/players");
        }
      } catch (error) {
        console.error("Error fetching player:", error);
        router.push("/dashboard/players");
      } finally {
        setLoading(false);
      }
    };

    fetchPlayer();
  }, [playerId, router]);
  
  const handleDownloadPdf = () => {
    setLoadingPdf(true);
    const cardElement = document.getElementById("printable-details");
    if (cardElement) {
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
        const canvasWidth = canvas.width;
        const canvasHeight = canvas.height;
        const ratio = canvasWidth / canvasHeight;

        let imgWidth = pdfWidth - 40;
        let imgHeight = imgWidth / ratio;
        
        if (imgHeight > pdfHeight - 40) {
            imgHeight = pdfHeight - 40;
            imgWidth = imgHeight * ratio;
        }

        const x = (pdfWidth - imgWidth) / 2;
        const y = 20;

        pdf.addImage(imgData, 'PNG', x, y, imgWidth, imgHeight);
        pdf.save(`fiche_details_${player?.name?.replace(/ /g, "_")}.pdf`);
      }).finally(() => {
        setLoadingPdf(false);
      });
    } else {
      console.error("Element to print not found.");
      setLoadingPdf(false);
    }
  };


  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-muted/40">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!player) {
    return (
      <div className="text-center p-8">
        <p>Joueur non trouvé.</p>
        <Button onClick={() => router.back()} className="mt-4">Retour</Button>
      </div>
    );
  }
  
  const playerInitial = player.name?.charAt(0)?.toUpperCase() || "P";

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
                Téléchargement...
              </>
            ) : (
              <>
                <FileDown className="mr-2 h-4 w-4" />
                Télécharger en PDF
              </>
            )}
          </Button>
        </div>

        <div id="printable-details" className="bg-white p-6 sm:p-8 rounded-lg shadow-sm">
            <header className="flex flex-col sm:flex-row items-center gap-6 pb-6 border-b">
                 <Avatar className="h-32 w-32 border-4 border-primary">
                    <AvatarImage src={player.photoUrl} alt={player.name} />
                    <AvatarFallback className="text-5xl">{playerInitial}</AvatarFallback>
                </Avatar>
                <div className="text-center sm:text-left">
                    <h1 className="text-3xl font-bold text-gray-900">{player.name}</h1>
                    <Badge className={cn("text-base mt-2", getStatusBadgeClass(player.status))}>
                        {player.status}
                    </Badge>
                </div>
            </header>

            <main className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-6">
                <div className="md:col-span-1 space-y-6">
                    <Card className="shadow-none border-gray-200">
                        <CardHeader>
                            <CardTitle className="text-xl">Informations Sportives</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <DetailItem icon={Shield} label="Catégorie" value={player.category} />
                            <DetailItem icon={Star} label="Poste" value={player.position} />
                            <DetailItem icon={Shirt} label="Numéro" value={player.number?.toString()} />
                            <DetailItem icon={ClipboardList} label="Entraîneur" value={player.coachName} />
                            <DetailItem icon={LogIn} label="Date d'entrée" value={player.entryDate ? format(new Date(player.entryDate), 'dd/MM/yyyy') : undefined} />
                            <DetailItem icon={LogOut} label="Date de sortie" value={player.exitDate ? format(new Date(player.exitDate), 'dd/MM/yyyy') : undefined} />
                        </CardContent>
                    </Card>
                </div>
                <div className="md:col-span-2 space-y-6">
                    <Card className="shadow-none border-gray-200">
                        <CardHeader>
                            <CardTitle className="text-xl">Informations Personnelles</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4 columns-1 sm:columns-2">
                            <DetailItem icon={User} label="Nom complet" value={player.name} />
                            <DetailItem icon={Cake} label="Date de naissance" value={player.birthDate ? format(new Date(player.birthDate), 'dd/MM/yyyy') : undefined} />
                            <DetailItem icon={VenetianMask} label="Genre" value={player.gender} />
                            <DetailItem icon={Flag} label="Nationalité" value={player.nationality} />
                            <DetailItem icon={Fingerprint} label="N° CIN" value={player.cin} />
                            <DetailItem icon={Home} label="Adresse" value={player.address} />
                            <DetailItem icon={Phone} label="Téléphone" value={player.phone} />
                            <DetailItem icon={Mail} label="Email" value={player.email}/>
                        </CardContent>
                    </Card>
                     <Card className="shadow-none border-gray-200 break-inside-avoid-page">
                        <CardHeader>
                            <CardTitle className="text-xl">Informations du Tuteur</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4 columns-1 sm:columns-2">
                            <DetailItem icon={User} label="Nom du tuteur" value={player.tutorName} />
                            <DetailItem icon={Fingerprint} label="N° CIN Tuteur" value={player.tutorCin} />
                            <DetailItem icon={Phone} label="Téléphone du tuteur" value={player.tutorPhone} />
                            <DetailItem icon={Mail} label="Email du tuteur" value={player.tutorEmail} />
                        </CardContent>
                    </Card>
                </div>
            </main>
        </div>
      </div>

       <style jsx global>{`
            @media print {
                body {
                    background-color: #fff !important;
                }
                .print\\:hidden {
                    display: none;
                }
            }
            .break-inside-avoid {
                break-inside: avoid;
            }
            .break-inside-avoid-page {
                break-inside: avoid-page;
            }
        `}</style>
    </div>
  );
}
