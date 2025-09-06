
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { CardContent } from "@/components/ui/card";
import { useState, useRef, useEffect } from "react";
import { Loader2, Camera, RefreshCcw } from "lucide-react";
import Image from "next/image";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { db, auth } from "@/lib/firebase";
import { collection, addDoc, doc, updateDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { Textarea } from "../ui/textarea";
import { Separator } from "../ui/separator";
import { useAuthState } from "react-firebase-hooks/auth";

const coachStatuses = ["Actif", "Inactif"] as const;

const formSchema = z.object({
  name: z.string().min(2, "Le nom doit contenir au moins 2 caractères."),
  category: z.string({ required_error: "La catégorie est requise."}),
  status: z.enum(coachStatuses),
  phone: z.string().optional(),
  email: z.string().email("Veuillez entrer une adresse email valide."),
  specialty: z.string().optional(),
  entryDate: z.string().optional(),
  exitDate: z.string().optional(),
  nationality: z.string().optional(),
  address: z.string().optional(),
});

interface CoachData extends z.infer<typeof formSchema> {
    id: string;
    photoUrl?: string;
}

interface AddCoachFormProps {
    coach?: CoachData;
}


const coachCategories = [
    "Seniors",
    "Seniors F",
    "U19",
    "U18",
    "U17",
    "U17 F",
    "U16",
    "U15",
    "U15 F",
    "U14",
    "U13",
    "U13 F",
    "U12",
    "U11",
    "U11 F",
    "U10",
    "U9",
    "U8",
    "U7",
    "Vétérans",
    "École de foot"
];

const coachSpecialties = [
    "Entraîneur Principal",
    "Entraîneur Adjoint",
    "Entraîneur Équipe Féminine",
    "Entraîneur des Gardiens",
    "Préparateur Physique",
    "Analyste Vidéo",
    "Directeur Technique",
    "Coordinateur des Jeunes",
    "Responsable École de Foot",
    "Autre"
];

const nationalities = [
    "Française", "Algérienne", "Marocaine", "Tunisienne", "Sénégalaise", "Ivoirienne", "Camerounaise", "Portugaise", "Espagnole", "Italienne", "Belge", "Allemande", "Autre"
];

export function AddCoachForm({ coach }: AddCoachFormProps) {
  const [user] = useAuthState(auth);
  const [loading, setLoading] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(coach?.photoUrl || null);
  const { toast } = useToast();
  const router = useRouter();
  const isEditMode = !!coach;

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      category: "",
      status: "Actif",
      phone: "",
      email: "",
      specialty: "",
      entryDate: "",
      exitDate: "",
      nationality: "",
      address: "",
    }
  });

  useEffect(() => {
    if (coach) {
        form.reset({
            ...coach,
            entryDate: coach.entryDate ? coach.entryDate.split('T')[0] : '',
            exitDate: coach.exitDate ? coach.exitDate.split('T')[0] : '',
            nationality: coach.nationality || "",
            address: coach.address || ""
        });
    }
  }, [coach, form]);


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
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        setPhotoDataUrl(dataUrl);
      }
    }
  };


  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!user) {
        toast({ variant: "destructive", title: "Non connecté", description: "Vous devez être connecté pour effectuer cette action." });
        return;
    }

    setLoading(true);

    if (!photoDataUrl) {
        toast({
            variant: "destructive",
            title: "Photo manquante",
            description: "Veuillez prendre une photo avant de continuer.",
        });
        setLoading(false);
        return;
    }

    try {
        const dataToSave = {
            ...values,
            userId: user.uid,
            photoUrl: photoDataUrl,
            specialty: values.specialty || '',
        };

        if (isEditMode) {
            const coachDocRef = doc(db, "coaches", coach.id);
            await updateDoc(coachDocRef, dataToSave);
            toast({
                title: "Entraîneur modifié !",
                description: `Les informations de ${values.name} ont été mises à jour.`,
            });
        } else {
            await addDoc(collection(db, "coaches"), {
                ...dataToSave,
                createdAt: new Date(),
            });

            toast({
                title: "Entraîneur ajouté !",
                description: `${values.name} a été ajouté au club.`,
            });
        }
      
      router.push("/dashboard/coaches");
      router.refresh();

    } catch (e: any) {
      toast({
          variant: "destructive",
          title: "Erreur",
          description: isEditMode ? "Impossible de modifier l'entraîneur." : "Une erreur est survenue lors de l'ajout de l'entraîneur.",
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
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid grid-cols-1 md:grid-cols-2 gap-12">
            
            {/* Colonne de Gauche: Photo et Infos Club */}
            <div className="space-y-6">
                <div className="space-y-4">
                    <div className="aspect-square bg-muted rounded-md flex items-center justify-center relative overflow-hidden">
                        <video 
                            ref={videoRef} 
                            className={cn(
                                "w-full h-full object-cover",
                                photoDataUrl && "hidden"
                            )} 
                            autoPlay 
                            muted 
                            playsInline 
                        />
                        {photoDataUrl && (
                            <Image src={photoDataUrl} alt="Photo de l'entraîneur" layout="fill" objectFit="cover" />
                        )}
                        { hasCameraPermission === false && <p className="text-muted-foreground p-4 text-center">La caméra n'est pas disponible.</p> }
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
                        <Button type="button" variant="outline" onClick={takePicture} disabled={!hasCameraPermission} className="w-full" size="sm">
                            <Camera className="mr-2 h-4 w-4"/>
                            Prendre
                        </Button>
                        {photoDataUrl && (
                            <Button type="button" variant="secondary" onClick={() => setPhotoDataUrl(null)} className="w-full" size="sm">
                                <RefreshCcw className="mr-2 h-4 w-4" />
                                Reprendre
                            </Button>
                        )}
                    </div>
                </div>

                <Separator />
                
                <div className="space-y-4">
                    <h3 className="text-lg font-medium">Informations Club</h3>
                    <FormField
                        control={form.control}
                        name="specialty"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Spécialité</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                <SelectTrigger>
                                    <SelectValue placeholder="Sélectionner une spécialité" />
                                </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    {coachSpecialties.map(spec => (
                                        <SelectItem key={spec} value={spec}>{spec}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <FormMessage />
                            </FormItem>
                        )}
                    />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <FormField
                            control={form.control}
                            name="category"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Catégorie</FormLabel>
                                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Sélectionner une catégorie" />
                                    </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        {coachCategories.map(cat => (
                                            <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="status"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Statut</FormLabel>
                                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Sélectionner un statut" />
                                    </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        {coachStatuses.map(cat => (
                                            <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                        />
                    </div>
                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="entryDate"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Date d'entrée</FormLabel>
                                <FormControl>
                                  <Input type="date" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                           <FormField
                            control={form.control}
                            name="exitDate"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Date de sortie</FormLabel>
                                <FormControl>
                                  <Input type="date" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                    </div>
                </div>
            </div>

            {/* Colonne de Droite: Infos Personnelles et Bouton */}
            <div className="space-y-6">
                <div className="space-y-4">
                     <h3 className="text-lg font-medium">Informations Personnelles</h3>
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
                    <FormField
                      control={form.control}
                      name="nationality"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nationalité</FormLabel>
                           <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                              <SelectTrigger>
                                  <SelectValue placeholder="Sélectionner une nationalité" />
                              </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                  {nationalities.map(nat => (
                                      <SelectItem key={nat} value={nat}>{nat}</SelectItem>
                                  ))}
                              </SelectContent>
                          </Select>
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
                            <Textarea placeholder="Adresse complète..." {...field} />
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
                                <Input type="email" placeholder="contact@email.com" {...field} />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                    />
                     <FormField
                        control={form.control}
                        name="phone"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Téléphone</FormLabel>
                            <FormControl>
                                <Input type="tel" placeholder="06 12 34 56 78" {...field} />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                <Button type="submit" disabled={loading} className="w-full !mt-12">
                {loading ? (
                    <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Enregistrement...
                    </>
                ) : isEditMode ? "Enregistrer les modifications" : "Ajouter l'entraîneur"}
                </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </>
  );
}
