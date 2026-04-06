
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect, Suspense, useMemo } from "react";
import { Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { collection, getDocs, query, addDoc, doc, updateDoc, arrayUnion, where } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useAuthState } from "react-firebase-hooks/auth";
import { Badge } from "../ui/badge";
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

const paymentStatuses = ["Payé", "Partiel", "En attente", "En retard"];
const paymentMethods = ["Espèces", "Carte Bancaire", "Virement", "Chèque"];

function FormContent({ payment: initialPayment }: { payment?: PaymentData }) {
    const [user] = useAuthState(auth);
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [players, setPlayers] = useState<Player[]>([]);
    const [loadingPlayers, setLoadingPlayers] = useState(true);
    const router = useRouter();
    const searchParams = useSearchParams();
    const isEditMode = !!initialPayment;

    const amountAlreadyPaid = useMemo(() => 
      isEditMode ? (initialPayment?.transactions || []).reduce((acc, t) => acc + (parseFloat(t.amount?.toString() || "0")), 0) : 0
    , [initialPayment, isEditMode]);

    const formSchema = z.object({
        playerId: z.string().min(1, "Le joueur est requis."),
        totalAmount: z.preprocess((val) => (val === "" || val === 0 ? undefined : val), z.coerce.number().min(0.01, "Montant requis.")),
        description: z.string().min(3, "La description est requise."),
        newTransactionAmount: z.coerce.string().optional().or(z.literal('')),
        newTransactionMethod: z.string().optional(),
        status: z.enum(["Payé", "Partiel", "En attente", "En retard"]),
    }).superRefine((data, ctx) => {
        const total = parseFloat(data.totalAmount?.toString() || "0");
        const newVal = parseFloat(data.newTransactionAmount || "0");
        const remaining = Math.max(0, total - amountAlreadyPaid);
        if (newVal > (remaining + 0.01)) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ["newTransactionAmount"],
                message: `Le versement ne peut pas dépasser le solde restant de ${remaining.toFixed(2)} MAD.`,
            });
        }
    });

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: isEditMode ? {
            playerId: initialPayment?.playerId,
            totalAmount: initialPayment?.totalAmount,
            description: initialPayment?.description,
            status: initialPayment?.status,
            newTransactionAmount: "",
            newTransactionMethod: "Espèces",
        } : {
            description: `Cotisation ${format(new Date(), "MMMM yyyy", { locale: fr })}`,
            playerId: searchParams.get('playerId') || "",
            totalAmount: undefined,
            status: "En attente",
            newTransactionAmount: "",
            newTransactionMethod: "Espèces",
        }
    });

    const watchTotal = form.watch("totalAmount");
    const watchNewAmount = form.watch("newTransactionAmount");

    useEffect(() => {
        const total = parseFloat(watchTotal?.toString() || "0");
        const newVal = parseFloat(watchNewAmount || "0");
        if (!watchTotal) return;
        const totalSettled = amountAlreadyPaid + newVal;
        const remaining = total - totalSettled;
        if (total > 0 && remaining < 0.01) { form.setValue("status", "Payé"); }
        else if (totalSettled > 0) { form.setValue("status", "Partiel"); }
        else { form.setValue("status", "En attente"); }
    }, [watchTotal, watchNewAmount, amountAlreadyPaid, form]);

    useEffect(() => {
        const fetchInitialData = async () => {
            if (!user) return;
            setLoadingPlayers(true);
            try {
                // Determine current month to filter out existing folders
                const currentMonthName = format(new Date(), "MMMM", { locale: fr }).toLowerCase();

                // Fetch all players
                const playersSnap = await getDocs(query(collection(db, "players"), where("userId", "==", user.uid)));
                const allPlayers = playersSnap.docs.map(d => ({ id: d.id, name: d.data().name } as Player));

                if (isEditMode) {
                    setPlayers(allPlayers.sort((a,b) => a.name.localeCompare(b.name)));
                } else {
                    // Fetch all payments to see who already has a folder for this month
                    const paymentsSnap = await getDocs(query(collection(db, "payments"), where("userId", "==", user.uid)));
                    const existingPlayerIdsForMonth = new Set(
                        paymentsSnap.docs
                            .filter(doc => (doc.data().description || "").toLowerCase().includes(currentMonthName))
                            .map(doc => doc.data().playerId)
                    );

                    // Only show players who DON'T have a folder for this month
                    const availablePlayers = allPlayers.filter(p => !existingPlayerIdsForMonth.has(p.id));
                    setPlayers(availablePlayers.sort((a,b) => a.name.localeCompare(b.name)));
                }
            } catch(e) { console.error(e); } finally { setLoadingPlayers(false); }
        };
        fetchInitialData();
    }, [user, isEditMode]);

    const onSubmit = async (values: z.infer<typeof formSchema>) => {
        if (!user) return;
        const newVal = parseFloat(values.newTransactionAmount || "0");
        setLoading(true);
        try {
            const trans = newVal > 0 ? { amount: newVal, date: new Date(), method: values.newTransactionMethod || "Espèces" } : null;
            if (isEditMode && initialPayment) {
                const ref = doc(db, "payments", initialPayment.id);
                const update: any = { totalAmount: values.totalAmount, status: values.status, description: values.description };
                if(trans) update.transactions = arrayUnion(trans);
                await updateDoc(ref, update);
                toast({ title: "Paiement mis à jour" });
            } else { 
                 await addDoc(collection(db, "payments"), {
                    userId: user.uid, playerId: values.playerId, totalAmount: values.totalAmount,
                    description: values.description, status: values.status, createdAt: new Date(),
                    transactions: trans ? [trans] : [],
                });
                toast({ title: "Paiement enregistré" });
            }
            router.push("/dashboard/payments");
        } catch (e) { toast({ variant: "destructive", title: "Erreur" }); } finally { setLoading(false); }
    }
    
    const remainingToDisplay = Math.max(0, (parseFloat(watchTotal?.toString() || "0")) - amountAlreadyPaid);

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 max-w-2xl mx-auto">
                 <FormField control={form.control} name="playerId" render={({ field }) => (
                    <FormItem>
                        <FormLabel className="font-bold text-xs uppercase text-muted-foreground">Sélectionner le joueur</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value} disabled={loadingPlayers || isEditMode}>
                            <FormControl>
                                <SelectTrigger className="bg-background border-slate-200 h-11">
                                    <SelectValue placeholder={loadingPlayers ? "Chargement..." : "Choisir un joueur..."} />
                                </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                {players.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                                {players.length === 0 && !loadingPlayers && <SelectItem value="none" disabled>Tous les dossiers du mois sont déjà créés</SelectItem>}
                            </SelectContent>
                        </Select>
                        <FormMessage />
                    </FormItem>
                )} />
                <FormField control={form.control} name="description" render={({ field }) => (
                    <FormItem>
                        <FormLabel className="font-bold text-xs uppercase text-muted-foreground">Description (Mois/Année)</FormLabel>
                        <FormControl><Input {...field} value={field.value ?? ""} className="bg-background border-slate-200" /></FormControl>
                        <FormMessage />
                    </FormItem>
                )} />
                <FormField control={form.control} name="totalAmount" render={({ field }) => (
                    <FormItem>
                        <FormLabel className="font-bold text-xs uppercase text-muted-foreground">Montant total dû (MAD)</FormLabel>
                        <FormControl><Input type="number" step="0.01" {...field} value={field.value ?? ""} placeholder="Ex: 1500.00" className="font-bold text-lg bg-background border-slate-200 h-12" /></FormControl>
                        <FormMessage />
                    </FormItem>
                )} />

                {isEditMode && (
                    <div className="bg-slate-50 p-4 rounded-xl border-2 border-dashed border-slate-200 flex justify-between items-center">
                        <div className="flex flex-col">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Montant déjà réglé</span>
                            <span className="text-base font-black text-primary italic">DÉJÀ VERSÉ</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-xl font-black text-slate-900">{amountAlreadyPaid.toFixed(2)} MAD</span>
                            <CheckCircle2 className="h-5 w-5 text-green-500" />
                        </div>
                    </div>
                )}
               
                {remainingToDisplay > 0.01 && (
                    <div className="p-6 border-2 border-primary/20 rounded-2xl space-y-5 bg-primary/5 shadow-inner">
                        <div className="flex justify-between items-center">
                            <h4 className="font-black text-primary uppercase text-xs tracking-widest flex items-center gap-2"><AlertCircle className="h-4 w-4" /> {isEditMode ? "Versement Complémentaire" : "Premier Versement"}</h4>
                            <Badge variant="outline" className="bg-white font-black text-sm px-3 py-1 shadow-sm text-red-600 border-red-200 uppercase tracking-tighter">RESTE : {remainingToDisplay.toFixed(2)} MAD</Badge>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <FormField control={form.control} name="newTransactionAmount" render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="font-black text-[10px] uppercase text-slate-500">Montant à verser (MAD)</FormLabel>
                                    <FormControl><Input type="number" step="0.01" {...field} value={field.value || ""} placeholder={`Max ${remainingToDisplay.toFixed(2)}`} className="font-black text-xl h-12 border-primary/30 focus:border-primary shadow-sm bg-background" /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                            <FormField control={form.control} name="newTransactionMethod" render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="font-black text-[10px] uppercase text-slate-500">Méthode</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger className="h-12 font-bold shadow-sm bg-background border-slate-200"><SelectValue /></SelectTrigger></FormControl><SelectContent>{paymentMethods.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent></Select>
                                </FormItem>
                            )} />
                        </div>
                    </div>
                )}

                <FormField control={form.control} name="status" render={({ field }) => (
                    <FormItem>
                        <FormLabel className="font-black text-[10px] uppercase text-slate-500">Statut du dossier (Calculé)</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value} disabled>
                            <FormControl>
                                <SelectTrigger className="bg-background border-slate-200 font-black tracking-widest text-xs h-10 border-2">
                                    <SelectValue />
                                </SelectTrigger>
                            </FormControl>
                            <SelectContent>{paymentStatuses.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                        </Select>
                    </FormItem>
                )} />

                <Button type="submit" disabled={loading || loadingPlayers} className="w-full h-14 font-black uppercase tracking-[0.2em] text-lg shadow-2xl transition-transform active:scale-95">
                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : isEditMode ? "Enregistrer le versement" : "Confirmer le paiement"}
                </Button>
            </form>
        </Form>
    );
}

export function AddPaymentForm(props: { payment?: PaymentData }) {
    return (
        <Suspense fallback={<div className="flex justify-center py-10"><Loader2 className="animate-spin text-primary" /></div>}>
            <FormContent {...props} />
        </Suspense>
    )
}
