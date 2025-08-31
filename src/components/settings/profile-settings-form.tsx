
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth, storage } from "@/lib/firebase";
import { updateProfile } from "firebase/auth";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";

const formSchema = z.object({
  name: z.string().min(2, "Le nom doit contenir au moins 2 caractères."),
  email: z.string().email("Veuillez entrer une adresse email valide."),
  photo: z.any().optional(),
});

export function ProfileSettingsForm() {
  const [user, loadingUser] = useAuthState(auth);
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);


  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
        name: "",
        email: "",
    },
  });

  useEffect(() => {
    if (user) {
      form.reset({
        name: user.displayName || "",
        email: user.email || "",
      });
      if (user.photoURL) {
        setPhotoPreview(user.photoURL);
      }
    }
  }, [user, form]);


  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };


  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setLoading(true);
    if (!user) {
        toast({ variant: "destructive", title: "Erreur", description: "Vous n'êtes pas connecté." });
        setLoading(false);
        return;
    }

    try {
        let photoURL = user.photoURL;
        const photoFile = values.photo?.[0];

        if (photoFile) {
            const storageRef = ref(storage, `profile-pictures/${user.uid}/${photoFile.name}`);
            const snapshot = await uploadBytes(storageRef, photoFile);
            photoURL = await getDownloadURL(snapshot.ref);
        }

        await updateProfile(user, { 
            displayName: values.name,
            photoURL: photoURL
        });
        
        if (photoURL) {
          setPhotoPreview(photoURL);
        }

        toast({ title: "Profil mis à jour", description: "Vos informations ont été mises à jour avec succès." });
    } catch (error: any) {
        toast({ variant: "destructive", title: "Erreur", description: error.message });
    } finally {
        setLoading(false);
    }
  };
  
  const userInitial = user?.displayName?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || "A";

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profil</CardTitle>
        <CardDescription>Mettez à jour les informations de votre profil.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="flex items-center gap-6">
                    <Avatar className="h-20 w-20">
                        <AvatarImage src={photoPreview || user?.photoURL || undefined} alt={user?.displayName || ""} />
                        <AvatarFallback className="text-2xl">{userInitial}</AvatarFallback>
                    </Avatar>
                    <FormField
                        control={form.control}
                        name="photo"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Photo de profil</FormLabel>
                            <FormControl>
                                <Input 
                                    type="file" 
                                    accept="image/*"
                                    className="file:text-foreground"
                                    onChange={(e) => {
                                        field.onChange(e.target.files);
                                        handlePhotoChange(e);
                                    }}
                                />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>
                 <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Nom complet</FormLabel>
                        <FormControl>
                            <Input placeholder="Votre nom complet" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                            <Input type="email" placeholder="Votre email" {...field} disabled />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                <Button type="submit" disabled={loading}>
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Enregistrement en cours...
                      </>
                    ) : "Enregistrer les modifications" }
                </Button>
            </form>
        </Form>
      </CardContent>
    </Card>
  );
}
