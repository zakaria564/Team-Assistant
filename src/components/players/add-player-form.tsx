"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { CardContent } from "@/components/ui/card";
import { useState, useRef, useEffect } from "react";
import { Loader2, Camera } from "lucide-react";
import Image from "next/image";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { db } from "@/lib/firebase";
import { collection, addDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";

const formSchema = z.object({
  name: z.string().min(2, "Le nom doit contenir au moins 2 caractères."),
  category: z.string().min(2, "La catégorie est requise."),
  number: z.coerce.number().min(1, "Le numéro doit être supérieur à 0.").max(99, "Le numéro ne peut pas dépasser 99."),
});

export function AddPlayerForm() {
  const [loading, setLoading] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  const { toast } = useToast();
  const router = useRouter();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      category: "",
      number: 10,
    }
  });

  useEffect(() => {
    const getCameraPermission = async () => {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setHasCameraPermission(false);
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        setHasCameraPermission(true);

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (error) {
        console.error('Error accessing camera:', error);
        setHasCameraPermission(false);
        toast({
          variant: 'destructive',
          title: 'Accès à la caméra refusé',
          description: 'Veuillez autoriser l\'accès à la caméra dans les paramètres de votre navigateur.',
        });
      }
    };

    getCameraPermission();
  }, [toast]);

  const takePicture = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');

      if (context) {
        const targetWidth = 400;
        const targetHeight = 400;
        canvas.width = targetWidth;
        canvas.height = targetHeight;

        const videoWidth = video.videoWidth;
        const videoHeight = video.videoHeight;
        const aspectRatio = videoWidth / videoHeight;
        
        let sx, sy, sWidth, sHeight;

        if (aspectRatio > 1) { // landscape
            sHeight = videoHeight;
            sWidth = videoHeight;
            sx = (videoWidth - videoHeight) / 2;
            sy = 0;
        } else { // portrait
            sWidth = videoWidth;
            sHeight = videoWidth;
            sx = 0;
            sy = (videoHeight - videoWidth) / 2;
        }
        
        context.drawImage(video, sx, sy, sWidth, sHeight, 0, 0, targetWidth, targetHeight);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8); // Compress JPEG
        setPhotoDataUrl(dataUrl);
      }
    }
  };


  async function onSubmit(values: z.infer<typeof formSchema>) {
    setLoading(true);

    if (!photoDataUrl) {
        toast({
            variant: "destructive",
            title: "Photo manquante",
            description: "Veuillez prendre une photo avant d'ajouter le joueur.",
        });
        setLoading(false);
        return;
    }

    try {
      await addDoc(collection(db, "players"), {
        ...values,
        photoUrl: photoDataUrl,
        createdAt: new Date(),
      });

      toast({
        title: "Joueur ajouté !",
        description: `${values.name} a été ajouté au club.`,
      });
      
      router.push("/dashboard/players");

    } catch (e: any) {
      toast({
          variant: "destructive",
          title: "Erreur",
          description: "Une erreur est survenue lors de l'ajout du joueur. La photo est peut-être trop volumineuse.",
      });
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid md:grid-cols-2 gap-12">
            <div className="space-y-8">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nom complet</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: Jean Dupont" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-8">
                    <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Catégorie</FormLabel>
                        <FormControl>
                            <Input placeholder="Ex: U17" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                    <FormField
                    control={form.control}
                    name="number"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Numéro</FormLabel>
                        <FormControl>
                            <Input type="number" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                </div>
                <Button type="submit" disabled={loading} className="w-full">
                {loading ? (
                    <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Ajout en cours...
                    </>
                ) : "Ajouter le joueur"}
                </Button>
            </div>

            <div className="space-y-4">
                <div className="aspect-square bg-muted rounded-md flex items-center justify-center relative overflow-hidden">
                    {photoDataUrl ? (
                         <Image src={photoDataUrl} alt="Photo du joueur" layout="fill" objectFit="cover" />
                    ): (
                         <video ref={videoRef} className="w-full h-full object-cover" autoPlay muted playsInline />
                    )}
                    { hasCameraPermission === false && <p className="text-muted-foreground p-4 text-center">La caméra n'est pas disponible. Veuillez autoriser l'accès ou télécharger une photo.</p> }
                </div>
                <canvas ref={canvasRef} className="hidden" />

                {hasCameraPermission === false && (
                    <Alert variant="destructive">
                    <AlertTitle>Accès à la caméra requis</AlertTitle>
                    <AlertDescription>
                        Veuillez autoriser l'accès à la caméra pour utiliser cette fonctionnalité.
                    </AlertDescription>
                    </Alert>
                )}

                <div className="flex gap-4">
                    <Button type="button" variant="outline" onClick={takePicture} disabled={!hasCameraPermission} className="w-full">
                        <Camera className="mr-2"/>
                        Prendre une photo
                    </Button>
                </div>
            </div>
          </form>
        </Form>
      </CardContent>
    </>
  );
}
