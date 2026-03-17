"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect, useMemo } from "react";
import { Loader2, AlertCircle, Calendar as CalendarIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { collection, getDocs, query, addDoc, doc, updateDoc, arrayUnion, where } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { format, parse } from "date-fns";
import { fr } from "date-fns/locale";
import { useAuthState } from "react-firebase-hooks/auth";
import { Badge } from "../ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";

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

const paymentStatuses = ["Payé", "Partiel", "En attente", "En retard"];
const paymentMethods = ["Espèces", "Virement", "Chèque"];

const formatDateInput = (value: string) => {
  const numbers = value.replace(/\D/g, "");
  if (numbers.length <= 2) return numbers;
  if (numbers.length <= 4) return `${numbers.slice(0, 2)}/${numbers.slice(2)}`;
  return `${numbers.slice(0, 2)}/${numbers.slice(2, 4)}/${numbers.slice(4, 8)}`;
};

export function AddSalaryForm({ salary }: { salary?: SalaryData }) {
    const [user] = useAuthState(auth);
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [coaches, setCoaches] = useState<Coach[]>([]);
    const [loadingCoaches, setLoadingCoaches] = useState(true);
    const router = useRouter();
    const isEditMode = !!salary;
    
    const amountAlreadyPaid = useMemo(() => 
      isEditMode ? (salary?.transactions || []).reduce((acc, t) => acc + (parseFloat(t.amount?.toString() || "0")), 0) : 0
    , [salary, isEditMode]);

    const formSchema = z.object({
        coachId: z.string().min(1, "L'entraîneur est requis."),
        totalAmount: z.coerce.number().min(0.01, "Le montant total doit être positif."),
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
            coachId: salary?.coachId,
            totalAmount: salary?.totalAmount,
            description: salary?.description,
            status: salary?.status,
            newTransactionAmount: "",
            newTransactionMethod: "Espèces",
        } : {
            description: `Salaire ${format(new Date(), "MMMM yyyy", { locale: fr })}`,
            coachId: "",
            totalAmount: "" as any,
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

        if (total > 0 && remaining <= 0.001) {
            form.setValue("status", "Payé");
        } else if (totalSettled > 0) {
            form.setValue("status", "Partiel");
        } else {
            form.setValue("status", "En attente");
        }
    }, [watchTotal, watchNewAmount, amountAlreadyPaid, form]);

    useEffect(() => {
        const fetchFilteredCoaches = async () => {
            if (!user) return;
            setLoadingCoaches(true);
            try {
                const coachesSnap = await getDocs(query(collection(db, "coaches"), where("userId", "==", user.uid)));
                const allCoaches = coachesSnap.docs.map(d => ({ id: d.id, name: d.data().name } as Coach));

                const salariesSnap = await getDocs(query(collection(db, "salaries"), where("userId", "==", user.uid)));
                const coachStatusMap: Record<string, string[]> = {};
                salariesSnap.docs.forEach(d => {
                    const data = d.data();
                    if (!coachStatusMap[data.coachId]) coachStatusMap[data.coachId] = [];
                    coachStatusMap[data.coachId].push(data.status);
                });

                const filtered = allCoaches.filter(coach => {
                    const statuses = coachStatusMap[coach.id];
                    if (!statuses || statuses.length === 0) return true;
                    return statuses.some(s => s !== 'Payé');
                });

                setCoaches(filtered.sort((a,b) => a.name.localeCompare(b.name)));
            } catch (error) { 
                console.error(error); 
            } finally { 
                setLoadingCoaches(false); 
            }
        };
        fetchFilteredCoaches();
    }, [user]);

    const onSubmit = async (values: z.infer<typeof formSchema>) => {
        if (!user) return;
        const newVal = parseFloat(values.newTransactionAmount || "0");
        setLoading(true);
        try {
            const trans = newVal > 0 ? {
                amount: newVal,
                date: new Date(),
                method: values.newTransactionMethod || "Espèces",
            } : null;

            if (isEditMode && salary) {
                const ref = doc(db, "salaries", salary.id);
                const update: any = { totalAmount: values.totalAmount, status: values.status, description: values.description };
                if(trans) update.transactions = arrayUnion(trans);
                await updateDoc(ref, update);
                toast({ title: "Salaire mis à jour" });
            } else {
                await addDoc(collection(db, "salaries"), {
                    userId: user.uid, coachId: values.coachId, totalAmount: values.totalAmount,
                    description: values.description, status: values.status, createdAt: new Date(),
                    transactions: trans ? [trans] : [],
                });
                toast({ title: "Salaire enregistré" });
            }
            router.push("/dashboard/salaries");
        } catch (e) { toast({ variant: "destructive", title: "Erreur" }); } finally { setLoading(false); }
    }

    const remainingToDisplay = Math.max(0, (parseFloat(watchTotal?.toString() || "0")) - amountAlreadyPaid);

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 max-w-2xl mx-auto">
                <FormField control={form.control} name="coachId" render={({ field }) => (
                    <FormItem>
                        <FormLabel className="font-bold text-xs uppercase text-muted-foreground">Entraîneur (Focus impayés)</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value} disabled={isEditMode || loadingCoaches}>
                            <FormControl>
                                <SelectTrigger className="bg-background border-slate-200">
                                    <SelectValue placeholder={loadingCoaches ? "Chargement..." : "Sélectionner un coach"} />
                                </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                {coaches.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                                {coaches.length === 0 && !loadingCoaches && <SelectItem value="none" disabled>Tous les coachs sont réglés</SelectItem>}
                            </SelectContent>
                        </Select>
                        <FormMessage />
                    </FormItem>
                )} />
                <FormField control={form.control} name="description" render={({ field }) => (
                    <FormItem>
                        <FormLabel className="font-bold text-xs uppercase text-muted-foreground">Description (Période)</FormLabel>
                        <FormControl><Input {...field} value={field.value ?? ""} className="bg-background border-slate-200" /></FormControl>
                        <FormMessage />
                    </FormItem>
                )} />
                <FormField control={form.control} name="totalAmount" render={({ field }) => (
                    <FormItem>
                        <FormLabel className="font-bold text-xs uppercase text-muted-foreground">Salaire Total Fixé (MAD)</FormLabel>
                        <FormControl><Input type="number" step="0.01" {...field} value={field.value || ""} className="font-bold text-lg bg-background border-slate-200" /></FormControl>
                        <FormMessage />
                    </FormItem>
                )} />

                {isEditMode && (
                    <div className="bg-slate-50 p-4 rounded-xl border-2 border-dashed border-slate-200 flex justify-between items-center">
                        <span className="text-sm font-semibold text-slate-500 uppercase tracking-widest">Déjà versé à ce jour</span>
                        <span className="text-lg font-black text-slate-900">{amountAlreadyPaid.toFixed(2)} MAD</span>
                    </div>
                )}

                {remainingToDisplay > 0.01 && (
                    <div className="p-6 border-2 border-primary/20 rounded-2xl space-y-5 bg-primary/5 shadow-inner">
                        <div className="flex justify-between items-center">
                            <h4 className="font-black text-primary uppercase text-xs tracking-widest flex items-center gap-2"><AlertCircle className="h-4 w-4" /> Nouveau Versement</h4>
                            <Badge variant="outline" className="bg-white font-black text-sm px-3 py-1 shadow-sm text-red-600 border-red-200">SOLDE RESTANT : {remainingToDisplay.toFixed(2)} MAD</Badge>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <FormField control={form.control} name="newTransactionAmount" render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="font-black text-[10px] uppercase text-slate-500">Montant à payer</FormLabel>
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
                        <FormLabel className="font-black text-[10px] uppercase text-slate-500">Statut du dossier (Calculé par défaut)</FormLabel>
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

                <Button type="submit" disabled={loading} className="w-full h-14 font-black uppercase tracking-[0.2em] text-lg shadow-2xl transition-transform active:scale-95">
                    {loading ? <Loader2 className="animate-spin mr-3 h-6 w-6" /> : "Valider le Versement"}
                </Button>
            </form>
        </Form>
    );
}