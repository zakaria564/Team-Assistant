"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle2, AlertTriangle, Trash2, Upload, Link as LinkIcon, Image as ImageIcon } from "lucide-react";
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
          if (width > height) { if (width > maxSize) { height *= maxSize / width; width = maxSize; } } 
          else { if (height > maxSize) { width *= maxSize / height; height = maxSize; } }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.7));
        };
      };
      reader.onerror = reject;
    });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, fieldName: 'logoUrl' | 'adminPhotoUrl') => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setLoading(true);
      const compressed = await compressImage(file);
      form.setValue(fieldName, compressed);
      toast({ title: "Image chargée", description: "L'image a été compressée pour les performances mobile." });
    } catch (error) {
      toast({ variant: "destructive", title: "Erreur d'image" });
    } finally { setLoading(false); }
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!user) return;
    setLoading(true);
    setSaveError(null);
    try {
        const clubDocRef = doc(db, "clubs", user.uid);
        await setDoc(clubDocRef, { ...values, userId: user.uid, updatedAt: new Date() }, { merge: true });
        toast({ title: "Modifications enregistrées !" });
        router.refresh();
    } catch (error: any) {
        console.error(error);
        setSaveError("Erreur d'enregistrement. Vérifiez la taille des images (max 1Mo après compression).");
        toast({ variant: "destructive", title: "Erreur" });
    } finally { setLoading(false); }
  };

  return (
    <Card className="shadow-md">
      <CardHeader>
        <CardTitle>Identité du Club</CardTitle>
        <CardDescription>Gérez l'image de marque et les contacts officiels.</CardDescription>
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

                    <div className="grid sm:grid-cols-2 gap-10">
                        <div className="space-y-4">
                            <FormLabel className="text-base flex items-center gap-2"><ImageIcon className="h-4 w-4 text-primary" /> Logo du Club (URL)</FormLabel>
                            <div className="flex flex-col gap-4">
                                <div className="h-32 w-32 border-2 rounded-xl bg-slate-50 flex items-center justify-center overflow-hidden shadow-inner relative mx-auto sm:mx-0">
                                    {form.watch('logoUrl') ? (
                                        <img src={form.watch('logoUrl')} className="h-full w-full object-contain p-2" alt="Logo" />
                                    ) : <div className="text-[10px] text-muted-foreground font-black uppercase">Aucun Logo</div>}
                                </div>
                                <div className="space-y-2">
                                    <div className="flex gap-2">
                                        <Button type="button" variant="outline" className="flex-1 h-10 text-xs font-bold" onClick={() => logoInputRef.current?.click()}>
                                            <Upload className="mr-2 h-4 w-4" /> Charger
                                        </Button>
                                        <input type="file" ref={logoInputRef} className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, 'logoUrl')} />
                                        {form.watch('logoUrl') && (
                                            <Button type="button" variant="destructive" size="icon" className="h-10 w-10 shrink-0" onClick={() => form.setValue('logoUrl', '')}>
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        )}
                                    </div>
                                    <FormField control={form.control} name="logoUrl" render={({ field }) => (
                                        <FormItem>
                                            <FormControl>
                                                <div className="relative">
                                                    <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                                                    <Input placeholder="Coller l'URL du logo ici..." {...field} value={field.value || ''} className="pl-9 text-xs h-9" />
                                                </div>
                                            </FormControl>
                                        </FormItem>
                                    )} />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <FormLabel className="text-base flex items-center gap-2"><ImageIcon className="h-4 w-4 text-primary" /> Photo Profil Admin (URL)</FormLabel>
                            <div className="flex flex-col gap-4">
                                <div className="h-32 w-32 rounded-full border-2 bg-slate-50 flex items-center justify-center overflow-hidden shadow-inner relative mx-auto sm:mx-0">
                                    {form.watch('adminPhotoUrl') ? (
                                        <img src={form.watch('adminPhotoUrl')} className="h-full w-full object-cover" alt="Admin" />
                                    ) : <div className="text-[10px] text-muted-foreground font-black uppercase">Pas de Photo</div>}
                                </div>
                                <div className="space-y-2">
                                    <div className="flex gap-2">
                                        <Button type="button" variant="outline" className="flex-1 h-10 text-xs font-bold" onClick={() => adminInputRef.current?.click()}>
                                            <Upload className="mr-2 h-4 w-4" /> Charger
                                        </Button>
                                        <input type="file" ref={adminInputRef} className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, 'adminPhotoUrl')} />
                                        {form.watch('adminPhotoUrl') && (
                                            <Button type="button" variant="destructive" size="icon" className="h-10 w-10 shrink-0" onClick={() => form.setValue('adminPhotoUrl', '')}>
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        )}
                                    </div>
                                    <FormField control={form.control} name="adminPhotoUrl" render={({ field }) => (
                                        <FormItem>
                                            <FormControl>
                                                <div className="relative">
                                                    <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                                                    <Input placeholder="Coller l'URL de la photo ici..." {...field} value={field.value || ''} className="pl-9 text-xs h-9" />
                                                </div>
                                            </FormControl>
                                        </FormItem>
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

                    <Button type="submit" disabled={loading} className="w-full font-black uppercase tracking-widest h-12 shadow-lg mt-8">
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