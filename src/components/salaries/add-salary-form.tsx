
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { collection, getDocs, query, addDoc, doc, updateDoc, arrayUnion, where } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { Separator } from "../ui/separator";
import { Card, CardHeader, CardTitle, CardContent } from "../ui/card";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useAuthState } from "react-firebase-hooks/auth";

interface Coach {
  id: string;
  name: string;
}

interface SalaryData {
    id: string;
    coachId: string;
    totalAmount: number;
    description: string;
    status: 'Payé' | 'Partiel' | 'En attente' | 'En retard';
    transactions: { amount: number; date: any; method: string; }[];
}

interface AddSalaryFormProps {
    salary?: SalaryData;
}

const paymentStatuses = ["Payé", "Partiel", "En attente", "En retard"];
const paymentMethods = ["Espèces", "Virement", "Chèque"];

export function AddSalaryForm({ salary }: AddSalaryFormProps) {
    const [user] = useAuthState(auth);
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [coaches, setCoaches] = useState<Coach[]>([]);
    const [loadingCoaches, setLoadingCoaches] = useState(true);
    const router = useRouter();
    const isEditMode = !!salary;
    
    const amountAlreadyPaid = isEditMode 
      ? (salary.transactions || []).reduce((acc, t) => acc + (t.amount || 0), 0)
      : 0;

    const formSchema = z.object({
        coachId: z.string().min(1, "L'entraîneur est requis."),
        totalAmount: z.coerce.number().min(0.01, "Le montant total doit être positif."),
        description: z.string().min(3, "La description est requise."),
        newTransactionAmount: z.coerce.number().optional(),
        newTransactionMethod: z.string().optional(),
        status: z.enum(["Payé", "Partiel", "En attente", "En retard"]),
    }).superRefine((data, ctx) => {
        const total = data.totalAmount || 0;
        const remaining = isEditMode ? (salary?.totalAmount || 0) - amountAlreadyPaid : total;
        if (data.newTransactionAmount && data.newTransactionAmount > remaining + 0.01) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ["newTransactionAmount"],
                message: `Le versement ne peut pas dépasser le montant restant.`,
            });
        }
    });

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: isEditMode ? {
            coachId: salary.coachId,
            totalAmount: salary.totalAmount,
            description: salary.description,
            status: salary.status,
            newTransactionAmount: undefined,
            newTransactionMethod: "Espèces",
        } : {
            description: `Salaire ${format(new Date(), "MMMM yyyy", { locale: fr })}`,
            coachId: "",
            totalAmount: 0,
            status: "En attente",
            newTransactionAmount: undefined,
            newTransactionMethod: "Espèces",
        }
    });

    const watchTotal = form.watch("totalAmount");
    const watchNew = form.watch("newTransactionAmount") || 0;
    const currentPaid = amountAlreadyPaid + watchNew;

    useEffect(() => {
        if (watchTotal > 0) {
            if (currentPaid >= watchTotal - 0.01) form.setValue("status", "Payé");
            else if (currentPaid > 0) form.setValue("status", "Partiel");
            else form.setValue("status", "En attente");
        }
    }, [currentPaid, watchTotal, form]);

    useEffect(() => {
        const fetchUnpaidCoaches = async () => {
            if (!user) return;
            setLoadingCoaches(true);
            try {
                // 1. Get current month description
                const currentMonthDesc = `Salaire ${format(new Date(), "MMMM yyyy", { locale: fr })}`;
                
                // 2. Fetch all coaches
                const coachesQuery = query(collection(db, "coaches"), where("userId", "==", user.uid));
                const coachesSnap = await getDocs(coachesQuery);
                const allCoaches = coachesSnap.docs.map(d => ({ id: d.id, name: d.data().name } as Coach));

                // 3. Fetch salaries for this month to filter
                const salariesQuery = query(
                    collection(db, "salaries"), 
                    where("userId", "==", user.uid),
                    where("description", "==", currentMonthDesc)
                );
                const salariesSnap = await getDocs(salariesQuery);
                const paidCoachIds = new Set(salariesSnap.docs.map(d => d.data().coachId));

                // 4. Filter: only unpaid coaches
                let finalCoaches = allCoaches.filter(c => !paidCoachIds.has(c.id));
                
                // In edit mode, ensure the current coach is shown even if they are in the paid list
                if (isEditMode && salary) {
                    const currentCoach = allCoaches.find(c => c.id === salary.coachId);
                    if (currentCoach && !finalCoaches.find(c => c.id === currentCoach.id)) {
                        finalCoaches.push(currentCoach);
                    }
                }

                setCoaches(finalCoaches.sort((a,b) => a.name.localeCompare(b.name)));
            } catch (error) {
                console.error("Error fetching unpaid coaches:", error);
            } finally { setLoadingCoaches(false); }
        };
        fetchUnpaidCoaches();
    }, [user, isEditMode, salary]);

    const onSubmit = async (values: z.infer<typeof formSchema>) => {
        if (!user) return;
        setLoading(true);
        try {
            const trans = values.newTransactionAmount && values.newTransactionAmount > 0 ? {
                amount: values.newTransactionAmount,
                date: new Date(),
                method: values.newTransactionMethod || "Espèces",
            } : null;

            if (isEditMode && salary) {
                const ref = doc(db, "salaries", salary.id);
                const update: any = {
                    totalAmount: values.totalAmount,
                    status: values.status,
                    description: values.description,
                };
                if (trans) update.transactions = arrayUnion(trans);
                await updateDoc(ref, update);
                toast({ title: "Salaire mis à jour" });
            } else {
                await addDoc(collection(db, "salaries"), {
                    userId: user.uid,
                    coachId: values.coachId,
                    totalAmount: values.totalAmount,
                    description: values.description,
                    status: values.status,
                    createdAt: new Date(),
                    transactions: trans ? [trans] : [],
                });
                toast({ title: "Salaire enregistré" });
            }
            router.push("/dashboard/salaries");
            router.refresh();
        } catch (e) {
            toast({ variant: "destructive", title: "Erreur lors de l'enregistrement" });
        } finally { setLoading(false); }
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 max-w-2xl mx-auto">
                <FormField
                    control={form.control}
                    name="coachId"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Entraîneur</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value} disabled={isEditMode || loadingCoaches}>
                                <FormControl><SelectTrigger><SelectValue placeholder={loadingCoaches ? "Chargement..." : "Sélectionner un coach"} /></SelectTrigger></FormControl>
                                <SelectContent>
                                    {coaches.length > 0 ? (
                                        coaches.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)
                                    ) : (
                                        <div className="p-2 text-xs text-muted-foreground">Tous les coachs sont déjà payés ce mois-ci.</div>
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
                            <FormLabel>Description</FormLabel>
                            <FormControl><Input {...field} value={field.value ?? ""} /></FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="totalAmount"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Salaire Total (MAD)</FormLabel>
                            <FormControl><Input type="number" step="0.01" {...field} value={field.value ?? ""} /></FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                {isEditMode && (
                    <div className="bg-muted p-4 rounded-md space-y-2">
                        <p className="text-sm font-semibold">Historique : {amountAlreadyPaid.toFixed(2)} MAD déjà versés.</p>
                    </div>
                )}

                <div className="p-4 border rounded-md space-y-4 bg-primary/5">
                    <h4 className="font-bold text-primary">Nouveau Versement</h4>
                    <div className="grid grid-cols-2 gap-4">
                        <FormField
                            control={form.control}
                            name="newTransactionAmount"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Montant</FormLabel>
                                    <FormControl><Input type="number" step="0.01" {...field} value={field.value ?? ""} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="newTransactionMethod"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Méthode</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                        <SelectContent>{paymentMethods.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                                    </Select>
                                </FormItem>
                            )}
                        />
                    </div>
                </div>

                <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Statut final</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl><SelectTrigger className="bg-muted"><SelectValue /></SelectTrigger></FormControl>
                                <SelectContent>{paymentStatuses.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                            </Select>
                        </FormItem>
                    )}
                />

                <Button type="submit" disabled={loading} className="w-full">
                    {loading ? <Loader2 className="animate-spin" /> : "Enregistrer le paiement"}
                </Button>
            </form>
        </Form>
    );
}
