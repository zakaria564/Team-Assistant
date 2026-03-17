"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PlusCircle, Loader2, MoreHorizontal, Pencil, Trash2, FileText, Search, ChevronDown, ChevronRight, AlertCircle, Filter, Download } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { collection, getDocs, query, doc, where, deleteDoc, onSnapshot } from "firebase/firestore";
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
import { cn } from "@/lib/utils";
import { useAuthState } from "react-firebase-hooks/auth";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface Coach {
    id: string;
    name: string;
    photoUrl?: string;
}

interface Salary {
  id: string;
  coachId: string;
  coachName?: string;
  coachPhotoUrl?: string;
  totalAmount: number;
  status: 'Payé' | 'Partiel' | 'En attente' | 'En retard';
  createdAt: any;
  description: string;
  transactions: { amount: number; date: any; method: string; }[];
  amountPaid: number;
  amountRemaining: number;
}

interface CoachSalaries {
    coachId: string;
    coachName: string;
    coachPhotoUrl?: string;
    salaries: Salary[];
    hasPending: boolean;
}

const getBadgeClass = (status?: Salary['status']) => {
     switch (status) {
        case 'Payé': return 'bg-green-50 text-green-700 border-green-100';
        case 'Partiel': return 'bg-orange-50 text-orange-700 border-orange-100';
        case 'En attente': return 'bg-gray-100 text-gray-800 border-gray-300';
        case 'En retard': return 'bg-red-100 text-red-800 border-red-300';
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
    if (!user) {
        if (!loadingUser) setLoading(false);
        return;
    }

    setLoading(true);
    
    const coachesQuery = query(collection(db, "coaches"), where("userId", "==", user.uid));
    const unsubscribeCoaches = onSnapshot(coachesQuery, (coachesSnap) => {
        const coachesMap = new Map<string, Coach>();
        coachesSnap.forEach(doc => coachesMap.set(doc.id, { id: doc.id, ...doc.data() } as Coach));

        const salariesQuery = query(collection(db, "salaries"), where("userId", "==", user.uid));
        const unsubscribeSalaries = onSnapshot(salariesQuery, (salariesSnap) => {
            const salariesData = salariesSnap.docs.map(doc => {
                const data = doc.data();
                const coach = coachesMap.get(data.coachId);
                if (!coach) return null;

                const transactions = data.transactions || [];
                const amountPaid = transactions.reduce((sum: number, t: any) => sum + (parseFloat(t.amount?.toString() || "0")), 0);
                const totalAmount = data.totalAmount || 0;
                const amountRemaining = totalAmount - amountPaid;

                let calculatedStatus = data.status;
                if (amountRemaining > 0.01 && amountPaid > 0) {
                    calculatedStatus = 'Partiel';
                } else if (amountRemaining <= 0.01 && totalAmount > 0) {
                    calculatedStatus = 'Payé';
                } else if (amountPaid === 0 && totalAmount > 0) {
                    calculatedStatus = 'En attente';
                }

                return {
                    id: doc.id,
                    ...data,
                    coachName: coach.name,
                    coachPhotoUrl: coach.photoUrl,
                    amountPaid,
                    amountRemaining,
                    status: calculatedStatus
                } as Salary;
            }).filter(s => s !== null) as Salary[];

            setSalaries(salariesData.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)));
            setLoading(false);
        });

        return () => unsubscribeSalaries();
    });

    return () => unsubscribeCoaches();
  }, [user, loadingUser]);

  const groupedSalaries = useMemo(() => {
    const grouped: Record<string, CoachSalaries> = {};
    salaries.forEach(salary => {
        if (!grouped[salary.coachId]) {
            grouped[salary.coachId] = {
                coachId: salary.coachId,
                coachName: salary.coachName || "Coach inconnu",
                coachPhotoUrl: salary.coachPhotoUrl,
                salaries: [],
                hasPending: false
            };
        }
        grouped[salary.coachId].salaries.push(salary);
        if (salary.status !== 'Payé') grouped[salary.coachId].hasPending = true;
    });

    return Object.values(grouped)
        .filter(group => group.coachName.toLowerCase().includes(searchTerm.toLowerCase()))
        .sort((a, b) => a.coachName.localeCompare(b.coachName));
  }, [salaries, searchTerm]);

  const confirmDeleteSalary = async () => {
    if (!salaryToDelete) return;
    try {
      await deleteDoc(doc(db, "salaries", salaryToDelete.id));
      toast({ title: "Salaire supprimé" });
    } catch (error) {
      toast({ variant: "destructive", title: "Erreur lors de la suppression" });
    } finally {
      setSalaryToDelete(null);
    }
  };

  if (loading || loadingUser) return <div className="flex justify-center items-center py-20"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Salaires des Entraîneurs</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">Suivez les rémunérations et l'état des paiements.</p>
        </div>
        <Button asChild className="w-full sm:w-auto h-12 md:h-10 text-base md:text-sm">
          <Link href="/dashboard/salaries/add">
            <PlusCircle className="mr-2 h-5 w-5 md:h-4 md:w-4" /> Nouveau Salaire
          </Link>
        </Button>
      </div>

      <div className="relative w-full md:max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <Input 
          placeholder="Rechercher un entraîneur..." 
          className="pl-10 h-12 md:h-11 text-base md:text-sm" 
          value={searchTerm} 
          onChange={(e) => setSearchTerm(e.target.value)} 
        />
      </div>

      <div className="space-y-4">
        {groupedSalaries.map((group) => (
          <Collapsible 
            key={group.coachId}
            open={openCollapsibles[group.coachId]}
            onOpenChange={(isOpen) => setOpenCollapsibles(prev => ({ ...prev, [group.coachId]: isOpen }))}
            className="border rounded-lg bg-card overflow-hidden shadow-sm"
          >
            <CollapsibleTrigger className="w-full p-4 md:p-5 flex items-center justify-between hover:bg-muted/50 transition-colors min-h-[80px]">
              <div className="flex items-center gap-4 sm:gap-6 flex-1 min-w-0">
                <Avatar className="h-14 w-14 shrink-0 border-2 border-primary/10 shadow-sm">
                  <AvatarImage src={group.coachPhotoUrl} />
                  <AvatarFallback className="font-black text-lg">{group.coachName.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="text-left min-w-0">
                  <p className="font-bold text-base uppercase tracking-widest text-muted-foreground leading-none mb-1">{group.coachName}</p>
                  <div className="flex items-center gap-2">
                    <p className="text-sm text-slate-900 font-black uppercase tracking-tighter">{group.salaries.length} fiche(s)</p>
                    {group.hasPending && <Badge variant="destructive" className="text-[9px] px-1.5 h-4 font-black uppercase tracking-tighter">Solde dû</Badge>}
                  </div>
                </div>
              </div>
              {openCollapsibles[group.coachId] ? <ChevronDown className="h-6 w-6 shrink-0 text-slate-400" /> : <ChevronRight className="h-6 w-6 shrink-0 text-slate-400" />}
            </CollapsibleTrigger>
            <CollapsibleContent className="border-t bg-slate-50/30">
              <div className="overflow-x-auto w-full">
                <Table>
                    <TableHeader className="bg-muted/20">
                    <TableRow>
                        <TableHead className="min-w-[140px] font-black uppercase text-[10px] tracking-widest">Période</TableHead>
                        <TableHead className="hidden sm:table-cell font-black uppercase text-[10px] tracking-widest">Fixé</TableHead>
                        <TableHead className="font-black uppercase text-[10px] tracking-widest">Payé</TableHead>
                        <TableHead className="font-black uppercase text-[10px] tracking-widest text-center">Statut</TableHead>
                        <TableHead className="text-right font-black uppercase text-[10px] tracking-widest pr-4">Actions</TableHead>
                    </TableRow>
                    </TableHeader>
                    <TableBody>
                    {group.salaries.map((salary) => (
                        <TableRow key={salary.id} className="hover:bg-muted/10 h-16 md:h-auto">
                        <TableCell className="font-bold text-xs sm:text-sm pl-4">{salary.description}</TableCell>
                        <TableCell className="hidden sm:table-cell text-xs font-bold text-slate-600">{salary.totalAmount.toFixed(2)} MAD</TableCell>
                        <TableCell className="text-green-600 font-black text-xs sm:text-sm">{salary.amountPaid.toFixed(2)} MAD</TableCell>
                        <TableCell className="text-center">
                            <Badge className={cn("whitespace-nowrap text-[9px] px-2 py-0.5 font-black uppercase tracking-tighter", getBadgeClass(salary.status))}>
                            {salary.status}
                            </Badge>
                        </TableCell>
                        <TableCell className="text-right pr-4">
                            <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-10 w-10 md:h-8 md:w-8 hover:bg-white shadow-sm border border-slate-100">
                                    <MoreHorizontal className="h-5 w-5 md:h-4 md:w-4 text-slate-600" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56 p-2 shadow-xl border-2">
                                <DropdownMenuLabel className="text-[10px] uppercase tracking-widest text-slate-400 font-black mb-1">Actions</DropdownMenuLabel>
                                <Link href={`/dashboard/salaries/${salary.id}`} passHref>
                                    <DropdownMenuItem className="cursor-pointer py-2.5 font-bold text-xs uppercase tracking-tight">
                                        <FileText className="mr-3 h-4 w-4 text-primary" /> Détails complets
                                    </DropdownMenuItem>
                                </Link>
                                {salary.status !== 'Payé' && (
                                    <Link href={`/dashboard/salaries/${salary.id}/edit`} passHref>
                                        <DropdownMenuItem className="cursor-pointer py-2.5 font-black text-xs uppercase tracking-tight text-primary bg-primary/5">
                                            <PlusCircle className="mr-3 h-4 w-4" /> Ajouter versement
                                        </DropdownMenuItem>
                                    </Link>
                                )}
                                <Link href={`/dashboard/salaries/${salary.id}/receipt`} passHref>
                                    <DropdownMenuItem className="cursor-pointer py-2.5 font-bold text-xs uppercase tracking-tight text-slate-600">
                                        <Download className="mr-3 h-4 w-4 text-slate-600" /> Reçu de paie (PDF)
                                    </DropdownMenuItem>
                                </Link>
                                <DropdownMenuSeparator className="my-1" />
                                <DropdownMenuItem className="cursor-pointer py-2.5 font-black text-xs uppercase tracking-tight text-destructive focus:bg-destructive/10 focus:text-destructive" onClick={() => setSalaryToDelete(salary)}>
                                    <Trash2 className="mr-3 h-4 w-4" /> Supprimer
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                            </DropdownMenu>
                        </TableCell>
                        </TableRow>
                    ))}
                    </TableBody>
                </Table>
              </div>
            </CollapsibleContent>
          </Collapsible>
        ))}
        {groupedSalaries.length === 0 && (
          <div className="text-center py-24 text-muted-foreground border rounded-lg bg-card bg-slate-50/50 italic">
            Aucun enregistrement trouvé.
          </div>
        )}
      </div>

      <AlertDialog open={!!salaryToDelete} onOpenChange={() => setSalaryToDelete(null)}>
        <AlertDialogContent className="w-[95%] rounded-xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-black">Supprimer cette fiche ?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-600 font-medium">Cette action supprimera tout l'historique associé à cette période.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel className="h-12 md:h-10 font-bold rounded-xl">Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteSalary} className="bg-destructive text-white hover:bg-destructive/90 h-12 md:h-10 font-black rounded-xl uppercase tracking-widest">Confirmer la suppression</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
