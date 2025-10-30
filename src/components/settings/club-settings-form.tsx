
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { useState, useEffect } from "react";
import { Textarea } from "../ui/textarea";
import { db, auth } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { Skeleton } from "../ui/skeleton";
import { useAuthState } from "react-firebase-hooks/auth";
import { useRouter } from "next/navigation";

const formSchema = z.object({
  clubName: z.string().min(2, "Le nom du club est requis."),
  logoUrl: z.string().url("Veuillez entrer une URL valide.").optional().or(z.literal('')),
  contactEmail: z.string().email("Veuillez entrer une adresse email valide.").optional().or(z.literal('')),
  clubPhone: z.string().optional(),
  address: z.string().optional(),
});

export function ClubSettingsForm() {
  const [user, loadingUser] = useAuthState(auth);
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const router = useRouter();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
        clubName: "",
        logoUrl: "",
        contactEmail: "",
        clubPhone: "",
        address: "",
    }
  });

  useEffect(() => {
    const fetchClubData = async () => {
        if (!user) {
            if (!loadingUser) setLoadingData(false);
            return;
        }
        setLoadingData(true);
        try {
            const clubDocRef = doc(db, "clubs", user.uid);
            const docSnap = await getDoc(clubDocRef);
            if (docSnap.exists()) {
                const data = docSnap.data();
                form.reset(data);
            } else {
                const defaultData = {
                    contactEmail: user.email || "",
                };
                form.reset(defaultData);
            }
        } catch (error) {
            console.error("Error fetching club data: ", error);
            toast({
                variant: "destructive",
                title: "Erreur",
                description: "Impossible de charger les informations du club."
            });
        } finally {
            setLoadingData(false);
        }
    };

    if (user || !loadingUser) {
        fetchClubData();
    }
  }, [user, loadingUser, form, toast]);


  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!user) {
        toast({ variant: "destructive", title: "Non connecté", description: "Vous devez être connecté pour enregistrer." });
        return;
    }
    setLoading(true);
    try {
        const clubDocRef = doc(db, "clubs", user.uid);
        await setDoc(clubDocRef, {
            ...values,
            userId: user.uid,
        }, { merge: true });
        toast({ title: "Informations du club enregistrées", description: "Les données de votre club ont été mises à jour." });
        router.refresh();
    } catch (error: any) {
        toast({ variant: "destructive", title: "Erreur", description: "Impossible d'enregistrer les informations." });
    } finally {
        setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Informations du Club</CardTitle>
        <CardDescription>Gérez les informations publiques de votre club.</CardDescription>
      </CardHeader>
      <CardContent>
        {loadingData || loadingUser ? (
             <div className="space-y-4">
                <Skeleton className="h-9 w-1/2" />
                <div className="grid sm:grid-cols-2 gap-4">
                    <Skeleton className="h-9 w-full" />
                    <Skeleton className="h-9 w-full" />
                </div>
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-10 w-48" />
            </div>
        ) : (
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                        control={form.control}
                        name="clubName"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Nom de votre club</FormLabel>
                            <FormControl>
                                <Input placeholder="Nom de votre club" {...field} />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="logoUrl"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>URL du logo de votre club</FormLabel>
                            <FormControl>
                                <Input placeholder="https://exemple.com/logo.png" {...field} value={field.value || ''} />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                    />
                    
                    <div className="grid sm:grid-cols-2 gap-4">
                        <FormField
                            control={form.control}
                            name="contactEmail"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Email de contact</FormLabel>
                                <FormControl>
                                    <Input type="email" placeholder="contact@club.com" {...field} value={field.value ?? ""}/>
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="clubPhone"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Téléphone du club</FormLabel>
                                <FormControl>
                                    <Input type="tel" placeholder="+33 1 23 45 67 89" {...field} value={field.value ?? ""} />
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                    <FormField
                        control={form.control}
                        name="address"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Adresse</FormLabel>
                            <FormControl>
                                <Textarea placeholder="Adresse complète du siège ou du stade" {...field} value={field.value ?? ""} />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                    />

                    <Button type="submit" disabled={loading} className="!mt-6">
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Enregistrer les informations
                    </Button>
                </form>
            </Form>
        )}
      </CardContent>
    </Card>
  );
}
