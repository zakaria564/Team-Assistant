
"use client";

import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { CardContent } from "@/components/ui/card";
import { useState, useRef, useEffect, useCallback } from "react";
import { Loader2, Camera, RefreshCcw, PlusCircle, Trash2 } from "lucide-react";
import Image from "next/image";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { db, auth, storage } from "@/lib/firebase";
import { collection, addDoc, doc, updateDoc, getDocs, query, where } from "firebase/firestore";
import { ref, uploadString, getDownloadURL } from "firebase/storage";
import { useRouter } from "next/navigation";
import { Textarea } from "../ui/textarea";
import { Separator } from "../ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useAuthState } from "react-firebase-hooks/auth";
import { Calendar } from "../ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Calendar as CalendarIcon } from "lucide-react";
import { format } from "date-fns";

const playerStatuses = ["Actif", "Inactif", "Blessé", "Suspendu"] as const;

const documentSchema = z.object({
  name: z.string().optional(),
  url: z.string().url("Veuillez entrer une URL valide.").optional().or(z.literal('')),
  validityDate: z.string().optional(),
});


const formSchema = z.object({
  name: z.string().min(2, "Le nom doit contenir au moins 2 caractères."),
  photoUrl: z.string().url("URL invalide").optional().or(z.literal('')),
  gender: z.enum(["Masculin", "Féminin"], { required_error: "Le genre est requis." }),
  category: z.string().min(1, "La catégorie est requise."),
  status: z.enum(playerStatuses),
  number: z.coerce.number().min(1, "Le numéro doit être supérieur à 0.").max(99, "Le numéro ne peut pas dépasser 99."),
  birthDate: z.string().optional(),
  entryDate: z.string().optional(),
  exitDate: z.string().optional(),
  address: z.string().optional(),
  nationality: z.string().optional(),
  cin: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email("Veuillez entrer une adresse email valide.").optional().or(z.literal('')),
  position: z.string().optional(),
  tutorName: z.string().optional(),
  tutorCin: z.string().optional(),
  tutorPhone: z.string().optional(),
  tutorEmail: z.string().email("Veuillez entrer une adresse email valide.").optional().or(z.literal('')),
  coachId: z.string().optional(),
  documents: z.array(documentSchema).optional(),
});

interface PlayerData extends z.infer<typeof formSchema> {
    id: string;
    photoUrl?: string;
    documents?: { name: string; url: string; validityDate?: string }[];
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
    "Seniors", "Seniors F",
    "U19", "U19 F",
    "U18", "U18 F",
    "U17", "U17 F",
    "U16", "U16 F",
    "U15", "U15 F",
    "U14", "U14 F",
    "U13", "U13 F",
    "U12", "U12 F",
    "U11", "U11 F",
    "U10", "U10 F",
    "U9", "U9 F",
    "U8", "U8 F",
    "U7", "U7 F",
    "Vétérans"
];

const nationalities = [
    "Française", "Algérienne", "Marocaine", "Tunisienne", "Sénégalaise", "Ivoirienne", "Camerounaise", "Nigériane", "Ghanéenne", "Égyptienne", "Portugaise", "Espagnole", "Italienne", "Belge", "Allemande", "Néerlandaise", "Brésilienne", "Argentine", "Suisse", "Autre", "Angolaise", "Béninoise", "Botswanaise", "Burkinabée", "Burundaise", "Cap-verdienne", "Centrafricaine", "Comorienne", "Congolaise (Brazzaville)", "Congolaise (Kinshasa)", "Djiboutienne", "Érythréenne", "Éthiopienne", "Gabonaise", "Gambienne", "Guinéenne", "Guinéenne-Bissau", "Équato-guinéenne", "Kényane", "Libérienne", "Libyenne", "Malawite", "Malienne", "Mauritanienne", "Mozambicaine", "Namibienne", "Nigérienne", "Ougandaise", "Rwandaise", "Sierra-léonaise", "Somalienne", "Soudanaise", "Tanzanienne", "Tchadienne", "Togolaise", "Zambienne", "Zimbabwéenne", "Américaine (USA)", "Canadienne", "Mexicaine", "Colombienne", "Vénézuélienne", "Péruvienne", "Chilienne", "Uruguayenne", "Paraguayenne", "Bolivienne", "Équatorienne", "Britannique", "Irlandaise", "Suédoise", "Norvégienne", "Danoise", "Finlandaise", "Polonaise", "Tchèque", "Slovaque", "Hongroise", "Roumaine", "Bulgare", "Grecque", "Turque"
];

const documentTypes = [
    "Certificat Médical",
    "Carte d'identité",
    "Passeport",
    "Extrait de naissance",
    "Justificatif de domicile",
    "Photo d'identité",
    "Autorisation parentale",
    "Certificat de surclassement",
    "Autre"
];

const normalizeString = (str: string | null | undefined) => {
    if (!str) return '';
    return str
        .trim()
        .replace(/\s+/g, ' ')
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
};

export function AddPlayerForm(props: AddPlayerFormProps) {
  const { player } = props;
  const [user] = useAuthState(auth);
  const [loading, setLoading] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const { toast } = useToast();
  const router = useRouter();
  const isEditMode = !!player;

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: player ? {
        ...player,
        coachId: player.coachId || "",
    } : {
      name: "",
      photoUrl: "",
      gender: undefined,
      category: "",
      status: "Actif",
      number: undefined,
      birthDate: "",
      entryDate: "",
      exitDate: "",
      address: "",
      nationality: "",
      cin: "",
      phone: "",
      email: "",
      position: "",
      tutorName: "",
      tutorCin: "",
      tutorPhone: "",
      tutorEmail: "",
      coachId: "",
      documents: [],
    }
  });

  const photoDataUrl = form.watch('photoUrl');

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "documents",
  });

  useEffect(() => {
    if (player) {
      form.reset({
        ...player,
        number: player.number || undefined,
        coachId: player.coachId || "",
        photoUrl: player.photoUrl || "",
        birthDate: player.birthDate ? player.birthDate.split('T')[0] : '',
        entryDate: player.entryDate ? player.entryDate.split('T')[0] : '',
        exitDate: player.exitDate ? player.exitDate.split('T')[0] : '',
        address: player.address || "",
        nationality: player.nationality || "",
        cin: player.cin || "",
        phone: player.phone || "",
        email: player.email || "",
        position: player.position || "",
        tutorName: player.tutorName || "",
        tutorCin: player.tutorCin || "",
        tutorPhone: player.tutorPhone || "",
        tutorEmail: player.tutorEmail || "",
        documents: (player.documents || []).map(doc => ({
            name: doc.name,
            url: doc.url,
            validityDate: doc.validityDate ? doc.validityDate.split('T')[0] : '',
        })),
      });
    }
  }, [player, form.reset]);


  useEffect(() => {
    const fetchCoaches = async () => {
      if (!user) return;
      try {
        const q = query(collection(db, "coaches"), where("userId", "==", user.uid));
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
  }, [user, toast]);

  const getCameraPermission = useCallback(async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setHasCameraPermission(false);
        return;
    }
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        if (videoRef.current) {
            videoRef.current.srcObject = stream;
        }
        setHasCameraPermission(true);
    } catch (error) {
        console.error('Error accessing camera:', error);
        setHasCameraPermission(false);
        toast({
            variant: 'destructive',
            title: 'Accès à la caméra refusé',
            description: 'Veuillez autoriser l\'accès à la caméra dans les paramètres de votre navigateur.',
        });
    }
  }, [toast]);

  useEffect(() => {
    if(!photoDataUrl) {
      getCameraPermission();
    }
  }, [photoDataUrl, getCameraPermission]);

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

        if (aspectRatio > 1) {
            sHeight = videoHeight;
            sWidth = videoHeight;
            sx = (videoWidth - videoHeight) / 2;
            sy = 0;
        } else {
            sWidth = videoWidth;
            sHeight = videoWidth;
            sx = 0;
            sy = (videoHeight - videoWidth) / 2;
        }
        
        context.drawImage(video, sx, sy, sWidth, sHeight, 0, 0, targetWidth, targetHeight);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        form.setValue('photoUrl', dataUrl);

        const stream = video.srcObject as MediaStream;
        if (stream) {
          stream.getTracks().forEach(track => track.stop());
        }
        if(videoRef.current) {
            videoRef.current.srcObject = null;
        }
      }
    }
  };

  const retakePicture = () => {
    form.setValue('photoUrl', '');
  };

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!user) {
        toast({ variant: "destructive", title: "Non connecté", description: "Vous devez être connecté pour effectuer cette action." });
        return;
    }
    setLoading(true);

    if (!values.photoUrl) {
        toast({
            variant: "destructive",
            title: "Photo manquante",
            description: "Veuillez prendre une photo ou fournir une URL avant de continuer.",
        });
        setLoading(false);
        return;
    }

    try {
        if (!isEditMode) {
            const normalizedNewName = normalizeString(values.name);
            const q = query(collection(db, "players"), where("userId", "==", user.uid));
            const querySnapshot = await getDocs(q);
            const isDuplicate = querySnapshot.docs.some(doc => normalizeString(doc.data().name) === normalizedNewName);

            if (isDuplicate) {
                toast({
                    variant: "destructive",
                    title: "Nom déjà utilisé",
                    description: "Un joueur avec un nom similaire existe déjà. Veuillez choisir un autre nom.",
                });
                setLoading(false);
                return;
            }
        }

        const documentsToSave = (values.documents || [])
          .filter(doc => doc.name && doc.url) // Only save documents that have a name and a URL
          .map(doc => ({
              name: doc.name,
              url: doc.url,
              validityDate: doc.validityDate || null,
          }));

        const dataToSave = {
            ...values,
            userId: user.uid,
            coachId: values.coachId === 'none' ? '' : values.coachId,
            documents: documentsToSave,
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
      router.refresh();

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
            
            <div className="space-y-6">
                <div className="space-y-4">
                    <div className="aspect-square bg-muted rounded-md flex items-center justify-center relative overflow-hidden">
                        {!photoDataUrl && hasCameraPermission ? (
                             <video 
                                ref={videoRef} 
                                className="w-full h-full object-cover" 
                                autoPlay 
                                muted 
                                playsInline 
                            />
                        ) : photoDataUrl ? (
                            <Image src={photoDataUrl} alt="Photo du joueur" layout="fill" objectFit="cover" />
                        ) : (
                             <p className="text-muted-foreground p-4 text-center">La caméra n'est pas disponible ou l'accès est refusé.</p>
                        )
                        }
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
                        <Button type="button" variant="outline" onClick={takePicture} disabled={!hasCameraPermission || !!photoDataUrl} className="w-full" size="sm">
                            <Camera className="mr-2 h-4 w-4"/>
                            Prendre
                        </Button>
                        {photoDataUrl && (
                            <Button type="button" variant="secondary" onClick={retakePicture} className="w-full" size="sm">
                                <RefreshCcw className="mr-2 h-4 w-4" />
                                Reprendre
                            </Button>
                        )}
                    </div>
                     <FormField
                        control={form.control}
                        name="photoUrl"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Ou coller l'URL de la photo</FormLabel>
                            <FormControl>
                                <Input {...field} value={field.value || ''} />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                        />
                </div>

                <Separator />
                
                <div className="space-y-4">
                    <h3 className="text-lg font-medium">Informations Club</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="category"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Catégorie</FormLabel>
                               <Select onValueChange={field.onChange} value={field.value || ''}>
                                  <FormControl>
                                  <SelectTrigger>
                                      <SelectValue />
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
                                 <Select onValueChange={field.onChange} value={field.value || ''}>
                                    <FormControl>
                                    <SelectTrigger>
                                        <SelectValue />
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
                              <Select onValueChange={field.onChange} value={field.value || ''}>
                                <FormControl>
                                <SelectTrigger>
                                    <SelectValue />
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
                                <Input type="number" {...field} value={field.value || ''} />
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
                                 <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl>
                                    <SelectTrigger>
                                        <SelectValue />
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
                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="entryDate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Date d'entrée</FormLabel>
                            <FormControl>
                              <Input type="date" {...field} value={field.value || ''} />
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
                              <Input type="date" {...field} value={field.value || ''} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                </div>

            </div>

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
                            <Input {...field} />
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
                                <Input type="date" {...field} value={field.value || ''} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                         <FormField
                            control={form.control}
                            name="gender"
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel>Genre</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value || ''}>
                                    <FormControl>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        <SelectItem value="Masculin">Masculin</SelectItem>
                                        <SelectItem value="Féminin">Féminin</SelectItem>
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
                          name="nationality"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Nationalité</FormLabel>
                               <Select onValueChange={field.onChange} value={field.value || ''}>
                                  <FormControl>
                                  <SelectTrigger>
                                      <SelectValue />
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
                            name="cin"
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel>N° CIN</FormLabel>
                                <FormControl>
                                <Input {...field} value={field.value || ''} />
                                </FormControl>
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
                            <Textarea {...field} value={field.value || ''} />
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
                                <Input type="tel" {...field} value={field.value || ''} />
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
                                <Input type="email" {...field} value={field.value || ''} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                </div>

                <Separator />

                <div className="space-y-4">
                    <h3 className="text-lg font-medium">Informations du Tuteur (Optionnel)</h3>
                     <FormField
                      control={form.control}
                      name="tutorName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nom complet du tuteur</FormLabel>
                          <FormControl>
                            <Input {...field} value={field.value || ''} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="tutorCin"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>N° CIN du tuteur</FormLabel>
                          <FormControl>
                            <Input {...field} value={field.value || ''} />
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
                                <Input type="tel" {...field} value={field.value || ''} />
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
                                <Input type="email" {...field} value={field.value || ''} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                    </div>
                </div>
                
                <Separator />

                 <div className="space-y-4">
                    <h3 className="text-lg font-medium">Documents du Joueur</h3>
                    {fields.map((field, index) => (
                      <div key={field.id} className="p-4 border rounded-md space-y-4 relative">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute top-2 right-2 h-7 w-7 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                            onClick={() => remove(index)}
                          >
                            <Trash2 className="h-4 w-4" />
                            <span className="sr-only">Supprimer le document</span>
                          </Button>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                           <FormField
                            control={form.control}
                            name={`documents.${index}.name`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Type du document</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value || ''}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {documentTypes.map(docType => (
                                      <SelectItem key={docType} value={docType}>{docType}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name={`documents.${index}.validityDate`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Date d'expiration</FormLabel>
                                <FormControl>
                                  <Input type="date" {...field} value={field.value || ''} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                         <FormField
                          control={form.control}
                          name={`documents.${index}.url`}
                          render={({ field }) => (
                            <FormItem>
                               <FormLabel>URL du Document</FormLabel>
                               <FormControl>
                                   <Input 
                                      type="text" 
                                      
                                      {...field}
                                      value={field.value || ''}
                                    />
                               </FormControl>
                               <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                      </div>
                    ))}
                    <Button type="button" variant="outline" size="sm" onClick={() => append({ name: '', url: '', validityDate: '' })}>
                      <PlusCircle className="mr-2 h-4 w-4" />
                      Ajouter un document
                    </Button>
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

          </form>
        </Form>
      </CardContent>
    </>
  );
}
