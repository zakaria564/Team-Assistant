
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { collection, getDocs, query, addDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

interface Player {
  id: string;
  name: string;
}

const formSchema = z.object({
  playerId: z.string({ required_error: "Le joueur est requis." }).min(1, "Le joueur est requis."),
  amount: z.coerce.number({invalid_type_error: "Le montant est requis."}).min(1, "Le montant doit être supérieur à 0."),
  status: z.enum(["Payé", "En attente", "En retard"], { required_error: "Le statut est requis." }),
  method: z.string({ required_error: "La méthode est requise." }).min(1, "La méthode est requise."),
  description: z.string().min(3, "La description est requise."),
});

const paymentMethods = ["Carte Bancaire", "Espèces", "Virement", "Chèque"];
const paymentStatuses = ["Payé", "En attente", "En retard"];

export function AddPaymentForm() {
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [players, setPlayers] = useState<Player[]>([]);
    const [loadingPlayers, setLoadingPlayers] = useState(true);
    const router = useRouter();

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
        defaultValues: {
            description: "Cotisation annuelle",
            playerId: "",
            amount: 0,
            status: undefined,
            method: "",
        }
    });

    const onSubmit = async (values: z.infer<typeof formSchema>) => {
        setLoading(true);
        try {
             await addDoc(collection(db, "payments"), {
                ...values,
                createdAt: new Date(),
            });

            toast({
                title: "Paiement ajouté !",
                description: `Le paiement a été enregistré avec succès.`
            });
            router.push("/dashboard/payments");
        } catch (e) {
             toast({
                variant: "destructive",
                title: "Erreur",
                description: "Une erreur est survenue lors de l'ajout du paiement.",
            });
            console.error(e);
        } finally {
            setLoading(false);
        }
    }
    
    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 max-w-lg mx-auto">
                 <FormField
                    control={form.control}
                    name="playerId"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Joueur</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value} disabled={loadingPlayers}>
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
               
                <div className="grid grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name="amount"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Montant (MAD)</FormLabel>
                            <FormControl>
                                <Input type="number" step="0.01" placeholder="1500" {...field} />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="method"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Méthode</FormLabel>
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

                 <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Statut</FormLabel>
                         <Select onValueChange={field.onChange} defaultValue={field.value}>
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


                <Button type="submit" disabled={loading || loadingPlayers} className="w-full !mt-8">
                    {loading ? (
                        <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Ajout en cours...
                        </>
                    ) : "Ajouter le paiement"}
                </Button>
            </form>
        </Form>
    );
}
