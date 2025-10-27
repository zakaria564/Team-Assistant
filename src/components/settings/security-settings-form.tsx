
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
import { useState } from "react";
import { auth } from "@/lib/firebase";
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from "firebase/auth";

const formSchema = z.object({
  currentPassword: z.string().min(1, "Le mot de passe actuel est requis."),
  newPassword: z.string().min(6, "Le nouveau mot de passe doit contenir au moins 6 caractères."),
  confirmPassword: z.string()
}).refine(data => data.newPassword === data.confirmPassword, {
  message: "Les nouveaux mots de passe ne correspondent pas.",
  path: ["confirmPassword"],
});

export function SecuritySettingsForm() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
        currentPassword: "",
        newPassword: "",
        confirmPassword: ""
    }
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    const user = auth.currentUser;
    if (!user || !user.email) {
      toast({ variant: "destructive", title: "Erreur", description: "Utilisateur non trouvé." });
      return;
    }
    setLoading(true);
    try {
        // 1. Re-authenticate user to confirm their identity
        const credential = EmailAuthProvider.credential(user.email, values.currentPassword);
        await reauthenticateWithCredential(user, credential);

        // 2. If re-authentication is successful, update the password
        await updatePassword(user, values.newPassword);

        toast({ title: "Mot de passe mis à jour", description: "Votre mot de passe a été modifié avec succès." });
        form.reset();

    } catch (error: any) {
        let description = "Une erreur est survenue.";
        if (error.code === 'auth/wrong-password') {
            description = "Le mot de passe actuel est incorrect.";
            form.setError("currentPassword", { type: "manual", message: description });
        } else if (error.code === 'auth/weak-password') {
            description = "Le nouveau mot de passe est trop faible.";
             form.setError("newPassword", { type: "manual", message: description });
        }
        toast({ variant: "destructive", title: "Erreur", description });
    } finally {
        setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sécurité</CardTitle>
        <CardDescription>Modifiez votre mot de passe.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                    control={form.control}
                    name="currentPassword"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Mot de passe actuel</FormLabel>
                        <FormControl>
                            <Input type="password" placeholder="••••••••" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="newPassword"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Nouveau mot de passe</FormLabel>
                        <FormControl>
                            <Input type="password" placeholder="••••••••" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                 <FormField
                    control={form.control}
                    name="confirmPassword"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Confirmer le nouveau mot de passe</FormLabel>
                        <FormControl>
                            <Input type="password" placeholder="••••••••" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                <Button type="submit" disabled={loading}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Changer le mot de passe
                </Button>
            </form>
        </Form>
      </CardContent>
    </Card>
  );
}
