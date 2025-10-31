
"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { AddPlayerForm } from "@/components/players/add-player-form";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowLeft, Loader2 } from "lucide-react";

interface Player {
  id: string;
  name: string;
  gender: "Masculin" | "Féminin";
  category: string;
  number: number;
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
  entryDate?: string;
  exitDate?: string;
  documents?: { name: string; url: string; validityDate?: string }[];
}

const toTitleCase = (str: string) => {
  if (!str) return '';
  return str.toLowerCase().split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
};

export default function EditPlayerPage() {
  const params = useParams();
  const playerId = params.id;
  const router = useRouter();
  
  const [player, setPlayer] = useState<Player | null>(null);
  const [loading, setLoading] = useState(true);

   useEffect(() => {
    if (!playerId) return;

    const fetchPlayer = async () => {
      setLoading(true);
      try {
        const docRef = doc(db, "players", playerId as string);
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
              Mettez à jour les informations de {loading ? "..." : toTitleCase(player?.name || '')}.
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
