
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

const normalizeString = (str: string) => {
    return str
        .toLowerCase()
        .normalize("NFD") // Decompose accented characters
        .replace(/[\u0300-\u036f]/g, "") // Remove diacritical marks
        .replace(/\s+/g, ''); // Remove all whitespace
};


export function AddPaymentForm({ payment }: AddPaymentFormProps) {
    const [user] = useAuthState(auth);
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [players, setPlayers] = useState<Player[]>([]);
    const [loadingPlayers, setLoadingPlayers] = useState(true);
    const router = useRouter();
    const isEditMode = !!payment;
    
    const amountAlreadyPaid = isEditMode 
      ? (payment.transactions || []).reduce((acc, t) => acc + t.amount, 0)
      : 0;
    
    const amountRemainingBeforeNew = isEditMode
        ? (payment.totalAmount || 0) - amountAlreadyPaid
        : undefined;


    const formSchema = z.object({
        playerId: z.string({ required_error: "Le joueur est requis." }).min(1, "Le joueur est requis."),
        totalAmount: z.coerce.number({invalid_type_error: "Le montant est requis."}).min(1, "Le montant total doit être supérieur à 0."),
        description: z.string().min(3, "La description est requise."),
        
        newTransactionAmount: z.coerce.number().optional().refine(val => {
            if (val === undefined || val === null) return true;
            const maxAmount = amountRemainingBeforeNew !== undefined ? amountRemainingBeforeNew : form.getValues('totalAmount');
            return val <= maxAmount;
        }, {
            message: `Le versement ne peut pas dépasser le montant restant.`
        }),
        newTransactionMethod: z.string().optional(),

        status: z.enum(["Payé", "Partiel", "En attente", "En retard"]),
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
            playerId: "",
            totalAmount: 1500,
            status: "En attente",
            newTransactionAmount: undefined,
            newTransactionMethod: "Espèces",
        }
    });

    const watchTotalAmount = form.watch("totalAmount");
    const watchNewTransactionAmount = form.watch("newTransactionAmount") || 0;
    const newTotalPaid = amountAlreadyPaid + watchNewTransactionAmount;
    const amountRemaining = watchTotalAmount - newTotalPaid;

    useEffect(() => {
        if (watchTotalAmount > 0) {
            if (amountRemaining <= 0) {
                form.setValue("status", "Payé");
            } else if (newTotalPaid > 0 && amountRemaining > 0) {
                form.setValue("status", "Partiel");
            } else if (newTotalPaid === 0) {
                 form.setValue("status", "En attente");
            }
        }
    }, [amountRemaining, newTotalPaid, watchTotalAmount, form]);


    useEffect(() => {
        const fetchPlayersAndPayments = async () => {
            if (!user) return;
            setLoadingPlayers(true);
            try {
                const playersQuery = query(collection(db, "players"), where("userId", "==", user.uid));
                const paymentsQuery = query(collection(db, "payments"), where("userId", "==", user.uid));

                const [playersSnapshot, paymentsSnapshot] = await Promise.all([
                    getDocs(playersQuery),
                    getDocs(paymentsQuery)
                ]);

                const playersData = playersSnapshot.docs.map(doc => ({ id: doc.id, name: doc.data().name } as Player));

                const currentMonthDesc = `Cotisation ${format(new Date(), "MMMM yyyy", { locale: fr })}`;
                const normalizedCurrentMonthDesc = normalizeString(currentMonthDesc);

                const paidPlayerIds = new Set<string>();
                paymentsSnapshot.forEach(doc => {
                    const paymentData = doc.data();
                    if (paymentData.description) {
                         const normalizedPaymentDesc = normalizeString(paymentData.description);
                         const amountPaid = (paymentData.transactions || []).reduce((sum: number, t: any) => sum + t.amount, 0);
                         const totalAmount = paymentData.totalAmount || 0;
                         const isPaid = amountPaid >= totalAmount;

                        if (normalizedPaymentDesc === normalizedCurrentMonthDesc && isPaid) {
                            paidPlayerIds.add(paymentData.playerId);
                        }
                    }
                });

                const availablePlayers = playersData.filter(player => !paidPlayerIds.has(player.id));

                setPlayers(availablePlayers);

            } catch (error) {
                console.error("Error fetching data: ", error);
                toast({
                    variant: "destructive",
                    title: "Erreur de chargement",
                    description: "Impossible de charger les joueurs disponibles.",
                });
            } finally {
                setLoadingPlayers(false);
            }
        };

        if (!isEditMode) {
           fetchPlayersAndPayments();
        } else {
            const fetchAllPlayers = async () => {
                if (!user) return;
                setLoadingPlayers(true);
                 try {
                    const q = query(collection(db, "players"), where("userId", "==", user.uid));
                    const querySnapshot = await getDocs(q);
                    const playersData = querySnapshot.docs.map(doc => ({ id: doc.id, name: doc.data().name } as Player));
                    setPlayers(playersData);
                } catch(e) {
                     console.error("Error fetching players: ", e);
                } finally {
                    setLoadingPlayers(false);
                }
            }
            fetchAllPlayers();
        }
    }, [user, toast, isEditMode]);

    const onSubmit = async (values: z.infer<typeof formSchema>) => {
        if (!user) {
            toast({ variant: "destructive", title: "Non connecté", description: "Vous devez être connecté pour effectuer cette action." });
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

                toast({
                    title: "Paiement mis à jour !",
                    description: newTransactionData 
                      ? `Un versement de ${newTransactionData.amount.toFixed(2)} MAD a été ajouté.`
                      : 'Les informations du paiement ont été mises à jour.',
                });

            } else { // Mode Création
                 const initialTransactions = newTransactionData ? [newTransactionData] : [];
                 await addDoc(collection(db, "payments"), {
                    userId: user.uid,
                    playerId: values.playerId,
                    totalAmount: values.totalAmount,
                    description: values.description,
                    status: values.status,
                    createdAt: new Date(),
                    transactions: initialTransactions,
                });
                toast({
                    title: "Paiement ajouté !",
                    description: `Le paiement a été enregistré avec succès.`
                });
            }
            router.push("/dashboard/payments");
            router.refresh();
        } catch (e) {
             toast({
                variant: "destructive",
                title: "Erreur",
                description: "Une erreur est survenue lors de l'enregistrement du paiement.",
            });
            console.error(e);
        } finally {
            setLoading(false);
        }
    }
    
    const calculatedAmountRemaining = isEditMode ? amountRemainingBeforeNew : watchTotalAmount;

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
                                <SelectValue placeholder={loadingPlayers ? "Chargement des joueurs..." : "Sélectionner un joueur"} />
                            </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                            {players.length === 0 && !loadingPlayers ? (
                                <SelectItem value="no-player" disabled>Aucun joueur disponible pour le paiement</SelectItem>
                            ) : (
                                players.map(player => (
                                    <SelectItem key={player.id} value={player.id}>{player.name}</SelectItem>
                                ))
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
                        <FormControl>
                            <Input placeholder="Ex: Cotisation annuelle 2024/2025" {...field} readOnly={!isEditMode} className={isEditMode ? "" : "bg-muted"}/>
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
                      <Input type="number" step="0.01" {...field} />
                      </FormControl>
                      <FormMessage />
                  </FormItem>
                  )}
              />

                {isEditMode && payment && (
                  <Card className="bg-muted/30">
                    <CardHeader>
                        <CardTitle className="text-lg">Historique des transactions</CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm">
                      <div className="w-full overflow-x-auto">
                        {(payment.transactions || []).length > 0 ? (
                          <ul className="space-y-2">
                            {payment.transactions.map((t, i) => (
                                <li key={i} className="flex justify-between items-center">
                                  <span>{t.amount.toFixed(2)} MAD ({t.method})</span>
                                  <span className="text-muted-foreground">{format(new Date(t.date.seconds * 1000), "dd/MM/yyyy HH:mm")}</span>
                                </li>
                            ))}
                            <Separator />
                              <li className="flex justify-between items-center font-bold">
                                  <span>Total Payé</span>
                                  <span>{amountAlreadyPaid.toFixed(2)} MAD</span>
                              </li>
                          </ul>
                        ) : (
                          <p className="text-muted-foreground">Aucune transaction pour le moment.</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}
               
                {amountRemaining > 0 && (
                <div className="space-y-4 rounded-md border p-4">
                  <h4 className="font-medium">{isEditMode ? 'Ajouter un nouveau versement' : 'Premier versement (optionnel)'}</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                          control={form.control}
                          name="newTransactionAmount"
                          render={({ field }) => (
                          <FormItem>
                              <FormLabel>Montant du versement (MAD)</FormLabel>
                              <FormControl>
                                <Input 
                                    type="number" 
                                    step="0.01" 
                                    placeholder={calculatedAmountRemaining?.toFixed(2) || '0.00'}
                                    {...field}
                                    value={field.value === undefined ? '' : field.value}
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
                              <FormLabel>Méthode du versement</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                      <SelectValue placeholder="Sélectionner une méthode" />
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
                     <Separator />
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                          <FormItem>
                              <FormLabel>Nouveau total payé</FormLabel>
                              <FormControl>
                                  <Input type="text" value={`${newTotalPaid.toFixed(2)} MAD`} readOnly className="bg-muted font-semibold text-green-600"/>
                              </FormControl>
                          </FormItem>
                          <FormItem>
                              <FormLabel>Montant restant</FormLabel>
                              <FormControl>
                                  <Input type="text" value={`${amountRemaining.toFixed(2)} MAD`} readOnly className="bg-muted font-semibold text-red-600"/>
                              </FormControl>
                          </FormItem>
                      </div>
                </div>
                )}

                 <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Statut final</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                            <SelectTrigger className="bg-muted">
                                <SelectValue placeholder="Sélectionner un statut" />
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
                    {loading ? (
                        <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Enregistrement...
                        </>
                    ) : isEditMode ? "Enregistrer les modifications" : "Ajouter le paiement"}
                </Button>
            </form>
        </Form>
    );
}

    

    
