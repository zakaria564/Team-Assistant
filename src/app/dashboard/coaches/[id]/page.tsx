
"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, ArrowLeft, Phone, Mail, Shield, Star, FileText, FileDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useAuthState } from "react-firebase-hooks/auth";
import { format } from "date-fns";

export default function CoachDetailPage(props: { params: Promise<{ id: string }>, searchParams: Promise<any> }) {
  const { params: paramsPromise } = props;
  const params = React.use(paramsPromise);
  const coachId = params.id;
  const router = useRouter();
  const [user, loadingUser] = useAuthState(auth);
  const [coach, setCoach] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!coachId || loadingUser) return;
    const fetchCoach = async () => {
      setLoading(true);
      try {
        const snap = await getDoc(doc(db, "coaches", coachId));
        if (snap.exists()) setCoach({ id: snap.id, ...snap.data() });
        else router.push('/dashboard/coaches');
      } catch (e) { 
        console.error(e); 
      } finally { 
        setLoading(false); 
      }
    };
    fetchCoach();
  }, [coachId, router, loadingUser]);

  if (loading || loadingUser) return <div className="flex justify-center items-center h-full py-20"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
  if (!coach) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}><ArrowLeft className="h-6 w-6" /></Button>
          <h1 className="text-3xl font-bold tracking-tight">Fiche Entraîneur</h1>
        </div>
        <div className="flex gap-2">
            <Button variant="outline" onClick={() => router.push(`/dashboard/coaches/${coach.id}/details`)}>Exporter PDF</Button>
            <Button onClick={() => router.push(`/dashboard/coaches/${coach.id}/edit`)}>Modifier</Button>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <CardContent className="pt-6 flex flex-col items-center gap-4">
            <Avatar className="h-32 w-32 border-4 border-primary shadow-sm">
              <AvatarImage src={coach.photoUrl} />
              <AvatarFallback>E</AvatarFallback>
            </Avatar>
            <h2 className="text-2xl font-bold text-center">{coach.name}</h2>
            <Badge className="bg-green-100 text-green-800">{coach.status}</Badge>
          </CardContent>
        </Card>
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader><CardTitle>Informations Professionnelles</CardTitle></CardHeader>
            <CardContent className="grid sm:grid-cols-2 gap-6">
              <div className="flex items-center gap-3"><Star className="text-muted-foreground h-5 w-5" /> <span>Spécialité: {coach.specialty}</span></div>
              <div className="flex items-center gap-3"><Shield className="text-muted-foreground h-5 w-5" /> <span>Catégorie: {coach.category}</span></div>
              <div className="flex items-center gap-3"><Phone className="text-muted-foreground h-5 w-5" /> <span>Tél: {coach.phone || 'N/A'}</span></div>
              <div className="flex items-center gap-3"><Mail className="text-muted-foreground h-5 w-5" /> <span>Email: {coach.email}</span></div>
            </CardContent>
          </Card>

          {coach.documents && coach.documents.length > 0 && (
            <Card>
                <CardHeader className="pb-3 border-b mb-4">
                    <CardTitle className="text-lg flex items-center gap-2 text-primary">
                        <FileText className="h-5 w-5" /> Documents du Coach
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
                        {coach.documents.map((doc: any, index: number) => (
                            <div key={index} className="flex items-center justify-between p-3 border rounded-lg bg-muted/30 group hover:border-primary transition-colors">
                                <div className="flex flex-col">
                                    <span className="font-bold text-sm">{doc.name}</span>
                                    {doc.validityDate && (
                                        <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                                            Expire le : {format(new Date(doc.validityDate), "dd/MM/yyyy")}
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
