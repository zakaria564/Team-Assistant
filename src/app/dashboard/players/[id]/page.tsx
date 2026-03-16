"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, ArrowLeft, Shield, Star, Shirt, ClipboardList, Phone, Mail, Fingerprint, Cake, Flag, Home, User, VenetianMask, FileText, ExternalLink } from "lucide-react";
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

type PageProps = {
  params: Promise<{ id: string }>;
};

export default function PlayerDetailPage({ params }: PageProps) {
  const resolvedParams = React.use(params);
  const playerId = resolvedParams.id;
  
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
          if(data.coachId && data.coachId !== 'none' && data.coachId !== '') {
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
  const playerInitial = player.name?.charAt(0)?.toUpperCase() || "P";

  return (
    <div className="space-y-6 max-w-5xl mx-auto px-2 sm:px-0">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}><ArrowLeft className="h-6 w-6" /></Button>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Fiche Joueur</h1>
        </div>
        <div className="flex gap-2">
            <Button variant="outline" size="sm" className="flex-1 sm:flex-none" onClick={() => router.push(`/dashboard/players/${player.id}/details`)}>Exporter PDF</Button>
            <Button size="sm" className="flex-1 sm:flex-none" onClick={() => router.push(`/dashboard/players/${player.id}/edit`)}>Modifier</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1 h-fit">
          <CardContent className="pt-8 flex flex-col items-center gap-6">
            <div className="h-32 w-32 sm:h-40 sm:w-40 border-4 border-primary shadow-lg rounded-full overflow-hidden bg-white flex items-center justify-center relative">
              {player.photoUrl ? (
                <img 
                  src={player.photoUrl} 
                  alt={player.name} 
                  className="h-full w-full object-contain bg-white" 
                />
              ) : (
                <div className="text-4xl font-black text-slate-300">{playerInitial}</div>
              )}
            </div>
            <div className="text-center space-y-3 w-full">
                <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tight leading-tight">{player.name}</h2>
                <div className="flex flex-col items-center gap-3">
                    <Badge variant="outline" className="font-mono text-xs py-1 px-3 bg-muted/50 flex items-center gap-2">
                        <Fingerprint className="h-3.5 w-3.5 text-primary" />
                        {player.professionalId || "ID: N/A"}
                    </Badge>
                    <Badge className={cn("text-sm font-bold px-6 py-1.5 shadow-sm", 
                        player.status === 'Actif' ? 'bg-green-100 text-green-800' : 
                        player.status === 'Inactif' ? 'bg-gray-100 text-gray-800' :
                        player.status === 'Blessé' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
                    )}>{player.status}</Badge>
                </div>
            </div>
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
                <CardHeader className="pb-3 border-b mb-4"><CardTitle className="text-lg flex items-center gap-2 text-primary"><FileText className="h-5 w-5" /> Documents Numérisés</CardTitle></CardHeader>
                <CardContent className="pt-4">
                    <div className="space-y-3">
                        {player.documents.map((doc: any, i: number) => (
                            <div key={i} className="flex items-center justify-between p-3 border rounded-lg hover:bg-slate-50 transition-colors group">
                                <div className="flex items-center gap-3">
                                    <div className="bg-primary/10 p-2 rounded">
                                        <FileText className="h-4 w-4 text-primary" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-slate-800">{doc.name}</p>
                                        {doc.validityDate && (
                                            <p className="text-[10px] text-muted-foreground uppercase font-bold">Expire le : {format(new Date(doc.validityDate), 'dd/MM/yyyy')}</p>
                                        )}
                                    </div>
                                </div>
                                <Button variant="ghost" size="sm" asChild className="opacity-0 group-hover:opacity-100 transition-opacity">
                                    <a href={doc.url} target="_blank" rel="noopener noreferrer">
                                        <ExternalLink className="h-4 w-4 mr-2" /> Ouvrir
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