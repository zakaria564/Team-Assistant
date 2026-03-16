"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { AddSalaryForm } from "@/components/salaries/add-salary-form";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { ArrowLeft, Loader2 } from "lucide-react";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default function EditSalaryPage(props: PageProps) {
  const resolvedParams = React.use(props.params);
  const salaryId = resolvedParams.id;
  
  const router = useRouter();
  const [salary, setSalary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [coachName, setCoachName] = useState("");

   useEffect(() => {
    if (!salaryId) return;

    const fetchSalary = async () => {
      setLoading(true);
      try {
        const docRef = doc(db, "salaries", salaryId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = { id: docSnap.id, ...docSnap.data() };
          setSalary(data);
          
          const coachRef = doc(db, "coaches", data.coachId);
          const coachSnap = await getDoc(coachRef);
          if(coachSnap.exists()) setCoachName(coachSnap.data().name);
        } else {
          router.push("/dashboard/salaries");
        }
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    fetchSalary();
  }, [salaryId, router]);


  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
         <Button variant="ghost" size="icon" onClick={() => router.back()}><ArrowLeft className="h-6 w-6" /></Button>
        <div>
            <h1 className="text-3xl font-bold tracking-tight">Gérer les versements</h1>
            <p className="text-muted-foreground">Ajouter un paiement pour {loading ? "..." : coachName}.</p>
        </div>
      </div>
      <Card>
        <CardHeader>
            <CardTitle>Versements du Salaire</CardTitle>
            <CardDescription>Ajoutez un nouveau versement ou modifiez le montant total.</CardDescription>
        </CardHeader>
        <CardContent>
            {loading ? (
                <div className="flex justify-center items-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
            ) : salary ? (
                <AddSalaryForm salary={salary} />
            ) : (
                <p className="p-6">Document non trouvé.</p>
            )}
        </CardContent>
      </Card>
    </div>
  );
}
