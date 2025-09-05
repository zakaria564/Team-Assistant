
"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PlusCircle, Download, Loader2, MoreHorizontal, Pencil, Trash2, FileText, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { collection, getDocs, query, orderBy, doc, deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { 
  DropdownMenu, 
  DropdownMenuTrigger, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";


interface Salary {
  id: string;
  coachId: string;
  coachName?: string;
  totalAmount: number;
  status: 'Payé' | 'Partiel' | 'En attente' | 'En retard';
  createdAt: { seconds: number, nanoseconds: number };
  description: string;
  transactions: { amount: number; date: any; method: string; }[];
  amountPaid: number;
  amountRemaining: number;
}


export default function SalariesPage() {
  const [salaries, setSalaries] = useState<Salary[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [searchCategory, setSearchCategory] = useState("coachName");

  useEffect(() => {
    const fetchSalaries = async () => {
      setLoading(true);
      try {
        const coachesQuery = query(collection(db, "coaches"));
        const coachesSnapshot = await getDocs(coachesQuery);
        const coachesMap = new Map<string, string>();
        coachesSnapshot.forEach(doc => {
            coachesMap.set(doc.id, doc.data().name);
        });

        const salariesQuery = query(collection(db, "salaries"), orderBy("createdAt", "desc"));
        const salariesSnapshot = await getDocs(salariesQuery);
        const salariesData = salariesSnapshot.docs.map(doc => {
            const data = doc.data() as any;
            
            const transactions = data.transactions || [];
            const amountPaid = transactions.reduce((sum: number, t: any) => sum + t.amount, 0);
            const totalAmount = data.totalAmount || 0;
            const amountRemaining = totalAmount - amountPaid;
            
            return { 
                id: doc.id, 
                ...data,
                coachName: coachesMap.get(data.coachId) || "Entraîneur inconnu",
                amountPaid,
                amountRemaining,
                totalAmount,
                transactions
            } as Salary;
        });

        setSalaries(salariesData);

      } catch (error: any) {
        console.error("Error fetching salaries: ", error);
        toast({
          variant: "destructive",
          title: "Erreur de chargement",
          description: "Impossible de charger les salaires. Vérifiez vos règles de sécurité Firestore.",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchSalaries();
  }, [toast]);

  const filteredSalaries = useMemo(() => {
    if (!searchTerm) return salaries;
    const lowercasedSearchTerm = searchTerm.toLowerCase();

    return salaries.filter(salary => {
        const valueToSearch = (searchCategory === 'coachName' ? salary.coachName : salary.status) || '';
        return valueToSearch.toLowerCase().includes(lowercasedSearchTerm);
    });
  }, [salaries, searchTerm, searchCategory]);


  const handleDeleteSalary = async (salaryId: string) => {
    const salaryToDelete = salaries.find(p => p.id === salaryId);
    if (!salaryToDelete) return;
    
    try {
      await deleteDoc(doc(db, "salaries", salaryToDelete.id));
      setSalaries(salaries.filter(p => p.id !== salaryToDelete.id));
      toast({
        title: "Salaire supprimé",
        description: `Le salaire a été supprimé avec succès.`,
      });
    } catch (error) {
       toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de supprimer le salaire.",
      });
      console.error("Error deleting salary: ", error);
    }
  };

  const getBadgeVariant = (status: Salary['status']) => {
    switch (status) {
        case 'Payé': return 'default';
        case 'Partiel': return 'secondary';
        case 'En retard': return 'destructive';
        default: return 'outline';
    }
  }

  const getBadgeClass = (status: Salary['status']) => {
     switch (status) {
        case 'Payé': return 'bg-green-100 text-green-800 border-green-300';
        case 'Partiel': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
        case 'En attente': return 'bg-gray-100 text-gray-800 border-gray-300';
        case 'En retard': return 'bg-red-100 text-red-800 border-red-300';
        default: return '';
    }
  }

  return (
    <>
      <div>
        <div className="flex items-center justify-between mb-6">
          <div>
              <h1 className="text-3xl font-bold tracking-tight">Salaires des Entraîneurs</h1>
              <p className="text-muted-foreground">Suivez et gérez les salaires des entraîneurs.</p>
          </div>
          <div className="flex gap-2">
              <Button variant="outline">
                  <Download className="mr-2 h-4 w-4" />
                  Exporter
              </Button>
              <Button asChild>
                <Link href="/dashboard/salaries/add">
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Ajouter un salaire
                </Link>
              </Button>
          </div>
        </div>

        <div className="mb-4 flex items-center gap-4">
            <div className="relative w-full max-w-sm">
                 <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input 
                    placeholder="Rechercher..."
                    className="pl-10"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
            <Select value={searchCategory} onValueChange={setSearchCategory}>
                <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Critère" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="coachName">Nom de l'entraîneur</SelectItem>
                    <SelectItem value="status">Statut</SelectItem>
                </SelectContent>
            </Select>
        </div>


        <Card>
          <CardHeader>
            <CardTitle>Suivi des salaires</CardTitle>
            <CardDescription>Liste des dernières transactions et statuts de paiement.</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center items-center py-10">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Entraîneur</TableHead>
                    <TableHead className="hidden lg:table-cell">Description</TableHead>
                    <TableHead className="text-right">Montant Payé</TableHead>
                    <TableHead className="text-right hidden md:table-cell">Montant Restant</TableHead>
                    <TableHead className="text-right hidden xl:table-cell">Montant Total</TableHead>
                    <TableHead className="hidden xl:table-cell">Date de création</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSalaries.length > 0 ? (
                      filteredSalaries.map((salary) => (
                      <TableRow key={salary.id}>
                        <TableCell className="font-medium">{salary.coachName}</TableCell>
                        <TableCell className="text-muted-foreground hidden lg:table-cell">{salary.description}</TableCell>
                        <TableCell className="text-right font-semibold text-green-600">{salary.amountPaid.toFixed(2)} MAD</TableCell>
                        <TableCell className="text-right font-semibold text-red-600 hidden md:table-cell">{salary.amountRemaining.toFixed(2)} MAD</TableCell>
                        <TableCell className="text-right hidden xl:table-cell">{salary.totalAmount.toFixed(2)} MAD</TableCell>
                        <TableCell className="text-muted-foreground hidden xl:table-cell">{format(new Date(salary.createdAt.seconds * 1000), "dd/MM/yyyy 'à' HH:mm", { locale: fr })}</TableCell>
                        <TableCell>
                          <Badge 
                              variant={getBadgeVariant(salary.status)}
                              className={getBadgeClass(salary.status)}
                          >
                              {salary.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0">
                                  <span className="sr-only">Ouvrir le menu</span>
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                <Link href={`/dashboard/salaries/${salary.id}`}>
                                  <DropdownMenuItem className="cursor-pointer">
                                      <FileText className="mr-2 h-4 w-4" />
                                      Voir les détails
                                  </DropdownMenuItem>
                                </Link>
                                <Link href={`/dashboard/salaries/${salary.id}/edit`}>
                                  <DropdownMenuItem className="cursor-pointer">
                                      <Pencil className="mr-2 h-4 w-4" />
                                      Modifier
                                  </DropdownMenuItem>
                                </Link>
                                <DropdownMenuSeparator />
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <DropdownMenuItem 
                                        className="text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer"
                                        onSelect={(e) => e.preventDefault()}
                                        >
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        Supprimer
                                        </DropdownMenuItem>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>Êtes-vous sûr de vouloir supprimer ce salaire ?</AlertDialogTitle>
                                            <AlertDialogDescription>
                                            Cette action est irréversible. Le salaire pour "{salary.description}" sera définitivement supprimé.
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Annuler</AlertDialogCancel>
                                            <AlertDialogAction 
                                            onClick={() => handleDeleteSalary(salary.id)}
                                            className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                                            >
                                            Supprimer
                                            </AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                              </DropdownMenuContent>
                            </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                        <TableCell colSpan={8} className="text-center text-muted-foreground py-10">
                           {searchTerm ? "Aucun salaire ne correspond à votre recherche." : "Aucun salaire trouvé."}
                        </TableCell>
                      </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
