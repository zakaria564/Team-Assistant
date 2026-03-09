"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { Textarea } from "../ui/textarea";
import { db, auth } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { Skeleton } from "../ui/skeleton";
import { useAuthState } from "react-firebase-hooks/auth";
import { useRouter } from "next/navigation";
import { Separator } from "../ui/separator";

const formSchema = z.object({
  clubName: z.string().min(2, "Le nom du club est requis."),
  displayTitle: z.string().optional(),
  logoUrl: z.string().url("Veuillez entrer une URL valide.").optional().or(z.literal('')),
  adminPhotoUrl: z.string().url("Veuillez entrer une URL valide.").optional().or(z.literal('')),
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
        displayTitle: "",
        logoUrl: "",
        adminPhotoUrl: "",
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
                form.reset({
                  clubName: data.clubName || "",
                  displayTitle: data.displayTitle || "",
                  logoUrl: data.logoUrl || "",
                  adminPhotoUrl: data.adminPhotoUrl || "",
                  contactEmail: data.contactEmail || user.email || "",
                  clubPhone: data.clubPhone || "",
                  address: data.address || "",
                });
            } else {
                form.reset({
                  clubName: "",
                  displayTitle: "",
                  logoUrl: "",
                  adminPhotoUrl: "",
                  contactEmail: user.email || "",
                  clubPhone: "",
                  address: "",
                });
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
        toast({ title: "Informations enregistrées", description: "Les données ont été mises à jour." });
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
        <CardTitle>Configuration de l'Interface</CardTitle>
        <CardDescription>Gérez le titre affiché et les informations de votre club.</CardDescription>
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
                    <div className="grid sm:grid-cols-2 gap-4">
                        <FormField
                            control={form.control}
                            name="clubName"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Nom officiel du club</FormLabel>
                                <FormControl>
                                    <Input placeholder="Ex: USDS Football" {...field} />
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="displayTitle"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Grand Titre (Barre du haut)</FormLabel>
                                <FormControl>
                                    <Input placeholder="Ex: CLUB USDS" {...field} />
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                    
                    <Separator className="!my-6"/>

                    <div className="space-y-4">
                         <h4 className="text-base font-medium">Images & Logos</h4>
                         <div className="grid sm:grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="logoUrl"
                                render={({ field }) => (
                                    <FormItem>
                                    <FormLabel>URL du logo (Menu latéral)</FormLabel>
                                    <FormControl>
                                        <Input placeholder="" {...field} value={field.value || ''} />
                                    </FormControl>
                                    <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="adminPhotoUrl"
                                render={({ field }) => (
                                    <FormItem>
                                    <FormLabel>URL de votre photo de profil</FormLabel>
                                    <FormControl>
                                        <Input placeholder="" {...field} value={field.value || ''} />
                                    </FormControl>
                                    <FormMessage />
                                    </FormItem>
                                )}
                            />
                         </div>
                    </div>
                    
                     <Separator className="!my-6"/>

                    <div className="space-y-4">
                        <h4 className="text-base font-medium">Coordonnées</h4>
                        <div className="grid sm:grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="contactEmail"
                                render={({ field }) => (
                                    <FormItem>
                                    <FormLabel>Email de contact</FormLabel>
                                    <FormControl>
                                        <Input type="email" placeholder="" {...field} value={field.value ?? ""}/>
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
                                    <FormLabel>Téléphone</FormLabel>
                                    <FormControl>
                                        <Input type="tel" placeholder="" {...field} value={field.value ?? ""} />
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
                                    <Textarea placeholder="" {...field} value={field.value ?? ""} />
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>

                    <Button type="submit" disabled={loading} className="!mt-6 w-full sm:w-auto">
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Enregistrer les modifications
                    </Button>
                </form>
            </Form>
        )}
      </CardContent>
    </Card>
  );
}
