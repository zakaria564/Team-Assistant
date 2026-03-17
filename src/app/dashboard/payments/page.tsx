
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

interface Player {
    id: string;
    name: string;
    photoUrl?: string;
    gender: 'Masculin' | 'Féminin';
}

interface Payment {
  id: string;
  playerId: string;
  totalAmount: number;
  status: 'Payé' | 'Partiel' | 'En attente' | 'En retard';
  createdAt: any;
  description: string;
  transactions: { amount: number; date: any; method: string; }[];
  amountPaid: number;
  amountRemaining: number;
}

interface PlayerPayments {
    playerId: string;
    playerName: string;
    playerPhotoUrl?: string;
    playerGender: 'Masculin' | 'Féminin';
    payments: Payment[];
    hasPending: boolean;
}

const getBadgeClass = (status?: Payment['status']) => {
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

export default function PaymentsPage() {
  const [user, loadingUser] = useAuthState(auth);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [showOnlyPending, setShowShowOnlyPending] = useState(false);
  const [paymentToDelete, setPaymentToDelete] = useState<Payment | null>(null);
  const [openCollapsibles, setOpenCollapsibles] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!user) {
        if (!loadingUser) setLoading(false);
        return;
    }
    setLoading(true);
    
    const playersQuery = query(collection(db, "players"), where("userId", "==", user.uid));
    const unsubscribePlayers = onSnapshot(playersQuery, (playersSnapshot) => {
        const playersData = playersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Player));
        setPlayers(playersData);

        const paymentsQuery = query(collection(db, "payments"), where("userId", "==", user.uid));
        const unsubscribePayments = onSnapshot(paymentsQuery, (paymentsSnapshot) => {
            const paymentsData = paymentsSnapshot.docs.map(doc => {
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
                } as Payment;
            });
            
            setPayments(paymentsData);
            setLoading(false);
        });

        return () => unsubscribePayments();
    });

    return () => unsubscribePlayers();
  }, [user, loadingUser]);

  const groupedAndFilteredPayments: PlayerPayments[] = useMemo(() => {
    const grouped: Record<string, PlayerPayments> = {};

    players.forEach(player => {
        grouped[player.id] = {
            playerId: player.id,
            playerName: player.name,
            playerPhotoUrl: player.photoUrl,
            playerGender: player.gender || 'Masculin',
            payments: [],
            hasPending: true
        };
    });

    payments.forEach(payment => {
        if (grouped[payment.playerId]) {
            grouped[payment.playerId].payments.push(payment);
        }
    });

    return Object.values(grouped).map(group => ({
        ...group,
        hasPending: group.payments.length === 0 || group.payments.some(p => p.status !== 'Payé')
    }))
    .filter(group => {
        const matchesSearch = group.playerName.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesPending = !showOnlyPending || group.hasPending;
        return matchesSearch && matchesPending;
    })
    .sort((a, b) => a.playerName.localeCompare(b.playerName));

  }, [payments, players, searchTerm, showOnlyPending]);

  const { malePayments, femalePayments } = useMemo(() => {
    const male: PlayerPayments[] = [];
    const female: PlayerPayments[] = [];
    groupedAndFilteredPayments.forEach(group => {
      if (group.playerGender === "Féminin") female.push(group);
      else male.push(group);
    });
    return { malePayments: male, femalePayments: female };
  }, [groupedAndFilteredPayments]);

  const confirmDeletePayment = async () => {
    if(!paymentToDelete) return;
    try {
      await deleteDoc(doc(db, "payments", paymentToDelete.id));
      toast({ title: "Dossier supprimé" });
    } catch (error) { toast({ variant: "destructive", title: "Erreur" }); }
    finally { setPaymentToDelete(null); }
  };

  const renderPaymentGroups = (groups: PlayerPayments[]) => {
     if (groups.length === 0) return <div className="text-center text-muted-foreground py-16 border-2 border-dashed rounded-xl bg-slate-50/50 italic">Aucun résultat trouvé.</div>;

    return (
       <div className="space-y-2">
          {groups.map((playerGroup) => (
              <Collapsible 
                  key={playerGroup.playerId} 
                  className={cn("border rounded-lg transition-all", playerGroup.hasPending ? "border-red-200 bg-red-50/30 shadow-sm" : "border-border")}
                  open={openCollapsibles[playerGroup.playerId] || false}
                  onOpenChange={(isOpen) => setOpenCollapsibles(prev => ({...prev, [playerGroup.playerId]: isOpen}))}
              >
                  <CollapsibleTrigger className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-4">
                            <Avatar className="h-12 w-12 border-2 border-slate-100">
                                <AvatarImage src={playerGroup.playerPhotoUrl} alt={playerGroup.playerName} />
                                <AvatarFallback className="font-bold">{playerGroup.playerName?.charAt(0)}</AvatarFallback>
                            </Avatar>
                          <div className="flex flex-col text-left">
                              <p className="text-[10px] font-bold text-muted-foreground tracking-wider mb-1">
                                {toTitleCase(playerGroup.playerName)}
                              </p>
                              <div className="flex items-center gap-2">
                                <p className="text-xs font-bold text-slate-900 leading-tight">
                                    {playerGroup.payments.length} Dossier(s)
                                </p>
                                {playerGroup.hasPending && (
                                    <Badge className="bg-red-600 text-white border-none text-[8px] font-black uppercase tracking-widest px-1.5 h-4 flex items-center gap-1 animate-pulse">
                                        <BellRing className="h-2 w-2" /> Notification
                                    </Badge>
                                )}
                              </div>
                          </div>
                      </div>
                      {openCollapsibles[playerGroup.playerId] ? <ChevronDown className="h-5 w-5 text-slate-400" /> : <ChevronRight className="h-5 w-5 text-slate-400" />}
                  </CollapsibleTrigger>
                  <CollapsibleContent className="border-t bg-white">
                      <div className="w-full overflow-x-auto p-2">
                      <Table>
                          <TableHeader className="bg-muted/20">
                              <TableRow>
                              <TableHead className="font-black uppercase text-[10px] tracking-widest pl-4">Description</TableHead>
                              <TableHead className="hidden md:table-cell font-black uppercase text-[10px] tracking-widest">Total</TableHead>
                              <TableHead className="font-black uppercase text-[10px] tracking-widest">Payé</TableHead>
                              <TableHead className="hidden sm:table-cell font-black uppercase text-[10px] tracking-widest text-center">Statut</TableHead>
                              <TableHead className="text-right font-black uppercase text-[10px] tracking-widest pr-4">Actions</TableHead>
                              </TableRow>
                          </TableHeader>
                          <TableBody>
                              {playerGroup.payments.length > 0 ? playerGroup.payments.map((payment) => (
                                  <TableRow key={payment.id} className="h-14">
                                      <TableCell className="font-bold text-xs pl-4">{payment.description}</TableCell>
                                      <TableCell className="hidden md:table-cell font-mono text-xs text-slate-500">{payment.totalAmount.toFixed(2)} MAD</TableCell>
                                      <TableCell className="font-black text-green-600 text-xs">{payment.amountPaid.toFixed(2)} MAD</TableCell>
                                      <TableCell className="hidden sm:table-cell text-center">
                                          <Badge className={cn("whitespace-nowrap text-[9px] font-black uppercase px-2", getBadgeClass(payment.status))}>
                                              {payment.status}
                                          </Badge>
                                      </TableCell>
                                      <TableCell className="text-right pr-4">
                                          <div className="flex items-center justify-end gap-1">
                                              <Button variant="ghost" size="icon" asChild className="h-8 w-8 hover:bg-slate-100 border">
                                                  <Link href={`/dashboard/payments/${payment.id}`}>
                                                      <FileText className="h-4 w-4 text-primary" />
                                                  </Link>
                                              </Button>
                                              <DropdownMenu>
                                                  <DropdownMenuTrigger asChild>
                                                  <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-slate-100 border">
                                                      <MoreHorizontal className="h-4 w-4" />
                                                  </Button>
                                                  </DropdownMenuTrigger>
                                                  <DropdownMenuContent align="end" className="w-52">
                                                  <DropdownMenuLabel className="text-[10px] uppercase font-black text-slate-400">Actions</DropdownMenuLabel>
                                                  {payment.status !== 'Payé' && (
                                                      <Link href={`/dashboard/payments/${payment.id}/edit`} passHref>
                                                          <DropdownMenuItem className="cursor-pointer font-black text-primary bg-primary/5">
                                                              <PlusCircle className="mr-2 h-4 w-4" /> Enregistrer versement
                                                          </DropdownMenuItem>
                                                      </Link>
                                                  )}
                                                  <Link href={`/dashboard/payments/${payment.id}/receipt`} passHref>
                                                      <DropdownMenuItem className="cursor-pointer">
                                                          <Download className="mr-2 h-4 w-4" /> Exporter reçu
                                                      </DropdownMenuItem>
                                                  </Link>
                                                  <DropdownMenuSeparator />
                                                  <DropdownMenuItem
                                                      className="cursor-pointer text-red-600 focus:bg-red-50 font-bold"
                                                      onSelect={() => setPaymentToDelete(payment)}
                                                    >
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
                                              <p className="text-muted-foreground text-xs italic">Aucun dossier de paiement ouvert pour ce joueur.</p>
                                              <Button asChild variant="outline" size="sm" className="h-9 text-[10px] font-black uppercase tracking-widest border-primary text-primary hover:bg-primary hover:text-white transition-all">
                                                  <Link href={`/dashboard/payments/add?playerId=${playerGroup.playerId}`}>
                                                      <PlusCircle className="mr-2 h-3 w-3" /> Ouvrir un nouveau dossier
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
    )
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
              <h1 className="text-3xl font-black uppercase tracking-tighter italic">Suivi des Cotisations</h1>
              <p className="text-muted-foreground font-medium">Gérez les paiements mensuels et les impayés.</p>
          </div>
          <Button asChild className="w-full md:w-auto font-black uppercase tracking-widest h-11 shadow-lg">
            <Link href="/dashboard/payments/add">
              <PlusCircle className="mr-2 h-4 w-4" /> Nouveau Dossier
            </Link>
          </Button>
        </div>

        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="relative w-full md:max-w-sm">
                 <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input 
                    placeholder="Rechercher un joueur..."
                    className="pl-10 h-12 bg-white shadow-sm"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
            <div className="flex items-center space-x-2 bg-muted/50 p-2 px-4 rounded-xl border w-full md:w-auto justify-center h-12">
                <Checkbox 
                    id="pending-filter" 
                    checked={showOnlyPending} 
                    onCheckedChange={(checked) => setShowShowOnlyPending(checked === true)}
                />
                <Label htmlFor="pending-filter" className="flex items-center gap-2 cursor-pointer font-black uppercase text-[10px] tracking-widest">
                    Afficher les impayés uniquement
                </Label>
            </div>
        </div>

        <Card className="shadow-xl border-none">
          <CardContent className="p-0 sm:p-6 pt-6">
            {loading || loadingUser ? (
              <div className="flex justify-center items-center py-20">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
              </div>
            ) : (
                 <Tabs defaultValue="male">
                    <TabsList className="grid w-full grid-cols-2 h-14 mb-6 bg-muted/50 p-1 rounded-xl">
                        <TabsTrigger value="male" className="font-black uppercase text-[10px] tracking-widest">Masculin ({malePayments.length})</TabsTrigger>
                        <TabsTrigger value="female" className="font-black uppercase text-[10px] tracking-widest">Féminin ({femalePayments.length})</TabsTrigger>
                    </TabsList>
                    <TabsContent value="male" className="mt-0 outline-none">
                        {renderPaymentGroups(malePayments)}
                    </TabsContent>
                    <TabsContent value="female" className="mt-0 outline-none">
                        {renderPaymentGroups(femalePayments)}
                    </TabsContent>
                </Tabs>
            )}
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={!!paymentToDelete} onOpenChange={(isOpen) => !isOpen && setPaymentToDelete(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
              <AlertDialogTitle className="font-black text-xl uppercase tracking-tight">Supprimer définitivement ?</AlertDialogTitle>
              <AlertDialogDescription className="font-medium text-slate-600">
              Cette action supprimera tout l'historique de ce dossier spécifique.
              </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
              <AlertDialogCancel className="rounded-xl font-bold">Annuler</AlertDialogCancel>
              <AlertDialogAction 
              onClick={confirmDeletePayment}
              className="bg-red-600 hover:bg-red-700 text-white font-black uppercase tracking-widest rounded-xl"
              >
              Supprimer
              </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
