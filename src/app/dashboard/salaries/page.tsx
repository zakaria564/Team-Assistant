
"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PlusCircle, Loader2, MoreHorizontal, Pencil, Trash2, FileText, Search, ChevronDown, ChevronRight } from "lucide-react";
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

interface Salary {
  id: string;
  coachId: string;
  coachName: string;
  coachPhotoUrl?: string;
  totalAmount: number;
  status: string;
  description: string;
  transactions: any[];
}

export default function SalariesPage() {
  const [user, loadingUser] = useAuthState(auth);
  const [salaries, setSalaries] = useState<Salary[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [salaryToDelete, setSalaryToDelete] = useState<Salary | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => { setIsMounted(true); }, []);

  useEffect(() => {
    if (!user || !isMounted) return;
    setLoading(true);

    const fetchData = async () => {
        try {
            const coachesSnap = await getDocs(query(collection(db, "coaches"), where("userId", "==", user.uid)));
            const coachesMap = new Map();
            coachesSnap.docs.forEach(d => coachesMap.set(d.id, { name: d.data().name, photo: d.data().photoUrl }));

            const unsubscribe = onSnapshot(query(collection(db, "salaries"), where("userId", "==", user.uid)), (snapshot) => {
                const salariesData = snapshot.docs.map(doc => {
                    const data = doc.data();
                    const coachInfo = coachesMap.get(data.coachId);
                    return { 
                        id: doc.id, 
                        ...data,
                        coachName: coachInfo?.name || "Entraîneur",
                        coachPhotoUrl: coachInfo?.photo
                    } as Salary;
                });
                setSalaries(salariesData);
                setLoading(false);
            });
            return unsubscribe;
        } catch (e) { setLoading(false); }
    };

    fetchData();
  }, [user, isMounted]);

  const filteredSalaries = useMemo(() => {
    if (!searchTerm) return salaries;
    const term = searchTerm.toLowerCase();
    return salaries.filter(s => s.coachName.toLowerCase().includes(term));
  }, [salaries, searchTerm]);

  const handleDelete = async () => {
    if(!salaryToDelete) return;
    try {
      await deleteDoc(doc(db, "salaries", salaryToDelete.id));
      toast({ title: "Salaire supprimé définitivement" });
    } catch (e) { toast({ variant: "destructive", title: "Erreur" }); }
    finally { setSalaryToDelete(null); }
  };

  if (!isMounted || loading || loadingUser) return <div className="flex justify-center items-center h-full"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
            <h1 className="text-3xl font-bold tracking-tight">Salaires Entraîneurs</h1>
            <p className="text-muted-foreground">Gérez les règlements de votre club.</p>
        </div>
        <Button asChild><Link href="/dashboard/salaries/add"><PlusCircle className="mr-2 h-4 w-4" /> Nouveau Salaire</Link></Button>
      </div>

      <div className="relative w-full md:max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input placeholder="Rechercher un entraîneur..." className="pl-10" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
      </div>

      <Card>
        <CardHeader><CardTitle>Liste des règlements</CardTitle></CardHeader>
        <CardContent>
          <Table>
              <TableHeader><TableRow><TableHead>Entraîneur</TableHead><TableHead>Description</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
              <TableBody>
                  {filteredSalaries.map((s) => (
                      <TableRow key={s.id}>
                          <TableCell>
                              <div className="flex items-center gap-3">
                                  <Avatar className="h-8 w-8"><AvatarImage src={s.coachPhotoUrl} /><AvatarFallback>E</AvatarFallback></Avatar>
                                  <span className="font-medium">{s.coachName}</span>
                              </div>
                          </TableCell>
                          <TableCell>{s.description}</TableCell>
                          <TableCell className="text-right">
                              <DropdownMenu>
                                  <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                      <Link href={`/dashboard/salaries/${s.id}`}><DropdownMenuItem className="cursor-pointer"><FileText className="mr-2 h-4 w-4" /> Détails</DropdownMenuItem></Link>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem className="text-destructive cursor-pointer" onClick={() => setSalaryToDelete(s)}><Trash2 className="mr-2 h-4 w-4" /> Supprimer</DropdownMenuItem>
                                  </DropdownMenuContent>
                              </DropdownMenu>
                          </TableCell>
                      </TableRow>
                  ))}
              </TableBody>
          </Table>
        </CardContent>
      </Card>

      <AlertDialog open={!!salaryToDelete} onOpenChange={() => setSalaryToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Supprimer définitivement ?</AlertDialogTitle><AlertDialogDescription>Cette action est irréversible.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
              <AlertDialogCancel>Annuler</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">Supprimer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
