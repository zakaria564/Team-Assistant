
"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PlusCircle, Download, Loader2, MoreHorizontal, Pencil, Trash2, FileText, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { collection, getDocs, query, doc, deleteDoc, where } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
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
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useAuthState } from "react-firebase-hooks/auth";


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
  const [user, loadingUser] = useAuthState(auth);
  const [salaries, setSalaries] = useState<Salary[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [searchCategory, setSearchCategory] = useState("coachName");
  const [salaryToDelete, setSalaryToDelete] = useState<Salary | null>(null);

  useEffect(() => {
    const fetchSalaries = async () => {
        if (!user) {
            if (!loadingUser) setLoading(false);
            return;
        }
      setLoading(true);
      try {
        const coachesQuery = query(collection(db, "coaches"), where("userId", "==", user.uid));
        const coachesSnapshot = await getDocs(coachesQuery);
        const coachesMap = new Map<string, string>();
        coachesSnapshot.forEach(doc => {
            coachesMap.set(doc.id, doc.data().name);
        });

        const salariesQuery = query(collection(db, "salaries"));
        const salariesSnapshot = await getDocs(salariesQuery);
        const salariesData = salariesSnapshot.docs.map(doc => {
            const data = doc.data() as any;
            
            const transactions = data.transactions || [];
            const amountPaid = transactions.reduce((sum: number, t: any) => sum + t.amount, 0);
            const totalAmount = data.totalAmount || 0;
            const amountRemaining = totalAmount - amountPaid;
            
            let status = data.status;
            if (amountRemaining <= 0) {
              status = 'Payé';
            }

            return { 
                id: doc.id, 
                ...data,
                coachName: coachesMap.get(data.coachId) || "Entraîneur inconnu",
                amountPaid,
                amountRemaining,
                totalAmount,
                transactions,
                status // Use the corrected status
            } as Salary;
        });
        
        const sortedSalaries = salariesData.sort((a, b) => b.createdAt.seconds - a.createdAt.seconds);
        setSalaries(sortedSalaries);

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
  }, [user, loadingUser, toast]);

  const filteredSalaries = useMemo(() => {
    if (!searchTerm) return salaries;
    const lowercasedSearchTerm = searchTerm.toLowerCase();

    return salaries.filter(salary => {
        const valueToSearch = (searchCategory === 'coachName' ? salary.coachName : salary.status) || '';
        return valueToSearch.toLowerCase().includes(lowercasedSearchTerm);
    });
  }, [salaries, searchTerm, searchCategory]);


  const confirmDeleteSalary = async () => {
    if(!salaryToDelete) return;
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
    } finally {
        setSalaryToDelete(null);
    }
  };

  const getBadgeClass = (status: Salary['status']) => {
     switch (status) {
        case 'Payé': return 'bg-green-100 text-green-800 border-green-300';
        case 'Partiel': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
        case 'En attente': return 'bg-gray-100 text-gray-800 border-gray-300';
        case 'En retard': return 'bg-red-100 text-red-800 border-red-300';
        default: return '';
    }
  }
  
  const handleExport = () => {
    const csvHeader = "Entraîneur;Description;Montant Total;Montant Payé;Montant Restant;Statut;Date de Création\n";
    const csvRows = filteredSalaries.map(s => {
      const row = [
        `"${s.coachName}"`,
        `"${s.description}"`,
        s.totalAmount.toFixed(2),
        s.amountPaid.toFixed(2),
        s.amountRemaining.toFixed(2),
        s.status,
        format(new Date(s.createdAt.seconds * 1000), "yyyy-MM-dd HH:mm", { locale: fr })
      ].join(';');
      return row;
    }).join('\n');

    const csvString = `${csvHeader}${csvRows}`;
    const blob = new Blob([`\uFEFF${csvString}`], { type: 'text/csv;charset=utf-8;' });

    const link = document.createElement("a");
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", `export_salaires_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <>
      <div>
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
          <div>
              <h1 className="text-3xl font-bold tracking-tight">Salaires des Entraîneurs</h1>
              <p className="text-muted-foreground">Suivez et gérez les salaires des entraîneurs.</p>
          </div>
          <div className="flex gap-2 w-full md:w-auto">
              <Button variant="outline" className="w-1/2 md:w-auto" onClick={handleExport}>
                  <Download className="mr-2 h-4 w-4" />
                  Exporter
              </Button>
              <Button asChild className="w-1/2 md:w-auto">
                <Link href="/dashboard/salaries/add">
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Ajouter
                </Link>
              </Button>
          </div>
        </div>

        <div className="mb-4 flex flex-col md:flex-row items-center gap-4">
            <div className="relative w-full md:max-w-sm">
                 <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input 
                    placeholder="Rechercher..."
                    className="pl-10"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
            <Select value={searchCategory} onValueChange={setSearchCategory}>
                <SelectTrigger className="w-full md:w-[180px]">
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
            {loading || loadingUser ? (
              <div className="flex justify-center items-center py-10">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <div className="w-full overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Entraîneur</TableHead>
                      <TableHead className="hidden md:table-cell">Montant Payé</TableHead>
                      <TableHead className="hidden sm:table-cell">Statut</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSalaries.length > 0 ? (
                        filteredSalaries.map((salary) => {
                          const isPaid = salary.status === 'Payé';
                          return (
                            <TableRow key={salary.id}>
                              <TableCell>
                                <div className="flex flex-col">
                                    <span className="font-medium">{salary.coachName}</span>
                                    <span className="text-muted-foreground text-sm md:hidden">{salary.amountPaid.toFixed(2)} MAD</span>
                                </div>
                              </TableCell>
                              <TableCell className="hidden md:table-cell">{salary.amountPaid.toFixed(2)} MAD</TableCell>
                              <TableCell className="hidden sm:table-cell">
                                <Badge className={cn("whitespace-nowrap", getBadgeClass(salary.status))}>
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
                                      <DropdownMenuItem asChild className="cursor-pointer">
                                        <Link href={`/dashboard/salaries/${salary.id}`}>
                                            <FileText className="mr-2 h-4 w-4" />
                                            Voir les détails
                                        </Link>
                                      </DropdownMenuItem>
                                      {!isPaid && (
                                          <DropdownMenuItem asChild className="cursor-pointer">
                                            <Link href={`/dashboard/salaries/${salary.id}/edit`}>
                                                <PlusCircle className="mr-2 h-4 w-4" />
                                                Ajouter un versement
                                            </Link>
                                          </DropdownMenuItem>
                                      )}
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem 
                                        className="text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer"
                                        onSelect={() => setSalaryToDelete(salary)}
                                      >
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        Supprimer
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                              </TableCell>
                            </TableRow>
                          )
                        })
                    ) : (
                      <TableRow>
                          <TableCell colSpan={4} className="text-center text-muted-foreground py-10">
                             {searchTerm ? "Aucun salaire ne correspond à votre recherche." : "Aucun salaire trouvé."}
                          </TableCell>
                        </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={!!salaryToDelete} onOpenChange={(isOpen) => !isOpen && setSalaryToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
              <AlertDialogTitle>Êtes-vous sûr de vouloir supprimer ce salaire ?</AlertDialogTitle>
              <AlertDialogDescription>
              Cette action est irréversible. Le salaire pour "{salaryToDelete?.description}" sera définitivement supprimé.
              </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setSalaryToDelete(null)}>Annuler</AlertDialogCancel>
              <AlertDialogAction 
              onClick={confirmDeleteSalary}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
              >
              Supprimer
              </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
