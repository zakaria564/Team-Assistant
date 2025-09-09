
"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { db, auth } from "@/lib/firebase";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import { useAuthState } from "react-firebase-hooks/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, ArrowLeft, Download, Trophy } from "lucide-react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Link from "next/link";

interface Player {
  id: string;
  name: string;
  category: string;
  number: number;
  photoUrl?: string;
  position?: string;
}

export default function PlayerCardsPage() {
  const router = useRouter();
  const [user, loadingUser] = useAuthState(auth);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingPdf, setLoadingPdf] = useState(false);
  const [clubName, setClubName] = useState("Votre Club");

  useEffect(() => {
    const fetchPlayers = async () => {
      if (!user) {
        if (!loadingUser) setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const playersQuery = query(collection(db, "players"), where("userId", "==", user.uid));
        const playersSnapshot = await getDocs(playersQuery);
        const playersData = playersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Player));
        setPlayers(playersData);

        const clubDocRef = doc(db, "clubs", user.uid);
        const clubDoc = await getDoc(clubDocRef);
        if (clubDoc.exists() && clubDoc.data().clubName) {
          setClubName(clubDoc.data().clubName);
        }

      } catch (error) {
        console.error("Error fetching players:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPlayers();
  }, [user, loadingUser]);

  const handleDownloadPdf = () => {
    setLoadingPdf(true);
    const cardsElement = document.getElementById("printable-cards");
    if (cardsElement) {
      html2canvas(cardsElement, {
        scale: 2,
        useCORS: true,
        backgroundColor: null, 
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

        let imgWidth = pdfWidth;
        let imgHeight = pdfWidth / ratio;
        
        let heightLeft = imgHeight;
        let position = 0;

        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pdfHeight;

        while (heightLeft >= 0) {
          position = heightLeft - imgHeight;
          pdf.addPage();
          pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
          heightLeft -= pdfHeight;
        }

        pdf.save("cartes-joueurs.pdf");
      }).finally(() => {
        setLoadingPdf(false);
      });
    } else {
      console.error("L'élément à imprimer est introuvable.");
      setLoadingPdf(false);
    }
  };

  return (
    <div className="bg-muted/40 p-4 sm:p-8 flex flex-col items-center min-h-screen">
      <div className="w-full max-w-7xl space-y-4">
        <div className="flex justify-between items-center print:hidden">
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Retour
          </Button>
          <Button onClick={handleDownloadPdf} disabled={loadingPdf || loading || players.length === 0}>
            {loadingPdf ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Téléchargement...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Télécharger en PDF
              </>
            )}
          </Button>
        </div>

        {loading ? (
            <div className="flex justify-center items-center py-20">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
        ) : players.length > 0 ? (
            <div id="printable-cards" className="p-2 bg-white">
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {players.map(player => (
                    <Link href={`/dashboard/players/${player.id}/card`} key={player.id} className="no-underline">
                        <Card className="h-full aspect-[5.4/8.6] border-2 border-primary/50 bg-gray-50 flex flex-col items-center justify-between p-2 text-center text-black shadow-lg break-inside-avoid hover:shadow-xl hover:border-primary transition-all">
                            <header className="w-full">
                                <div className="flex items-center justify-center gap-1">
                                    <Trophy className="h-4 w-4 text-primary" />
                                    <h2 className="font-bold text-sm text-primary">{clubName}</h2>
                                </div>
                            </header>
                            <div className="flex flex-col items-center gap-1 my-auto">
                            <Avatar className="h-20 w-20 border-2 border-primary">
                                    <AvatarImage src={player.photoUrl} alt={player.name} />
                                    <AvatarFallback className="text-2xl">{player.name?.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <h3 className="text-base font-bold">{player.name}</h3>
                                <p className="text-xs font-semibold text-primary -mt-1">{player.position || 'N/A'}</p>
                            </div>
                            <footer className="w-full space-y-1 text-sm">
                                <div className="flex justify-between items-center text-left">
                                    <span className="font-semibold text-primary">{player.category}</span>
                                    <span className="font-bold text-lg text-black/80">#{player.number}</span>
                                </div>
                            </footer>
                        </Card>
                    </Link>
                ))}
                </div>
            </div>
        ) : (
            <Card>
                <CardContent className="py-20 text-center text-muted-foreground">
                    <p>Aucun joueur trouvé. Veuillez d'abord ajouter des joueurs.</p>
                </CardContent>
            </Card>
        )}
      </div>
       <style jsx global>{`
            @media print {
                body {
                    -webkit-print-color-adjust: exact;
                    print-color-adjust: exact;
                }
                .print\\:hidden {
                    display: none;
                }
            }
            .break-inside-avoid {
                break-inside: avoid;
            }
        `}</style>
    </div>
  );
}
