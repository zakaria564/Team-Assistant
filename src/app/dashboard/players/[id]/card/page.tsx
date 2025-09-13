
"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, Download, Trophy, User, Shirt, Shield, Star, Cake, Flag, Phone, Mail, Home, Fingerprint } from "lucide-react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface Player {
  id: string;
  name: string;
  category: string;
  number: number;
  photoUrl?: string;
  position?: string;
  birthDate?: string;
  nationality?: string;
  cin?: string;
  phone?: string;
  email?: string;
  address?: string;
}

export default function PlayerCardPdfPage({ params }: { params: { id: string } }) {
  const { id: playerId } = React.use(params);
  const router = useRouter();
  const [user, loadingUser] = useAuthState(auth);
  const [player, setPlayer] = useState<Player | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingPdf, setLoadingPdf] = useState(false);
  const [clubName, setClubName] = useState("Votre Club");

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
        const playerRef = doc(db, "players", playerId as string);
        const playerSnap = await getDoc(playerRef);

        if (playerSnap.exists()) {
          setPlayer({ id: playerSnap.id, ...playerSnap.data() } as Player);
        } else {
          console.error("Player not found");
          router.push("/dashboard/players");
        }

        const clubDocRef = doc(db, "clubs", user.uid);
        const clubDoc = await getDoc(clubDocRef);
        if (clubDoc.exists() && clubDoc.data().clubName) {
          setClubName(clubDoc.data().clubName);
        }

      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPlayerAndClub();
  }, [playerId, user, loadingUser, router]);

  const handleDownloadPdf = () => {
    setLoadingPdf(true);
    const cardElement = document.getElementById("printable-card");
    if (cardElement) {
      html2canvas(cardElement, {
        scale: 2.5, // Increase scale for better quality
        useCORS: true,
        backgroundColor: '#ffffff',
      }).then((canvas) => {
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF({
          orientation: 'portrait',
          unit: 'mm',
          format: 'a6' // A6 is a good size for a player card
        });

        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        pdf.save(`carte-${player?.name?.replace(/ /g, "_")}.pdf`);
      }).finally(() => {
        setLoadingPdf(false);
      });
    } else {
      console.error("Element to print not found.");
      setLoadingPdf(false);
    }
  };

  if (loading || loadingUser) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }
  
  if (!player) {
     return (
      <div className="flex justify-center items-center h-screen">
        <p>Joueur non trouvé.</p>
      </div>
    );
  }
  
  const playerInitial = player.name?.charAt(0)?.toUpperCase() || "J";


  return (
    <div className="bg-background">
      <div className="w-full max-w-sm mx-auto space-y-4 py-4 px-2">
         <div className="flex justify-between items-center">
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
                <Download className="mr-2 h-4 w-4" />
                Télécharger
              </>
            )}
          </Button>
        </div>

        <div id="printable-card" className="w-full aspect-[1/1.414] bg-white text-black shadow-lg rounded-xl overflow-hidden flex flex-col">
            {/* Header */}
            <header className="bg-primary text-primary-foreground p-3 text-center">
                <div className="flex items-center justify-center gap-2">
                    <Trophy className="h-6 w-6" />
                    <h1 className="font-bold text-xl">{clubName}</h1>
                </div>
            </header>

            {/* Body */}
            <div className="p-4 flex-grow flex flex-col items-center justify-center gap-3">
                <Avatar className="h-28 w-28 border-4 border-primary shadow-md">
                    <AvatarImage src={player.photoUrl} alt={player.name} />
                    <AvatarFallback className="text-4xl">{playerInitial}</AvatarFallback>
                </Avatar>
                <div className="text-center">
                    <h2 className="text-2xl font-bold leading-tight">{player.name}</h2>
                    <p className="text-md font-semibold text-primary">{player.position || "Poste non spécifié"}</p>
                </div>

                 <div className="w-full grid grid-cols-2 gap-3 text-xs mt-3">
                    <div className="flex items-center gap-2">
                        <Shirt className="h-4 w-4 text-primary/80"/>
                        <div>
                            <p className="font-semibold">Numéro</p>
                            <p className="text-sm text-black/80">{player.number}</p>
                        </div>
                    </div>
                     <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4 text-primary/80"/>
                        <div>
                            <p className="font-semibold">Catégorie</p>
                            <p className="text-sm text-black/80">{player.category}</p>
                        </div>
                    </div>
                     <div className="flex items-center gap-2">
                        <Cake className="h-4 w-4 text-primary/80"/>
                        <div>
                            <p className="font-semibold">Date de naissance</p>
                            <p className="text-sm text-black/80">{player.birthDate ? format(new Date(player.birthDate), "dd/MM/yyyy", { locale: fr }) : 'N/A'}</p>
                        </div>
                    </div>
                     <div className="flex items-center gap-2">
                        <Flag className="h-4 w-4 text-primary/80"/>
                        <div>
                            <p className="font-semibold">Nationalité</p>
                            <p className="text-sm text-black/80">{player.nationality || "N/A"}</p>
                        </div>
                    </div>
                </div>

            </div>

            {/* Footer */}
            <footer className="bg-muted p-2 text-center text-xs text-black/60 mt-auto">
                <p>Saison 2024-2025</p>
            </footer>
        </div>
      </div>
    </div>
  );
}
