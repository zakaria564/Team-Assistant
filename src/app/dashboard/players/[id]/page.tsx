
"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, ArrowLeft, Shield, Star, Shirt, ClipboardList, Phone, Mail, Fingerprint, Cake, Flag, Home, User, VenetianMask, FileText, FileDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useAuthState } from "react-firebase-hooks/auth";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const DetailItem = ({ icon: Icon, label, value, href }: { icon: any, label: string, value?: string, href?: string }) => (
  <div className="flex items-start gap-3">
    <Icon className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
    <div>
      <p className="text-xs text-muted-foreground font-medium">{label}</p>
      {href ? (
        <a href={href} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-primary hover:underline break-all">
          {value || "Non renseigné"}
        </a>
      ) : (
        <p className="text-sm font-semibold">{value || "Non renseigné"}</p>
      )}
    </div>
  </div>
);

export default function PlayerDetailPage(props: { params: Promise<{ id: string }>, searchParams: Promise<any> }) {
  const params = React.use(props.params);
  const searchParams = React.use(props.searchParams);
  const playerId = params.id;
  const router = useRouter();
  const [user, loadingUser] = useAuthState(auth);
  const [player, setPlayer] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!playerId || loadingUser) return;
    const fetchPlayer = async () => {
      setLoading(true);
      try {
        const playerSnap = await getDoc(doc(db, "players", playerId));
        if (playerSnap.exists()) {
          const data = { id: playerSnap.id, ...playerSnap.data() };
          if(data.coachId) {
            const cSnap = await getDoc(doc(db, "coaches", data.coachId));
            if(cSnap.exists()) data.coachName = cSnap.data().name;
          }
          setPlayer(data);
        } else {
          router.push('/dashboard/players');
        }
      } catch (e) { 
        console.error(e); 
      } finally { 
        setLoading(false); 
      }
    };
    fetchPlayer();
  }, [playerId, router, loadingUser]);

  if (loading || loadingUser) return <div className="flex justify-center items-center h-full py-20"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
  if (!player) return null;

  const birthDate = player.birthDate ? format(new Date(player.birthDate), "dd MMMM yyyy", { locale: fr }) : undefined;
  const entryDate = player.entryDate ? format(new Date(player.entryDate), "dd/MM/yyyy", { locale: fr }) : undefined;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}><ArrowLeft className="h-6 w-6" /></Button>
          <h1 className="text-3xl font-bold tracking-tight">Fiche Joueur</h1>
        </div>
        <div className="flex gap-2">
            <Button variant="outline" onClick={() => router.push(`/dashboard/players/${player.id}/details`)}>Exporter PDF</Button>
            <Button onClick={() => router.push(`/dashboard/players/${player.id}/edit`)}>Modifier le profil</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1 h-fit">
          <CardContent className="pt-8 flex flex-col items-center gap-4">
            <Avatar className="h-40 w-40 border-4 border-primary shadow-lg">
              <AvatarImage src={player.photoUrl} className="object-cover" />
              <AvatarFallback className="text-4xl">P</AvatarFallback>
            </Avatar>
            <div className="text-center space-y-1">
                <h2 className="text-2xl font-bold uppercase tracking-tight">{player.name}</h2>
                <Badge variant="outline" className="font-mono text-xs flex items-center gap-1 justify-center">
                    <Fingerprint className="h-3 w-3" />
                    {player.professionalId || "ID: N/A"}
                </Badge>
            </div>
            <Badge className={cn("text-base px-4 py-1", 
                player.status === 'Actif' ? 'bg-green-100 text-green-800' : 
                player.status === 'Inactif' ? 'bg-gray-100 text-gray-800' :
                player.status === 'Blessé' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
            )}>{player.status}</Badge>
          </CardContent>
        </Card>

        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader className="pb-3 border-b mb-4"><CardTitle className="text-lg flex items-center gap-2 text-primary"><Shield className="h-5 w-5" /> Informations Sportives</CardTitle></CardHeader>
            <CardContent className="grid sm:grid-cols-2 gap-y-6 gap-x-4">
              <DetailItem icon={Shield} label="Catégorie" value={player.category} />
              <DetailItem icon={Star} label="Poste Principal" value={player.position} />
              <DetailItem icon={Shirt} label="Numéro de Maillot" value={player.number ? `#${player.number}` : undefined} />
              <DetailItem icon={ClipboardList} label="Entraîneur Responsable" value={player.coachName} />
              <DetailItem icon={Cake} label="Date d'entrée au club" value={entryDate} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3 border-b mb-4"><CardTitle className="text-lg flex items-center gap-2 text-primary"><User className="h-5 w-5" /> État Civil & Contact</CardTitle></CardHeader>
            <CardContent className="grid sm:grid-cols-2 gap-y-6 gap-x-4">
              <DetailItem icon={Cake} label="Date de naissance" value={birthDate} />
              <DetailItem icon={VenetianMask} label="Genre" value={player.gender} />
              <DetailItem icon={Flag} label="Nationalité" value={player.nationality} />
              <DetailItem icon={Fingerprint} label="N° CIN" value={player.cin} />
              <DetailItem 
                icon={Mail} 
                label="Email" 
                value={player.email} 
                href={player.email ? `mailto:${player.email}` : undefined} 
              />
              <DetailItem 
                icon={Phone} 
                label="Téléphone" 
                value={player.phone} 
                href={player.phone ? `tel:${player.phone}` : undefined} 
              />
              <div className="sm:col-span-2">
                <DetailItem 
                    icon={Home} 
                    label="Adresse Résidentielle" 
                    value={player.address} 
                    href={player.address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(player.address)}` : undefined}
                />
              </div>
            </CardContent>
          </Card>

          {player.tutorName && (
            <Card>
                <CardHeader className="pb-3 border-b mb-4"><CardTitle className="text-lg flex items-center gap-2 text-primary"><User className="h-5 w-5" /> Informations du Tuteur</CardTitle></CardHeader>
                <CardContent className="grid sm:grid-cols-2 gap-y-6 gap-x-4">
                    <DetailItem icon={User} label="Nom du parent / tuteur" value={player.tutorName} />
                    <DetailItem icon={Fingerprint} label="CIN du tuteur" value={player.tutorCin} />
                    <DetailItem 
                        icon={Mail} 
                        label="Email du tuteur" 
                        value={player.tutorEmail} 
                        href={player.tutorEmail ? `mailto:${player.tutorEmail}` : undefined} 
                    />
                    <DetailItem 
                        icon={Phone} 
                        label="Téléphone du tuteur" 
                        value={player.tutorPhone} 
                        href={player.tutorPhone ? `tel:${player.tutorPhone}` : undefined} 
                    />
                </CardContent>
            </Card>
          )}

          {player.documents && player.documents.length > 0 && (
            <Card>
                <CardHeader className="pb-3 border-b mb-4">
                    <CardTitle className="text-lg flex items-center gap-2 text-primary">
                        <FileText className="h-5 w-5" /> Documents Enregistrés
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {player.documents.map((doc: any, index: number) => (
                            <div key={index} className="flex items-center justify-between p-3 border rounded-lg bg-muted/30 group hover:border-primary transition-colors">
                                <div className="flex flex-col">
                                    <span className="font-bold text-sm">{doc.name}</span>
                                    {doc.validityDate && (
                                        <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                                            Valide jusqu'au : {format(new Date(doc.validityDate), "dd/MM/yyyy")}
                                        </span>
                                    )}
                                </div>
                                <Button variant="ghost" size="icon" asChild className="h-8 w-8 hover:bg-primary/10 hover:text-primary">
                                    <a href={doc.url} target="_blank" rel="noopener noreferrer">
                                        <FileDown className="h-4 w-4" />
                                    </a>
                                </Button>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
