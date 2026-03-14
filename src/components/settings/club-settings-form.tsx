
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Upload, CheckCircle2, X, AlertTriangle } from "lucide-react";
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
        } finally {
            setLoadingData(false);
        }
    };

    if (user || !loadingUser) {
        fetchClubData();
    }
  }, [user, loadingUser, form]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>, type: 'logoUrl' | 'adminPhotoUrl') => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 1.5 * 1024 * 1024) {
        toast({
            variant: "destructive",
            title: "Fichier trop volumineux",
            description: "Pour des raisons de performance, l'image doit faire moins de 1.5 Mo."
        });
        return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
        const base64String = reader.result as string;
        form.setValue(type, base64String);
        setSaveError(null);
    };
    reader.readAsDataURL(file);
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!user) return;
    setLoading(true);
    setSaveError(null);
    try {
        const clubDocRef = doc(db, "clubs", user.uid);
        const dataToSave = {
            ...values,
            userId: user.uid,
            updatedAt: new Date(),
        };
        await setDoc(clubDocRef, dataToSave, { merge: true });
        toast({ title: "Configuration enregistrée !" });
        router.refresh();
    } catch (error: any) {
        console.error("Save error:", error);
        let message = "Une erreur est survenue lors de la sauvegarde.";
        if (error.code === 'resource-exhausted' || error.message?.includes('too large')) {
            message = "Le fichier est trop volumineux pour être stocké. Veuillez utiliser une image plus compressée (moins de 800Ko).";
        }
        setSaveError(message);
        toast({ variant: "destructive", title: "Erreur", description: message });
    } finally {
        setLoading(false);
    }
  };

  return (
    <Card className="shadow-md">
      <CardHeader>
        <CardTitle>Identité du Club</CardTitle>
        <CardDescription>Gérez le logo et les informations officielles qui apparaîtront sur vos documents.</CardDescription>
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
            </div>
        ) : (
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    {saveError && (
                        <Alert variant="destructive">
                            <AlertTriangle className="h-4 w-4" />
                            <AlertTitle>Attention</AlertTitle>
                            <AlertDescription>{saveError}</AlertDescription>
                        </Alert>
                    )}
                    <div className="grid sm:grid-cols-2 gap-6">
                        <FormField
                            control={form.control}
                            name="clubName"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Nom officiel du club</FormLabel>
                                <FormControl>
                                    <Input placeholder="Ex: WAC Casablanca" {...field} />
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
                                <FormLabel>Titre de l'application (Barre du haut)</FormLabel>
                                <FormControl>
                                    <Input placeholder="Ex: CLUB USDS" {...field} />
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                    
                    <Separator />

                    <div className="grid sm:grid-cols-2 gap-8">
                        <div className="space-y-4">
                            <FormLabel className="text-base">Logo du Club (PDF & Documents)</FormLabel>
                            <div className="flex flex-col gap-4">
                                <div className="h-32 w-full max-w-[200px] border-2 border-dashed rounded-lg bg-muted flex items-center justify-center overflow-hidden relative group">
                                    {form.watch('logoUrl') ? (
                                        <>
                                            <img src={form.watch('logoUrl')} className="h-full w-full object-contain p-2" alt="Logo" />
                                            <Button 
                                                type="button" 
                                                variant="destructive" 
                                                size="icon" 
                                                className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                                onClick={() => form.setValue('logoUrl', '')}
                                            >
                                                <X className="h-3 w-3" />
                                            </Button>
                                        </>
                                    ) : (
                                        <Upload className="h-8 w-8 text-muted-foreground opacity-50" />
                                    )}
                                </div>
                                <div className="flex flex-col gap-2">
                                    <Input 
                                        type="file" 
                                        accept="image/*" 
                                        onChange={(e) => handleFileChange(e, 'logoUrl')} 
                                        className="hidden" 
                                        id="logo-input"
                                    />
                                    <Button 
                                        type="button" 
                                        variant="outline" 
                                        size="sm"
                                        className="w-full sm:w-auto"
                                        onClick={() => document.getElementById('logo-input')?.click()}
                                    >
                                        <Upload className="mr-2 h-4 w-4" />
                                        {form.watch('logoUrl') ? "Remplacer le logo" : "Choisir un logo"}
                                    </Button>
                                    <p className="text-[10px] text-muted-foreground italic font-medium">Format PNG ou JPG conseillé (Max 1.5Mo).</p>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <FormLabel className="text-base">Photo Profil Admin</FormLabel>
                            <div className="flex flex-col gap-4">
                                <div className="h-32 w-32 rounded-full border-2 border-dashed bg-muted flex items-center justify-center overflow-hidden relative group">
                                    {form.watch('adminPhotoUrl') ? (
                                        <>
                                            <img src={form.watch('adminPhotoUrl')} className="h-full w-full object-cover" alt="Admin" />
                                            <Button 
                                                type="button" 
                                                variant="destructive" 
                                                size="icon" 
                                                className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                                onClick={() => form.setValue('adminPhotoUrl', '')}
                                            >
                                                <X className="h-3 w-3" />
                                            </Button>
                                        </>
                                    ) : (
                                        <Upload className="h-8 w-8 text-muted-foreground opacity-50" />
                                    )}
                                </div>
                                <div className="flex flex-col gap-2">
                                    <Input 
                                        type="file" 
                                        accept="image/*" 
                                        onChange={(e) => handleFileChange(e, 'adminPhotoUrl')} 
                                        className="hidden" 
                                        id="admin-input"
                                    />
                                    <Button 
                                        type="button" 
                                        variant="outline" 
                                        size="sm"
                                        className="w-full sm:w-auto"
                                        onClick={() => document.getElementById('admin-input')?.click()}
                                    >
                                        <Upload className="mr-2 h-4 w-4" />
                                        Modifier la photo
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <Separator />

                    <div className="space-y-4">
                        <h4 className="text-lg font-semibold">Coordonnées de Contact</h4>
                        <div className="grid sm:grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="contactEmail"
                                render={({ field }) => (
                                    <FormItem>
                                    <FormLabel>Email officiel</FormLabel>
                                    <FormControl>
                                        <Input type="email" {...field} value={field.value ?? ""}/>
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
                                        <Input type="tel" {...field} value={field.value ?? ""} />
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
                                <FormLabel>Adresse complète</FormLabel>
                                <FormControl>
                                    <Textarea {...field} value={field.value ?? ""} />
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>

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
