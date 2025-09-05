
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
import { cn } from "@/lib/utils";

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
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [searchCategory, setSearchCategory] = useState("playerName");

  useEffect(() => {
    const fetchPayments = async () => {
      setLoading(true);
      try {
        const playersQuery = query(collection(db, "players"));
        const playersSnapshot = await getDocs(playersQuery);
        const playersMap = new Map<string, string>();
        playersSnapshot.forEach(doc => {
            playersMap.set(doc.id, doc.data().name);
        });

        const paymentsQuery = query(collection(db, "payments"), orderBy("createdAt", "desc"));
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

        setPayments(paymentsData);

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
  }, [toast]);

  const filteredPayments = useMemo(() => {
    if (!searchTerm) return payments;
    const lowercasedSearchTerm = searchTerm.toLowerCase();

    return payments.filter(payment => {
        const valueToSearch = (searchCategory === 'playerName' ? payment.playerName : payment.status) || '';
        return valueToSearch.toLowerCase().includes(lowercasedSearchTerm);
    });
  }, [payments, searchTerm, searchCategory]);


  const handleDeletePayment = async (paymentId: string) => {
    const paymentToDelete = payments.find(p => p.id === paymentId);
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

  return (
    <>
      <div>
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
          <div>
              <h1 className="text-3xl font-bold tracking-tight">Paiements des Joueurs</h1>
              <p className="text-muted-foreground">Suivez et gérez les paiements des cotisations.</p>
          </div>
          <div className="flex gap-2 w-full md:w-auto">
              <Button variant="outline" className="w-1/2 md:w-auto">
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
            {loading ? (
              <div className="flex justify-center items-center py-10">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <div className="w-full overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Joueur</TableHead>
                      <TableHead className="hidden lg:table-cell">Description</TableHead>
                      <TableHead className="text-right hidden sm:table-cell">Montant Payé</TableHead>
                      <TableHead className="text-right hidden md:table-cell">Montant Restant</TableHead>
                      <TableHead className="text-right hidden xl:table-cell">Montant Total</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPayments.length > 0 ? (
                        filteredPayments.map((payment) => (
                        <TableRow key={payment.id}>
                          <TableCell className="font-medium">{payment.playerName}</TableCell>
                          <TableCell className="text-muted-foreground hidden lg:table-cell">{payment.description}</TableCell>
                          <TableCell className="text-right font-semibold text-green-600 hidden sm:table-cell">{(payment.amountPaid || 0).toFixed(2)} MAD</TableCell>
                          <TableCell className="text-right font-semibold text-red-600 hidden md:table-cell">{(payment.amountRemaining || 0).toFixed(2)} MAD</TableCell>
                          <TableCell className="text-right hidden xl:table-cell">{(payment.totalAmount || 0).toFixed(2)} MAD</TableCell>
                          <TableCell>
                            <Badge 
                                variant={getBadgeVariant(payment.status)}
                                className={cn("whitespace-nowrap", getBadgeClass(payment.status))}
                            >
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
                                  <Link href={`/dashboard/payments/${payment.id}`}>
                                    <DropdownMenuItem className="cursor-pointer">
                                        <FileText className="mr-2 h-4 w-4" />
                                        Voir les détails
                                    </DropdownMenuItem>
                                  </Link>
                                  <Link href={`/dashboard/payments/${payment.id}/edit`}>
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
                                        <AlertDialogTitle>Êtes-vous sûr de vouloir supprimer ce paiement ?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                          Cette action est irréversible. Le paiement pour "{payment.description}" sera définitivement supprimé.
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>Annuler</AlertDialogCancel>
                                        <AlertDialogAction 
                                          onClick={() => handleDeletePayment(payment.id)}
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
                          <TableCell colSpan={7} className="text-center text-muted-foreground py-10">
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
    </>
  );
}
