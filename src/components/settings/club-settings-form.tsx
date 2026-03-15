"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle2, AlertTriangle, Link as LinkIcon, Trash2, Upload, Image as ImageIcon } from "lucide-react";
import { useState, useEffect, useRef } from "react";
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
  
  const logoInputRef = useRef<HTMLInputElement>(null);
  const adminInputRef = useRef<HTMLInputElement>(null);

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

  const compressImage = (file: File, maxSize: number = 400): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > maxSize) {
              height *= maxSize / width;
              width = maxSize;
            }
          } else {
            if (height > maxSize) {
              width *= maxSize / height;
              height = maxSize;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.7));
        };
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, fieldName: 'logoUrl' | 'adminPhotoUrl') => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setLoading(true);
      const compressed = await compressImage(file);
      form.setValue(fieldName, compressed);
      toast({ title: "Image chargée", description: "L'image a été optimisée pour le système." });
    } catch (error) {
      toast({ variant: "destructive", title: "Erreur", description: "Impossible de traiter l'image." });
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!user) return;
    
    setLoading(true);
    setSaveError(null);
    try {
        const clubDocRef = doc(db, "clubs", user.uid);
        await setDoc(clubDocRef, { ...values, userId: user.uid, updatedAt: new Date() }, { merge: true });
        toast({ title: "Configuration enregistrée !", description: "Vos modifications sont appliquées sur tous vos appareils." });
        router.refresh();
    } catch (error: any) {
        console.error(error);
        setSaveError("Erreur lors de l'enregistrement. Vérifiez vos URLs d'images.");
        toast({ variant: "destructive", title: "Erreur technique" });
    } finally {
        setLoading(false);
    }
  };

  return (
    <Card className="shadow-md">
      <CardHeader>
        <CardTitle>Identité du Club</CardTitle>
        <CardDescription>Gérez l'image de marque et les contacts de votre club.</CardDescription>
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
                            <FormLabel className="text-base flex items-center gap-2"><ImageIcon className="h-4 w-4 text-primary" /> Logo du Club</FormLabel>
                            <div className="flex flex-col gap-4">
                                <div className="h-32 w-32 border-2 rounded-xl bg-slate-50 flex items-center justify-center overflow-hidden shadow-sm relative group">
                                    {form.watch('logoUrl') ? (
                                        <>
                                            <img src={form.watch('logoUrl')} className="h-full w-full object-contain p-2" alt="Logo" />
                                            <button 
                                                type="button" 
                                                onClick={() => form.setValue('logoUrl', '')}
                                                className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                <Trash2 className="h-6 w-6 text-white" />
                                            </button>
                                        </>
                                    ) : <div className="text-[10px] text-muted-foreground font-bold">Aucun Logo</div>}
                                </div>
                                <div className="flex flex-col gap-2">
                                    <div className="flex gap-2">
                                        <Button type="button" variant="outline" className="flex-1" onClick={() => logoInputRef.current?.click()}>
                                            <Upload className="mr-2 h-4 w-4" /> Choisir fichier
                                        </Button>
                                        <input type="file" ref={logoInputRef} className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, 'logoUrl')} />
                                    </div>
                                    <FormField control={form.control} name="logoUrl" render={({ field }) => (
                                        <FormItem><FormControl><Input placeholder="Ou coller l'URL ici..." {...field} value={field.value || ''} className="text-xs h-8" /></FormControl></FormItem>
                                    )} />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <FormLabel className="text-base flex items-center gap-2"><ImageIcon className="h-4 w-4 text-primary" /> Photo Profil Admin</FormLabel>
                            <div className="flex flex-col gap-4">
                                <div className="h-32 w-32 rounded-full border-2 bg-slate-50 flex items-center justify-center overflow-hidden shadow-sm relative group">
                                    {form.watch('adminPhotoUrl') ? (
                                        <>
                                            <img src={form.watch('adminPhotoUrl')} className="h-full w-full object-cover" alt="Admin" />
                                            <button 
                                                type="button" 
                                                onClick={() => form.setValue('adminPhotoUrl', '')}
                                                className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                <Trash2 className="h-6 w-6 text-white" />
                                            </button>
                                        </>
                                    ) : <div className="text-[10px] text-muted-foreground font-bold">Aucune Photo</div>}
                                </div>
                                <div className="flex flex-col gap-2">
                                    <div className="flex gap-2">
                                        <Button type="button" variant="outline" className="flex-1" onClick={() => adminInputRef.current?.click()}>
                                            <Upload className="mr-2 h-4 w-4" /> Choisir fichier
                                        </Button>
                                        <input type="file" ref={adminInputRef} className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, 'adminPhotoUrl')} />
                                    </div>
                                    <FormField control={form.control} name="adminPhotoUrl" render={({ field }) => (
                                        <FormItem><FormControl><Input placeholder="Ou coller l'URL ici..." {...field} value={field.value || ''} className="text-xs h-8" /></FormControl></FormItem>
                                    )} />
                                </div>
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

                    <Button type="submit" disabled={loading} className="w-full font-black uppercase tracking-widest h-12 shadow-lg">
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
