
"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PlusCircle, Download, Loader2, MoreHorizontal, Pencil, Trash2, FileText, Search, ChevronDown, ChevronRight, BellRing, Filter, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { collection, query, doc, where, deleteDoc, onSnapshot, getDocs } from "firebase/firestore";
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
    status: string;
}

interface Payment {
  id: string;
  playerId: string;
  playerName?: string;
  playerPhotoUrl?: string;
  playerGender?: 'Masculin' | 'Féminin';
  totalAmount: number;
  status: 'Payé' | 'Partiel' | 'En attente' | 'En retard';
  createdAt: { seconds: number, nanoseconds: number };
  description: string;
  transactions: { amount: number; date: any; method: string; }[];
  amountPaid: number;
  amountRemaining: number;
}

type PaymentStatus = Payment['status'];

interface PlayerPayments {
    playerId: string;
    playerName: string;
    playerPhotoUrl?: string;
    playerGender: 'Masculin' | 'Féminin';
    payments: Payment[];
    currentMonthStatus?: PaymentStatus | 'N/A';
    hasPending: boolean;
}

const normalizeString = (str: string) => {
    if (!str) return '';
    return str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '');
};

const getBadgeClass = (status?: PaymentStatus | 'N/A') => {
     switch (status) {
        case 'Payé': return 'bg-green-50 text-green-700 border-green-100';
        case 'Partiel': return 'bg-orange-50 text-orange-700 border-orange-100';
        case 'En attente': return 'bg-gray-100 text-gray-800 border-gray-300';
        case 'En retard': return 'bg-red-100 text-red-800 border-red-300';
        case 'N/A': return 'bg-gray-100 text-gray-800 border-gray-300';
        default: return '';
    }
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
                const player = playersData.find(p => p.id === data.playerId);
                
                const transactions = data.transactions || [];
                const amountPaid = transactions.reduce((sum: number, t: any) => sum + (parseFloat(t.amount?.toString() || "0")), 0);
                const totalAmount = data.totalAmount || 0;
                const amountRemaining = Math.max(0, totalAmount - amountPaid);
                
                let calculatedStatus: PaymentStatus = data.status;
                if (amountRemaining < 0.01 && totalAmount > 0) {
                    calculatedStatus = 'Payé';
                } else if (amountPaid > 0) {
                    calculatedStatus = 'Partiel';
                } else {
                    calculatedStatus = 'En attente';
                }

                return { 
                    id: doc.id, 
                    ...data,
                    playerName: player?.name || "Inconnu",
                    playerPhotoUrl: player?.photoUrl,
                    playerGender: player?.gender || 'Masculin',
                    amountPaid,
                    amountRemaining,
                    totalAmount,
                    transactions,
                    status: calculatedStatus
                } as Payment;
            });
            
            setPayments(paymentsData.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)));
            setLoading(false);
        });

        return () => unsubscribePayments();
    });

    return () => unsubscribePlayers();
  }, [user, loadingUser]);

  const groupedAndFilteredPayments: PlayerPayments[] = useMemo(() => {
    const grouped: { [key: string]: PlayerPayments } = {};
    const currentMonthDesc = `Cotisation ${format(new Date(), "MMMM yyyy", { locale: fr })}`;
    const normalizedCurrentMonthDesc = normalizeString(currentMonthDesc);

    players.forEach(player => {
        grouped[player.id] = {
            playerId: player.id,
            playerName: player.name,
            playerPhotoUrl: player.photoUrl,
            playerGender: player.gender || 'Masculin',
            payments: [],
            currentMonthStatus: 'N/A',
            hasPending: true
        };
    });

    payments.forEach(payment => {
        if (grouped[payment.playerId]) {
            grouped[payment.playerId].payments.push(payment);
            const playerPending = grouped[payment.playerId].payments.some(p => p.status !== 'Payé');
            grouped[payment.playerId].hasPending = playerPending;

            const normalizedPaymentDesc = normalizeString(payment.description);
            if(normalizedPaymentDesc === normalizedCurrentMonthDesc) {
                grouped[payment.playerId].currentMonthStatus = payment.status;
            }
        }
    });

    let result = Object.values(grouped);

    if (searchTerm) {
        const lowercasedSearchTerm = searchTerm.toLowerCase();
        result = result.filter(playerGroup => 
            playerGroup.playerName.toLowerCase().includes(lowercasedSearchTerm)
        );
    }

    if (showOnlyPending) {
        result = result.filter(playerGroup => playerGroup.hasPending || playerGroup.payments.length === 0);
    }

    return result.sort((a, b) => a.playerName.localeCompare(b.playerName));

  }, [payments, players, searchTerm, showOnlyPending]);

  const { malePayments, femalePayments } = useMemo(() => {
    const male: PlayerPayments[] = [];
    const female: PlayerPayments[] = [];
    groupedAndFilteredPayments.forEach(group => {
      if (group.playerGender === "Féminin") {
        female.push(group);
      } else {
        male.push(group);
      }
    });
    return { malePayments: male, femalePayments: female };
  }, [groupedAndFilteredPayments]);

  const confirmDeletePayment = async () => {
    if(!paymentToDelete) return;
    try {
      await deleteDoc(doc(db, "payments", paymentToDelete.id));
      toast({ title: "Paiement supprimé" });
    } catch (error) {
      toast({ variant: "destructive", title: "Erreur" });
    } finally {
        setPaymentToDelete(null);
    }
  };
  
  const handleExport = () => {
    const csvHeader = "Joueur;Description;Montant Total;Montant Payé;Montant Restant;Statut;Date de Création\n";
    const allPaymentsToExport = groupedAndFilteredPayments.flatMap(group => group.payments);
    
    const csvRows = allPaymentsToExport.map(p => {
      const row = [
        `"${p.playerName}"`,
        `"${p.description}"`,
        p.totalAmount.toFixed(2),
        p.amountPaid.toFixed(2),
        p.amountRemaining.toFixed(2),
        p.status,
        p.createdAt ? format(new Date(p.createdAt.seconds * 1000), "yyyy-MM-dd HH:mm", { locale: fr }) : 'N/A'
      ].join(';');
      return row;
    }).join('\n');

    const csvString = `${csvHeader}${csvRows}`;
    const blob = new Blob([`\uFEFF${csvString}`], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `export_paiements_${format(new Date(), "yyyy-MM-dd")}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const renderPaymentGroups = (groups: PlayerPayments[]) => {
     if (groups.length === 0) {
        return (
            <div className="text-center text-muted-foreground py-10 border-2 border-dashed rounded-xl bg-slate-50/50">
                {searchTerm || showOnlyPending ? "Aucun joueur ne correspond à vos critères." : "Aucun joueur dans cette catégorie."}
            </div>
        )
    }

    return (
       <div className="space-y-2">
          {groups.map((playerGroup) => (
              <Collapsible 
                  key={playerGroup.playerId} 
                  className={cn("border rounded-lg transition-all", playerGroup.hasPending ? "border-destructive/30 bg-destructive/5" : "border-border")}
                  open={openCollapsibles[playerGroup.playerId] || false}
                  onOpenChange={(isOpen) => setOpenCollapsibles(prev => ({...prev, [playerGroup.playerId]: isOpen}))}
              >
                  <CollapsibleTrigger className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-4">
                            <div className="relative">
                                <Avatar className="h-12 w-12 border-2 border-slate-100">
                                    <AvatarImage src={playerGroup.playerPhotoUrl} alt={playerGroup.playerName} />
                                    <AvatarFallback className="font-bold">{playerGroup.playerName?.charAt(0)}</AvatarFallback>
                                </Avatar>
                                {playerGroup.hasPending && (
                                    <span className="absolute -top-1 -right-1 flex h-4 w-4">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-4 w-4 bg-destructive border-2 border-white"></span>
                                    </span>
                                )}
                            </div>
                          <div className="flex flex-col text-left min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-[0.2em]">
                                    {playerGroup.playerName}
                                  </p>
                                  {playerGroup.hasPending && (
                                      <Badge className="bg-destructive/10 text-destructive border-none text-[8px] font-black uppercase tracking-widest px-1.5 h-4 flex items-center gap-1">
                                          <BellRing className="h-2 w-2" /> Notification
                                      </Badge>
                                  )}
                              </div>
                              <p className="text-base font-black text-slate-900 uppercase tracking-tight leading-tight mt-1">
                                {playerGroup.payments.length} {playerGroup.payments.length > 1 ? 'Dossiers' : 'Dossier'}
                              </p>
                          </div>
                      </div>
                      <div className="flex items-center gap-4">
                            <div className="hidden sm:flex flex-col items-end mr-2">
                                <span className="text-[8px] text-muted-foreground uppercase font-black tracking-widest">Mois en cours</span>
                                <Badge className={cn("whitespace-nowrap mt-0.5 text-[10px] font-bold uppercase", getBadgeClass(playerGroup.currentMonthStatus))}>
                                  {playerGroup.currentMonthStatus}
                                </Badge>
                            </div>
                            {openCollapsibles[playerGroup.playerId] ? <ChevronDown className="h-5 w-5 text-slate-400" /> : <ChevronRight className="h-5 w-5 text-slate-400" />}
                      </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="border-t bg-slate-50/30">
                      <div className="w-full overflow-x-auto p-2">
                      <Table>
                          <TableHeader>
                              <TableRow>
                              <TableHead className="font-bold">Description</TableHead>
                              <TableHead className="hidden md:table-cell font-bold">Total</TableHead>
                              <TableHead className="font-bold">Payé</TableHead>
                              <TableHead className="hidden sm:table-cell font-bold">Statut</TableHead>
                              <TableHead className="text-right font-bold pr-4">Actions</TableHead>
                              </TableRow>
                          </TableHeader>
                          <TableBody>
                              {playerGroup.payments.length > 0 ? playerGroup.payments.map((payment) => (
                                  <TableRow key={payment.id}>
                                      <TableCell>
                                          <div className="flex flex-col">
                                              <span className="font-bold text-xs sm:text-sm">{payment.description}</span>
                                              <span className="text-muted-foreground text-[10px] md:hidden">{payment.amountPaid.toFixed(2)} / {payment.totalAmount.toFixed(2)} MAD</span>
                                          </div>
                                      </TableCell>
                                      <TableCell className="hidden md:table-cell font-mono text-xs">{payment.totalAmount.toFixed(2)} MAD</TableCell>
                                      <TableCell className="font-black text-green-600 text-xs">{payment.amountPaid.toFixed(2)} MAD</TableCell>
                                      <TableCell className="hidden sm:table-cell">
                                          <Badge className={cn("whitespace-nowrap text-[10px] font-bold uppercase", getBadgeClass(payment.status))}>
                                              {payment.status}
                                          </Badge>
                                      </TableCell>
                                      <TableCell className="text-right pr-4">
                                          <div className="flex items-center justify-end gap-1">
                                              <Button variant="ghost" size="icon" asChild className="h-8 w-8 hover:bg-white shadow-sm border">
                                                  <Link href={`/dashboard/payments/${payment.id}`}>
                                                      <FileText className="h-4 w-4 text-primary" />
                                                  </Link>
                                              </Button>
                                              <DropdownMenu>
                                                  <DropdownMenuTrigger asChild>
                                                  <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-white shadow-sm border">
                                                      <MoreHorizontal className="h-4 w-4" />
                                                  </Button>
                                                  </DropdownMenuTrigger>
                                                  <DropdownMenuContent align="end" className="w-56 p-2">
                                                  <DropdownMenuLabel className="text-[10px] uppercase font-black text-slate-400">Actions</DropdownMenuLabel>
                                                  {payment.status !== 'Payé' && (
                                                      <Link href={`/dashboard/payments/${payment.id}/edit`} passHref>
                                                          <DropdownMenuItem className="cursor-pointer py-2.5 text-primary bg-primary/5 font-black">
                                                              <PlusCircle className="mr-3 h-4 w-4" /> Enregistrer versement
                                                          </DropdownMenuItem>
                                                      </Link>
                                                  )}
                                                  <Link href={`/dashboard/payments/${payment.id}/receipt`} passHref>
                                                      <DropdownMenuItem className="cursor-pointer py-2.5">
                                                          <Download className="mr-3 h-4 w-4" /> Exporter le reçu
                                                      </DropdownMenuItem>
                                                  </Link>
                                                  <DropdownMenuSeparator />
                                                  <DropdownMenuItem
                                                      className="cursor-pointer text-destructive focus:bg-destructive/10 font-bold"
                                                      onSelect={() => setPaymentToDelete(payment)}
                                                    >
                                                      <Trash2 className="mr-3 h-4 w-4" /> Supprimer définitivement
                                                  </DropdownMenuItem>
                                                  </DropdownMenuContent>
                                              </DropdownMenu>
                                          </div>
                                      </TableCell>
                                  </TableRow>
                              )) : (
                                  <TableRow>
                                      <TableCell colSpan={5} className="text-center py-8">
                                          <div className="flex flex-col items-center gap-2">
                                              <p className="text-muted-foreground text-xs italic">Aucun dossier de paiement ouvert pour ce joueur.</p>
                                              <Button asChild variant="outline" size="sm" className="h-8 text-[10px] font-black uppercase">
                                                  <Link href={`/dashboard/payments/add?playerId=${playerGroup.playerId}`}>
                                                      <PlusCircle className="mr-2 h-3 w-3" /> Ouvrir un dossier
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
              <p className="text-muted-foreground font-medium">Gérez les paiements mensuels de vos joueurs.</p>
          </div>
          <div className="flex gap-2 w-full md:w-auto">
              <Button variant="outline" className="w-1/2 md:w-auto font-bold h-11" onClick={handleExport}>
                  <Download className="mr-2 h-4 w-4" /> Exporter
              </Button>
              <Button asChild className="w-1/2 md:w-auto font-black uppercase tracking-widest h-11 shadow-lg">
                <Link href="/dashboard/payments/add">
                  <PlusCircle className="mr-2 h-4 w-4" /> Nouveau Dossier
                </Link>
              </Button>
          </div>
        </div>

        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="relative w-full md:max-w-sm">
                 <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input 
                    placeholder="Rechercher un joueur..."
                    className="pl-10 h-12 bg-background shadow-sm"
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
                    Afficher les paiements incomplets
                </Label>
            </div>
        </div>

        <Card className="shadow-xl border-none">
          <CardContent className="p-0 sm:p-6 pt-6">
            {loading || loadingUser ? (
              <div className="flex justify-center items-center py-20">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
              </div>
            ) : groupedAndFilteredPayments.length > 0 ? (
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
            ) : (
                <div className="text-center text-muted-foreground py-24 bg-slate-50/50 rounded-2xl border-2 border-dashed mx-4">
                    <p className="text-lg font-black uppercase tracking-tighter italic">Aucun résultat</p>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Vérifiez vos filtres ou ajoutez un joueur.</p>
                </div>
            )}
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={!!paymentToDelete} onOpenChange={(isOpen) => !isOpen && setPaymentToDelete(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
              <AlertDialogTitle className="font-black text-xl">Supprimer définitivement ?</AlertDialogTitle>
              <AlertDialogDescription className="font-medium text-slate-600">
              Cette action supprimera tout l'historique des transactions pour ce dossier spécifique.
              </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
              <AlertDialogCancel className="rounded-xl font-bold">Annuler</AlertDialogCancel>
              <AlertDialogAction 
              onClick={confirmDeletePayment}
              className="bg-destructive hover:bg-destructive/90 text-white font-black uppercase tracking-widest rounded-xl"
              >
              Confirmer la suppression
              </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
