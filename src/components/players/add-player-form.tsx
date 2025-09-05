
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
import { db } from "@/lib/firebase";
import { collection, addDoc, doc, updateDoc, getDocs, query, where } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { Textarea } from "../ui/textarea";
import { Separator } from "../ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

const playerStatuses = ["Actif", "Inactif", "Blessé", "Suspendu"] as const;

const formSchema = z.object({
  name: z.string().min(2, "Le nom doit contenir au moins 2 caractères."),
  category: z.string().min(1, "La catégorie est requise."),
  status: z.enum(playerStatuses),
  number: z.coerce.number().min(1, "Le numéro doit être supérieur à 0.").max(99, "Le numéro ne peut pas dépasser 99."),
  birthDate: z.string().optional(),
  address: z.string().optional(),
  nationality: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email("Veuillez entrer une adresse email valide.").optional().or(z.literal('')),
  position: z.string().optional(),
  tutorName: z.string().optional(),
  tutorPhone: z.string().optional(),
  tutorEmail: z.string().email("Veuillez entrer une adresse email valide.").optional().or(z.literal('')),
  coachId: z.string().optional(),
});

interface PlayerData extends z.infer<typeof formSchema> {
    id: string;
    photoUrl?: string;
}

interface Coach {
    id: string;
    name: string;
}

interface AddPlayerFormProps {
    player?: PlayerData;
}

const footballPositions = [
    "Gardien de but",
    "Défenseur central",
    "Latéral droit",
    "Latéral gauche",
    "Piston droit",
    "Piston gauche",
    "Milieu défensif",
    "Milieu central",
    "Milieu offensif",
    "Ailier droit",
    "Ailier gauche",
    "Avant-centre",
    "Buteur"
];

const playerCategories = [
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

const nationalities = [
    "Française", "Algérienne", "Marocaine", "Tunisienne", "Sénégalaise", "Ivoirienne", "Camerounaise", "Portugaise", "Espagnole", "Italienne", "Belge", "Allemande", "Autre"
];

export function AddPlayerForm({ player }: AddPlayerFormProps) {
  const [loading, setLoading] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(player?.photoUrl || null);
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const { toast } = useToast();
  const router = useRouter();
  const isEditMode = !!player;

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      category: "",
      status: "Actif",
      number: 10,
      birthDate: "",
      address: "",
      nationality: "",
      phone: "",
      email: "",
      position: "",
      tutorName: "",
      tutorPhone: "",
      tutorEmail: "",
      coachId: "",
    }
  });

  useEffect(() => {
    if (player) {
      form.reset({
        ...player,
        coachId: player.coachId || "",
        birthDate: player.birthDate ? player.birthDate.split('T')[0] : '',
        address: player.address || "",
        nationality: player.nationality || "",
        phone: player.phone || "",
        email: player.email || "",
        position: player.position || "",
        tutorName: player.tutorName || "",
        tutorPhone: player.tutorPhone || "",
        tutorEmail: player.tutorEmail || "",
      });
    }
  }, [player, form]);


  useEffect(() => {
    const fetchCoaches = async () => {
      try {
        const q = query(collection(db, "coaches"), where("status", "==", "Actif"));
        const querySnapshot = await getDocs(q);
        const coachesData = querySnapshot.docs.map(doc => ({ id: doc.id, name: doc.data().name } as Coach));
        setCoaches(coachesData);
      } catch (error) {
        console.error("Error fetching coaches: ", error);
        toast({
          variant: "destructive",
          title: "Erreur",
          description: "Impossible de charger la liste des entraîneurs.",
        });
      }
    };
    fetchCoaches();
  }, [toast]);

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
            description: "Veuillez prendre une photo avant de continuer.",
        });
        setLoading(false);
        return;
    }

    try {
        const playersRef = collection(db, "players");
        const q = query(playersRef, where("name", "==", values.name));
        const querySnapshot = await getDocs(q);
        
        let isDuplicate = false;
        if (!querySnapshot.empty) {
            if (isEditMode && player) {
                // In edit mode, it's a duplicate if another player has the same name
                isDuplicate = querySnapshot.docs.some(doc => doc.id !== player.id);
            } else {
                // In add mode, any result is a duplicate
                isDuplicate = true;
            }
        }

        if (isDuplicate) {
            toast({
                variant: "destructive",
                title: "Nom de joueur déjà existant",
                description: "Un autre joueur porte déjà ce nom. Veuillez en choisir un autre.",
            });
            setLoading(false);
            return;
        }

        const dataToSave = {
            ...values,
            coachId: values.coachId === 'none' ? '' : values.coachId,
            photoUrl: photoDataUrl
        };

        if (isEditMode && player) {
            const playerDocRef = doc(db, "players", player.id);
            await updateDoc(playerDocRef, dataToSave);
            toast({
                title: "Joueur modifié !",
                description: `Les informations de ${values.name} ont été mises à jour.`,
            });
        } else {
             await addDoc(collection(db, "players"), {
                ...dataToSave,
                createdAt: new Date(),
            });
            toast({
                title: "Joueur ajouté !",
                description: `${values.name} a été ajouté au club.`,
            });
        }
      
      router.push("/dashboard/players");

    } catch (e: any) {
      toast({
          variant: "destructive",
          title: "Erreur",
          description: isEditMode ? "Impossible de modifier le joueur." : "Une erreur est survenue lors de l'ajout du joueur.",
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
            <div className="space-y-4 md:order-2">
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
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="birthDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Date de naissance</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
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
                  </div>
                 <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Adresse</FormLabel>
                      <FormControl>
                        <Textarea placeholder="123 Rue du Stade..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Téléphone</FormLabel>
                          <FormControl>
                            <Input type="tel" placeholder="0612345678" {...field} />
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
                  </div>

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
                                  {playerCategories.map(cat => (
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
                        name="position"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Poste</FormLabel>
                             <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                <SelectTrigger>
                                    <SelectValue placeholder="Sélectionner un poste" />
                                </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    {footballPositions.map(pos => (
                                        <SelectItem key={pos} value={pos}>{pos}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                </div>
                 <FormField
                    control={form.control}
                    name="coachId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Entraîneur</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || ""}>
                            <FormControl>
                            <SelectTrigger>
                                <SelectValue placeholder="Assigner un entraîneur" />
                            </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                <SelectItem value="none">Aucun</SelectItem>
                                {coaches.map(coach => (
                                    <SelectItem key={coach.id} value={coach.id}>{coach.name}</SelectItem>
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
                                    {playerStatuses.map(status => (
                                        <SelectItem key={status} value={status}>{status}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                </div>

                <Separator className="my-6" />

                <div className="space-y-4">
                    <h3 className="text-lg font-medium">Informations du Tuteur (Optionnel)</h3>
                     <FormField
                      control={form.control}
                      name="tutorName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nom complet du tuteur</FormLabel>
                          <FormControl>
                            <Input placeholder="Ex: Marie Dupont" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="tutorPhone"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Téléphone du tuteur</FormLabel>
                              <FormControl>
                                <Input type="tel" placeholder="0612345678" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="tutorEmail"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Email du tuteur</FormLabel>
                              <FormControl>
                                <Input type="email" placeholder="tuteur@email.com" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                    </div>
                </div>


                <Button type="submit" disabled={loading} className="w-full !mt-8">
                {loading ? (
                    <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Enregistrement...
                    </>
                ) : isEditMode ? "Enregistrer les modifications" : "Ajouter le joueur"}
                </Button>
            </div>

            <div className="space-y-4 md:order-1">
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
                         <Image src={photoDataUrl} alt="Photo du joueur" layout="fill" objectFit="cover" />
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
                    <Button type="button" variant="outline" onClick={takePicture} disabled={!hasCameraPermission} className="w-full">
                        <Camera className="mr-2"/>
                        Prendre une photo
                    </Button>
                     {photoDataUrl && (
                        <Button type="button" variant="secondary" onClick={() => setPhotoDataUrl(null)} className="w-full">
                            <RefreshCcw className="mr-2" />
                            Reprendre
                        </Button>
                     )}
                </div>
            </div>
          </form>
        </Form>
      </CardContent>
    </>
  );
}
