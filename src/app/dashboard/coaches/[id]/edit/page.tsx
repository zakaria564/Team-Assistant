
"use client";

import React from "react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { AddCoachForm } from "@/components/coaches/add-coach-form";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { ArrowLeft, Loader2 } from "lucide-react";

interface Coach {
  id: string;
  name: string;
  category: string;
  status: "Actif" | "Inactif";
  phone?: string;
  email: string;
  photoUrl?: string;
  specialty?: string;
  entryDate?: string;
  exitDate?: string;
  nationality?: string;
  address?: string;
  documents?: { name: string; url: string; validityDate?: string }[];
}

export default function EditCoachPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const coachId = params.id;
  
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
          router.push("/dashboard/coaches");
        }
      } catch (error) {
        console.error("Error fetching coach:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchCoach();
  }, [coachId, router]);


  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
         <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-6 w-6" />
          <span className="sr-only">Retour</span>
        </Button>
        <div>
            <h1 className="text-3xl font-bold tracking-tight">Modifier l'entraîneur</h1>
            <p className="text-muted-foreground">
              Mettez à jour les informations de {loading ? "..." : coach?.name}.
            </p>
        </div>
      </div>
      <Card>
        <CardHeader>
            <CardTitle>Informations de l'entraîneur</CardTitle>
            <CardDescription>Modifiez les champs ci-dessous et enregistrez.</CardDescription>
        </CardHeader>
        <CardContent>
            {loading ? (
                <div className="flex justify-center items-center py-20">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            ) : coach ? (
                <AddCoachForm coach={coach} />
            ) : (
                <p className="p-6">Entraîneur non trouvé.</p>
            )}
        </CardContent>
      </Card>
    </div>
  );
}
