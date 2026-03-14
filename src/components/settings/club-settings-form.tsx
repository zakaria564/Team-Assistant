
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Upload, CheckCircle2, X, AlertTriangle, Link as LinkIcon } from "lucide-react";
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
    setLoading(true);
    setSaveError(null);
    try {
        const clubDocRef = doc(db, "clubs", user.uid);
        await setDoc(clubDocRef, { ...values, userId: user.uid, updatedAt: new Date() }, { merge: true });
        toast({ title: "Configuration enregistrée !" });
        router.refresh();
    } catch (error: any) {
        setSaveError("Erreur lors de l'enregistrement. Si vous utilisez une image, elle est peut-être trop lourde.");
        toast({ variant: "destructive", title: "Erreur" });
    } finally {
        setLoading(false);
    }
  };

  return (
    <Card className="shadow-md">
      <CardHeader>
        <CardTitle>Identité du Club</CardTitle>
        <CardDescription>Gérez le logo et les informations officielles du club.</CardDescription>
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
                            <FormItem><FormLabel>Titre de l'application</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                    </div>
                    
                    <Separator />

                    <div className="grid sm:grid-cols-2 gap-8">
                        <div className="space-y-4">
                            <FormLabel className="text-base flex items-center gap-2"><LinkIcon className="h-4 w-4" /> Logo du Club (URL)</FormLabel>
                            <div className="flex flex-col gap-4">
                                <div className="h-24 w-24 border rounded-lg bg-muted flex items-center justify-center overflow-hidden">
                                    {form.watch('logoUrl') ? <img src={form.watch('logoUrl')} className="h-full w-full object-contain p-1" alt="Logo" /> : <Upload className="opacity-20" />}
                                </div>
                                <FormField control={form.control} name="logoUrl" render={({ field }) => (
                                    <FormItem><FormControl><Input placeholder="Coller l'URL du logo ici..." {...field} /></FormControl><FormMessage /></FormItem>
                                )} />
                            </div>
                        </div>

                        <div className="space-y-4">
                            <FormLabel className="text-base flex items-center gap-2"><LinkIcon className="h-4 w-4" /> Photo Admin (URL)</FormLabel>
                            <div className="flex flex-col gap-4">
                                <div className="h-24 w-24 rounded-full border bg-muted flex items-center justify-center overflow-hidden">
                                    {form.watch('adminPhotoUrl') ? <img src={form.watch('adminPhotoUrl')} className="h-full w-full object-cover" alt="Admin" /> : <Upload className="opacity-20" />}
                                </div>
                                <FormField control={form.control} name="adminPhotoUrl" render={({ field }) => (
                                    <FormItem><FormControl><Input placeholder="Coller l'URL de la photo ici..." {...field} /></FormControl><FormMessage /></FormItem>
                                )} />
                            </div>
                        </div>
                    </div>
                    
                    <Separator />

                    <div className="grid sm:grid-cols-2 gap-4">
                        <FormField control={form.control} name="contactEmail" render={({ field }) => (
                            <FormItem><FormLabel>Email officiel</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name="clubPhone" render={({ field }) => (
                            <FormItem><FormLabel>Téléphone</FormLabel><FormControl><Input type="tel" {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                    </div>
                    <FormField control={form.control} name="address" render={({ field }) => (
                        <FormItem><FormLabel>Adresse complète</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>
                    )} />

                    <Button type="submit" disabled={loading} className="w-full font-bold">
                        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                        Enregistrer les modifications
                    </Button>
                </form>
            </Form>
        )}
      </CardContent>
    </Card>
  );
}
