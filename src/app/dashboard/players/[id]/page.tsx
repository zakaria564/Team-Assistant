
"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, ArrowLeft, User, Phone, Mail, Home, Flag, Shirt, Cake, Shield, Star, Activity, ClipboardList, LogIn, LogOut, Download, Fingerprint, VenetianMask, Calendar as CalendarIcon } from "lucide-react";
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

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
  tutorPhone?: string;
  coachId?: string;
  coachName?: string;
  entryDate?: string;
  documents?: { name: string; url: string }[];
}

export default function PlayerDetailPage(props: { params: Promise<{ id: string }> }) {
  const unwrappedParams = React.use(props.params);
  const playerId = unwrappedParams.id;
  const router = useRouter();
  const [player, setPlayer] = useState<Player | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!playerId) return;
    const fetchPlayer = async () => {
      setLoading(true);
      try {
        const playerSnap = await getDoc(doc(db, "players", playerId));
        if (playerSnap.exists()) {
          const data = { id: playerSnap.id, ...playerSnap.data() } as Player;
          if(data.coachId) {
            const cSnap = await getDoc(doc(db, "coaches", data.coachId));
            if(cSnap.exists()) data.coachName = cSnap.data().name;
          }
          setPlayer(data);
        } else {
          router.push('/dashboard/players');
        }
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    fetchPlayer();
  }, [playerId, router]);

  if (loading) return <div className="flex justify-center items-center h-full"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
  if (!player) return null;

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" onClick={() => router.back()}><ArrowLeft className="h-6 w-6" /></Button>
        <h1 className="text-3xl font-bold tracking-tight">Fiche Joueur</h1>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <CardContent className="pt-6 flex flex-col items-center gap-4">
            <Avatar className="h-32 w-32 border-4 border-primary"><AvatarImage src={player.photoUrl} /><AvatarFallback>P</AvatarFallback></Avatar>
            <h2 className="text-2xl font-bold">{player.name}</h2>
            <Badge className={cn("text-base", player.status === 'Actif' ? 'bg-green-100 text-green-800' : 'bg-gray-100')}>{player.status}</Badge>
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Détails</CardTitle></CardHeader>
          <CardContent className="grid sm:grid-cols-2 gap-6">
            <div className="flex items-center gap-3"><User className="text-muted-foreground" /> <span>{player.name}</span></div>
            <div className="flex items-center gap-3"><Shield className="text-muted-foreground" /> <span>{player.category}</span></div>
            <div className="flex items-center gap-3"><Star className="text-muted-foreground" /> <span>{player.position}</span></div>
            <div className="flex items-center gap-3"><Shirt className="text-muted-foreground" /> <span>N° {player.number}</span></div>
            <div className="flex items-center gap-3"><Phone className="text-muted-foreground" /> <span>{player.phone || 'N/A'}</span></div>
            <div className="flex items-center gap-3"><ClipboardList className="text-muted-foreground" /> <span>Coach: {player.coachName || 'Aucun'}</span></div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
