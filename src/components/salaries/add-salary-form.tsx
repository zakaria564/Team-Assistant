
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

interface Salary {
  id: string;
  coachId: string;
  status: 'Payé' | 'Partiel' | 'En attente' | 'En retard';
  description: string;
  totalAmount: number;
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
const paymentMethods = ["Espèces", "Carte Bancaire", "Virement", "Chèque"];

const normalizeString = (str: string | null | undefined): string => {
    if (!str) return '';
    return str
        .toLowerCase()
        .normalize("NFD") // Decompose accented characters
        .replace(/[\u0300-\u036f]/g, "") // Remove diacritical marks
        .replace(/\s+/g, ''); // Remove all whitespace
};

export function AddSalaryForm({ salary }: AddSalaryFormProps) {
    const [user] = useAuthState(auth);
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [coaches, setCoaches] = useState<Coach[]>([]);
    const [allSalaries, setAllSalaries] = useState<Salary[]>([]);
    const [loadingCoaches, setLoadingCoaches] = useState(true);
    const router = useRouter();
    const isEditMode = !!salary;
    
    const amountAlreadyPaid = isEditMode 
      ? (salary.transactions || []).reduce((acc, t) => acc + t.amount, 0)
      : 0;

    const formSchema = z.object({
        coachId: z.string({ required_error: "L'entraîneur est requis." }).min(1, "L'entraîneur est requis."),
        totalAmount: z.coerce.number({required_error: "Le montant est requis.", invalid_type_error: "Le montant est requis."}).min(0.01, "Le montant total doit être positif."),
        description: z.string().min(3, "La description est requise."),
        newTransactionAmount: z.coerce.number().optional(),
        newTransactionMethod: z.string().optional(),
        status: z.enum(["Payé", "Partiel", "En attente", "En retard"]),
    }).superRefine((data, ctx) => {
        const totalAmount = data.totalAmount || 0;
        const amountRemaining = isEditMode ? (salary?.totalAmount || 0) - amountAlreadyPaid : totalAmount;
        if (data.newTransactionAmount && data.newTransactionAmount > amountRemaining) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ["newTransactionAmount"],
                message: `Le versement ne peut pas dépasser le montant restant de ${amountRemaining.toFixed(2)} MAD.`,
            });
        }
    });

    const defaultDescription = `Salaire ${format(new Date(), "MMMM yyyy", { locale: fr })}`;

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        mode: "onChange",
        defaultValues: isEditMode ? {
            coachId: salary.coachId,
            totalAmount: salary.totalAmount,
            description: salary.description,
            status: salary.status,
            newTransactionAmount: undefined,
            newTransactionMethod: "Espèces",
        } : {
            description: defaultDescription,
            coachId: "",
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
    const watchCoachId = form.watch("coachId");

    useEffect(() => {
        if (isEditMode || !watchCoachId || !allSalaries.length) return;

        const normalizedCurrentMonthDesc = normalizeString(defaultDescription);
        
        const existingSalary = allSalaries.find(s => {
            const isSameCoach = s.coachId === watchCoachId;
            const isSameMonth = normalizeString(s.description) === normalizedCurrentMonthDesc;
            const isPending = s.status === 'Partiel' || s.status === 'En attente';
            return isSameCoach && isSameMonth && isPending;
        });

        if (existingSalary) {
            toast({
                title: "Salaire existant trouvé",
                description: `Cet entraîneur a déjà un salaire en attente pour ce mois. Vous allez être redirigé pour le compléter.`,
            });
            router.push(`/dashboard/salaries/${existingSalary.id}/edit`);
        }
    }, [watchCoachId, allSalaries, isEditMode, defaultDescription, router, toast]);

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
         const fetchCoachesAndSalaries = async () => {
            if (!user) return;
            setLoadingCoaches(true);
            try {
                const coachesQuery = query(collection(db, "coaches"), where("userId", "==", user.uid));
                const salariesQuery = query(collection(db, "salaries"), where("userId", "==", user.uid));

                const [coachesSnapshot, salariesSnapshot] = await Promise.all([
                    getDocs(coachesQuery),
                    getDocs(salariesQuery)
                ]);
                
                const allCoaches = coachesSnapshot.docs.map(doc => ({ id: doc.id, name: doc.data().name } as Coach));
                const allSalariesData = salariesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data()} as Salary));
                setAllSalaries(allSalariesData);
                
                if (isEditMode) {
                    setCoaches(allCoaches.sort((a,b) => a.name.localeCompare(b.name)));
                } else {
                    const normalizedCurrentMonthDesc = normalizeString(defaultDescription);
                    const paidCoachIds = new Set<string>();

                    allSalariesData.forEach(s => {
                        const normalizedSalaryDesc = normalizeString(s.description);
                        if(normalizedSalaryDesc === normalizedCurrentMonthDesc && s.status === 'Payé'){
                            paidCoachIds.add(s.coachId);
                        }
                    });
                    
                    const availableCoaches = allCoaches.filter(c => !paidCoachIds.has(c.id));
                    setCoaches(availableCoaches.sort((a,b) => a.name.localeCompare(b.name)));
                }

            } catch (error) {
                console.error("Error fetching data: ", error);
                toast({
                    variant: "destructive",
                    title: "Erreur de chargement",
                    description: "Impossible de charger les entraîneurs disponibles.",
                });
            } finally {
                setLoadingCoaches(false);
            }
        };
        fetchCoachesAndSalaries();
    }, [user, toast, isEditMode, defaultDescription]);

    const onSubmit = async (values: z.infer<typeof formSchema>) => {
        if (!user) {
            toast({ variant: "destructive", title: "Non connecté", description: "Vous devez être connecté pour effectuer cette action." });
            return;
        }

        if (!values.totalAmount) {
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
            if (isEditMode && salary) {
                const salaryDocRef = doc(db, "salaries", salary.id);
                const updateData: any = {
                    totalAmount: values.totalAmount,
                    status: values.status,
                    description: values.description,
                    userId: user.uid,
                };
                if(newTransactionData){
                    updateData.transactions = arrayUnion(newTransactionData);
                }
                
                await updateDoc(salaryDocRef, updateData);

                toast({
                    title: "Salaire mis à jour !",
                    description: newTransactionData 
                      ? `Un versement de ${newTransactionData.amount.toFixed(2)} MAD a été ajouté.`
                      : 'Les informations du salaire ont été mises à jour.',
                });

            } else { // Mode Création
                 const initialTransactions = newTransactionData ? [newTransactionData] : [];
                 await addDoc(collection(db, "salaries"), {
                    userId: user.uid,
                    coachId: values.coachId,
                    totalAmount: values.totalAmount,
                    description: values.description,
                    status: values.status,
                    createdAt: new Date(),
                    transactions: initialTransactions,
                });
                toast({
                    title: "Salaire ajouté !",
                    description: `Le salaire a été enregistré avec succès.`
                });
            }
            router.push("/dashboard/salaries");
            router.refresh();
        } catch (e) {
             toast({
                variant: "destructive",
                title: "Erreur",
                description: "Une erreur est survenue lors de l'enregistrement du salaire.",
            });
            console.error(e);
        } finally {
            setLoading(false);
        }
    }
    
    const amountRemainingForPlaceholder = parseFloat(isEditMode ? ((salary?.totalAmount || 0) - amountAlreadyPaid).toString() : (watchTotalAmount || 0).toString());

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 max-w-2xl mx-auto">
                 <FormField
                    control={form.control}
                    name="coachId"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Entraîneur</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value} disabled={loadingCoaches || isEditMode}>
                            <FormControl>
                            <SelectTrigger>
                                <SelectValue placeholder={loadingCoaches ? "Chargement des entraîneurs..." : "Sélectionner un entraîneur"} />
                            </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                            {coaches.length === 0 && !loadingCoaches ? (
                                <SelectItem value="no-coach" disabled>Aucun entraîneur à payer pour ce mois-ci.</SelectItem>
                            ) : (
                                coaches.map(coach => (
                                    <SelectItem key={coach.id} value={coach.id}>{coach.name}</SelectItem>
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
                            <Input placeholder="Ex: Salaire de Septembre" {...field} />
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
                            value={field.value === undefined ? "" : field.value}
                            onChange={e => field.onChange(e.target.value === '' ? undefined : e.target.valueAsNumber)}
                        />
                      </FormControl>
                      <FormMessage />
                  </FormItem>
                  )}
              />

                {isEditMode && salary && (
                  <Card className="bg-muted/30">
                    <CardHeader>
                        <CardTitle className="text-lg">Historique des transactions</CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm">
                      <div className="w-full overflow-x-auto">
                        {(salary.transactions || []).length > 0 ? (
                          <ul className="space-y-2">
                            {salary.transactions.map((t, i) => (
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
               
                 {((watchTotalAmount || 0) > amountAlreadyPaid) && (
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
                                    placeholder={amountRemainingForPlaceholder?.toFixed(2) || '0.00'}
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
                                  <Input type="text" value={`${amountRemainingOnTotal.toFixed(2)} MAD`} readOnly className="bg-muted font-semibold text-red-600"/>
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


                <Button type="submit" disabled={loading || loadingCoaches} className="w-full !mt-8">
                    {loading ? (
                        <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Enregistrement...
                        </>
                    ) : isEditMode ? "Enregistrer les modifications" : "Ajouter le salaire"}
                </Button>
            </form>
        </Form>
    );
}

