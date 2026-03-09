
"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, ArrowLeft, Phone, Mail, Shield, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useAuthState } from "react-firebase-hooks/auth";

export default function CoachDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: coachId } = React.use(params);
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
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}><ArrowLeft className="h-6 w-6" /></Button>
        <h1 className="text-3xl font-bold tracking-tight">Fiche Entraîneur</h1>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <CardContent className="pt-6 flex flex-col items-center gap-4">
            <Avatar className="h-32 w-32 border-4 border-primary shadow-sm">
              <AvatarImage src={coach.photoUrl} />
              <AvatarFallback>E</AvatarFallback>
            </Avatar>
            <h2 className="text-2xl font-bold">{coach.name}</h2>
            <Badge className="bg-green-100 text-green-800">{coach.status}</Badge>
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Informations Professionnelles</CardTitle></CardHeader>
          <CardContent className="grid sm:grid-cols-2 gap-6">
            <div className="flex items-center gap-3"><Star className="text-muted-foreground h-5 w-5" /> <span>Spécialité: {coach.specialty}</span></div>
            <div className="flex items-center gap-3"><Shield className="text-muted-foreground h-5 w-5" /> <span>Catégorie: {coach.category}</span></div>
            <div className="flex items-center gap-3"><Phone className="text-muted-foreground h-5 w-5" /> <span>Tél: {coach.phone || 'N/A'}</span></div>
            <div className="flex items-center gap-3"><Mail className="text-muted-foreground h-5 w-5" /> <span>Email: {coach.email}</span></div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
