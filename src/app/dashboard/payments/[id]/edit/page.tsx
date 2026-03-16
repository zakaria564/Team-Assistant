"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { AddPaymentForm } from "@/components/payments/add-payment-form";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { ArrowLeft, Loader2 } from "lucide-react";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default function EditPaymentPage(props: PageProps) {
  const { id: paymentId } = React.use(props.params);
  
  const router = useRouter();
  const [payment, setPayment] = useState<any>(null);
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
          const paymentData = { id: docSnap.id, ...docSnap.data() };
          setPayment(paymentData);
          
          const playerRef = doc(db, "players", paymentData.playerId);
          const playerSnap = await getDoc(playerRef);
          if(playerSnap.exists()) {
              setPlayerName(playerSnap.data().name);
          }

        } else {
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
    <div className="px-2 sm:px-0">
      <div className="flex items-center gap-4 mb-6">
         <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-6 w-6" />
          <span className="sr-only">Retour</span>
        </Button>
        <div>
            <h1 className="text-xl sm:text-3xl font-bold tracking-tight">Ajouter un versement</h1>
            <p className="text-sm text-muted-foreground">
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
