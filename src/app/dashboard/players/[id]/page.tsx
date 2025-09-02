
"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, ArrowLeft, User, Phone, Mail, Home, Flag, Shirt, Cake, Shield, Pencil } from "lucide-react";
import Link from "next/link";

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
}

const DetailItem = ({ icon: Icon, label, value }: { icon: React.ElementType, label: string, value?: string }) => (
  <div className="flex items-start gap-3">
    <Icon className="h-5 w-5 text-muted-foreground mt-1" />
    <div>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="text-base font-medium">{value || "Non spécifié"}</p>
    </div>
  </div>
);

export default function PlayerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const playerId = params.id as string;
  
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
        }
      } catch (error) {
        console.error("Error fetching player:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPlayer();
  }, [playerId]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!player) {
    return (
      <div className="text-center">
        <p>Joueur non trouvé.</p>
        <Button onClick={() => router.back()} className="mt-4">Retour</Button>
      </div>
    );
  }
  
  const playerInitial = player.name?.charAt(0)?.toUpperCase() || "P";

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-6 w-6" />
            <span className="sr-only">Retour</span>
            </Button>
            <div>
            <h1 className="text-3xl font-bold tracking-tight">Détails du Joueur</h1>
            <p className="text-muted-foreground">
                Fiche complète de {player.name}.
            </p>
            </div>
        </div>
        <Button asChild>
          <Link href={`/dashboard/players/${playerId}/edit`}>
            <Pencil className="mr-2 h-4 w-4" />
            Modifier
          </Link>
        </Button>
      </div>
      
      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-1 space-y-6">
            <Card>
                <CardContent className="pt-6">
                    <div className="flex flex-col items-center gap-4">
                        <Avatar className="h-32 w-32 border-4 border-primary">
                            <AvatarImage src={player.photoUrl} alt={player.name} />
                            <AvatarFallback className="text-5xl">{playerInitial}</AvatarFallback>
                        </Avatar>
                        <div className="text-center">
                            <h2 className="text-2xl font-bold">{player.name}</h2>
                            <p className="text-muted-foreground">{player.position || "Poste non défini"}</p>
                        </div>
                    </div>
                </CardContent>
            </Card>
             <Card>
                <CardHeader>
                    <CardTitle>Informations Sportives</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <DetailItem icon={Shield} label="Catégorie" value={player.category} />
                    <DetailItem icon={Shirt} label="Numéro" value={player.number?.toString()} />
                </CardContent>
            </Card>
        </div>
        <div className="md:col-span-2 space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Informations Personnelles</CardTitle>
                </CardHeader>
                 <CardContent className="grid md:grid-cols-2 gap-x-6 gap-y-6">
                    <DetailItem icon={User} label="Nom complet" value={player.name} />
                    <DetailItem icon={Cake} label="Date de naissance" value={player.birthDate} />
                    <DetailItem icon={Flag} label="Nationalité" value={player.nationality} />
                    <DetailItem icon={Home} label="Adresse" value={player.address} />
                    <DetailItem icon={Phone} label="Téléphone" value={player.phone} />
                    <DetailItem icon={Mail} label="Email" value={player.email} />
                 </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle>Informations du Tuteur</CardTitle>
                </CardHeader>
                <CardContent className="grid md:grid-cols-2 gap-x-6 gap-y-6">
                    <DetailItem icon={User} label="Nom du tuteur" value={player.tutorName} />
                    <DetailItem icon={Phone} label="Téléphone du tuteur" value={player.tutorPhone} />
                    <DetailItem icon={Mail} label="Email du tuteur" value={player.tutorEmail} />
                </CardContent>
            </Card>
        </div>
      </div>
    </div>
  );
}
