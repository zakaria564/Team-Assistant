
"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, ArrowLeft, Pencil, FileText, User, Calendar, Hash, DollarSign, BadgeHelp, ClipboardList } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";


interface Salary {
  id: string;
  coachId: string;
  coachName?: string;
  totalAmount: number;
  status: 'Payé' | 'Partiel' | 'En attente' | 'En retard';
  createdAt: { seconds: number, nanoseconds: number };
  description: string;
  transactions: { amount: number; date: { seconds: number, nanoseconds: number }; method: string; }[];
}

const DetailItem = ({ icon: Icon, label, value, children }: { icon: React.ElementType, label: string, value?: string | number, children?: React.ReactNode }) => (
  <div className="flex items-start gap-4">
    <Icon className="h-6 w-6 text-muted-foreground mt-1" />
    <div>
      <p className="text-sm text-muted-foreground">{label}</p>
      <div className="text-base font-medium">{value || children || "Non spécifié"}</div>
    </div>
  </div>
);

const getBadgeClass = (status?: Salary['status']) => {
     switch (status) {
        case 'Payé': return 'bg-green-100 text-green-800 border-green-300';
        case 'Partiel': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
        case 'En attente': return 'bg-gray-100 text-gray-800 border-gray-300';
        case 'En retard': return 'bg-red-100 text-red-800 border-red-300';
        default: return '';
    }
}


export default function SalaryDetailPage() {
  const params = useParams();
  const router = useRouter();
  const salaryId = params.id as string;
  
  const [salary, setSalary] = useState<Salary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!salaryId) return;

    const fetchSalary = async () => {
      setLoading(true);
      try {
        const salaryRef = doc(db, "salaries", salaryId);
        const salarySnap = await getDoc(salaryRef);

        if (salarySnap.exists()) {
          const salaryData = { id: salarySnap.id, ...salarySnap.data() } as Omit<Salary, 'coachName'>;
          
          const coachRef = doc(db, "coaches", salaryData.coachId);
          const coachSnap = await getDoc(coachRef);

          setSalary({
            ...salaryData,
            coachName: coachSnap.exists() ? coachSnap.data().name : "Entraîneur inconnu"
          });

        } else {
          console.log("No such salary document!");
          router.push('/dashboard/salaries');
        }
      } catch (error) {
        console.error("Error fetching salary details:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchSalary();
  }, [salaryId, router]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!salary) {
    return (
      <div className="text-center">
        <p>Salaire non trouvé.</p>
        <Button onClick={() => router.push("/dashboard/salaries")} className="mt-4">Retour à la liste</Button>
      </div>
    );
  }
  
  const amountPaid = salary.transactions?.reduce((sum, t) => sum + t.amount, 0) || 0;
  const amountRemaining = salary.totalAmount - amountPaid;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.back()}>
              <ArrowLeft className="h-6 w-6" />
              <span className="sr-only">Retour</span>
            </Button>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Détails du Salaire</h1>
              <p className="text-muted-foreground">
                  Transaction pour {salary.coachName}.
              </p>
            </div>
        </div>
        <Button asChild className="w-full md:w-auto">
          <Link href={`/dashboard/salaries/${salaryId}/edit`}>
            <Pencil className="mr-2 h-4 w-4" />
            Ajouter un versement
          </Link>
        </Button>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
            <CardHeader>
                <CardTitle className="flex items-center gap-3 text-2xl">
                    <FileText />
                    <span>{salary.description}</span>
                </CardTitle>
                <CardDescription>
                    Créé le {format(new Date(salary.createdAt.seconds * 1000), "dd/MM/yyyy 'à' HH:mm", { locale: fr })}
                </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="w-full overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date du versement</TableHead>
                      <TableHead>Méthode</TableHead>
                      <TableHead className="text-right">Montant</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {salary.transactions?.length > 0 ? (
                      salary.transactions.map((transaction, index) => (
                        <TableRow key={index}>
                          <TableCell>{format(new Date(transaction.date.seconds * 1000), "dd/MM/yyyy 'à' HH:mm", { locale: fr })}</TableCell>
                          <TableCell>{transaction.method}</TableCell>
                          <TableCell className="text-right font-medium">{transaction.amount.toFixed(2)} MAD</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center text-muted-foreground py-6">
                          Aucun versement enregistré pour ce salaire.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
        </Card>

        <div className="space-y-6 lg:col-span-1">
            <Card>
                <CardHeader>
                  <CardTitle>Résumé Financier</CardTitle>
                </CardHeader>
                 <CardContent className="space-y-4">
                    <DetailItem icon={DollarSign} label="Montant total dû" value={`${salary.totalAmount.toFixed(2)} MAD`} />
                    <DetailItem icon={DollarSign} label="Montant total payé" value={`${amountPaid.toFixed(2)} MAD`} />
                    <DetailItem icon={DollarSign} label="Montant restant" value={`${amountRemaining.toFixed(2)} MAD`} />
                    <DetailItem icon={BadgeHelp} label="Statut">
                        <Badge className={cn("text-base", getBadgeClass(salary.status))}>
                            {salary.status}
                        </Badge>
                    </DetailItem>
                </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Entraîneur</CardTitle>
              </CardHeader>
              <CardContent>
                 <DetailItem icon={User} label="Nom de l'entraîneur" value={salary.coachName} />
              </CardContent>
            </Card>
        </div>
      </div>
    </div>
  );
}
