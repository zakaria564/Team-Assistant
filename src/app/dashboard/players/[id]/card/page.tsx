
"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
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
  const router = useRouter();
  const { id: playerId } = params;
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
          format: [85.6, 53.98] // Credit card size
        });

        const pdfWidth = 85.6;
        const pdfHeight = 53.98;
        
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
      <div className="flex justify-center items-center h-screen bg-muted/40">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }
  
  if (!player) {
     return (
      <div className="flex justify-center items-center h-screen bg-muted/40">
        <p>Joueur non trouvé.</p>
      </div>
    );
  }
  
  const playerInitial = player.name?.charAt(0)?.toUpperCase() || "J";


  return (
    <div className="bg-muted/40 p-4 sm:p-8 flex flex-col items-center min-h-screen">
      <div className="w-full max-w-md space-y-4">
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
                Télécharger PDF
              </>
            )}
          </Button>
        </div>

        <div id="printable-card" className="w-full aspect-[85.6/53.98] bg-white text-black shadow-lg rounded-xl overflow-hidden p-3 flex flex-col justify-between">
            {/* Header */}
            <header className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                    <Trophy className="h-6 w-6 text-primary" />
                    <h1 className="font-bold text-sm text-primary">{clubName}</h1>
                </div>
                <div className="text-right">
                    <p className="font-bold text-lg leading-tight text-black/80 -mb-1">#{player.number}</p>
                    <p className="font-semibold text-xs leading-tight text-primary">{player.category}</p>
                </div>
            </header>

            {/* Body */}
            <div className="flex items-center gap-3">
                <Avatar className="h-20 w-20 border-2 border-primary">
                    <AvatarImage src={player.photoUrl} alt={player.name} />
                    <AvatarFallback className="text-3xl">{playerInitial}</AvatarFallback>
                </Avatar>
                <div className="space-y-1">
                    <h2 className="text-xl font-bold leading-tight">{player.name}</h2>
                    {player.position && <p className="text-sm font-medium text-black/70 flex items-center gap-1"><Star className="h-3 w-3" />{player.position}</p>}
                    {player.birthDate && <p className="text-xs text-black/60 flex items-center gap-1"><Cake className="h-3 w-3" />{format(new Date(player.birthDate), "dd/MM/yyyy", { locale: fr })}</p>}
                </div>
            </div>

            {/* Footer */}
            <footer className="text-xs text-black/60">
                <p>Saison 2024-2025</p>
            </footer>
        </div>
      </div>
    </div>
  );
}
