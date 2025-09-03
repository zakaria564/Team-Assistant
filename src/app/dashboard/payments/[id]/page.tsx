
"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, ArrowLeft, Pencil, FileText, User, Calendar, Hash, DollarSign, BadgeHelp, ClipboardList } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";

interface Payment {
  id: string;
  playerId: string;
  playerName?: string; // Will be fetched separately
  totalAmount: number;
  amountPaid: number;
  amountRemaining: number;
  status: 'Payé' | 'Partiel' | 'En attente' | 'En retard';
  createdAt: { seconds: number, nanoseconds: number };
  description: string;
  method: string;
}

const DetailItem = ({ icon: Icon, label, value, children }: { icon: React.ElementType, label: string, value?: string | number, children?: React.ReactNode }) => (
  <div className="flex items-start gap-4">
    <Icon className="h-6 w-6 text-muted-foreground mt-1" />
    <div>
      <p className="text-sm text-muted-foreground">{label}</p>
      <div className="text-base font-medium">{value || children || "Non spécifié"}</div>
    </div>
  </div>
);

const getBadgeClass = (status?: Payment['status']) => {
     switch (status) {
        case 'Payé': return 'bg-green-100 text-green-800 border-green-300';
        case 'Partiel': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
        case 'En attente': return 'bg-gray-100 text-gray-800 border-gray-300';
        case 'En retard': return 'bg-red-100 text-red-800 border-red-300';
        default: return '';
    }
}


export default function PaymentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const paymentId = params.id as string;
  
  const [payment, setPayment] = useState<Payment | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!paymentId) return;

    const fetchPayment = async () => {
      setLoading(true);
      try {
        const paymentRef = doc(db, "payments", paymentId);
        const paymentSnap = await getDoc(paymentRef);

        if (paymentSnap.exists()) {
          const paymentData = { id: paymentSnap.id, ...paymentSnap.data() } as Omit<Payment, 'playerName'>;
          
          const playerRef = doc(db, "players", paymentData.playerId);
          const playerSnap = await getDoc(playerRef);

          setPayment({
            ...paymentData,
            playerName: playerSnap.exists() ? playerSnap.data().name : "Joueur inconnu"
          });

        } else {
          console.log("No such payment document!");
          router.push('/dashboard/payments');
        }
      } catch (error) {
        console.error("Error fetching payment details:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPayment();
  }, [paymentId, router]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!payment) {
    return (
      <div className="text-center">
        <p>Paiement non trouvé.</p>
        <Button onClick={() => router.push("/dashboard/payments")} className="mt-4">Retour à la liste</Button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.back()}>
              <ArrowLeft className="h-6 w-6" />
              <span className="sr-only">Retour</span>
            </Button>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Détails du Paiement</h1>
              <p className="text-muted-foreground">
                  Transaction pour {payment.playerName}.
              </p>
            </div>
        </div>
        <Button asChild>
          <Link href={`/dashboard/payments/${paymentId}/edit`}>
            <Pencil className="mr-2 h-4 w-4" />
            Modifier
          </Link>
        </Button>
      </div>
      
      <Card>
          <CardHeader>
              <CardTitle className="flex items-center gap-3 text-2xl">
                  <FileText />
                  <span>{payment.description}</span>
              </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 pt-2">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                <DetailItem icon={User} label="Joueur" value={payment.playerName} />
                <DetailItem icon={Calendar} label="Date et heure" value={format(new Date(payment.createdAt.seconds * 1000), "dd/MM/yyyy 'à' HH:mm")} />
                 <DetailItem icon={ClipboardList} label="Méthode de Paiement" value={payment.method} />
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                <DetailItem icon={DollarSign} label="Montant total" value={`${payment.totalAmount.toFixed(2)} MAD`} />
                <DetailItem icon={DollarSign} label="Montant payé" value={`${payment.amountPaid.toFixed(2)} MAD`} />
                <DetailItem icon={DollarSign} label="Montant restant" value={`${payment.amountRemaining.toFixed(2)} MAD`} />
                <DetailItem icon={BadgeHelp} label="Statut">
                    <Badge className={cn("text-base", getBadgeClass(payment.status))}>
                        {payment.status}
                    </Badge>
                </DetailItem>
            </div>
          </CardContent>
      </Card>
    </div>
  );
}
