
"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { AddSalaryForm } from "@/components/salaries/add-salary-form";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { ArrowLeft, Loader2 } from "lucide-react";

interface Salary {
  id: string;
  coachId: string;
  totalAmount: number;
  description: string;
  status: 'Payé' | 'Partiel' | 'En attente' | 'En retard';
  transactions: { amount: number; date: any; method: string; }[];
}

export default function EditSalaryPage() {
  const router = useRouter();
  const params = useParams();
  const salaryId = params.id as string;
  
  const [salary, setSalary] = useState<Salary | null>(null);
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
          const salaryData = { id: docSnap.id, ...docSnap.data() } as Salary;
          setSalary(salaryData);
          
          // Fetch coach name
          const coachRef = doc(db, "coaches", salaryData.coachId);
          const coachSnap = await getDoc(coachRef);
          if(coachSnap.exists()) {
              setCoachName(coachSnap.data().name);
          }

        } else {
          console.log("No such document!");
          router.push("/dashboard/salaries");
        }
      } catch (error) {
        console.error("Error fetching salary:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchSalary();
  }, [salaryId, router]);


  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
         <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-6 w-6" />
          <span className="sr-only">Retour</span>
        </Button>
        <div>
            <h1 className="text-3xl font-bold tracking-tight">Modifier le salaire</h1>
            <p className="text-muted-foreground">
              Mettez à jour le salaire pour {loading ? "..." : coachName}.
            </p>
        </div>
      </div>
      <Card>
        <CardHeader>
            <CardTitle>Détails du Salaire</CardTitle>
            <CardDescription>Ajoutez un nouveau versement ou modifiez les informations.</CardDescription>
        </CardHeader>
        <CardContent>
            {loading ? (
                <div className="flex justify-center items-center py-20">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            ) : salary ? (
                <AddSalaryForm salary={salary} />
            ) : (
                <p className="p-6">Salaire non trouvé.</p>
            )}
        </CardContent>
      </Card>
    </div>
  );
}
