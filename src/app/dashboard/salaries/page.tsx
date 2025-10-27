
"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PlusCircle, Download, Loader2, MoreHorizontal, Pencil, Trash2, FileText, Search, ChevronDown, ChevronRight } from "lucide-react";
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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";


interface Salary {
  id: string;
  coachId: string;
  coachName?: string;
  coachPhotoUrl?: string;
  totalAmount: number;
  status: 'Payé' | 'Partiel' | 'En attente' | 'En retard';
  createdAt: { seconds: number, nanoseconds: number };
  description: string;
  transactions: { amount: number; date: any; method: string; }[];
  amountPaid: number;
  amountRemaining: number;
}

type SalaryStatus = Salary['status'];

interface CoachSalaries {
    coachId: string;
    coachName: string;
    coachPhotoUrl?: string;
    salaries: Salary[];
    currentMonthStatus?: SalaryStatus | 'N/A';
}

const normalizeString = (str: string | null | undefined) => {
    if (!str) return '';
    return str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '');
};

const getBadgeClass = (status?: SalaryStatus | 'N/A') => {
     switch (status) {
        case 'Payé': return 'bg-green-100 text-green-800 border-green-300';
        case 'Partiel': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
        case 'En attente': return 'bg-gray-100 text-gray-800 border-gray-300';
        case 'En retard': return 'bg-red-100 text-red-800 border-red-300';
        case 'N/A': return 'bg-gray-100 text-gray-800 border-gray-300';
        default: return '';
    }
};


export default function SalariesPage() {
  const [user, loadingUser] = useAuthState(auth);
  const [salaries, setSalaries] = useState<Salary[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [salaryToDelete, setSalaryToDelete] = useState<Salary | null>(null);
  const [openCollapsibles, setOpenCollapsibles] = useState<Record<string, boolean>>({});

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
        const coachesMap = new Map<string, {name: string, photoUrl?: string}>();
        coachesSnapshot.forEach(doc => {
            coachesMap.set(doc.id, { name: doc.data().name, photoUrl: doc.data().photoUrl });
        });

        const salariesQuery = query(collection(db, "salaries"), where("userId", "==", user.uid));
        const salariesSnapshot = await getDocs(salariesQuery);
        const salariesData = salariesSnapshot.docs
            .map(doc => {
                const data = doc.data() as any;
                
                if (!coachesMap.has(data.coachId)) {
                    return null;
                }

                const transactions = data.transactions || [];
                const amountPaid = transactions.reduce((sum: number, t: any) => sum + t.amount, 0);
                const totalAmount = data.totalAmount || 0;
                const amountRemaining = totalAmount - amountPaid;
                
                let status: SalaryStatus = data.status;
                if (amountRemaining <= 0) {
                  status = 'Payé';
                }

                return { 
                    id: doc.id, 
                    ...data,
                    coachName: coachesMap.get(data.coachId)?.name || "Entraîneur inconnu",
                    coachPhotoUrl: coachesMap.get(data.coachId)?.photoUrl,
                    amountPaid,
                    amountRemaining,
                    totalAmount,
                    transactions,
                    status
                } as Salary;
            })
            .filter((s): s is Salary => s !== null);
        
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

  const groupedAndFilteredSalaries: CoachSalaries[] = useMemo(() => {
    const grouped: { [key: string]: CoachSalaries } = {};
    const currentMonthDesc = `Salaire ${format(new Date(), "MMMM yyyy", { locale: fr })}`;
    const normalizedCurrentMonthDesc = normalizeString(currentMonthDesc);

    salaries.forEach(salary => {
        if (!grouped[salary.coachId]) {
            grouped[salary.coachId] = {
                coachId: salary.coachId,
                coachName: salary.coachName || "Entraîneur inconnu",
                coachPhotoUrl: salary.coachPhotoUrl,
                salaries: [],
                currentMonthStatus: 'N/A'
            };
        }
        grouped[salary.coachId].salaries.push(salary);
        
        const normalizedSalaryDesc = normalizeString(salary.description);
        if(normalizedSalaryDesc === normalizedCurrentMonthDesc) {
            grouped[salary.coachId].currentMonthStatus = salary.status;
        }
    });

    let result = Object.values(grouped);

    if (searchTerm) {
        const lowercasedSearchTerm = searchTerm.toLowerCase();
        result = result.filter(coachGroup => 
            coachGroup.coachName.toLowerCase().includes(lowercasedSearchTerm)
        );
    }

    return result.sort((a, b) => a.coachName.localeCompare(b.coachName));

  }, [salaries, searchTerm]);


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
  
  const handleExport = () => {
    const csvHeader = "Entraîneur;Description;Montant Total;Montant Payé;Montant Restant;Statut;Date de Création\n";
    const allSalariesToExport = groupedAndFilteredSalaries.flatMap(group => group.salaries);
    
    const csvRows = allSalariesToExport.map(s => {
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
                    placeholder="Rechercher un entraîneur..."
                    className="pl-10"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
        </div>


        <Card>
          <CardHeader>
            <CardTitle>Suivi des salaires</CardTitle>
            <CardDescription>Liste des salaires regroupés par entraîneur.</CardDescription>
          </CardHeader>
          <CardContent>
            {loading || loadingUser ? (
              <div className="flex justify-center items-center py-10">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : groupedAndFilteredSalaries.length > 0 ? (
                <div className="space-y-2">
                    {groupedAndFilteredSalaries.map((coachGroup) => (
                        <Collapsible 
                            key={coachGroup.coachId} 
                            className="border rounded-lg"
                            open={openCollapsibles[coachGroup.coachId] || false}
                            onOpenChange={(isOpen) => setOpenCollapsibles(prev => ({...prev, [coachGroup.coachId]: isOpen}))}
                        >
                            <CollapsibleTrigger className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors">
                                <div className="flex items-center gap-4">
                                     <Avatar>
                                        <AvatarImage src={coachGroup.coachPhotoUrl} alt={coachGroup.coachName} />
                                        <AvatarFallback>{coachGroup.coachName?.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                    <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2">
                                        <span className="font-medium">{coachGroup.coachName}</span>
                                        <Badge variant="secondary" className="w-fit mt-1 sm:mt-0">{coachGroup.salaries.length} paiement(s)</Badge>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                     <Badge className={cn("whitespace-nowrap", getBadgeClass(coachGroup.currentMonthStatus))}>
                                        {coachGroup.currentMonthStatus}
                                     </Badge>
                                     {openCollapsibles[coachGroup.coachId] ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                                </div>
                            </CollapsibleTrigger>
                            <CollapsibleContent>
                                <div className="w-full overflow-x-auto p-2">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                        <TableHead>Description</TableHead>
                                        <TableHead className="hidden md:table-cell">Montant</TableHead>
                                        <TableHead className="hidden sm:table-cell">Statut</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {coachGroup.salaries.map((salary) => {
                                            return (
                                                <TableRow key={salary.id}>
                                                    <TableCell>
                                                        <div className="flex flex-col">
                                                            <span className="font-medium">{salary.description}</span>
                                                            <span className="text-muted-foreground text-sm md:hidden">{salary.amountPaid.toFixed(2)} / {salary.totalAmount.toFixed(2)} MAD</span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="hidden md:table-cell">{salary.amountPaid.toFixed(2)} / {salary.totalAmount.toFixed(2)} MAD</TableCell>
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
                                                            {salary.status !== 'Payé' && (
                                                                <DropdownMenuItem asChild className="cursor-pointer">
                                                                    <Link href={`/dashboard/salaries/${salary.id}/edit`}>
                                                                        <PlusCircle className="mr-2 h-4 w-4" />
                                                                        Ajouter un versement
                                                                    </Link>
                                                                </DropdownMenuItem>
                                                            )}
                                                            <DropdownMenuItem asChild className="cursor-pointer">
                                                                <Link href={`/dashboard/salaries/${salary.id}/receipt`}>
                                                                    <Download className="mr-2 h-4 w-4" />
                                                                    Exporter la fiche
                                                                </Link>
                                                            </DropdownMenuItem>
                                                            <DropdownMenuSeparator />
                                                            <DropdownMenuItem
                                                                className="cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10"
                                                                onClick={() => setSalaryToDelete(salary)}
                                                            >
                                                                <Trash2 className="mr-2 h-4 w-4" />
                                                                Supprimer
                                                            </DropdownMenuItem>
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>
                                                    </TableCell>
                                                </TableRow>
                                            )
                                        })}
                                    </TableBody>
                                    </Table>
                                </div>
                            </CollapsibleContent>
                        </Collapsible>
                    ))}
                </div>
            ) : (
                <div className="text-center text-muted-foreground py-10">
                    {searchTerm ? "Aucun entraîneur ne correspond à votre recherche." : "Aucun salaire trouvé."}
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
