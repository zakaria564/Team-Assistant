
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { db } from "@/lib/firebase";
import { collection, addDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";

const formSchema = z.object({
  name: z.string().min(2, "Le nom de la catégorie doit contenir au moins 2 caractères."),
  coach: z.string().optional(),
});

export function AddCategoryForm() {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      coach: "",
    }
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setLoading(true);
    try {
      await addDoc(collection(db, "categories"), {
        ...values,
        createdAt: new Date(),
      });

      toast({
        title: "Catégorie ajoutée !",
        description: `La catégorie ${values.name} a été ajoutée au club.`,
      });
      
      router.push("/dashboard/categories");

    } catch (e: any) {
      toast({
          variant: "destructive",
          title: "Erreur",
          description: "Une erreur est survenue lors de l'ajout de la catégorie. Vérifiez vos règles de sécurité Firestore.",
      });
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 max-w-lg">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nom de la catégorie</FormLabel>
              <FormControl>
                <Input placeholder="Ex: U10, Seniors B..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
            control={form.control}
            name="coach"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Entraîneur principal (Optionnel)</FormLabel>
                <FormControl>
                    <Input placeholder="Ex: Jean Dupont" {...field} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
        />
        <Button type="submit" disabled={loading} className="w-full">
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Ajout en cours...
            </>
          ) : "Ajouter la catégorie"}
        </Button>
      </form>
    </Form>
  );
}
