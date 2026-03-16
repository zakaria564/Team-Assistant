"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { AddPlayerForm } from "@/components/players/add-player-form";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowLeft, Loader2 } from "lucide-react";

const toTitleCase = (str: string) => {
  if (!str) return '';
  return str.toLowerCase().split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
};

type PageProps = {
  params: Promise<{ id: string }>;
};

export default function EditPlayerPage(props: PageProps) {
  const resolvedParams = React.use(props.params);
  const playerId = resolvedParams.id;
  
  const router = useRouter();
  const [player, setPlayer] = useState<any>(null);
  const [loading, setLoading] = useState(true);

   useEffect(() => {
    if (!playerId) return;

    const fetchPlayer = async () => {
      setLoading(true);
      try {
        const docRef = doc(db, "players", playerId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          setPlayer({ id: docSnap.id, ...docSnap.data() });
        } else {
          router.push("/dashboard/players");
        }
      } catch (error) {
        console.error("Error fetching player:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPlayer();
  }, [playerId, router]);


  return (
    <div className="px-2 sm:px-0">
      <div className="flex items-center gap-4 mb-6">
         <Button variant="ghost" size="icon" onClick={() => router.back()} className="h-10 w-10">
          <ArrowLeft className="h-6 w-6" />
          <span className="sr-only">Retour</span>
        </Button>
        <div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight uppercase italic">Modifier le joueur</h1>
            <p className="text-sm text-muted-foreground font-semibold">
              Mise à jour des informations de {loading ? "..." : toTitleCase(player?.name || '')}.
            </p>
        </div>
      </div>
      <Card className="shadow-lg border-t-4 border-primary">
        <CardHeader className="pb-2">
            <CardTitle className="text-lg">Informations du Joueur</CardTitle>
            <CardDescription className="text-xs">Modifiez les champs ci-dessous et enregistrez.</CardDescription>
        </CardHeader>
        {loading ? (
             <div className="flex justify-center items-center py-24">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
              </div>
        ) : player ? (
            <AddPlayerForm player={player} />
        ) : (
            <p className="p-10 text-center text-muted-foreground italic">Joueur non trouvé ou supprimé.</p>
        )}
      </Card>
    </div>
  );
}