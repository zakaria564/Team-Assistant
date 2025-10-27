
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { db, auth } from "@/lib/firebase";
import { collection, addDoc, doc, updateDoc, getDocs, query, where } from "firebase/firestore";
import { useAuthState } from "react-firebase-hooks/auth";

const formSchema = z.object({
  name: z.string().min(2, "Le nom de l'équipe doit contenir au moins 2 caractères."),
  logoUrl: z.string().url("Veuillez entrer une URL valide.").optional().or(z.literal('')),
});

interface OpponentData {
    id: string;
    name: string;
    logoUrl?: string;
}

interface AddOpponentFormProps {
    opponent?: OpponentData | null;
    onFinished?: () => void;
}

const normalizeString = (str: string) => {
    if (!str) return '';
    return str
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
};

export function AddOpponentForm({ opponent, onFinished }: AddOpponentFormProps) {
  const [user] = useAuthState(auth);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const isEditMode = !!opponent;

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      logoUrl: "",
    }
  });
  
  useEffect(() => {
    if (opponent) {
        form.reset({ name: opponent.name, logoUrl: opponent.logoUrl || '' });
    } else {
        form.reset({ name: "", logoUrl: "" });
    }
  }, [opponent, form]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!user) {
        toast({ variant: "destructive", title: "Non connecté", description: "Vous devez être connecté pour effectuer cette action." });
        return;
    }
    setLoading(true);

    try {
        const normalizedNewName = normalizeString(values.name);
        const q = query(collection(db, "opponents"), where("userId", "==", user.uid));
        const querySnapshot = await getDocs(q);
        const isDuplicate = querySnapshot.docs.some(doc => {
            const existingOpponent = doc.data() as OpponentData;
            return normalizeString(existingOpponent.name) === normalizedNewName && doc.id !== opponent?.id;
        });

        if (isDuplicate) {
            toast({
                variant: "destructive",
                title: "Nom déjà utilisé",
                description: "Une équipe adverse avec ce nom existe déjà.",
            });
            setLoading(false);
            return;
        }

        const dataToSave = {
            name: values.name,
            logoUrl: values.logoUrl,
            userId: user.uid,
        };

        if (isEditMode && opponent) {
            const opponentDocRef = doc(db, "opponents", opponent.id);
            await updateDoc(opponentDocRef, dataToSave);
            toast({
                title: "Adversaire modifié !",
                description: `Le nom de l'équipe a été mis à jour.`,
            });
        } else {
            await addDoc(collection(db, "opponents"), {
                ...dataToSave,
                createdAt: new Date(),
            });
            toast({
                title: "Adversaire ajouté !",
                description: `${values.name} a été ajouté à votre liste.`,
            });
        }
      
      onFinished?.();

    } catch (e: any) {
      toast({
          variant: "destructive",
          title: "Erreur",
          description: "Une erreur est survenue.",
      });
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nom de l'équipe adverse</FormLabel>
              <FormControl>
                <Input placeholder="Ex: AS Victoire" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="logoUrl"
          render={({ field }) => (
            <FormItem>
              <FormLabel>URL du logo</FormLabel>
              <FormControl>
                <Input placeholder="https://exemple.com/logo.png" {...field} value={field.value || ''}/>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={loading} className="w-full">
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Enregistrement...
            </>
          ) : isEditMode ? "Enregistrer les modifications" : "Ajouter l'adversaire"}
        </Button>
      </form>
    </Form>
  );
}
