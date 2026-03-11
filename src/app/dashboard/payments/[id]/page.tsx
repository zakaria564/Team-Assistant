
"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, ArrowLeft, FileText } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { useAuthState } from "react-firebase-hooks/auth";

const DetailItem = ({ icon: Icon, label, value, href }: { icon: any, label: string, value?: string, href?: string }) => (
  <div className="flex items-start gap-3">
    <Icon className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
    <div>
      <p className="text-xs text-muted-foreground font-medium">{label}</p>
      {href ? (
        <a href={href} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-primary hover:underline break-all">
          {value || "Non renseigné"}
        </a>
      ) : (
        <p className="text-sm font-semibold">{value || "Non renseigné"}</p>
      )}
    </div>
  </div>
);

export default function PaymentDetailPage(props: { params: Promise<{ id: string }>, searchParams: Promise<any> }) {
  const params = React.use(props.params);
  const paymentId = params.id;
  const router = useRouter();
  const [user, loadingUser] = useAuthState(auth);
  const [payment, setPayment] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!paymentId || loadingUser) return;
    const fetchPayment = async () => {
      setLoading(true);
      try {
        const snap = await getDoc(doc(db, "payments", paymentId));
        if (snap.exists()) {
          const data = snap.data();
          const pSnap = await getDoc(doc(db, "players", data.playerId));
          setPayment({ id: snap.id, ...data, playerName: pSnap.exists() ? pSnap.data().name : "Joueur inconnu" });
        } else router.push('/dashboard/payments');
      } catch (e) { 
        console.error(e); 
      } finally { 
        setLoading(false); 
      }
    };
    fetchPayment();
  }, [paymentId, router, loadingUser]);

  if (loading || loadingUser) return <div className="flex justify-center items-center h-full py-20"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
  if (!payment) return null;

  const totalPaid = payment.transactions?.reduce((sum: number, t: any) => sum + t.amount, 0) || 0;
  const remaining = payment.totalAmount - totalPaid;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}><ArrowLeft className="h-6 w-6" /></Button>
        <h1 className="text-3xl font-bold tracking-tight">Détails de Cotisation</h1>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><FileText /> {payment.description}</CardTitle>
            <CardDescription>Joueur: {payment.playerName}</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Méthode</TableHead><TableHead className="text-right">Montant</TableHead></TableRow></TableHeader>
              <TableBody>
                {payment.transactions?.map((t: any, i: number) => (
                  <TableRow key={i}>
                    <TableCell>{t.date?.seconds ? format(new Date(t.date.seconds * 1000), "dd/MM/yyyy", { locale: fr }) : 'N/A'}</TableCell>
                    <TableCell>{t.method}</TableCell>
                    <TableCell className="text-right font-medium">{t.amount.toFixed(2)} MAD</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Résumé</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between"><span>Total Dû:</span><span className="font-bold">{payment.totalAmount.toFixed(2)} MAD</span></div>
            <div className="flex justify-between"><span>Total Payé:</span><span className="font-bold text-green-600">{totalPaid.toFixed(2)} MAD</span></div>
            <div className="flex justify-between">
                <span>Reste :</span>
                <span className={cn(
                    "font-bold",
                    remaining > 0.01 ? "text-red-600" : "text-muted-foreground"
                )}>
                    {remaining.toFixed(2)} MAD
                </span>
            </div>
            <Badge className={cn("w-full justify-center text-base py-1", payment.status === 'Payé' ? 'bg-green-50 text-green-700' : 'bg-orange-50 text-orange-700')}>{payment.status}</Badge>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
