
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "@/lib/firebase";
import { updateProfile } from "firebase/auth";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";

const formSchema = z.object({
  name: z.string().min(2, "Le nom doit contenir au moins 2 caractères."),
  email: z.string().email("Veuillez entrer une adresse email valide."),
  photoURL: z.string().url("Veuillez entrer une URL d'image valide.").or(z.literal('')).optional(),
});

export function ProfileSettingsForm() {
  const [user, loadingUser, errorUser] = useAuthState(auth);
  const { toast } = useToast();
  const [loadingSubmit, setLoadingSubmit] = useState(false);
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
        name: "",
        email: "",
        photoURL: "",
    },
  });

  useEffect(() => {
    if (user) {
      form.reset({
        name: user.displayName || "",
        email: user.email || "",
        photoURL: user.photoURL || "",
      });
    }
  }, [user, form]);


  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setLoadingSubmit(true);
    if (!user) {
        toast({ variant: "destructive", title: "Erreur", description: "Vous n'êtes pas connecté." });
        setLoadingSubmit(false);
        return;
    }

    try {
        await updateProfile(user, { 
            displayName: values.name,
            photoURL: values.photoURL || null,
        });

        toast({ title: "Profil mis à jour", description: "Vos informations ont été mises à jour avec succès." });
        
        form.reset({
            name: user.displayName || "",
            email: user.email || "",
            photoURL: user.photoURL || "",
        });

    } catch (error: any) {
        toast({ variant: "destructive", title: "Erreur", description: error.message });
    } finally {
        setLoadingSubmit(false);
    }
  };
  
  const userInitial = user?.displayName?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || "A";
  const photoUrlValue = form.watch("photoURL");

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
                        <AvatarImage key={photoUrlValue} src={photoUrlValue || undefined} alt={user?.displayName || ""} />
                        <AvatarFallback className="text-2xl">{userInitial}</AvatarFallback>
                    </Avatar>
                     <FormField
                        control={form.control}
                        name="photoURL"
                        render={({ field }) => (
                            <FormItem className="flex-1">
                            <FormLabel>URL de la photo de profil</FormLabel>
                            <FormControl>
                                <Input 
                                    type="text"
                                    placeholder="https://exemple.com/photo.jpg"
                                    {...field}
                                    value={field.value || ""}
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
                <Button type="submit" disabled={loadingSubmit || loadingUser}>
                    {loadingSubmit ? (
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
