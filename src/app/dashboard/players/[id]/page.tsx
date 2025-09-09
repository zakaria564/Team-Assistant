
"use client";

import React from "react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, ArrowLeft, User, Phone, Mail, Home, Flag, Shirt, Cake, Shield, Pencil, Star, Activity, ClipboardList, LogIn, LogOut, FileHeart, Link as LinkIcon, Download, Calendar, Fingerprint, VenetianMask, FileDown } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

type PlayerStatus = "Actif" | "Inactif" | "Blessé" | "Suspendu";

interface PlayerDocument {
  name: string;
  url: string;
  validityDate?: string;
}

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
  documents?: PlayerDocument[];
}

const DetailItem = ({ icon: Icon, label, value, href, children }: { icon: React.ElementType, label: string, value?: string, href?: string, children?: React.ReactNode }) => (
  <div className="flex items-start gap-3">
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


export default function PlayerDetailPage({ params }: { params: { id: string } }) {
  const { id: playerId } = React.use(params);
  const router = useRouter();
  
  const [player, setPlayer] = useState<Player | null>(null);
  const [loading, setLoading] = useState(true);

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
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
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
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
            <Card>
                <CardContent className="pt-6">
                    <div className="flex flex-col items-center gap-4">
                        <Avatar className="h-32 w-32 border-4 border-primary">
                            <AvatarImage src={player.photoUrl} alt={player.name} />
                            <AvatarFallback className="text-5xl">{playerInitial}</AvatarFallback>
                        </Avatar>
                        <div className="text-center">
                            <h2 className="text-2xl font-bold">{player.name}</h2>
                            <Badge className={cn("text-base mt-2", getStatusBadgeClass(player.status))}>
                                {player.status}
                            </Badge>
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
                    <DetailItem icon={Star} label="Poste" value={player.position} />
                    <DetailItem icon={Shirt} label="Numéro" value={player.number?.toString()} />
                    <DetailItem icon={ClipboardList} label="Entraîneur" value={player.coachName} />
                    <DetailItem icon={LogIn} label="Date d'entrée" value={player.entryDate ? format(new Date(player.entryDate), 'dd/MM/yyyy') : undefined} />
                    <DetailItem icon={LogOut} label="Date de sortie" value={player.exitDate ? format(new Date(player.exitDate), 'dd/MM/yyyy') : undefined} />
                </CardContent>
            </Card>
        </div>
        <div className="lg:col-span-2 space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Informations Personnelles</CardTitle>
                </CardHeader>
                 <CardContent className="grid sm:grid-cols-2 gap-x-6 gap-y-6">
                    <DetailItem icon={User} label="Nom complet" value={player.name} />
                    <DetailItem icon={Cake} label="Date de naissance" value={player.birthDate ? format(new Date(player.birthDate), 'dd/MM/yyyy') : undefined} />
                    <DetailItem icon={VenetianMask} label="Genre" value={player.gender} />
                    <DetailItem icon={Flag} label="Nationalité" value={player.nationality} />
                    <DetailItem icon={Fingerprint} label="N° CIN" value={player.cin} />
                    <DetailItem icon={Home} label="Adresse" value={player.address} href={player.address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(player.address)}` : undefined} />
                    <DetailItem icon={Phone} label="Téléphone" value={player.phone} href={player.phone ? `tel:${player.phone}` : undefined} />
                    <DetailItem icon={Mail} label="Email" value={player.email} href={player.email ? `mailto:${player.email}` : undefined}/>
                 </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle>Informations du Tuteur</CardTitle>
                </CardHeader>
                <CardContent className="grid sm:grid-cols-2 gap-x-6 gap-y-6">
                    <DetailItem icon={User} label="Nom du tuteur" value={player.tutorName} />
                    <DetailItem icon={Fingerprint} label="N° CIN Tuteur" value={player.tutorCin} />
                    <DetailItem icon={Phone} label="Téléphone du tuteur" value={player.tutorPhone} href={player.tutorPhone ? `tel:${player.tutorPhone}` : undefined}/>
                    <DetailItem icon={Mail} label="Email du tuteur" value={player.tutorEmail} href={player.tutorEmail ? `mailto:${player.tutorEmail}` : undefined} />
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle>Documents</CardTitle>
                </CardHeader>
                <CardContent>
                    {(player.documents && player.documents.length > 0) ? (
                      <ul className="space-y-3">
                          {player.documents.map((doc, index) => (
                            <li key={index} className="flex items-center justify-between text-sm p-3 rounded-md bg-muted/50">
                                <div className="flex flex-col">
                                    <span className="font-medium">{doc.name}</span>
                                    {doc.validityDate && (
                                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                                            <Calendar className="h-3 w-3"/>
                                            Expire le: {format(new Date(doc.validityDate), 'dd/MM/yyyy')}
                                        </span>
                                    )}
                                </div>
                                <Button asChild variant="ghost" size="sm">
                                  <a href={doc.url} target="_blank" rel="noopener noreferrer">
                                    <Download className="mr-2 h-4 w-4" />
                                    Voir
                                  </a>
                                </Button>
                            </li>
                          ))}
                        </ul>
                    ) : (
                      <p className="text-sm text-muted-foreground">Aucun document n'a été ajouté pour ce joueur.</p>
                    )}
                </CardContent>
            </Card>
        </div>
      </div>
    </div>
  );
}
