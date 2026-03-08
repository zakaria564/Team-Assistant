
"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PlusCircle, Download, Loader2, MoreHorizontal, Pencil, Trash2, FileText, Search, ChevronDown, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { collection, getDocs, query, doc, where, updateDoc, onSnapshot } from "firebase/firestore";
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

interface Salary {
  id: string;
  coachId: string;
  coachName: string;
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
    currentMonthStatus: string;
}

export default function SalariesPage() {
  const [user, loadingUser] = useAuthState(auth);
  const [salaries, setSalaries] = useState<Salary[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [salaryToDelete, setSalaryToDelete] = useState<Salary | null>(null);
  const [openCollapsibles, setOpenCollapsibles] = useState<Record<string, boolean>>({});
  const [isMounted, setIsMounted] = useState(false);

  // Fix Hydration Mismatch: Only run date logic after mount
  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!user || !isMounted) {
      if (!loadingUser && isMounted) setLoading(false);
      return;
    }

    setLoading(true);

    const fetchData = async () => {
        try {
            const coachesSnap = await getDocs(query(collection(db, "coaches"), where("userId", "==", user.uid)));
            const coachesMap = new Map();
            coachesSnap.docs.forEach(d => coachesMap.set(d.id, { name: d.data().name, photo: d.data().photoUrl }));

            const q = query(
                collection(db, "salaries"), 
                where("userId", "==", user.uid),
                where("isDeleted", "==", false)
            );

            const unsubscribe = onSnapshot(q, (snapshot) => {
                const salariesData = snapshot.docs.map(doc => {
                    const data = doc.data();
                    const coachInfo = coachesMap.get(data.coachId);
                    
                    const transactions = data.transactions || [];
                    const amountPaid = transactions.reduce((sum: number, t: any) => sum + (Number(t.amount) || 0), 0);
                    const totalAmount = Number(data.totalAmount) || 0;
                    const amountRemaining = Math.max(0, totalAmount - amountPaid);
                    
                    let status = data.status || 'En attente';
                    if (amountRemaining <= 0 && totalAmount > 0) status = 'Payé';

                    return { 
                        id: doc.id, 
                        ...data,
                        coachName: coachInfo?.name || "Entraîneur inconnu",
                        coachPhotoUrl: coachInfo?.photo,
                        amountPaid,
                        amountRemaining,
                        totalAmount,
                        transactions,
                        status
                    } as Salary;
                });

                salariesData.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
                setSalaries(salariesData);
                setLoading(false);
            }, (error) => {
                console.error("Salaries Error:", error);
                setLoading(false);
            });

            return unsubscribe;
        } catch (e) {
            console.error("Fetch Data Error:", e);
            setLoading(false);
        }
    };

    const unsub = fetchData();
    return () => { if(unsub && typeof unsub === 'function') unsub(); };
  }, [user, loadingUser, isMounted]);

  const groupedAndFilteredSalaries = useMemo(() => {
    if (!isMounted) return [];
    const grouped: { [key: string]: CoachSalaries } = {};
    const currentMonthStr = `Salaire ${format(new Date(), "MMMM yyyy", { locale: fr })}`.toLowerCase();

    salaries.forEach(salary => {
        const coachId = salary.coachId || 'unknown';
        if (!grouped[coachId]) {
            grouped[coachId] = {
                coachId: coachId,
                coachName: salary.coachName,
                coachPhotoUrl: salary.coachPhotoUrl,
                salaries: [],
                currentMonthStatus: 'N/A'
            };
        }
        grouped[coachId].salaries.push(salary);
        
        if (salary.description?.toLowerCase().includes(currentMonthStr)) {
            grouped[coachId].currentMonthStatus = salary.status;
        }
    });

    let result = Object.values(grouped);
    if (searchTerm) {
        const term = searchTerm.toLowerCase();
        result = result.filter(g => g.coachName.toLowerCase().includes(term));
    }
    return result.sort((a, b) => a.coachName.localeCompare(b.coachName));
  }, [salaries, searchTerm, isMounted]);

  const handleArchive = async () => {
    if(!salaryToDelete) return;
    try {
      await updateDoc(doc(db, "salaries", salaryToDelete.id), { isDeleted: true });
      toast({ title: "Déplacé aux archives", description: "Le règlement a été sauvegardé dans vos copies de sécurité." });
    } catch (e) {
       toast({ variant: "destructive", title: "Erreur", description: "Action impossible." });
    } finally {
        setSalaryToDelete(null);
    }
  };

  if (!isMounted || loading || loadingUser) {
    return (
      <div className="flex justify-center items-center h-full">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
            <h1 className="text-3xl font-bold tracking-tight">Salaires des Entraîneurs</h1>
            <p className="text-muted-foreground">Gestion des règlements et copies de sécurité.</p>
        </div>
        <Button asChild>
          <Link href="/dashboard/salaries/add">
            <PlusCircle className="mr-2 h-4 w-4" /> Ajouter un Salaire
          </Link>
        </Button>
      </div>

      <div className="relative w-full md:max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input 
              placeholder="Rechercher un entraîneur..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
          />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Règlements Actifs</CardTitle>
          <CardDescription>Liste des salaires regroupés par entraîneur.</CardDescription>
        </CardHeader>
        <CardContent>
          {groupedAndFilteredSalaries.length > 0 ? (
              <div className="space-y-2">
                  {groupedAndFilteredSalaries.map((group) => (
                      <Collapsible 
                          key={group.coachId} 
                          className="border rounded-lg"
                          open={openCollapsibles[group.coachId] || false}
                          onOpenChange={(open) => setOpenCollapsibles(prev => ({...prev, [group.coachId]: open}))}
                      >
                          <CollapsibleTrigger className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors">
                              <div className="flex items-center gap-4">
                                   <Avatar>
                                      <AvatarImage src={group.coachPhotoUrl} />
                                      <AvatarFallback>{group.coachName[0]}</AvatarFallback>
                                  </Avatar>
                                  <div className="text-left">
                                      <span className="font-bold block">{group.coachName}</span>
                                      <Badge variant="secondary" className="text-[10px]">{group.salaries.length} règlement(s)</Badge>
                                  </div>
                              </div>
                              <div className="flex items-center gap-4">
                                   <Badge className={cn("hidden sm:inline-flex", 
                                      group.currentMonthStatus === 'Payé' ? 'bg-green-50 text-green-700' : 'bg-orange-50 text-orange-700'
                                   )}>
                                      {group.currentMonthStatus}
                                   </Badge>
                                   {openCollapsibles[group.coachId] ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                              </div>
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                              <div className="p-2 overflow-x-auto">
                                <Table>
                                    <TableHeader><TableRow><TableHead>Description</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                                    <TableBody>
                                        {group.salaries.map((s) => (
                                            <TableRow key={s.id}>
                                                <TableCell>
                                                    <p className="font-medium">{s.description}</p>
                                                    <p className="text-xs text-muted-foreground">{s.amountPaid.toFixed(2)} / {s.totalAmount.toFixed(2)} MAD</p>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            <Link href={`/dashboard/salaries/${s.id}`}><DropdownMenuItem className="cursor-pointer"><FileText className="mr-2 h-4 w-4" /> Détails</DropdownMenuItem></Link>
                                                            <Link href={`/dashboard/salaries/${s.id}/receipt`}><DropdownMenuItem className="cursor-pointer"><Download className="mr-2 h-4 w-4" /> Fiche de paie</DropdownMenuItem></Link>
                                                            <DropdownMenuSeparator />
                                                            <DropdownMenuItem className="text-destructive cursor-pointer" onClick={() => setSalaryToDelete(s)}><Trash2 className="mr-2 h-4 w-4" /> Archiver (Copie)</DropdownMenuItem>
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
              </div>
          ) : <p className="text-center py-10 text-muted-foreground">Aucun salaire enregistré pour le moment.</p>}
        </CardContent>
      </Card>

      <AlertDialog open={!!salaryToDelete} onOpenChange={() => setSalaryToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Archiver ce règlement ?</AlertDialogTitle><AlertDialogDescription>L'élément sera déplacé vers l'onglet Archives pour libérer votre liste active.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
              <AlertDialogCancel>Annuler</AlertDialogCancel>
              <AlertDialogAction onClick={handleArchive} className="bg-destructive hover:bg-destructive/90">Déplacer aux Archives</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
