
"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PlusCircle, Download, Loader2, MoreHorizontal, Pencil, Trash2, FileText, Search, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useAuthState } from "react-firebase-hooks/auth";
import { useRouter } from "next/navigation";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

type PaymentStatus = 'Payé' | 'Partiel' | 'En attente' | 'En retard';

interface AggregatedPayment {
  playerId: string;
  playerName: string;
  playerPhotoUrl?: string;
  totalAmountDue: number;
  totalAmountPaid: number;
  totalAmountRemaining: number;
  overallStatus: PaymentStatus;
}

export default function PaymentsPage() {
  const [user, loadingUser] = useAuthState(auth);
  const [payments, setPayments] = useState<AggregatedPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const router = useRouter();

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
        const playersMap = new Map<string, { name: string, photoUrl?: string }>();
        playersSnapshot.forEach(doc => {
            playersMap.set(doc.id, { name: doc.data().name, photoUrl: doc.data().photoUrl });
        });

        const paymentsQuery = query(collection(db, "payments"), where("userId", "==", user.uid));
        const paymentsSnapshot = await getDocs(paymentsQuery);
        
        const aggregatedData: { [key: string]: AggregatedPayment } = {};

        paymentsSnapshot.docs.forEach(doc => {
            const data = doc.data();
            const playerInfo = playersMap.get(data.playerId);

            if (!playerInfo) return; // Skip payments for players not found

            if (!aggregatedData[data.playerId]) {
                aggregatedData[data.playerId] = {
                    playerId: data.playerId,
                    playerName: playerInfo.name,
                    playerPhotoUrl: playerInfo.photoUrl,
                    totalAmountDue: 0,
                    totalAmountPaid: 0,
                    totalAmountRemaining: 0,
                    overallStatus: 'Payé',
                };
            }

            const playerAgg = aggregatedData[data.playerId];
            const amountPaid = (data.transactions || []).reduce((sum: number, t: any) => sum + t.amount, 0);
            
            playerAgg.totalAmountDue += data.totalAmount || 0;
            playerAgg.totalAmountPaid += amountPaid;
        });

        const finalPaymentsData = Object.values(aggregatedData).map(p => {
            p.totalAmountRemaining = p.totalAmountDue - p.totalAmountPaid;

            if (p.totalAmountRemaining <= 0) {
                p.overallStatus = 'Payé';
            } else if (p.totalAmountPaid > 0) {
                p.overallStatus = 'Partiel';
            } else {
                 p.overallStatus = 'En attente';
                 // A more complex logic could be added here to determine 'En retard' status
            }
            return p;
        });

        setPayments(finalPaymentsData);

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
        return payment.playerName.toLowerCase().includes(lowercasedSearchTerm);
    });
  }, [payments, searchTerm]);

  const getBadgeClass = (status: PaymentStatus) => {
     switch (status) {
        case 'Payé': return 'bg-green-100 text-green-800 border-green-300';
        case 'Partiel': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
        case 'En attente': return 'bg-gray-100 text-gray-800 border-gray-300';
        case 'En retard': return 'bg-red-100 text-red-800 border-red-300';
        default: return '';
    }
  }
  
  const handleExport = () => {
    const csvHeader = "Joueur;Montant Total Dû;Montant Total Payé;Montant Restant;Statut Global\n";
    const csvRows = filteredPayments.map(p => {
      const row = [
        `"${p.playerName}"`,
        p.totalAmountDue.toFixed(2),
        p.totalAmountPaid.toFixed(2),
        p.totalAmountRemaining.toFixed(2),
        p.overallStatus,
      ].join(';');
      return row;
    }).join('\n');

    const csvString = `${csvHeader}${csvRows}`;
    const blob = new Blob([`\uFEFF${csvString}`], { type: 'text/csv;charset=utf-8;' });

    const link = document.createElement("a");
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", `export_paiements_joueurs_${new Date().toISOString().split('T')[0]}.csv`);
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
                    placeholder="Rechercher par nom de joueur..."
                    className="pl-10"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Suivi des paiements par joueur</CardTitle>
            <CardDescription>Liste des statuts de paiement globaux pour chaque joueur.</CardDescription>
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
                      <TableHead className="hidden md:table-cell">Montant Dû</TableHead>
                      <TableHead className="hidden md:table-cell">Montant Payé</TableHead>
                      <TableHead className="hidden sm:table-cell">Statut Global</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPayments.length > 0 ? (
                        filteredPayments.map((payment) => (
                            <TableRow key={payment.playerId} className="cursor-pointer" onClick={() => router.push(`/dashboard/players/${payment.playerId}`)}>
                              <TableCell>
                                <div className="flex items-center gap-3">
                                   <Avatar>
                                      <AvatarImage src={payment.playerPhotoUrl} alt={payment.playerName} />
                                      <AvatarFallback>{payment.playerName?.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                    <div className="flex flex-col">
                                        <span className="font-medium">{payment.playerName}</span>
                                        <span className="text-muted-foreground text-sm md:hidden">
                                        {payment.totalAmountPaid.toFixed(2)} / {payment.totalAmountDue.toFixed(2)} MAD
                                        </span>
                                    </div>
                                </div>
                              </TableCell>
                              <TableCell className="hidden md:table-cell">{payment.totalAmountDue.toFixed(2)} MAD</TableCell>
                              <TableCell className="hidden md:table-cell">{payment.totalAmountPaid.toFixed(2)} MAD</TableCell>
                              <TableCell className="hidden sm:table-cell">
                                <Badge className={cn("whitespace-nowrap", getBadgeClass(payment.overallStatus))}>
                                  {payment.overallStatus}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right">
                                <Button asChild variant="outline" size="sm">
                                  <Link href={`/dashboard/players/${payment.playerId}`} onClick={e => e.stopPropagation()}>
                                      <User className="mr-2 h-4 w-4" />
                                      Voir Profil
                                  </Link>
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))
                    ) : (
                      <TableRow>
                          <TableCell colSpan={5} className="text-center text-muted-foreground py-10">
                            {searchTerm ? "Aucun joueur ne correspond à votre recherche." : "Aucun paiement trouvé."}
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
