
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle2, AlertTriangle, Link as LinkIcon, Trash2 } from "lucide-react";
import { useState, useEffect } from "react";
import { Textarea } from "../ui/textarea";
import { db, auth } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { Skeleton } from "../ui/skeleton";
import { useAuthState } from "react-firebase-hooks/auth";
import { useRouter } from "next/navigation";
import { Separator } from "../ui/separator";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";

const formSchema = z.object({
  clubName: z.string().min(2, "Le nom du club est requis."),
  displayTitle: z.string().optional(),
  logoUrl: z.string().optional().or(z.literal('')),
  adminPhotoUrl: z.string().optional().or(z.literal('')),
  contactEmail: z.string().email("Veuillez entrer une adresse email valide.").optional().or(z.literal('')),
  clubPhone: z.string().optional(),
  address: z.string().optional(),
});

export function ClubSettingsForm() {
  const [user, loadingUser] = useAuthState(auth);
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [saveError, setSaveError] = useState<string | null>(null);
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
                form.reset({ ...docSnap.data() });
            } else {
                form.reset({ contactEmail: user.email || "" });
            }
        } catch (error) {
            console.error("Error fetching club data: ", error);
        } finally {
            setLoadingData(false);
        }
    };
    if (user || !loadingUser) fetchClubData();
  }, [user, loadingUser, form]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!user) return;
    
    // Protection contre les chaînes trop longues (limite Firestore 1Mo par document)
    const totalSize = JSON.stringify(values).length;
    if (totalSize > 800000) {
        setSaveError("L'image ou les données sont trop volumineuses. Veuillez utiliser une URL d'image plus courte ou une image compressée.");
        return;
    }

    setLoading(true);
    setSaveError(null);
    try {
        const clubDocRef = doc(db, "clubs", user.uid);
        await setDoc(clubDocRef, { ...values, userId: user.uid, updatedAt: new Date() }, { merge: true });
        toast({ title: "Configuration enregistrée !" });
        router.refresh();
    } catch (error: any) {
        console.error(error);
        setSaveError("Erreur technique lors de l'enregistrement. Veuillez vérifier la taille de vos URLs d'images.");
        toast({ variant: "destructive", title: "Erreur" });
    } finally {
        setLoading(false);
    }
  };

  return (
    <Card className="shadow-md">
      <CardHeader>
        <CardTitle>Identité du Club</CardTitle>
        <CardDescription>Gérez les informations officielles et les logos de votre plateforme.</CardDescription>
      </CardHeader>
      <CardContent>
        {loadingData || loadingUser ? (
             <div className="space-y-4"><Skeleton className="h-9 w-1/2" /><Skeleton className="h-20 w-full" /></div>
        ) : (
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    {saveError && (
                        <Alert variant="destructive"><AlertTriangle className="h-4 w-4" /><AlertTitle>Attention</AlertTitle><AlertDescription>{saveError}</AlertDescription></Alert>
                    )}
                    <div className="grid sm:grid-cols-2 gap-6">
                        <FormField control={form.control} name="clubName" render={({ field }) => (
                            <FormItem><FormLabel>Nom officiel du club</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name="displayTitle" render={({ field }) => (
                            <FormItem><FormLabel>Titre de l'application (Barre du haut)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                    </div>
                    
                    <Separator />

                    <div className="grid sm:grid-cols-2 gap-8">
                        <div className="space-y-4">
                            <FormLabel className="text-base flex items-center gap-2"><LinkIcon className="h-4 w-4" /> Logo du Club (URL)</FormLabel>
                            <div className="flex flex-col gap-4">
                                <div className="h-24 w-24 border-2 rounded-lg bg-muted flex items-center justify-center overflow-hidden shadow-inner bg-white">
                                    {form.watch('logoUrl') ? <img src={form.watch('logoUrl')} className="h-full w-full object-contain p-1" alt="Logo" /> : <div className="text-[10px] text-muted-foreground font-bold text-center p-2">Aucun Logo</div>}
                                </div>
                                <div className="flex gap-2">
                                    <FormField control={form.control} name="logoUrl" render={({ field }) => (
                                        <FormItem className="flex-1"><FormControl><Input placeholder="Coller l'URL du logo..." {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>
                                    )} />
                                    <Button type="button" variant="outline" size="icon" className="shrink-0" onClick={() => form.setValue('logoUrl', '')} title="Effacer"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                                </div>
                                <p className="text-[10px] text-muted-foreground italic">Collez l'adresse web de votre logo (Format PNG/JPG recommandé).</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <FormLabel className="text-base flex items-center gap-2"><LinkIcon className="h-4 w-4" /> Photo Profil Admin (URL)</FormLabel>
                            <div className="flex flex-col gap-4">
                                <div className="h-24 w-24 rounded-full border-2 bg-muted flex items-center justify-center overflow-hidden shadow-inner bg-white">
                                    {form.watch('adminPhotoUrl') ? <img src={form.watch('adminPhotoUrl')} className="h-full w-full object-cover" alt="Admin" /> : <div className="text-[10px] text-muted-foreground font-bold text-center">Aucune Photo</div>}
                                </div>
                                <div className="flex gap-2">
                                    <FormField control={form.control} name="adminPhotoUrl" render={({ field }) => (
                                        <FormItem className="flex-1"><FormControl><Input placeholder="Coller l'URL de la photo..." {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>
                                    )} />
                                    <Button type="button" variant="outline" size="icon" className="shrink-0" onClick={() => form.setValue('adminPhotoUrl', '')} title="Effacer"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                                </div>
                                <p className="text-[10px] text-muted-foreground italic">Collez l'adresse web de votre photo de profil.</p>
                            </div>
                        </div>
                    </div>
                    
                    <Separator />

                    <div className="grid sm:grid-cols-2 gap-4">
                        <FormField control={form.control} name="contactEmail" render={({ field }) => (
                            <FormItem><FormLabel>Email officiel</FormLabel><FormControl><Input type="email" {...field} /></FormControl></FormItem>
                        )} />
                        <FormField control={form.control} name="clubPhone" render={({ field }) => (
                            <FormItem><FormLabel>Téléphone</FormLabel><FormControl><Input type="tel" {...field} /></FormControl></FormItem>
                        )} />
                    </div>
                    <FormField control={form.control} name="address" render={({ field }) => (
                        <FormItem><FormLabel>Adresse complète</FormLabel><FormControl><Textarea {...field} /></FormControl></FormItem>
                    )} />

                    <Button type="submit" disabled={loading} className="w-full font-black uppercase tracking-widest h-12">
                        {loading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <CheckCircle2 className="mr-2 h-5 w-5" />}
                        Enregistrer les modifications
                    </Button>
                </form>
            </Form>
        )}
      </CardContent>
    </Card>
  );
}
