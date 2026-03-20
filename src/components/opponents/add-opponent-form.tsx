
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect, useRef } from "react";
import { Loader2, Upload, ImageIcon, RefreshCcw } from "lucide-react";
import { db, auth } from "@/lib/firebase";
import { collection, addDoc, doc, updateDoc, getDocs, query, where } from "firebase/firestore";
import { useAuthState } from "react-firebase-hooks/auth";

const formSchema = z.object({
  name: z.string().min(2, "Le nom de l'équipe doit contenir au moins 2 caractères."),
  logoUrl: z.string().optional().or(z.literal('')),
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

const compressImage = (dataUrl: string, maxSize: number = 200): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = dataUrl;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;
      if (width > height) { if (width > maxSize) { height *= maxSize / width; width = maxSize; } }
      else { if (height > maxSize) { width *= maxSize / height; height = maxSize; } }
      canvas.width = width; canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', 0.7));
    };
  });
};

export function AddOpponentForm({ opponent, onFinished }: AddOpponentFormProps) {
  const [user] = useAuthState(auth);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
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

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
        try {
            const compressed = await compressImage(event.target?.result as string);
            form.setValue('logoUrl', compressed);
            toast({ title: "Logo chargé", description: "L'image a été optimisée." });
        } catch (error) {
            toast({ variant: "destructive", title: "Erreur", description: "Impossible de traiter l'image." });
        } finally {
            setUploading(false);
        }
    };
    reader.readAsDataURL(file);
  };

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

  const currentLogo = form.watch('logoUrl');

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="flex flex-col items-center gap-4">
            <div className="h-24 w-24 border-2 border-dashed rounded-xl flex items-center justify-center bg-slate-50 overflow-hidden shadow-inner relative group">
                {currentLogo ? (
                    <img src={currentLogo} alt="Logo Preview" className="h-full w-full object-contain p-2" />
                ) : (
                    <ImageIcon className="h-10 w-10 text-slate-300" />
                )}
                {uploading && (
                    <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    </div>
                )}
            </div>
            
            <div className="flex gap-2 w-full">
                <Button 
                    type="button" 
                    variant="outline" 
                    className="flex-1 font-black uppercase text-[10px] tracking-widest h-10" 
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                >
                    {currentLogo ? <><RefreshCcw className="mr-2 h-4 w-4" /> Remplacer</> : <><Upload className="mr-2 h-4 w-4" /> Choisir fichier</>}
                </Button>
                {currentLogo && (
                    <Button 
                        type="button" 
                        variant="ghost" 
                        size="icon" 
                        className="h-10 w-10 border text-destructive" 
                        onClick={() => form.setValue('logoUrl', '')}
                    >
                        <ImageIcon className="h-4 w-4" />
                    </Button>
                )}
            </div>
            <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept="image/*" 
                onChange={handleFileChange} 
            />
        </div>

        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="font-bold text-xs uppercase text-muted-foreground">Nom de l'équipe adverse</FormLabel>
              <FormControl>
                <Input placeholder="Ex: AS FAR, WAC..." {...field} className="h-11" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" disabled={loading || uploading} className="w-full h-12 font-black uppercase tracking-widest shadow-lg">
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
