
"use client";

import React from "react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { AddPlayerForm } from "@/components/players/add-player-form";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowLeft, Loader2 } from "lucide-react";

interface Player {
  id: string;
  name: string;
  category: string;
  number: number;
  photoUrl?: string;
  position?: string;
  birthDate?: string;
  address?: string;
  nationality?: string;
  phone?: string;
  email?: string;
  tutorName?: string;
  tutorPhone?: string;
  tutorEmail?: string;
  entryDate?: string;
  exitDate?: string;
}

export default function EditPlayerPage({ params }: { params: { id: string } }) {
  const resolvedParams = React.use(params);
  const router = useRouter();
  const playerId = resolvedParams.id as string;
  
  const [player, setPlayer] = useState<Player | null>(null);
  const [loading, setLoading] = useState(true);

   useEffect(() => {
    if (!playerId) return;

    const fetchPlayer = async () => {
      setLoading(true);
      try {
        const docRef = doc(db, "players", playerId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          setPlayer({ id: docSnap.id, ...docSnap.data() } as Player);
        } else {
          console.log("No such document!");
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
    <div>
      <div className="flex items-center gap-4 mb-6">
         <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-6 w-6" />
          <span className="sr-only">Retour</span>
        </Button>
        <div>
            <h1 className="text-3xl font-bold tracking-tight">Modifier le joueur</h1>
            <p className="text-muted-foreground">
              Mettez à jour les informations de {loading ? "..." : player?.name}.
            </p>
        </div>
      </div>
      <Card>
        <CardHeader>
            <CardTitle>Informations du Joueur</CardTitle>
            <CardDescription>Modifiez les champs ci-dessous et enregistrez.</CardDescription>
        </CardHeader>
        {loading ? (
             <div className="flex justify-center items-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
        ) : player ? (
            <AddPlayerForm player={player} />
        ) : (
            <p className="p-6">Joueur non trouvé.</p>
        )}
      </Card>
    </div>
  );
}
