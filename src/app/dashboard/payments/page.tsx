
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

interface Player {
  id: string;
  name: string;
}

interface Payment {
  id: string;
  playerId: string;
  playerName?: string;
  totalAmount: number;
  status: 'Payé' | 'Partiel' | 'En attente' | 'En retard';
  createdAt: { seconds: number, nanoseconds: number };
  description: string;
  transactions: { amount: number; date: any; method: string; }[];
  amountPaid: number;
  amountRemaining: number;
}


export default function PaymentsPage() {
  const [user, loadingUser] = useAuthState(auth);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [searchCategory, setSearchCategory] = useState("playerName");
  const [paymentToDelete, setPaymentToDelete] = useState<Payment | null>(null);

  useEffect(() => {
    const fetchPayments = async () => {
      if (!user) {
        if (!loadingUser) setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const playersQuery = query(collection(db, "players"), where("userId", "==", user.uid));
        const playersSnapshot = await getDocs(playersQuery);
        const playersMap = new Map<string, string>();
        playersSnapshot.forEach(doc => {
            playersMap.set(doc.id, doc.data().name);
        });

        const paymentsQuery = query(collection(db, "payments"), where("userId", "==", user.uid));
        const paymentsSnapshot = await getDocs(paymentsQuery);
        const paymentsData = paymentsSnapshot.docs.map(doc => {
            const data = doc.data() as any;
            
            const transactions = data.transactions || [];
            const amountPaid = transactions.reduce((sum: number, t: any) => sum + t.amount, 0);
            const totalAmount = data.totalAmount || 0;
            const amountRemaining = totalAmount - amountPaid;
            
            return { 
                id: doc.id, 
                ...data,
                playerName: playersMap.get(data.playerId) || "Joueur inconnu",
                amountPaid,
                amountRemaining,
                totalAmount,
                transactions
            } as Payment;
        });
        
        // Sort payments by creation date on the client side
        const sortedPayments = paymentsData.sort((a, b) => b.createdAt.seconds - a.createdAt.seconds);

        setPayments(sortedPayments);

      } catch (error: any) {
        console.error("Error fetching payments: ", error);
        toast({
          variant: "destructive",
          title: "Erreur de chargement",
          description: "Impossible de charger les paiements. Vérifiez vos règles de sécurité Firestore.",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchPayments();
  }, [user, loadingUser, toast]);

  const filteredPayments = useMemo(() => {
    if (!searchTerm) return payments;
    const lowercasedSearchTerm = searchTerm.toLowerCase();

    return payments.filter(payment => {
        const valueToSearch = (searchCategory === 'playerName' ? payment.playerName : payment.status) || '';
        return valueToSearch.toLowerCase().includes(lowercasedSearchTerm);
    });
  }, [payments, searchTerm, searchCategory]);


  const confirmDeletePayment = async () => {
    if (!paymentToDelete) return;

    try {
      await deleteDoc(doc(db, "payments", paymentToDelete.id));
      setPayments(payments.filter(p => p.id !== paymentToDelete.id));
      toast({
        title: "Paiement supprimé",
        description: `Le paiement a été supprimé avec succès.`,
      });
    } catch (error) {
       toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de supprimer le paiement.",
      });
      console.error("Error deleting payment: ", error);
    } finally {
        setPaymentToDelete(null);
    }
  };

  const getBadgeVariant = (status: Payment['status']) => {
    switch (status) {
        case 'Payé': return 'default';
        case 'Partiel': return 'secondary';
        case 'En retard': return 'destructive';
        default: return 'outline';
    }
  }

  const getBadgeClass = (status: Payment['status']) => {
     switch (status) {
        case 'Payé': return 'bg-green-100 text-green-800 border-green-300';
        case 'Partiel': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
        case 'En attente': return 'bg-gray-100 text-gray-800 border-gray-300';
        case 'En retard': return 'bg-red-100 text-red-800 border-red-300';
        default: return '';
    }
  }
  
  const handleExport = () => {
    const csvHeader = "Joueur;Description;Montant Total;Montant Payé;Montant Restant;Statut;Date de Création\n";
    const csvRows = filteredPayments.map(p => {
      const row = [
        `"${p.playerName}"`,
        `"${p.description}"`,
        p.totalAmount.toFixed(2),
        p.amountPaid.toFixed(2),
        p.amountRemaining.toFixed(2),
        p.status,
        format(new Date(p.createdAt.seconds * 1000), "yyyy-MM-dd HH:mm", { locale: fr })
      ].join(';');
      return row;
    }).join('\n');

    const csvString = `${csvHeader}${csvRows}`;
    const blob = new Blob([`\uFEFF${csvString}`], { type: 'text/csv;charset=utf-8;' });

    const link = document.createElement("a");
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", `export_paiements_${new Date().toISOString().split('T')[0]}.csv`);
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
              <h1 className="text-3xl font-bold tracking-tight">Paiements des Joueurs</h1>
              <p className="text-muted-foreground">Suivez et gérez les paiements des cotisations.</p>
          </div>
          <div className="flex gap-2 w-full md:w-auto">
              <Button variant="outline" className="w-1/2 md:w-auto" onClick={handleExport}>
                  <Download className="mr-2 h-4 w-4" />
                  Exporter
              </Button>
              <Button asChild className="w-1/2 md:w-auto">
                <Link href="/dashboard/payments/add">
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
                    <SelectItem value="playerName">Nom du Joueur</SelectItem>
                    <SelectItem value="status">Statut</SelectItem>
                </SelectContent>
            </Select>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Suivi des paiements</CardTitle>
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
                      <TableHead>Joueur</TableHead>
                      <TableHead className="hidden md:table-cell">Montant Total</TableHead>
                      <TableHead className="hidden md:table-cell">Montant Payé</TableHead>
                      <TableHead className="hidden sm:table-cell">Statut</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPayments.length > 0 ? (
                        filteredPayments.map((payment) => (
                        <TableRow key={payment.id}>
                          <TableCell>
                             <div className="flex flex-col">
                                <span className="font-medium">{payment.playerName}</span>
                                <span className="text-muted-foreground text-sm md:hidden">
                                  {payment.amountPaid.toFixed(2)} MAD / {payment.totalAmount.toFixed(2)} MAD
                                </span>
                             </div>
                          </TableCell>
                          <TableCell className="hidden md:table-cell">{payment.totalAmount.toFixed(2)} MAD</TableCell>
                          <TableCell className="hidden md:table-cell">{payment.amountPaid.toFixed(2)} MAD</TableCell>
                          <TableCell className="hidden sm:table-cell">
                                <Badge variant={getBadgeVariant(payment.status)} className={cn("whitespace-nowrap", getBadgeClass(payment.status))}>
                                  {payment.status}
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
                                    <Link href={`/dashboard/payments/${payment.id}`}>
                                        <FileText className="mr-2 h-4 w-4" />
                                        Voir les détails
                                    </Link>
                                  </DropdownMenuItem>
                                  <DropdownMenuItem asChild className="cursor-pointer">
                                    <Link href={`/dashboard/payments/${payment.id}/edit`}>
                                        <Pencil className="mr-2 h-4 w-4" />
                                        Modifier / Verser
                                    </Link>
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem 
                                    className="text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer"
                                    onSelect={() => setPaymentToDelete(payment)}
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Supprimer
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                          <TableCell colSpan={5} className="text-center text-muted-foreground py-10">
                            {searchTerm ? "Aucun paiement ne correspond à votre recherche." : "Aucun paiement trouvé."}
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

      <AlertDialog open={!!paymentToDelete} onOpenChange={(isOpen) => !isOpen && setPaymentToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Êtes-vous sûr de vouloir supprimer ce paiement ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Le paiement pour "{paymentToDelete?.description}" sera définitivement supprimé.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPaymentToDelete(null)}>Annuler</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDeletePayment}
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

    