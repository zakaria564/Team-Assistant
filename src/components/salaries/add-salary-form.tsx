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
import { Loader2, AlertCircle, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { collection, getDocs, query, addDoc, doc, updateDoc, arrayUnion, where } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { Separator } from "../ui/separator";
import { Card, CardHeader, CardTitle, CardContent } from "../ui/card";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useAuthState } from "react-firebase-hooks/auth";
import { Badge } from "../ui/badge";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import { cn } from "@/lib/utils";

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
        const alreadyPaid = isEditMode ? amountAlreadyPaid : 0;
        const remaining = total - alreadyPaid;
        
        if (data.newTransactionAmount && data.newTransactionAmount > (remaining + 0.01)) {
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

    const watchTotal = form.watch("totalAmount") || 0;
    const watchNew = form.watch("newTransactionAmount") || 0;
    const currentPaid = amountAlreadyPaid + watchNew;
    const remaining = Math.max(0, watchTotal - amountAlreadyPaid);

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
                const currentMonthDesc = `Salaire ${format(new Date(), "MMMM yyyy", { locale: fr })}`;
                const coachesQuery = query(collection(db, "coaches"), where("userId", "==", user.uid));
                const coachesSnap = await getDocs(coachesQuery);
                const allCoaches = coachesSnap.docs.map(d => ({ id: d.id, name: d.data().name } as Coach));

                const salariesQuery = query(
                    collection(db, "salaries"), 
                    where("userId", "==", user.uid),
                    where("description", "==", currentMonthDesc)
                );
                const salariesSnap = await getDocs(salariesQuery);
                const paidCoachIds = new Set(salariesSnap.docs.map(d => d.data().coachId));

                let finalCoaches = allCoaches.filter(c => !paidCoachIds.has(c.id));
                if (isEditMode && salary) {
                    const currentCoach = allCoaches.find(c => c.id === salary.coachId);
                    if (currentCoach && !finalCoaches.find(c => c.id === currentCoach.id)) {
                        finalCoaches.push(currentCoach);
                    }
                }
                setCoaches(finalCoaches.sort((a,b) => a.name.localeCompare(b.name)));
            } catch (error) {
                console.error(error);
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
                            <FormLabel>Description (Période)</FormLabel>
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
                            <FormLabel>Salaire Total Fixé (MAD)</FormLabel>
                            <FormControl><Input type="number" step="0.01" {...field} value={field.value ?? ""} className="font-bold text-lg" /></FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                {isEditMode && (
                    <div className="bg-slate-50 p-4 rounded-xl border-2 border-dashed border-slate-200 flex justify-between items-center">
                        <span className="text-sm font-semibold text-slate-500 uppercase tracking-widest">Déjà versé à ce jour</span>
                        <span className="text-lg font-black text-slate-900">{amountAlreadyPaid.toFixed(2)} MAD</span>
                    </div>
                )}

                {(remaining > 0 || !isEditMode) ? (
                    <div className="p-6 border-2 border-primary/20 rounded-2xl space-y-5 bg-primary/5 shadow-inner">
                        <div className="flex justify-between items-center">
                            <h4 className="font-black text-primary uppercase text-xs tracking-widest flex items-center gap-2">
                                <AlertCircle className="h-4 w-4" /> Nouveau Versement
                            </h4>
                            <Badge variant="outline" className={cn("bg-white font-black text-sm px-3 py-1 shadow-sm", remaining > 0 ? "text-red-600 border-red-200" : "text-green-600 border-green-200")}>
                                SOLDE RESTANT : {remaining.toFixed(2)} MAD
                            </Badge>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <FormField
                                control={form.control}
                                name="newTransactionAmount"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="font-black text-[10px] uppercase text-slate-500">Montant à payer</FormLabel>
                                        <FormControl>
                                            <Input 
                                                type="number" 
                                                step="0.01" 
                                                max={remaining}
                                                {...field} 
                                                value={field.value ?? ""} 
                                                placeholder={`Maximum ${remaining.toFixed(2)} MAD`} 
                                                className="font-black text-xl h-12 border-primary/30 focus:border-primary shadow-sm"
                                            />
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
                                        <FormLabel className="font-black text-[10px] uppercase text-slate-500">Méthode de règlement</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <FormControl><SelectTrigger className="h-12 font-bold shadow-sm"><SelectValue /></SelectTrigger></FormControl>
                                            <SelectContent>{paymentMethods.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                                        </Select>
                                    </FormItem>
                                )}
                            />
                        </div>
                        {watchNew > remaining + 0.01 && (
                            <Alert variant="destructive" className="bg-red-50">
                                <AlertCircle className="h-4 w-4" />
                                <AlertTitle>Montant non autorisé</AlertTitle>
                                <AlertDescription>
                                    Le montant versé ({watchNew} MAD) ne peut pas être supérieur au solde dû ({remaining.toFixed(2)} MAD).
                                </AlertDescription>
                            </Alert>
                        )}
                    </div>
                ) : (
                    <div className="p-6 bg-green-50 border-2 border-green-200 rounded-2xl text-center">
                        <p className="font-black text-green-700 uppercase tracking-widest flex items-center justify-center gap-2">
                            <ShieldCheck className="h-5 w-5" /> Salaire Intégralement Réglé
                        </p>
                    </div>
                )}

                <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel className="font-black text-[10px] uppercase text-slate-500">Statut du dossier</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl><SelectTrigger className="bg-slate-50 font-black tracking-widest text-xs h-10"><SelectValue /></SelectTrigger></FormControl>
                                <SelectContent>{paymentStatuses.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                            </Select>
                        </FormItem>
                    )}
                />

                <Button type="submit" disabled={loading || (watchNew > remaining + 0.01)} className="w-full h-14 font-black uppercase tracking-[0.2em] text-lg shadow-2xl transition-transform active:scale-95">
                    {loading ? <Loader2 className="animate-spin mr-3 h-6 w-6" /> : "Valider le Versement"}
                </Button>
            </form>
        </Form>
    );
}
