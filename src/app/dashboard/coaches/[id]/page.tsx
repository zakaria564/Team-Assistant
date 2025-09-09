
"use client";

import React from "react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, ArrowLeft, User, Phone, Mail, Shield, Pencil, Star, LogIn, LogOut, Flag, Home, Calendar, Download, Fingerprint } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

type CoachStatus = "Actif" | "Inactif";

interface CoachDocument {
  name: string;
  url: string;
  validityDate?: string;
}

interface Coach {
  id: string;
  name: string;
  category: string;
  status: CoachStatus;
  photoUrl?: string;
  phone?: string;
  email?: string;
  specialty?: string;
  entryDate?: string;
  exitDate?: string;
  nationality?: string;
  cin?: string;
  address?: string;
  documents?: CoachDocument[];
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

const getStatusBadgeClass = (status?: CoachStatus) => {
    switch (status) {
        case 'Actif': return 'bg-green-100 text-green-800 border-green-300';
        case 'Inactif': return 'bg-gray-100 text-gray-800 border-gray-300';
        default: return '';
    }
}


export default function CoachDetailPage({ params }: { params: { id: string } }) {
  const { id: coachId } = React.use(params);
  const router = useRouter();
  
  const [coach, setCoach] = useState<Coach | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!coachId) return;

    const fetchCoach = async () => {
      setLoading(true);
      try {
        const docRef = doc(db, "coaches", coachId as string);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          setCoach({ id: docSnap.id, ...docSnap.data() } as Coach);
        } else {
          console.log("No such document!");
          router.push('/dashboard/coaches');
        }
      } catch (error) {
        console.error("Error fetching coach:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchCoach();
  }, [coachId, router]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!coach) {
    return (
      <div className="text-center">
        <p>Entraîneur non trouvé.</p>
        <Button onClick={() => router.back()} className="mt-4">Retour</Button>
      </div>
    );
  }
  
  const coachInitial = coach.name?.charAt(0)?.toUpperCase() || "C";

  return (
    <div>
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-6 w-6" />
            <span className="sr-only">Retour</span>
            </Button>
            <div>
            <h1 className="text-3xl font-bold tracking-tight">Détails de l'Entraîneur</h1>
            <p className="text-muted-foreground">
                Fiche complète de {coach.name}.
            </p>
            </div>
        </div>
        <Button asChild className="w-full md:w-auto">
          <Link href={`/dashboard/coaches/${coachId}/edit`}>
            <Pencil className="mr-2 h-4 w-4" />
            Modifier
          </Link>
        </Button>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
            <Card>
                <CardContent className="pt-6">
                    <div className="flex flex-col items-center gap-4">
                        <Avatar className="h-32 w-32 border-4 border-primary">
                            <AvatarImage src={coach.photoUrl} alt={coach.name} />
                            <AvatarFallback className="text-5xl">{coachInitial}</AvatarFallback>
                        </Avatar>
                        <div className="text-center">
                            <h2 className="text-2xl font-bold">{coach.name}</h2>
                        </div>
                    </div>
                </CardContent>
            </Card>
             <Card>
                <CardHeader>
                    <CardTitle>Informations Sportives</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <DetailItem icon={Star} label="Spécialité" value={coach.specialty} />
                    <DetailItem icon={Shield} label="Catégorie Entraînée" value={coach.category} />
                     <DetailItem icon={User} label="Statut">
                        <Badge className={cn("text-base", getStatusBadgeClass(coach.status))}>
                            {coach.status}
                        </Badge>
                    </DetailItem>
                    <DetailItem icon={LogIn} label="Date d'entrée" value={coach.entryDate} />
                    <DetailItem icon={LogOut} label="Date de sortie" value={coach.exitDate} />
                </CardContent>
            </Card>
        </div>
        <div className="lg:col-span-2 space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Coordonnées</CardTitle>
                </CardHeader>
                 <CardContent className="grid sm:grid-cols-2 gap-x-6 gap-y-6">
                    <DetailItem icon={Flag} label="Nationalité" value={coach.nationality} />
                    <DetailItem icon={Fingerprint} label="N° CIN" value={coach.cin} />
                    <DetailItem icon={Phone} label="Téléphone" value={coach.phone} href={coach.phone ? `tel:${coach.phone}` : undefined} />
                    <DetailItem icon={Mail} label="Email" value={coach.email} href={coach.email ? `mailto:${coach.email}` : undefined} />
                    <DetailItem icon={Home} label="Adresse" value={coach.address} href={coach.address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(coach.address)}` : undefined} />
                 </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle>Documents</CardTitle>
                </CardHeader>
                <CardContent>
                    {(coach.documents && coach.documents.length > 0) ? (
                      <ul className="space-y-3">
                          {coach.documents.map((doc, index) => (
                            <li key={index} className="flex items-center justify-between text-sm p-3 rounded-md bg-muted/50">
                                <div className="flex flex-col">
                                    <span className="font-medium">{doc.name}</span>
                                    {doc.validityDate && (
                                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                                            <Calendar className="h-3 w-3"/>
                                            Expire le: {format(new Date(doc.validityDate), 'dd/MM/yyyy', {locale: fr})}
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
                      <p className="text-sm text-muted-foreground">Aucun document n'a été ajouté pour cet entraîneur.</p>
                    )}
                </CardContent>
            </Card>
        </div>
      </div>
    </div>
  );
}
