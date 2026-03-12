
"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, ArrowLeft, Banknote } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

export default function SalaryDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: salaryId } = React.use(params);
  const router = useRouter();
  const [salary, setSalary] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!salaryId) return;
    const fetchSalary = async () => {
      setLoading(true);
      try {
        const snap = await getDoc(doc(db, "salaries", salaryId));
        if (snap.exists()) {
          const data = snap.data();
          const cSnap = await getDoc(doc(db, "coaches", data.coachId));
          setSalary({ id: snap.id, ...data, coachName: cSnap.exists() ? cSnap.data().name : "Entraîneur inconnu" });
        } else router.push('/dashboard/salaries');
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    fetchSalary();
  }, [salaryId, router]);

  if (loading) return <div className="flex justify-center items-center h-full py-20"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
  if (!salary) return null;

  const totalPaid = salary.transactions?.reduce((sum: number, t: any) => sum + (t.amount || 0), 0) || 0;
  const remaining = salary.totalAmount - totalPaid;

  return (
    <div className="space-y-6 px-2 sm:px-0">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}><ArrowLeft className="h-6 w-6" /></Button>
        <h1 className="text-xl sm:text-3xl font-bold tracking-tight">Détails du Salaire</h1>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg sm:text-2xl"><Banknote className="text-primary h-5 w-5 sm:h-6 sm:w-6" /> {salary.description}</CardTitle>
            <CardDescription>Entraîneur : {salary.coachName}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
                <Table className="min-w-[400px] sm:min-w-full">
                <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Méthode</TableHead><TableHead className="text-right">Montant</TableHead></TableRow></TableHeader>
                <TableBody>
                    {salary.transactions?.map((t: any, i: number) => (
                    <TableRow key={i}>
                        <TableCell className="whitespace-nowrap text-xs sm:text-sm">{t.date?.seconds ? format(new Date(t.date.seconds * 1000), "dd/MM/yy", { locale: fr }) : 'N/A'}</TableCell>
                        <TableCell className="text-xs sm:text-sm">{t.method}</TableCell>
                        <TableCell className="text-right font-medium whitespace-nowrap text-xs sm:text-sm">{t.amount.toFixed(2)} MAD</TableCell>
                    </TableRow>
                    ))}
                </TableBody>
                </Table>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-lg sm:text-xl">Résumé</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between text-sm sm:text-base"><span>Salaire Total :</span><span className="font-bold">{salary.totalAmount.toFixed(2)} MAD</span></div>
            <div className="flex justify-between text-sm sm:text-base"><span>Déjà Payé :</span><span className="font-bold text-green-600">{totalPaid.toFixed(2)} MAD</span></div>
            <div className="flex justify-between text-sm sm:text-base">
                <span>Reste :</span>
                <span className={cn(
                    "font-bold",
                    remaining > 0.01 ? "text-red-600" : "text-muted-foreground"
                )}>
                    {remaining.toFixed(2)} MAD
                </span>
            </div>
            <Badge className={cn("w-full justify-center text-base py-1", salary.status === 'Payé' ? 'bg-green-50 text-green-700' : 'bg-orange-50 text-orange-700')}>{salary.status}</Badge>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
