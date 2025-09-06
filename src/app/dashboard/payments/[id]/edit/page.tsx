"use client";

import React from "react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { AddPaymentForm } from "@/components/payments/add-payment-form";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { ArrowLeft, Loader2 } from "lucide-react";

interface Payment {
  id: string;
  playerId: string;
  totalAmount: number;
  description: string;
  status: 'Payé' | 'Partiel' | 'En attente' | 'En retard';
  transactions: { amount: number; date: any; method: string; }[];
}

export default function EditPaymentPage({ params }: { params: { id: string } }) {
  const resolvedParams = React.use(params);
  const router = useRouter();
  const paymentId = resolvedParams.id;
  
  const [payment, setPayment] = useState<Payment | null>(null);
  const [loading, setLoading] = useState(true);
  const [playerName, setPlayerName] = useState("");

   useEffect(() => {
    if (!paymentId) return;

    const fetchPayment = async () => {
      setLoading(true);
      try {
        const docRef = doc(db, "payments", paymentId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const paymentData = { id: docSnap.id, ...docSnap.data() } as Payment;
          setPayment(paymentData);
          
          // Fetch player name
          const playerRef = doc(db, "players", paymentData.playerId);
          const playerSnap = await getDoc(playerRef);
          if(playerSnap.exists()) {
              setPlayerName(playerSnap.data().name);
          }

        } else {
          console.log("No such document!");
          router.push("/dashboard/payments");
        }
      } catch (error) {
        console.error("Error fetching payment:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPayment();
  }, [paymentId, router]);


  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
         <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-6 w-6" />
          <span className="sr-only">Retour</span>
        </Button>
        <div>
            <h1 className="text-3xl font-bold tracking-tight">Modifier / Ajouter un versement</h1>
            <p className="text-muted-foreground">
              Mettez à jour la cotisation pour {loading ? "..." : playerName}.
            </p>
        </div>
      </div>
      <Card>
        <CardHeader>
            <CardTitle>Détails de la Cotisation</CardTitle>
            <CardDescription>Ajoutez un nouveau versement ou modifiez les informations.</CardDescription>
        </CardHeader>
        <CardContent>
            {loading ? (
                <div className="flex justify-center items-center py-20">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            ) : payment ? (
                <AddPaymentForm payment={payment} />
            ) : (
                <p className="p-6">Paiement non trouvé.</p>
            )}
        </CardContent>
      </Card>
    </div>
  );
}
