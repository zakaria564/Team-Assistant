"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect, Suspense } from "react";
import { Loader2, AlertCircle, ShieldCheck } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { collection, getDocs, query, addDoc, doc, updateDoc, arrayUnion, where } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { Separator } from "../ui/separator";
import { Card, CardHeader, CardTitle, CardContent } from "../ui/card";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useAuthState } from "react-firebase-hooks/auth";
import { Badge } from "../ui/badge";
import { cn } from "@/lib/utils";
import React from "react";

interface Player {
  id: string;
  name: string;
}

interface PaymentData {
    id: string;
    playerId: string;
    totalAmount: number;
    description: string;
    status: 'Payé' | 'Partiel' | 'En attente' | 'En retard';
    transactions: { amount: number; date: any; method: string; }[];
}

interface AddPaymentFormProps {
    payment?: PaymentData;
}

const paymentStatuses = ["Payé", "Partiel", "En attente", "En retard"];
const paymentMethods = ["Espèces", "Carte Bancaire", "Virement", "Chèque"];

function FormContent({ payment }: AddPaymentFormProps) {
    const [user] = useAuthState(auth);
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [players, setPlayers] = useState<Player[]>([]);
    const [loadingPlayers, setLoadingPlayers] = useState(true);
    const router = useRouter();
    const searchParams = useSearchParams();
    const urlPlayerId = searchParams.get('playerId');
    const isEditMode = !!payment;
    
    const amountAlreadyPaid = isEditMode 
      ? (payment.transactions || []).reduce((acc, t) => acc + (t.amount || 0), 0)
      : 0;

    const formSchema = z.object({
        playerId: z.string({ required_error: "Le joueur est requis." }).min(1, "Le joueur est requis."),
        totalAmount: z.coerce.number({invalid_type_error: "Le montant est requis."}).min(0, "Le montant total doit être positif.").optional(),
        description: z.string().min(3, "La description est requise."),
        newTransactionAmount: z.coerce.number().optional(),
        newTransactionMethod: z.string().optional(),
        status: z.enum(["Payé", "Partiel", "En attente", "En retard"]),
    }).superRefine((data, ctx) => {
        const total = data.totalAmount || 0;
        const alreadyPaid = isEditMode ? amountAlreadyPaid : 0;
        const remaining = Math.max(0, total - alreadyPaid);
        if (data.newTransactionAmount && data.newTransactionAmount > (remaining + 0.01)) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ["newTransactionAmount"],
                message: `Le versement ne peut pas dépasser le montant restant de ${remaining.toFixed(2)} MAD.`,
            });
        }
    });

    const defaultDescription = `Cotisation ${format(new Date(), "MMMM yyyy", { locale: fr })}`;

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        mode: "onChange",
        defaultValues: isEditMode ? {
            playerId: payment.playerId,
            totalAmount: payment.totalAmount,
            description: payment.description,
            status: payment.status,
            newTransactionAmount: undefined,
            newTransactionMethod: "Espèces",
        } : {
            description: defaultDescription,
            playerId: urlPlayerId || "",
            totalAmount: undefined,
            status: "En attente",
            newTransactionAmount: undefined,
            newTransactionMethod: "Espèces",
        }
    });

    const watchTotalAmount = form.watch("totalAmount");
    const watchNewTransactionAmount = form.watch("newTransactionAmount") || 0;
    const newTotalPaid = amountAlreadyPaid + watchNewTransactionAmount;
    const amountRemainingOnTotal = (watchTotalAmount || 0) - newTotalPaid;

    useEffect(() => {
        if ((watchTotalAmount || 0) > 0) {
            if (amountRemainingOnTotal <= 0.01) {
                form.setValue("status", "Payé");
            } else if (newTotalPaid > 0 && amountRemainingOnTotal > 0.01) {
                form.setValue("status", "Partiel");
            } else if (newTotalPaid === 0) {
                 form.setValue("status", "En attente");
            }
        }
    }, [amountRemainingOnTotal, newTotalPaid, watchTotalAmount, form]);

    useEffect(() => {
        const fetchUnpaidPlayers = async () => {
            if (!user) return;
            setLoadingPlayers(true);
             try {
                const currentMonthDesc = `Cotisation ${format(new Date(), "MMMM yyyy", { locale: fr })}`;
                const playersQuery = query(collection(db, "players"), where("userId", "==", user.uid));
                const paymentsQuery = query(
                    collection(db, "payments"), 
                    where("userId", "==", user.uid),
                    where("description", "==", currentMonthDesc)
                );

                const [playersSnap, paymentsSnap] = await Promise.all([getDocs(playersQuery), getDocs(paymentsQuery)]);
                const paidPlayerIds = new Set(paymentsSnap.docs.map(d => d.data().playerId));
                const filteredPlayers = playersSnap.docs
                    .map(doc => ({ id: doc.id, name: doc.data().name } as Player))
                    .filter(p => isEditMode ? true : !paidPlayerIds.has(p.id));

                setPlayers(filteredPlayers.sort((a,b) => a.name.localeCompare(b.name)));
            } catch(e) {
                 console.error(e);
            } finally {
                setLoadingPlayers(false);
            }
        }
        fetchUnpaidPlayers();
    }, [user, isEditMode]);

    const onSubmit = async (values: z.infer<typeof formSchema>) => {
        if (!user) return;
        if (values.totalAmount === undefined) {
             toast({ variant: "destructive", title: "Montant manquant" });
            return;
        }
        setLoading(true);
        const newTransactionData = (values.newTransactionAmount && values.newTransactionAmount > 0 && values.newTransactionMethod) 
            ? { amount: values.newTransactionAmount, date: new Date(), method: values.newTransactionMethod }
            : null;

        try {
            if (isEditMode && payment) {
                const paymentDocRef = doc(db, "payments", payment.id);
                const updateData: any = { totalAmount: values.totalAmount, status: values.status, description: values.description };
                if(newTransactionData) updateData.transactions = arrayUnion(newTransactionData);
                await updateDoc(paymentDocRef, updateData);
                toast({ title: "Paiement mis à jour !" });
            } else { 
                 const initialTransactions = newTransactionData ? [newTransactionData] : [];
                 await addDoc(collection(db, "payments"), {
                    userId: user.uid,
                    playerId: values.playerId,
                    totalAmount: values.totalAmount,
                    description: values.description,
                    status: values.status,
                    createdAt: new Date(),
                    transactions: initialTransactions,
                    isDeleted: false,
                });
                toast({ title: "Paiement enregistré !" });
            }
            router.push("/dashboard/payments");
            router.refresh();
        } catch (e) {
             toast({ variant: "destructive", title: "Erreur" });
        } finally { setLoading(false); }
    }
    
    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 max-w-2xl mx-auto">
                 <FormField
                    control={form.control}
                    name="playerId"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel className="font-bold text-xs uppercase text-muted-foreground">Joueur</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value ?? ""} disabled={loadingPlayers || isEditMode}>
                            <FormControl>
                            <SelectTrigger className="bg-background border-slate-200">
                                <SelectValue placeholder={loadingPlayers ? "Chargement..." : "Choisir un joueur"} />
                            </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                {players.length > 0 ? (
                                    players.map(player => (
                                        <SelectItem key={player.id} value={player.id}>{player.name}</SelectItem>
                                    ))
                                ) : (
                                    <div className="p-2 text-xs text-muted-foreground">Tous les joueurs ont déjà un dossier pour ce mois.</div>
                                )}
                            </SelectContent>
                        </Select>
                        <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel className="font-bold text-xs uppercase text-muted-foreground">Description</FormLabel>
                        <FormControl><Input {...field} value={field.value ?? ""} className="bg-background border-slate-200" /></FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                  control={form.control}
                  name="totalAmount"
                  render={({ field }) => (
                  <FormItem>
                      <FormLabel className="font-bold text-xs uppercase text-muted-foreground">Montant total dû (MAD)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" {...field} value={field.value ?? ""} onChange={e => field.onChange(e.target.value === '' ? undefined : e.target.valueAsNumber)} className="font-bold text-lg bg-background border-slate-200" />
                      </FormControl>
                      <FormMessage />
                  </FormItem>
                  )}
              />

                {isEditMode && payment && (
                  <Card className="bg-muted/30">
                    <CardHeader><CardTitle className="text-lg">Historique des règlements</CardTitle></CardHeader>
                    <CardContent className="text-sm">
                      <div className="w-full overflow-x-auto">
                        {(payment.transactions || []).length > 0 ? (
                          <ul className="space-y-2">
                            {payment.transactions.map((t, i) => (
                                <li key={i} className="flex justify-between items-center bg-white p-2 rounded border border-slate-100">
                                  <span className="font-medium">{t.amount.toFixed(2)} MAD</span>
                                  <span className="text-xs text-muted-foreground">{t.method}</span>
                                </li>
                            ))}
                            <Separator className="my-2" />
                              <li className="flex justify-between items-center font-black text-slate-900">
                                  <span className="uppercase text-[10px]">Total déjà versé</span>
                                  <span>{amountAlreadyPaid.toFixed(2)} MAD</span>
                              </li>
                          </ul>
                        ) : (
                          <p className="text-muted-foreground italic">Aucun versement enregistré.</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}
               
                 {(watchTotalAmount !== undefined && (watchTotalAmount > amountAlreadyPaid + 0.01)) || !isEditMode ? (
                  <div className="space-y-4 rounded-xl border-2 border-primary/20 p-6 bg-primary/5 shadow-inner">
                    <div className="flex justify-between items-center">
                        <h4 className="font-black text-primary uppercase text-xs tracking-widest flex items-center gap-2"><AlertCircle className="h-4 w-4" /> Nouveau Versement</h4>
                        <Badge variant="outline" className="bg-white font-black text-sm px-3 py-1 shadow-sm border-primary/30">Reste: {(Math.max(0, (watchTotalAmount || 0) - amountAlreadyPaid)).toFixed(2)} MAD</Badge>
                    </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField
                            control={form.control}
                            name="newTransactionAmount"
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel className="font-black text-[10px] uppercase text-slate-500">Montant (MAD)</FormLabel>
                                <FormControl>
                                  <Input type="number" step="0.01" {...field} value={field.value ?? ""} onChange={e => field.onChange(e.target.value === '' ? undefined : e.target.valueAsNumber)} className="font-black text-xl h-12 border-primary/30 focus:border-primary shadow-sm bg-background" />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="newTransactionMethod"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="font-black text-[10px] uppercase text-slate-500">Méthode</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value ?? ""}>
                                  <FormControl><SelectTrigger className="h-12 font-bold shadow-sm bg-background border-slate-200"><SelectValue /></SelectTrigger></FormControl>
                                  <SelectContent>{paymentMethods.map(method => <SelectItem key={method} value={method}>{method}</SelectItem>)}</SelectContent>
                                </Select>
                              </FormItem>
                            )}
                        />
                      </div>
                  </div>
                ) : (
                    <div className="p-6 bg-green-50 border-2 border-green-200 rounded-2xl text-center">
                        <p className="font-black text-green-700 uppercase tracking-widest flex items-center justify-center gap-2">
                            <ShieldCheck className="h-5 w-5" /> Cotisation Intégralement Réglée
                        </p>
                    </div>
                )}

                 <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel className="font-black text-[10px] uppercase text-slate-500">Statut du dossier (Calculé par défaut)</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value ?? ""}>
                            <FormControl><SelectTrigger className="bg-background border-slate-200 font-black tracking-widest text-xs h-10"><SelectValue placeholder="Déterminé par le système..." /></SelectTrigger></FormControl>
                            <SelectContent>{paymentStatuses.map(status => <SelectItem key={status} value={status}>{status}</SelectItem>)}</SelectContent>
                        </Select>
                        </FormItem>
                    )}
                />

                <Button type="submit" disabled={loading || loadingPlayers} className="w-full h-14 font-black uppercase tracking-[0.2em] text-lg shadow-2xl transition-transform active:scale-95 !mt-12">
                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Confirmer l'enregistrement"}
                </Button>
            </form>
        </Form>
    );
}

export function AddPaymentForm(props: AddPaymentFormProps) {
    return (
        <Suspense fallback={<div className="flex justify-center py-10"><Loader2 className="animate-spin text-primary" /></div>}>
            <FormContent {...props} />
        </Suspense>
    )
}
