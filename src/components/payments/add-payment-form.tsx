
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
import { useRouter, useSearchParams } from "next/navigation";
import { collection, getDocs, query, addDoc, doc, updateDoc, arrayUnion, where } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { Separator } from "../ui/separator";
import { Card, CardHeader, CardTitle, CardContent } from "../ui/card";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useAuthState } from "react-firebase-hooks/auth";

interface Player {
  id: string;
  name: string;
}

interface Payment {
  id: string;
  playerId: string;
  status: 'Payé' | 'Partiel' | 'En attente' | 'En retard';
  description: string;
  totalAmount: number;
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

const normalizeString = (str: string | null | undefined): string => {
    if (!str) return '';
    return str
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, '');
};


export function AddPaymentForm({ payment }: AddPaymentFormProps) {
    const [user] = useAuthState(auth);
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [players, setPlayers] = useState<Player[]>([]);
    const [allPayments, setAllPayments] = useState<Payment[]>([]);
    const [loadingPlayers, setLoadingPlayers] = useState(true);
    const router = useRouter();
    const searchParams = useSearchParams();
    const urlPlayerId = searchParams.get('playerId');
    const isEditMode = !!payment;
    
    const amountAlreadyPaid = isEditMode 
      ? (payment.transactions || []).reduce((acc, t) => acc + t.amount, 0)
      : 0;

    const formSchema = z.object({
        playerId: z.string({ required_error: "Le joueur est requis." }).min(1, "Le joueur est requis."),
        totalAmount: z.coerce.number({invalid_type_error: "Le montant est requis."}).min(0, "Le montant total doit être positif.").optional(),
        description: z.string().min(3, "La description est requise."),
        newTransactionAmount: z.coerce.number().optional(),
        newTransactionMethod: z.string().optional(),
        status: z.enum(["Payé", "Partiel", "En attente", "En retard"]),
    }).superRefine((data, ctx) => {
        const totalAmount = data.totalAmount || 0;
        const amountRemaining = isEditMode ? (payment?.totalAmount || 0) - amountAlreadyPaid : totalAmount;
        if (data.newTransactionAmount && data.newTransactionAmount > amountRemaining) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ["newTransactionAmount"],
                message: `Le versement ne peut pas dépasser le montant restant.`,
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
    const watchPlayerId = form.watch("playerId");

    useEffect(() => {
        if ((watchTotalAmount || 0) > 0) {
            if (amountRemainingOnTotal <= 0) {
                form.setValue("status", "Payé");
            } else if (newTotalPaid > 0 && amountRemainingOnTotal > 0) {
                form.setValue("status", "Partiel");
            } else if (newTotalPaid === 0) {
                 form.setValue("status", "En attente");
            }
        }
    }, [amountRemainingOnTotal, newTotalPaid, watchTotalAmount, form]);


    useEffect(() => {
        const fetchPlayersAndPayments = async () => {
            if (!user) return;
            setLoadingPlayers(true);
             try {
                const playersQuery = query(collection(db, "players"), where("userId", "==", user.uid), where("isDeleted", "==", false));
                const [playersSnapshot] = await Promise.all([getDocs(playersQuery)]);
                const allPlayers = playersSnapshot.docs.map(doc => ({ id: doc.id, name: doc.data().name } as Player));
                setPlayers(allPlayers.sort((a,b) => a.name.localeCompare(b.name)));
            } catch(e) {
                 console.error(e);
            } finally {
                setLoadingPlayers(false);
            }
        }
        fetchPlayersAndPayments();
    }, [user, isEditMode, urlPlayerId]);

    const onSubmit = async (values: z.infer<typeof formSchema>) => {
        if (!user) {
            toast({ variant: "destructive", title: "Non connecté", description: "Vous devez être connecté." });
            return;
        }

        if (values.totalAmount === undefined) {
             toast({ variant: "destructive", title: "Montant manquant", description: "Veuillez spécifier un montant total." });
            return;
        }

        setLoading(true);

        const newTransactionData = (values.newTransactionAmount && values.newTransactionAmount > 0 && values.newTransactionMethod) 
            ? {
                amount: values.newTransactionAmount,
                date: new Date(),
                method: values.newTransactionMethod,
              }
            : null;

        try {
            if (isEditMode && payment) {
                const paymentDocRef = doc(db, "payments", payment.id);
                const updateData: any = {
                    totalAmount: values.totalAmount,
                    status: values.status,
                    description: values.description,
                    userId: user.uid
                };
                if(newTransactionData){
                    updateData.transactions = arrayUnion(newTransactionData);
                }
                
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
                toast({ title: "Paiement enregistré avec copie !" });
            }
            router.push("/dashboard/payments");
            router.refresh();
        } catch (e) {
             toast({ variant: "destructive", title: "Erreur", description: "Une erreur est survenue." });
        } finally {
            setLoading(false);
        }
    }
    
    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 max-w-2xl mx-auto">
                 <FormField
                    control={form.control}
                    name="playerId"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Joueur</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value} disabled={loadingPlayers || isEditMode}>
                            <FormControl>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                {players.map(player => (
                                    <SelectItem key={player.id} value={player.id}>{player.name}</SelectItem>
                                ))}
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
                        <FormControl>
                            <Input {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                  control={form.control}
                  name="totalAmount"
                  render={({ field }) => (
                  <FormItem>
                      <FormLabel>Montant total (MAD)</FormLabel>
                      <FormControl>
                        <Input
                            type="number"
                            step="0.01"
                            {...field}
                            value={field.value ?? ""}
                            onChange={e => field.onChange(e.target.value === '' ? undefined : e.target.valueAsNumber)}
                        />
                      </FormControl>
                      <FormMessage />
                  </FormItem>
                  )}
              />

                {isEditMode && payment && (
                  <Card className="bg-muted/30">
                    <CardHeader>
                        <CardTitle className="text-lg">Historique</CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm">
                      <div className="w-full overflow-x-auto">
                        {(payment.transactions || []).length > 0 ? (
                          <ul className="space-y-2">
                            {payment.transactions.map((t, i) => (
                                <li key={i} className="flex justify-between items-center">
                                  <span>{t.amount.toFixed(2)} MAD ({t.method})</span>
                                </li>
                            ))}
                            <Separator />
                              <li className="flex justify-between items-center font-bold">
                                  <span>Total Payé</span>
                                  <span>{amountAlreadyPaid.toFixed(2)} MAD</span>
                              </li>
                          </ul>
                        ) : (
                          <p className="text-muted-foreground">Aucune transaction.</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}
               
                 {(watchTotalAmount !== undefined && (watchTotalAmount > amountAlreadyPaid)) || !isEditMode ? (
                  <div className="space-y-4 rounded-md border p-4">
                    <h4 className="font-medium">Nouveau versement</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                            control={form.control}
                            name="newTransactionAmount"
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel>Montant (MAD)</FormLabel>
                                <FormControl>
                                  <Input 
                                      type="number" 
                                      step="0.01" 
                                      {...field}
                                      value={field.value ?? ''}
                                      onChange={e => field.onChange(e.target.value === '' ? undefined : e.target.valueAsNumber)}
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
                                <FormLabel>Méthode</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                  <FormControl>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                      {paymentMethods.map(method => (
                                          <SelectItem key={method} value={method}>{method}</SelectItem>
                                      ))}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                        />
                      </div>
                  </div>
                ) : null}

                 <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Statut</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                            <SelectTrigger className="bg-muted">
                                <SelectValue />
                            </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                {paymentStatuses.map(status => (
                                    <SelectItem key={status} value={status}>{status}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <FormMessage />
                        </FormItem>
                    )}
                />


                <Button type="submit" disabled={loading || loadingPlayers} className="w-full !mt-8">
                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Enregistrer"}
                </Button>
            </form>
        </Form>
    );
}
