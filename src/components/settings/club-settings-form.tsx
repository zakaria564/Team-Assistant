"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Upload, CheckCircle2 } from "lucide-react";
import { useState, useEffect } from "react";
import { Textarea } from "../ui/textarea";
import { db, auth, storage } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { Skeleton } from "../ui/skeleton";
import { useAuthState } from "react-firebase-hooks/auth";
import { useRouter } from "next/navigation";
import { Separator } from "../ui/separator";

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
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingAdmin, setUploadingAdmin] = useState(false);
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
        } finally {
            setLoadingData(false);
        }
    };

    if (user || !loadingUser) {
        fetchClubData();
    }
  }, [user, loadingUser, form]);

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'admin') => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    const isLogo = type === 'logo';
    isLogo ? setUploadingLogo(true) : setUploadingAdmin(true);

    try {
        const storageRef = ref(storage, `clubs/${user.uid}/${type}_${Date.now()}`);
        await uploadBytes(storageRef, file);
        const downloadUrl = await getDownloadURL(storageRef);
        
        form.setValue(isLogo ? 'logoUrl' : 'adminPhotoUrl', downloadUrl);
        toast({
            title: "Image chargée",
            description: "L'image a été stockée avec succès sur Firebase."
        });
    } catch (error) {
        console.error("Upload error:", error);
        toast({
            variant: "destructive",
            title: "Erreur d'envoi",
            description: "Impossible d'envoyer l'image vers Firebase Storage."
        });
    } finally {
        isLogo ? setUploadingLogo(false) : setUploadingAdmin(false);
    }
  };


  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!user) return;
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
        toast({ variant: "destructive", title: "Erreur", description: "Impossible d'enregistrer." });
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

                    <div className="space-y-6">
                         <h4 className="text-base font-medium">Images & Logos (Firebase)</h4>
                         <div className="grid sm:grid-cols-2 gap-8">
                            <div className="space-y-3">
                                <FormLabel>Logo du Club</FormLabel>
                                <div className="flex items-center gap-4">
                                    <div className="h-16 w-16 rounded border bg-muted flex items-center justify-center overflow-hidden shrink-0">
                                        {form.watch('logoUrl') ? (
                                            <img src={form.watch('logoUrl')} className="h-full w-full object-contain" />
                                        ) : <Upload className="opacity-20" />}
                                    </div>
                                    <div className="space-y-2 flex-1">
                                        <Input 
                                            type="file" 
                                            accept="image/*" 
                                            onChange={(e) => handleImageUpload(e, 'logo')} 
                                            className="hidden" 
                                            id="logo-upload"
                                        />
                                        <Button 
                                            type="button" 
                                            variant="outline" 
                                            size="sm" 
                                            className="w-full"
                                            disabled={uploadingLogo}
                                            onClick={() => document.getElementById('logo-upload')?.click()}
                                        >
                                            {uploadingLogo ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <Upload className="mr-2 h-4 w-4" />}
                                            {form.watch('logoUrl') ? "Changer le logo" : "Uploader le logo"}
                                        </Button>
                                        <p className="text-[10px] text-muted-foreground italic">Recommandé : PNG fond transparent</p>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <FormLabel>Photo Profil Admin</FormLabel>
                                <div className="flex items-center gap-4">
                                    <div className="h-16 w-16 rounded-full border bg-muted flex items-center justify-center overflow-hidden shrink-0">
                                        {form.watch('adminPhotoUrl') ? (
                                            <img src={form.watch('adminPhotoUrl')} className="h-full w-full object-cover" />
                                        ) : <Upload className="opacity-20" />}
                                    </div>
                                    <div className="space-y-2 flex-1">
                                        <Input 
                                            type="file" 
                                            accept="image/*" 
                                            onChange={(e) => handleImageUpload(e, 'admin')} 
                                            className="hidden" 
                                            id="admin-upload"
                                        />
                                        <Button 
                                            type="button" 
                                            variant="outline" 
                                            size="sm" 
                                            className="w-full"
                                            disabled={uploadingAdmin}
                                            onClick={() => document.getElementById('admin-upload')?.click()}
                                        >
                                            {uploadingAdmin ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <Upload className="mr-2 h-4 w-4" />}
                                            Changer la photo
                                        </Button>
                                    </div>
                                </div>
                            </div>
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
                                <FormLabel>Adresse</FormLabel>
                                <FormControl>
                                    <Textarea {...field} value={field.value ?? ""} />
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>

                    <Button type="submit" disabled={loading} className="!mt-10 w-full">
                        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                        Enregistrer toutes les modifications
                    </Button>
                </form>
            </Form>
        )}
      </CardContent>
    </Card>
  );
}
