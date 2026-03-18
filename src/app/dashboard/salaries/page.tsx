
"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PlusCircle, Download, Loader2, MoreHorizontal, Trash2, FileText, Search, ChevronDown, ChevronRight, BellRing } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { collection, query, doc, where, deleteDoc, onSnapshot } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast"; 
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

const toTitleCase = (str: string) => {
  if (!str) return '';
  return str.toLowerCase().split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
};

export default function SalariesPage() {
  const [user, loadingUser] = useAuthState(auth);
  const [salaries, setSalaries] = useState<Salary[]>([]);
  const [coaches, setCoaches] = useState<Coach[]>([]);
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
        const coachesData = coachesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Coach));
        setCoaches(coachesData);

        const salariesQuery = query(collection(db, "salaries"), where("userId", "==", user.uid));
        const unsubscribeSalaries = onSnapshot(salariesQuery, (salariesSnap) => {
            const salariesData = salariesSnap.docs.map(doc => {
                const data = doc.data() as any;
                const transactions = data.transactions || [];
                const amountPaid = transactions.reduce((sum: number, t: any) => sum + (parseFloat(t.amount?.toString() || "0")), 0);
                const totalAmount = data.totalAmount || 0;
                const amountRemaining = Math.max(0, totalAmount - amountPaid);

                return {
                    id: doc.id,
                    ...data,
                    amountPaid,
                    amountRemaining,
                    transactions,
                } as Salary;
            });
            setSalaries(salariesData);
            setLoading(false);
        });
        return () => unsubscribeSalaries();
    });
    return () => unsubscribeCoaches();
  }, [user, loadingUser]);

  const groupedSalaries = useMemo(() => {
    const grouped: Record<string, CoachSalaries> = {};
    
    coaches.forEach(coach => {
        grouped[coach.id] = {
            coachId: coach.id,
            coachName: coach.name,
            coachPhotoUrl: coach.photoUrl,
            salaries: [],
            hasPending: true
        };
    });

    salaries.forEach(salary => {
        if (grouped[salary.coachId]) {
            grouped[salary.coachId].salaries.push(salary);
        }
    });

    return Object.values(grouped).map(group => ({
        ...group,
        hasPending: group.salaries.length === 0 || group.salaries.some(s => s.status !== 'Payé')
    }))
    .filter(group => group.coachName.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => a.coachName.localeCompare(b.coachName));
  }, [salaries, coaches, searchTerm]);

  const confirmDeleteSalary = async () => {
    if (!salaryToDelete) return;
    try {
      await deleteDoc(doc(db, "salaries", salaryToDelete.id));
      toast({ title: "Fiche supprimée" });
    } catch (error) { toast({ variant: "destructive", title: "Erreur" }); }
    finally { setSalaryToDelete(null); }
  };

  if (loading || loadingUser) return <div className="flex justify-center items-center py-20"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tighter italic">Salaires des Entraîneurs</h1>
          <p className="text-muted-foreground font-medium">Suivez les rémunérations techniques.</p>
        </div>
        <Button asChild className="w-full md:w-auto font-black uppercase tracking-widest h-11 shadow-lg">
          <Link href="/dashboard/salaries/add">
            <PlusCircle className="mr-2 h-4 w-4" /> Nouveau Salaire
          </Link>
        </Button>
      </div>

      <div className="relative w-full md:max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <Input 
          placeholder="Rechercher un entraîneur..." 
          className="pl-10 h-12 bg-white shadow-sm dark:bg-slate-900" 
          value={searchTerm} 
          onChange={(e) => setSearchTerm(e.target.value)} 
        />
      </div>

      <div className="space-y-4">
        {groupedSalaries.length === 0 ? (
            <div className="text-center text-muted-foreground py-16 border-2 border-dashed rounded-xl bg-muted/20 italic">Aucun résultat trouvé.</div>
        ) : groupedSalaries.map((group) => (
          <Collapsible 
            key={group.coachId}
            open={openCollapsibles[group.coachId]}
            onOpenChange={(isOpen) => setOpenCollapsibles(prev => ({ ...prev, [group.coachId]: isOpen }))}
            className={cn("border rounded-lg bg-white dark:bg-slate-900 overflow-hidden shadow-sm transition-all", group.hasPending ? "border-red-200 bg-red-50/30 dark:bg-red-950/10" : "border-border")}
          >
            <CollapsibleTrigger className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-4">
                <Avatar className="h-12 w-12 border-2 border-slate-100">
                  <AvatarImage src={group.coachPhotoUrl} />
                  <AvatarFallback className="font-black text-lg">{group.coachName.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="text-left">
                  <p className="text-sm font-bold text-muted-foreground tracking-wider mb-1">
                    {toTitleCase(group.coachName)}
                  </p>
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-bold text-slate-900 dark:text-slate-100 leading-tight">
                      {group.salaries.length} Fiche(s)
                    </p>
                    {group.hasPending && (
                        <Badge className="bg-red-600 text-white border-none text-[8px] font-black uppercase tracking-widest px-1.5 h-4 flex items-center gap-1 animate-pulse">
                            <BellRing className="h-2 w-2" /> Notification
                        </Badge>
                    )}
                  </div>
                </div>
              </div>
              {openCollapsibles[group.coachId] ? <ChevronDown className="h-5 w-5 text-slate-400" /> : <ChevronRight className="h-5 w-5 text-slate-400" />}
            </CollapsibleTrigger>
            <CollapsibleContent className="border-t bg-white dark:bg-slate-950">
              <div className="overflow-x-auto w-full">
                <Table>
                    <TableHeader className="bg-muted/20">
                    <TableRow>
                        <TableHead className="min-w-[140px] font-black uppercase text-[10px] tracking-widest pl-4">Période</TableHead>
                        <TableHead className="hidden sm:table-cell font-black uppercase text-[10px] tracking-widest">Fixé</TableHead>
                        <TableHead className="font-black uppercase text-[10px] tracking-widest">Payé</TableHead>
                        <TableHead className="font-black uppercase text-[10px] tracking-widest text-center">Statut</TableHead>
                        <TableHead className="text-right font-black uppercase text-[10px] tracking-widest pr-4">Actions</TableHead>
                    </TableRow>
                    </TableHeader>
                    <TableBody>
                    {group.salaries.length > 0 ? group.salaries.map((salary) => (
                        <TableRow key={salary.id} className="h-14">
                        <TableCell className="font-bold text-xs pl-4">{salary.description}</TableCell>
                        <TableCell className="hidden sm:table-cell text-xs font-bold text-slate-500">{salary.totalAmount.toFixed(2)} MAD</TableCell>
                        <TableCell className="text-green-600 font-black text-xs">{salary.amountPaid.toFixed(2)} MAD</TableCell>
                        <TableCell className="text-center">
                            <Badge className={cn("whitespace-nowrap text-[9px] px-2 font-black uppercase tracking-tighter", getBadgeClass(salary.status))}>
                            {salary.status}
                            </Badge>
                        </TableCell>
                        <TableCell className="text-right pr-4">
                            <div className="flex items-center justify-end gap-1">
                                <Button variant="ghost" size="icon" asChild className="h-8 w-8 hover:bg-slate-100 border border-slate-100 dark:border-slate-800">
                                    <Link href={`/dashboard/salaries/${salary.id}`}>
                                        <FileText className="h-4 w-4 text-primary" />
                                    </Link>
                                </Button>
                                <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-slate-100 border border-slate-100 dark:border-slate-800">
                                        <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-52">
                                    <DropdownMenuLabel className="text-[10px] uppercase tracking-widest text-slate-400 font-black">Actions</DropdownMenuLabel>
                                    {salary.status !== 'Payé' && (
                                        <Link href={`/dashboard/salaries/${salary.id}/edit`} passHref>
                                            <DropdownMenuItem className="cursor-pointer font-black text-primary bg-primary/5">
                                                <PlusCircle className="mr-2 h-4 w-4" /> Ajouter versement
                                            </DropdownMenuItem>
                                        </Link>
                                    )}
                                    <Link href={`/dashboard/salaries/${salary.id}/receipt`} passHref>
                                        <DropdownMenuItem className="cursor-pointer">
                                            <Download className="mr-2 h-4 w-4" /> Exporter reçu PDF
                                        </DropdownMenuItem>
                                    </Link>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem className="cursor-pointer text-red-600 font-bold focus:bg-red-50" onClick={() => setSalaryToDelete(salary)}>
                                        <Trash2 className="mr-2 h-4 w-4" /> Supprimer
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        </TableCell>
                        </TableRow>
                    )) : (
                        <TableRow>
                            <TableCell colSpan={5} className="text-center py-10">
                                <div className="flex flex-col items-center gap-3">
                                    <p className="text-muted-foreground text-xs italic">Aucune fiche de salaire ouverte pour cet entraîneur.</p>
                                    <Button asChild variant="outline" size="sm" className="h-9 text-[10px] font-black uppercase tracking-widest border-primary text-primary hover:bg-primary hover:text-white transition-all">
                                        <Link href={`/dashboard/salaries/add?coachId=${group.coachId}`}>
                                            <PlusCircle className="mr-2 h-3 w-3" /> Ouvrir une nouvelle fiche
                                        </Link>
                                    </Button>
                                </div>
                            </TableCell>
                        </TableRow>
                    )}
                    </TableBody>
                </Table>
              </div>
            </CollapsibleContent>
          </Collapsible>
        ))}
      </div>

      <AlertDialog open={!!salaryToDelete} onOpenChange={() => setSalaryToDelete(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-black text-xl uppercase tracking-tight">Supprimer cette fiche ?</AlertDialogTitle>
            <AlertDialogDescription className="font-medium text-slate-600">Cette action supprimera tout l'historique associé à cette période.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="rounded-xl font-bold">Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteSalary} className="bg-red-600 text-white hover:bg-red-700 font-black rounded-xl uppercase tracking-widest">Supprimer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
