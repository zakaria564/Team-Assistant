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
import { Textarea } from "../ui/textarea";

const formSchema = z.object({
  clubName: z.string().min(2, "Le nom du club est requis."),
  contactEmail: z.string().email("Veuillez entrer une adresse email valide."),
  address: z.string().optional(),
});

export function ClubSettingsForm() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    // TODO: Fetch existing club data and set as defaultValues
    defaultValues: {
        clubName: "",
        contactEmail: "",
        address: ""
    }
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setLoading(true);
    try {
        // TODO: Implement saving logic to Firestore
        console.log("Club settings saved:", values);
        toast({ title: "Informations du club enregistrées", description: "Les données ont été sauvegardées (simulation)." });
    } catch (error: any) {
        toast({ variant: "destructive", title: "Erreur", description: "Impossible d'enregistrer les informations." });
    } finally {
        setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Informations du Club</CardTitle>
        <CardDescription>Gérez les informations publiques de votre club.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                    control={form.control}
                    name="clubName"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Nom du club</FormLabel>
                        <FormControl>
                            <Input placeholder="Nom de votre club" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="contactEmail"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Email de contact</FormLabel>
                        <FormControl>
                            <Input type="email" placeholder="contact@club.com" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Adresse</FormLabel>
                        <FormControl>
                            <Textarea placeholder="Adresse complète du siège ou du stade" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                <Button type="submit" disabled={loading}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Enregistrer les informations
                </Button>
            </form>
        </Form>
      </CardContent>
    </Card>
  );
}
