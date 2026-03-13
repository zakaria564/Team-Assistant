
"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { AddCoachForm } from "@/components/coaches/add-coach-form";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { ArrowLeft, Loader2 } from "lucide-react";

const toTitleCase = (str: string) => {
  if (!str) return '';
  return str.toLowerCase().split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
};

export default function EditCoachPage(props: { params: Promise<{ id: string }> }) {
  const params = React.use(props.params);
  const coachId = params.id;
  
  const router = useRouter();
  const [coach, setCoach] = useState<any>(null);
  const [loading, setLoading] = useState(true);

   useEffect(() => {
    if (!coachId) return;

    const fetchCoach = async () => {
      setLoading(true);
      try {
        const docRef = doc(db, "coaches", coachId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          setCoach({ id: docSnap.id, ...docSnap.data() });
        } else {
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
    <div className="px-2 sm:px-0">
      <div className="flex items-center gap-4 mb-6">
         <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-6 w-6" />
          <span className="sr-only">Retour</span>
        </Button>
        <div>
            <h1 className="text-xl sm:text-3xl font-bold tracking-tight">Modifier l'entraîneur</h1>
            <p className="text-sm text-muted-foreground">
              Mettez à jour les informations de {loading ? "..." : toTitleCase(coach?.name || '')}.
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
