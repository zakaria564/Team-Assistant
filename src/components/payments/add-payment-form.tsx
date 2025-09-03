
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
import { collection, getDocs, query, addDoc, doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Separator } from "../ui/separator";

interface Player {
  id: string;
  name: string;
}

const formSchema = z.object({
  playerId: z.string({ required_error: "Le joueur est requis." }).min(1, "Le joueur est requis."),
  totalAmount: z.coerce.number({invalid_type_error: "Le montant est requis."}).min(1, "Le montant total doit être supérieur à 0."),
  amountPaid: z.coerce.number({invalid_type_error: "Le montant payé est requis."}).min(0),
  status: z.enum(["Payé", "Partiel", "En attente", "En retard"], { required_error: "Le statut est requis." }),
  method: z.string({ required_error: "La méthode est requise." }).min(1, "La méthode est requise."),
  description: z.string().min(3, "La description est requise."),
  newPayment: z.coerce.number().optional(), // Nouveau champ pour le versement
}).refine(data => data.amountPaid <= data.totalAmount, {
    message: "Le montant payé ne peut pas dépasser le montant total.",
    path: ["amountPaid"],
});

interface PaymentData extends z.infer<typeof formSchema> {
    id: string;
}

interface AddPaymentFormProps {
    payment?: PaymentData;
}


const paymentMethods = ["Carte Bancaire", "Espèces", "Virement", "Chèque"];
const paymentStatuses = ["Payé", "Partiel", "En attente", "En retard"];

export function AddPaymentForm({ payment }: AddPaymentFormProps) {
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [players, setPlayers] = useState<Player[]>([]);
    const [loadingPlayers, setLoadingPlayers] = useState(true);
    const router = useRouter();
    const isEditMode = !!payment;

    useEffect(() => {
        const fetchPlayers = async () => {
            setLoadingPlayers(true);
            try {
                const q = query(collection(db, "players"));
                const querySnapshot = await getDocs(q);
                const playersData = querySnapshot.docs.map(doc => ({ id: doc.id, name: doc.data().name } as Player));
                setPlayers(playersData);
            } catch (error) {
                console.error("Error fetching players: ", error);
                toast({
                    variant: "destructive",
                    title: "Erreur de permissions",
                    description: "Impossible de charger les joueurs. Veuillez vérifier vos règles de sécurité Firestore.",
                });
            } finally {
                setLoadingPlayers(false);
            }
        };
        fetchPlayers();
    }, [toast]);

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: isEditMode ? { ...payment, newPayment: 0 } : {
            description: "Cotisation annuelle",
            playerId: "",
            totalAmount: 1500,
            amountPaid: 0,
            status: "En attente",
            method: "",
            newPayment: 0,
        }
    });

    const totalAmount = form.watch("totalAmount");
    const amountPaid = form.watch("amountPaid");
    const newPayment = form.watch("newPayment") || 0;
    
    // Calculs pour l'affichage et la logique
    const currentAmountPaid = isEditMode ? (payment?.amountPaid || 0) : amountPaid;
    const newTotalPaid = currentAmountPaid + newPayment;
    const amountRemaining = totalAmount - newTotalPaid;

     useEffect(() => {
        if (isEditMode) {
            form.setValue("amountPaid", newTotalPaid);
        }
    }, [newTotalPaid, form, isEditMode]);

    useEffect(() => {
        if (totalAmount > 0) {
            if (amountRemaining <= 0) {
                form.setValue("status", "Payé");
            } else if (newTotalPaid > 0 && amountRemaining > 0) {
                form.setValue("status", "Partiel");
            } else if (newTotalPaid === 0) {
                 form.setValue("status", "En attente");
            }
        }
    }, [amountRemaining, newTotalPaid, totalAmount, form]);

    const onSubmit = async (values: z.infer<typeof formSchema>) => {
        setLoading(true);
        const dataToSave = {
            ...values,
            amountPaid: isEditMode ? newTotalPaid : values.amountPaid, // On utilise le nouveau total calculé en mode édition
            amountRemaining: isEditMode ? amountRemaining : values.totalAmount - values.amountPaid,
        };
        
        delete (dataToSave as any).newPayment; // On ne sauvegarde pas le champ temporaire

        try {
            if (isEditMode) {
                const paymentDocRef = doc(db, "payments", payment.id);
                await updateDoc(paymentDocRef, dataToSave);
                toast({
                    title: "Paiement modifié !",
                    description: `Les informations du paiement ont été mises à jour.`,
                });
            } else {
                 await addDoc(collection(db, "payments"), {
                    ...dataToSave,
                    createdAt: new Date(),
                });
                toast({
                    title: "Paiement ajouté !",
                    description: `Le paiement a été enregistré avec succès.`
                });
            }
            router.push("/dashboard/payments");
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
    
    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 max-w-2xl mx-auto">
                 <FormField
                    control={form.control}
                    name="playerId"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Joueur</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value} disabled={loadingPlayers || isEditMode}>
                            <FormControl>
                            <SelectTrigger>
                                <SelectValue placeholder={loadingPlayers ? "Chargement des joueurs..." : "Sélectionner un joueur"} />
                            </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                            {players.length === 0 && !loadingPlayers ? (
                                <SelectItem value="no-player" disabled>Aucun joueur trouvé</SelectItem>
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
                            <Input placeholder="Ex: Cotisation annuelle 2024/2025" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />

                {isEditMode ? (
                     <div className="space-y-4 rounded-md border p-4">
                        <h4 className="font-medium">Gestion du Paiement</h4>
                         <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                             <FormItem>
                                <FormLabel>Montant déjà payé</FormLabel>
                                <FormControl>
                                    <Input type="number" value={currentAmountPaid.toFixed(2)} readOnly className="bg-muted"/>
                                </FormControl>
                            </FormItem>
                             <FormField
                                control={form.control}
                                name="newPayment"
                                render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Ajouter un versement (MAD)</FormLabel>
                                    <FormControl>
                                    <Input type="number" step="0.01" placeholder="0" {...field} onChange={e => field.onChange(e.target.valueAsNumber || 0)} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                                )}
                            />
                        </div>
                        <Separator />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormItem>
                                <FormLabel>Nouveau total payé</FormLabel>
                                <FormControl>
                                    <Input type="number" value={newTotalPaid.toFixed(2)} readOnly className="bg-muted font-semibold text-green-600"/>
                                </FormControl>
                            </FormItem>
                            <FormItem>
                                <FormLabel>Montant restant</FormLabel>
                                <FormControl>
                                    <Input type="number" value={amountRemaining.toFixed(2)} readOnly className="bg-muted font-semibold text-red-600"/>
                                </FormControl>
                            </FormItem>
                        </div>
                     </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                        <FormField
                            control={form.control}
                            name="totalAmount"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Montant total (MAD)</FormLabel>
                                <FormControl>
                                    <Input type="number" step="0.01" placeholder="1500" {...field} />
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="amountPaid"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Avance payée (MAD)</FormLabel>
                                <FormControl>
                                    <Input type="number" step="0.01" placeholder="500" {...field} />
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                         <FormItem>
                            <FormLabel>Montant restant (MAD)</FormLabel>
                            <FormControl>
                                <Input type="number" value={(form.watch('totalAmount') - form.watch('amountPaid')).toFixed(2)} readOnly className="bg-muted"/>
                            </FormControl>
                        </FormItem>
                    </div>
                )}
               
                <div className="grid grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name="method"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Méthode du dernier versement</FormLabel>
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
                     <FormField
                        control={form.control}
                        name="status"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Statut</FormLabel>
                             <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                <SelectTrigger>
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
                </div>


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

