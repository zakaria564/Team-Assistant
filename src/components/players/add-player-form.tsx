"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { CardContent } from "@/components/ui/card";
import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { Loader2, Camera, RefreshCcw, PlusCircle, Fingerprint, Upload, Mail, Phone, Calendar as CalendarIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { db, auth } from "@/lib/firebase";
import { collection, addDoc, doc, updateDoc, getDocs, query, where } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { Textarea } from "../ui/textarea";
import { Separator } from "../ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuthState } from "react-firebase-hooks/auth";
import { format, parse } from "date-fns";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

const playerStatuses = ["Actif", "Inactif", "Blessé", "Suspendu"] as const;

const documentSchema = z.object({
  name: z.string().optional(),
  url: z.string().url("Veuillez entrer une URL valide.").optional().or(z.literal('')),
  validityDate: z.string().optional(),
});

const formSchema = z.object({
  name: z.string().min(2, "Le nom doit contenir au moins 2 caractères."),
  photoUrl: z.string().optional().or(z.literal('')),
  gender: z.enum(["Masculin", "Féminin"], { required_error: "Le genre est requis." }),
  category: z.string().min(1, "La catégorie est requise."),
  status: z.enum(playerStatuses, { required_error: "Le statut est requis." }),
  number: z.coerce.number().min(1).max(99).optional().or(z.literal('')),
  birthDate: z.string().optional(),
  entryDate: z.string().optional(),
  exitDate: z.string().optional(),
  address: z.string().optional(),
  nationality: z.string().optional(),
  cin: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email("Email invalide").optional().or(z.literal('')),
  position: z.string().optional(),
  tutorName: z.string().optional(),
  tutorCin: z.string().optional(),
  tutorPhone: z.string().optional(),
  tutorEmail: z.string().email("Email invalide").optional().or(z.literal('')),
  coachId: z.string().optional(),
  documents: z.array(documentSchema).optional(),
  professionalId: z.string().optional(),
});

interface PlayerData extends z.infer<typeof formSchema> {
    id: string;
}

interface Coach {
    id: string;
    name: string;
}

interface AddPlayerFormProps {
    player?: PlayerData;
}

const footballPositions = [
    "Gardien de but", "Défenseur central", "Latéral droit", "Latéral gauche", "Piston droit", "Piston gauche",
    "Milieu défensif", "Milieu central", "Milieu offensif", "Ailier droit", "Ailier gauche", "Avant-centre", "Buteur"
];

const playerCategories = [
    "Seniors", "Seniors F", "U19", "U19 F", "U18", "U18 F", "U17", "U17 F", "U16", "U16 F", 
    "U15", "U15 F", "U14", "U14 F", "U13", "U13 F", "U12", "U12 F", "U11", "U11 F", 
    "U10", "U10 F", "U9", "U9 F", "U8", "U8 F", "U7", "U7 F", "Vétérans"
];

const nationalities = ["Marocaine", "Française", "Algérienne", "Tunisienne", "Sénégalaise", "Ivoirienne", "Camerounaise", "Autre"];

const generateProfessionalId = () => {
    const yearMonth = format(new Date(), "yyyyMM");
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `PL-${yearMonth}-${random}`;
};

const DateField = ({ label, field, placeholder }: { label: string, field: any, placeholder?: string }) => {
    const [inputValue, setInputValue] = useState(field.value || "");

    useEffect(() => {
        setInputValue(field.value || "");
    }, [field.value]);

    return (
        <FormItem className="flex flex-col">
            <FormLabel>{label}</FormLabel>
            <div className="flex gap-2">
                <FormControl>
                    <Input 
                        type="date" 
                        {...field} 
                        value={inputValue}
                        onChange={(e) => {
                            setInputValue(e.target.value);
                            field.onChange(e.target.value);
                        }}
                        className="flex-1"
                    />
                </FormControl>
                <Popover>
                    <PopoverTrigger asChild>
                        <Button variant="outline" size="icon" className="shrink-0 h-10 w-10">
                            <CalendarIcon className="h-4 w-4" />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="end">
                        <Calendar
                            mode="single"
                            selected={field.value ? new Date(field.value) : undefined}
                            onSelect={(date) => {
                                if (date) {
                                    const formatted = format(date, "yyyy-MM-dd");
                                    setInputValue(formatted);
                                    field.onChange(formatted);
                                }
                            }}
                            initialFocus
                        />
                    </PopoverContent>
                </Popover>
            </div>
            <FormMessage />
        </FormItem>
    );
};

export function AddPlayerForm({ player }: AddPlayerFormProps) {
  const [user] = useAuthState(auth);
  const [loading, setLoading] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const { toast } = useToast();
  const router = useRouter();
  const isEditMode = !!player;

  const defaultValues = useMemo(() => {
    if (!player) return {
        name: "", photoUrl: "", gender: "Masculin" as const, category: "", status: "Actif" as const,
        number: "", birthDate: "", entryDate: format(new Date(), "yyyy-MM-dd"), exitDate: "", address: "", nationality: "Marocaine",
        cin: "", phone: "", email: "", position: "", tutorName: "", tutorCin: "", tutorPhone: "",
        tutorEmail: "", coachId: "", documents: [], professionalId: "",
    };
    return {
        name: player.name || "",
        photoUrl: player.photoUrl || "",
        gender: (player.gender as "Masculin" | "Féminin") || "Masculin",
        category: player.category || "",
        status: (player.status as typeof playerStatuses[number]) || "Actif",
        number: player.number ?? "",
        birthDate: player.birthDate || "",
        entryDate: player.entryDate || "",
        exitDate: player.exitDate || "",
        address: player.address || "",
        nationality: player.nationality || "Marocaine",
        cin: player.cin || "",
        phone: player.phone || "",
        email: player.email || "",
        position: player.position || "",
        tutorName: player.tutorName || "",
        tutorCin: player.tutorCin || "",
        tutorPhone: player.tutorPhone || "",
        tutorEmail: player.tutorEmail || "",
        coachId: player.coachId || "",
        professionalId: player.professionalId || "",
        documents: (player.documents || []).map((d: any) => ({
            name: d.name || "",
            url: d.url || "",
            validityDate: d.validityDate || "",
        })),
    };
  }, [player]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues
  });

  useEffect(() => {
    if (player) {
      form.reset(defaultValues);
    }
  }, [player, defaultValues, form]);

  const photoDataUrl = form.watch('photoUrl');

  useEffect(() => {
    const fetchCoaches = async () => {
      if (!user) return;
      try {
        const q = query(collection(db, "coaches"), where("userId", "==", user.uid));
        const querySnapshot = await getDocs(q);
        setCoaches(querySnapshot.docs.map(doc => ({ id: doc.id, name: doc.data().name } as Coach)));
      } catch (error) { console.error(error); }
    };
    fetchCoaches();
  }, [user]);

  const compressImage = (file: File, maxSize: number = 400): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          if (width > height) { if (width > maxSize) { height *= maxSize / width; width = maxSize; } } 
          else { if (height > maxSize) { width *= maxSize / height; height = maxSize; } }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.7));
        };
      };
      reader.onerror = reject;
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    try {
      const compressed = await compressImage(file);
      form.setValue('photoUrl', compressed);
      toast({ title: "Photo chargée", description: "L'image a été optimisée." });
    } catch (err) {
      toast({ variant: "destructive", title: "Erreur", description: "Impossible de charger l'image." });
    } finally {
      setLoading(false);
    }
  };

  const getCameraPermission = useCallback(async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setHasCameraPermission(false);
        return;
    }
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
        if (videoRef.current) videoRef.current.srcObject = stream;
        setHasCameraPermission(true);
    } catch (error) { setHasCameraPermission(false); }
  }, []);

  useEffect(() => { if(!photoDataUrl) getCameraPermission(); }, [photoDataUrl, getCameraPermission]);

  const takePicture = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      if (context) {
        canvas.width = 400; canvas.height = 400;
        const videoWidth = video.videoWidth; const videoHeight = video.videoHeight;
        const aspectRatio = videoWidth / videoHeight;
        let sx, sy, sWidth, sHeight;
        if (aspectRatio > 1) { sHeight = videoHeight; sWidth = videoHeight; sx = (videoWidth - videoHeight) / 2; sy = 0; }
        else { sWidth = videoWidth; sHeight = videoWidth; sx = 0; sy = (videoHeight - videoWidth) / 2; }
        context.drawImage(video, sx, sy, sWidth, sHeight, 0, 0, 400, 400);
        form.setValue('photoUrl', canvas.toDataURL('image/jpeg', 0.8));
        const stream = video.srcObject as MediaStream;
        if (stream) stream.getTracks().forEach(track => track.stop());
        if(videoRef.current) videoRef.current.srcObject = null;
      }
    }
  };

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!user) return;
    setLoading(true);
    try {
        const dataToSave = {
            ...values,
            userId: user.uid,
            coachId: values.coachId === 'none' ? '' : (values.coachId || ''),
            professionalId: values.professionalId || generateProfessionalId(),
            isDeleted: false,
        };
        if (isEditMode && player) {
            await updateDoc(doc(db, "players", player.id), dataToSave);
            toast({ title: "Joueur modifié !" });
            router.push("/dashboard/players");
        } else {
            const docRef = await addDoc(collection(db, "players"), { ...dataToSave, createdAt: new Date() });
            toast({ title: "Joueur ajouté !" });
            router.push(`/dashboard/payments/add?playerId=${docRef.id}`);
        }
        router.refresh();
    } catch (e) {
      toast({ variant: "destructive", title: "Erreur" });
    } finally { setLoading(false); }
  }

  return (
    <CardContent>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="grid grid-cols-1 md:grid-cols-2 gap-12">
          <div className="space-y-6">
              <div className="space-y-4">
                  <div className="aspect-square bg-slate-100 rounded-xl border-2 border-slate-200 flex items-center justify-center relative overflow-hidden shadow-inner">
                      {!photoDataUrl && hasCameraPermission ? (
                           <video ref={videoRef} className="w-full h-full object-cover" autoPlay muted playsInline />
                      ) : photoDataUrl ? (
                          <img src={photoDataUrl} alt="Photo" className="w-full h-full object-contain absolute inset-0 p-1" />
                      ) : (
                           <p className="text-muted-foreground p-4 text-center">Caméra non disponible.</p>
                      )}
                  </div>
                  <canvas ref={canvasRef} className="hidden" />
                  <div className="grid grid-cols-2 gap-2">
                      <Button type="button" variant="outline" onClick={takePicture} disabled={!hasCameraPermission || !!photoDataUrl} className="w-full h-10 text-xs" size="sm"><Camera className="mr-2 h-4 w-4"/>Prendre</Button>
                      <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={!!photoDataUrl} className="w-full h-10 text-xs" size="sm"><Upload className="mr-2 h-4 w-4"/>Galerie</Button>
                      <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileUpload} />
                      {photoDataUrl && <Button type="button" variant="secondary" onClick={() => form.setValue('photoUrl', '')} className="w-full h-10 col-span-2 text-xs" size="sm"><RefreshCcw className="mr-2 h-4 w-4" />Changer la photo</Button>}
                  </div>
              </div>
              
              <Separator />
              
              <div className="space-y-4">
                  <h3 className="text-lg font-bold flex items-center gap-2 uppercase tracking-tighter"><Fingerprint className="h-5 w-5 text-primary" />Informations Club</h3>
                  {isEditMode && (
                      <FormField control={form.control} name="professionalId" render={({ field }) => (
                          <FormItem><FormLabel>ID Professionnel</FormLabel><FormControl><Input {...field} value={field.value ?? ""} disabled className="bg-muted font-mono font-bold" /></FormControl></FormItem>
                      )} />
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FormField control={form.control} name="category" render={({ field }) => (
                          <FormItem><FormLabel>Catégorie</FormLabel><Select onValueChange={field.onChange} value={field.value || ''}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent>{playerCategories.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>
                      )} />
                      <FormField control={form.control} name="position" render={({ field }) => (
                          <FormItem><FormLabel>Poste</FormLabel><Select onValueChange={field.onChange} value={field.value || ''}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent>{footballPositions.map(pos => <SelectItem key={pos} value={pos}>{pos}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>
                      )} />
                  </div>
                   <FormField control={form.control} name="coachId" render={({ field }) => (
                      <FormItem><FormLabel>Entraîneur Responsable</FormLabel><Select onValueChange={field.onChange} value={field.value || ''}><FormControl><SelectTrigger><SelectValue placeholder="Assigner un coach" /></SelectTrigger></FormControl><SelectContent><SelectItem value="none">Aucun</SelectItem>{coaches.map(coach => <SelectItem key={coach.id} value={coach.id}>{coach.name}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>
                  )} />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FormField control={form.control} name="number" render={({ field }) => (
                          <FormItem><FormLabel>Numéro Maillot</FormLabel><FormControl><Input type="number" {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={form.control} name="status" render={({ field }) => (
                          <FormItem><FormLabel>Statut</FormLabel><Select onValueChange={field.onChange} value={field.value || ''}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent>{playerStatuses.map(status => <SelectItem key={status} value={status}>{status}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>
                      )} />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FormField control={form.control} name="entryDate" render={({ field }) => (
                          <DateField label="Date d'entrée" field={field} />
                      )} />
                      <FormField control={form.control} name="exitDate" render={({ field }) => (
                          <DateField label="Date de sortie" field={field} />
                      )} />
                  </div>
              </div>
          </div>

          <div className="space-y-6">
              <div className="space-y-4">
                   <h3 className="text-lg font-bold uppercase tracking-tighter">État Civil & Contact</h3>
                  <FormField control={form.control} name="name" render={({ field }) => (
                    <FormItem><FormLabel>Nom complet du joueur</FormLabel><FormControl><Input {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>
                  )} />
                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FormField control={form.control} name="birthDate" render={({ field }) => (
                        <DateField label="Date de naissance" field={field} />
                      )} />
                       <FormField control={form.control} name="gender" render={({ field }) => (
                        <FormItem><FormLabel>Genre</FormLabel><Select onValueChange={field.onChange} value={field.value || ''}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="Masculin">Masculin</SelectItem><SelectItem value="Féminin">Féminin</SelectItem></SelectContent></Select><FormMessage /></FormItem>
                      )} />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FormField control={form.control} name="nationality" render={({ field }) => (
                        <FormItem><FormLabel>Nationalité</FormLabel><Select onValueChange={field.onChange} value={field.value || ''}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent>{nationalities.map(nat => <SelectItem key={nat} value={nat}>{nat}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>
                      )} />
                       <FormField control={form.control} name="cin" render={({ field }) => (
                        <FormItem><FormLabel>N° CIN du joueur</FormLabel><FormControl><Input {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>
                      )} />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FormField control={form.control} name="phone" render={({ field }) => (
                        <FormItem><FormLabel>Téléphone du joueur</FormLabel><FormControl><div className="relative"><Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input className="pl-9" placeholder="06..." {...field} value={field.value ?? ""} /></div></FormControl><FormMessage /></FormItem>
                      )} />
                       <FormField control={form.control} name="email" render={({ field }) => (
                        <FormItem><FormLabel>Email du joueur</FormLabel><FormControl><div className="relative"><Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input type="email" className="pl-9" placeholder="exemple@mail.com" {...field} value={field.value ?? ""} /></div></FormControl><FormMessage /></FormItem>
                      )} />
                    </div>
                   <FormField control={form.control} name="address" render={({ field }) => (
                    <FormItem><FormLabel>Adresse de résidence</FormLabel><FormControl><Textarea {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>
                  )} />
              </div>
              
              <Separator />
              
              <div className="space-y-4">
                  <h3 className="text-lg font-bold uppercase tracking-tighter">Responsable Légal (Tuteur)</h3>
                   <FormField control={form.control} name="tutorName" render={({ field }) => (
                    <FormItem><FormLabel>Nom complet du tuteur</FormLabel><FormControl><Input {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="tutorEmail" render={({ field }) => (
                    <FormItem><FormLabel>Email du tuteur</FormLabel><FormControl><div className="relative"><Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input type="email" className="pl-9" placeholder="tuteur@mail.com" {...field} value={field.value ?? ""} /></div></FormControl><FormMessage /></FormItem>
                  )} />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FormField control={form.control} name="tutorPhone" render={({ field }) => (
                        <FormItem><FormLabel>Téléphone tuteur</FormLabel><FormControl><div className="relative"><Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input className="pl-9" placeholder="06..." {...field} value={field.value ?? ""} /></div></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={form.control} name="tutorCin" render={({ field }) => (
                        <FormItem><FormLabel>CIN du tuteur</FormLabel><FormControl><Input {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>
                      )} />
                  </div>
              </div>
              
              <Button type="submit" disabled={loading} className="w-full !mt-8 font-black uppercase tracking-widest h-14 shadow-lg active:scale-95 transition-transform">
                {loading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : isEditMode ? "Enregistrer les modifications" : "Enregistrer et passer au paiement"}
              </Button>
          </div>
        </form>
      </Form>
    </CardContent>
  );
}
