"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, Download, Trophy, Shirt, Shield, Cake, Flag, Fingerprint } from "lucide-react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { AvatarFallback } from "@/components/ui/avatar";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export default function PlayerCardPdfPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: playerId } = React.use(params);
  
  const router = useRouter();
  const [user, loadingUser] = useAuthState(auth);
  const [player, setPlayer] = useState<any>(null);
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
        const playerRef = doc(db, "players", playerId);
        const playerSnap = await getDoc(playerRef);

        if (playerSnap.exists()) {
          setPlayer({ id: playerSnap.id, ...playerSnap.data() });
        } else {
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

  const handleDownloadPdf = async () => {
    setLoadingPdf(true);
    const cardElement = document.getElementById("printable-card");
    if (cardElement) {
      try {
        const images = Array.from(cardElement.getElementsByTagName('img'));
        await Promise.all(images.map(img => {
            if (img.complete) return Promise.resolve();
            return new Promise((resolve) => {
                img.onload = resolve;
                img.onerror = resolve;
            });
        }));

        await new Promise(r => setTimeout(r, 1000));

        const canvas = await html2canvas(cardElement, {
            scale: 2.5,
            useCORS: true,
            backgroundColor: '#ffffff',
        });

        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF({
          orientation: 'portrait',
          unit: 'mm',
          format: 'a6'
        });

        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        pdf.save(`carte-${player?.name?.replace(/ /g, "_")}.pdf`);
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingPdf(false);
      }
    } else {
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
  
  if (!player) return null;
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
                Génération...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Télécharger
              </>
            )}
          </Button>
        </div>

        <div id="printable-card" className="w-full aspect-[1/1.414] bg-white text-black shadow-lg rounded-xl overflow-hidden flex flex-col mx-auto max-sm">
            <header className="bg-primary text-primary-foreground p-3 text-center">
                <div className="flex items-center justify-center gap-2">
                    <Trophy className="h-6 w-6" />
                    <h1 className="font-bold text-xl uppercase tracking-tighter">{clubName}</h1>
                </div>
            </header>

            <div className="p-4 flex-grow flex flex-col items-center justify-center gap-3">
                <div className="relative">
                    <div className="h-28 w-28 border-4 border-primary shadow-md rounded-full overflow-hidden flex items-center justify-center bg-slate-100">
                        {player.photoUrl ? (
                            <img src={player.photoUrl} alt={player.name} className="h-full w-full object-contain" />
                        ) : (
                            <AvatarFallback className="text-4xl">{playerInitial}</AvatarFallback>
                        )}
                    </div>
                    <div className="absolute -bottom-2 -right-2 bg-black text-white px-2 py-0.5 rounded font-mono text-[10px] border border-white">
                        ID: {player.professionalId?.split('-').pop() || player.id.substring(0, 4).toUpperCase()}
                    </div>
                </div>
                
                <div className="text-center">
                    <h2 className="text-2xl font-bold leading-tight uppercase">{player.name}</h2>
                    <p className="text-sm font-black text-primary uppercase">{player.position || "Poste non spécifié"}</p>
                    <div className="mt-1 flex items-center justify-center gap-1 bg-muted px-2 py-0.5 rounded-full border">
                        <Fingerprint className="h-3 w-3 text-muted-foreground" />
                        <span className="text-[10px] font-mono font-bold tracking-widest">{player.professionalId || "N/A"}</span>
                    </div>
                </div>

                 <div className="w-full grid grid-cols-2 gap-3 text-xs mt-3">
                    <div className="flex items-center gap-2">
                        <Shirt className="h-4 w-4 text-primary/80"/>
                        <div>
                            <p className="font-semibold text-[10px] uppercase text-muted-foreground">Numéro</p>
                            <p className="text-sm font-black text-black/80">#{player.number}</p>
                        </div>
                    </div>
                     <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4 text-primary/80"/>
                        <div>
                            <p className="font-semibold text-[10px] uppercase text-muted-foreground">Catégorie</p>
                            <p className="text-sm font-black text-black/80">{player.category}</p>
                        </div>
                    </div>
                     <div className="flex items-center gap-2">
                        <Cake className="h-4 w-4 text-primary/80"/>
                        <div>
                            <p className="font-semibold text-[10px] uppercase text-muted-foreground">Naissance</p>
                            <p className="text-sm font-black text-black/80">{player.birthDate ? format(new Date(player.birthDate), "dd/MM/yyyy") : 'N/A'}</p>
                        </div>
                    </div>
                     <div className="flex items-center gap-2">
                        <Flag className="h-4 w-4 text-primary/80"/>
                        <div>
                            <p className="font-semibold text-[10px] uppercase text-muted-foreground">Nationalité</p>
                            <p className="text-sm font-black text-black/80">{player.nationality || "N/A"}</p>
                        </div>
                    </div>
                </div>

            </div>

            <footer className="bg-primary/5 p-2 text-center text-[10px] font-bold text-black/60 mt-auto border-t">
                <p>DOCUMENT OFFICIEL - SAISON {new Date().getFullYear()}-{new Date().getFullYear()+1}</p>
            </footer>
        </div>
      </div>
    </div>
  );
}
