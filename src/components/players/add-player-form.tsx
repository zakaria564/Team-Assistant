
"use client";

import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { CardContent } from "@/components/ui/card";
import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { Loader2, Camera, RefreshCcw, PlusCircle, Fingerprint, Upload, Calendar as CalendarIcon, FileText, Trash2, ShieldCheck, User, Eye, RotateCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { db, auth } from "@/lib/firebase";
import { collection, addDoc, doc, updateDoc, getDocs, query, where } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { Textarea } from "../ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuthState } from "react-firebase-hooks/auth";
import { format, parse } from "date-fns";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

const playerStatuses = ["Actif", "Inactif", "Blessé", "Suspendu"] as const;

const playerCategories = [
    "Seniors", "Seniors F", "U19", "U19 F", "U18", "U18 F", "U17", "U17 F", "U16", "U16 F", 
    "U15", "U15 F", "U14", "U14 F", "U13", "U13 F", "U12", "U12 F", "U11", "U11 F", 
    "U10", "U10 F", "U9", "U9 F", "U8", "U8 F", "U7", "U7 F", "U6", "U6 F", "Vétérans"
];

const playerPositions = [
    "Gardien de but", 
    "Défenseur Central", 
    "Arrière Latéral", 
    "Arrière Droit", 
    "Arrière Gauche", 
    "Milieu Défensif", 
    "Milieu Central", 
    "Milieu Offensif", 
    "Ailier", 
    "Ailier Droit", 
    "Ailier Gauche", 
    "Attaquant", 
    "Attaquant de pointe", 
    "Avant-centre"
];

const nationalities = [
  "Marocaine", "Afghane", "Albanaise", "Algérienne", "Allemande", "Américaine", "Andorrane", "Angolaise", 
  "Antiguaise-et-Barbudienne", "Argentine", "Arménienne", "Australienne", "Autrichienne", "Azerbaïdjanaise", 
  "Bahamienne", "Bahreïnienne", "Bangladeshenne", "Barbadienne", "Belge", "Belizienne", "Béninoise", 
  "Bhoutanaise", "Biélorusse", "Birmane", "Bissau-Guinéenne", "Bolivienne", "Bosniaque", "Botswanaise", 
  "Brésilienne", "Britannique", "Brunéienne", "Bulgare", "Burkinabé", "Burundaise", "Cambodgienne", 
  "Camerounaise", "Canadienne", "Cap-Verdienne", "Centrafricaine", "Chilienne", "Chinoise", "Chypriote", 
  "Colombienne", "Comorienne", "Congolaise", "Costaricaine", "Croate", "Cubaine", "Danoise", "Djiboutienne", 
  "Dominicaine", "Dominiquaise", "Égyptienne", "Émiratie", "Équatorienne", "Érythréenne", "Espagnole", 
  "Estonienne", "Éthiopienne", "Fidjienne", "Finlandaise", "Française", "Gabonaise", "Gambienne", 
  "Géorgienne", "Ghanéenne", "Grecque", "Grenadienne", "Guatémaltèque", "Guinéenne", "Guinéenne équatoriale", 
  "Guyanaise", "Haïtienne", "Hellénique", "Hondurienne", "Hongroise", "Indienne", "Indonésienne", "Irakienne", 
  "Iranienne", "Irlandaise", "Islandaise", "Israélienne", "Italienne", "Ivoirienne", "Jamaïcaine", "Japonaise", 
  "Jordanienne", "Kazakhstanaise", "Kényane", "Kirghize", "Kiribatienne", "Koweïtienne", "Laotienne", 
  "Lésothienne", "Lettonne", "Libanaise", "Libérienne", "Libyenne", "Liechtensteinoise", "Lituanienne", 
  "Luxembourgeoise", "Macédonienne", "Malgache", "Malaisienne", "Malawienne", "Maldivienne", "Malienne", 
  "Maltaise", "Marshallaise", "Mauricienne", "Mauritanienne", "Mexicaine", "Micronésienne", "Moldave", 
  "Monégasque", "Mongole", "Monténégrine", "Mozambicaine", "Namibienne", "Nauruane", "Néerlandaise", 
  "Népalaise", "Nicaraguayenne", "Nigériane", "Nigérienne", "Nord-Coréenne", "Norvégienne", "Néo-Zélandaise", 
  "Omanaise", "Ougandaise", "Ouzbèke", "Pakistanaise", "Palaosienne", "Palestinienne", "Panaméenne", 
  "Papouane-Néo-Guinéenne", "Paraguayenne", "Péruvienne", "Philippine", "Polonaise", "Portugaise", 
  "Qatarienne", "Roumaine", "Russe", "Rwandaise", "Saint-Christophienne", "Saint-Lucienne", "Saint-Marinaise", 
  "Saint-Vincentaise", "Salomonaise", "Salvadorienne", "Samoane", "Santoméenne", "Saoudienne", "Sénégalaise", 
  "Serbe", "Seychelloise", "Sierra-Léonaise", "Singapourienne", "Slovaque", "Slovène", "Somalienne", 
  "Soudanaise", "Sri-Lankaise", "Sud-Africaine", "Sud-Coréenne", "Sud-Soudanaise", "Suédoise", "Suisse", 
  "Surinamaise", "Swazie", "Syrienne", "Tadjike", "Tanzanienne", "Tchadienne", "Tchèque", "Thaïlandaise", 
  "Togolaise", "Tonguienne", "Trinidadienne", "Tunisienne", "Turkmène", "Turque", "Tuvaluane", "Ukrainienne", 
  "Uruguayenne", "Vanuataise", "Vaticane", "Vénézuélienne", "Vietnamienne", "Yéménite", "Zambienne", "Zimbabwéenne", "Autre"
];

const documentSchema = z.object({
  name: z.string().min(1, "Nom requis"),
  url: z.string().min(1, "Fichier requis"),
  validityDate: z.string().optional(),
});

const formSchema = z.object({
  name: z.string().min(2, "Le nom doit contenir au moins 2 caractères."),
  photoUrl: z.string().optional().or(z.literal('')),
  gender: z.enum(["Masculin", "Féminin"], { required_error: "Le genre est requis." }),
  category: z.string().min(1, "La catégorie est requise."),
  status: z.enum(playerStatuses, { required_error: "Le statut est requis." }),
  number: z.preprocess((val) => (val === "" || val === 0 ? undefined : val), z.coerce.number().min(1).max(99).optional()),
  birthDate: z.string().optional(),
  entryDate: z.string().optional(),
  exitDate: z.string().optional(),
  address: z.string().optional(),
  nationality: z.string().optional(),
  cin: z.string().optional(),
  phone: z.string().optional(),
  email: z.preprocess((val) => (val === "" ? undefined : val), z.string().email("Email invalide").optional()),
  position: z.string().optional(),
  tutorName: z.string().optional(),
  tutorCin: z.string().optional(),
  tutorPhone: z.string().optional(),
  tutorEmail: z.preprocess((val) => (val === "" ? undefined : val), z.string().email("Email invalide").optional()),
  coachId: z.string().optional(),
  documents: z.array(documentSchema).optional(),
  professionalId: z.string().optional(),
});

const formatDateInput = (value: string) => {
  const numbers = value.replace(/\D/g, "");
  if (numbers.length <= 2) return numbers;
  if (numbers.length <= 4) return `${numbers.slice(0, 2)}/${numbers.slice(2)}`;
  return `${numbers.slice(0, 2)}/${numbers.slice(2, 4)}/${numbers.slice(4, 8)}`;
};

const compressImage = (dataUrl: string, maxSize: number = 600): Promise<string> => {
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
      resolve(canvas.toDataURL('image/jpeg', 0.85));
    };
  });
};

const DateField = ({ label, field }: { label: string, field: any }) => (
    <FormItem className="flex flex-col">
        <FormLabel className="font-bold text-xs uppercase text-muted-foreground">{label}</FormLabel>
        <div className="flex gap-2">
            <FormControl>
                <Input 
                    placeholder="JJ/MM/AAAA" 
                    {...field} 
                    value={field.value || ""} 
                    onChange={(e) => field.onChange(formatDateInput(e.target.value))} 
                    className="flex-1 bg-background border-slate-200 font-medium h-10" 
                />
            </FormControl>
            <Popover>
                <PopoverTrigger asChild>
                    <Button variant="outline" size="icon" className="shrink-0 h-10 w-10 shadow-sm bg-background border-slate-200">
                        <CalendarIcon className="h-4 w-4 text-primary" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                    <Calendar 
                        mode="single" 
                        selected={field.value ? parse(field.value, "dd/MM/yyyy", new Date()) : undefined} 
                        onSelect={(date) => date && field.onChange(format(date, "dd/MM/yyyy"))} 
                        initialFocus 
                    />
                </PopoverContent>
            </Popover>
        </div>
        <FormMessage />
    </FormItem>
);

export function AddPlayerForm({ player }: { player?: any }) {
  const [user] = useAuthState(auth);
  const [loading, setLoading] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [coaches, setCoaches] = useState<any[]>([]);
  const { toast } = useToast();
  const router = useRouter();
  const isEditMode = !!player;

  const defaultValues = useMemo(() => {
    if (!player) return {
        name: "", photoUrl: "", gender: "Masculin" as const, category: "", status: "Actif" as const,
        number: undefined, birthDate: "", entryDate: format(new Date(), "dd/MM/yyyy"), exitDate: "", address: "", nationality: "Marocaine",
        cin: "", phone: "", email: "", position: "", tutorName: "", tutorCin: "", tutorPhone: "",
        tutorEmail: "", coachId: "", documents: [], professionalId: "",
    };
    return { ...player, documents: player.documents || [], number: player.number || undefined };
  }, [player]);

  const form = useForm<z.infer<typeof formSchema>>({ resolver: zodResolver(formSchema), defaultValues });
  const { fields, append, remove } = useFieldArray({ control: form.control, name: "documents" });

  useEffect(() => { if (player) form.reset(defaultValues); }, [player, defaultValues, form]);

  useEffect(() => {
    const fetchCoaches = async () => {
      if (!user) return;
      try {
        const q = query(collection(db, "coaches"), where("userId", "==", user.uid));
        const snap = await getDocs(q);
        setCoaches(snap.docs.map(d => ({ id: d.id, name: d.data().name })));
      } catch (e) { console.error(e); }
    };
    fetchCoaches();
  }, [user]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    setLoading(true);
    const reader = new FileReader();
    reader.onload = async (event) => { 
        const compressed = await compressImage(event.target?.result as string);
        form.setValue('photoUrl', compressed); 
        setLoading(false); 
    };
    reader.readAsDataURL(file);
  };

  const startCamera = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) { setHasCameraPermission(false); return; }
    
    // Stop existing tracks if any
    if (videoRef.current?.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
    }

    try {
        const s = await navigator.mediaDevices.getUserMedia({ 
            video: { 
                facingMode: facingMode,
                width: { ideal: 1280 },
                height: { ideal: 1280 }
            } 
        });
        if (videoRef.current) videoRef.current.srcObject = s;
        setHasCameraPermission(true);
    } catch (e) { 
        setHasCameraPermission(false); 
    }
  }, [facingMode]);

  useEffect(() => { 
    if(!form.watch('photoUrl')) {
        startCamera();
    }
    return () => {
        if (videoRef.current?.srcObject) {
            const stream = videoRef.current.srcObject as MediaStream;
            stream.getTracks().forEach(track => track.stop());
        }
    };
  }, [form.watch('photoUrl'), startCamera]);

  const toggleCamera = () => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
  };

  const takePicture = async () => {
    if (videoRef.current && canvasRef.current) {
      const c = canvasRef.current; const ctx = c.getContext('2d');
      if (ctx) { 
          c.width = videoRef.current.videoWidth; 
          c.height = videoRef.current.videoHeight;
          
          if (facingMode === 'user') {
              // Mirror compensation for front camera capture
              ctx.translate(c.width, 0);
              ctx.scale(-1, 1);
          }
          
          ctx.drawImage(videoRef.current, 0, 0); 
          const compressed = await compressImage(c.toDataURL('image/jpeg', 0.9));
          form.setValue('photoUrl', compressed); 
      }
    }
  };

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!user) return;
    setLoading(true);
    try {
        const data = { 
            ...values, 
            userId: user.uid, 
            professionalId: values.professionalId || `PL-${format(new Date(), "yyyyMM")}-${Math.random().toString(36).substring(2, 6).toUpperCase()}` 
        };
        if (isEditMode) await updateDoc(doc(db, "players", player.id), data);
        else await addDoc(collection(db, "players"), { ...data, createdAt: new Date() });
        toast({ title: "Enregistré avec succès !" }); router.push("/dashboard/players");
    } catch (e) { 
        console.error(e);
        toast({ variant: "destructive", title: "Erreur lors de l'enregistrement" }); 
    } finally { setLoading(false); }
  }

  return (
    <CardContent className="pt-6">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          <div className="space-y-8">
              <div className="space-y-4">
                  <div className="aspect-square bg-slate-900 rounded-2xl border-4 border-slate-800 flex items-center justify-center relative overflow-hidden shadow-2xl group">
                       {!form.watch('photoUrl') && hasCameraPermission ? (
                           <>
                                <video ref={videoRef} className={cn("w-full h-full object-cover", facingMode === 'user' && "scale-x-[-1]")} autoPlay muted playsInline />
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                    <div className="w-[65%] aspect-[3/4] border-2 border-white/20 rounded-[100px] shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]"></div>
                                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[67%] aspect-[3/4] border border-primary/40 rounded-[100px] animate-pulse"></div>
                                </div>
                                <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-md px-2 py-1 rounded-md flex items-center gap-2 border border-white/10">
                                    <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                                    <span className="text-[7px] font-black text-white uppercase tracking-widest leading-none">Flux HD Actif</span>
                                </div>
                                <Button 
                                    type="button" 
                                    variant="secondary" 
                                    size="icon" 
                                    onClick={toggleCamera}
                                    className="absolute bottom-4 right-4 h-10 w-10 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white hover:bg-white/20"
                                >
                                    <RotateCw className="h-5 w-5" />
                                </Button>
                           </>
                       )
                      : form.watch('photoUrl') ? <img src={form.watch('photoUrl')} className="w-full h-full object-contain p-2" />
                      : <div className="flex flex-col items-center gap-2 text-muted-foreground"><Camera className="h-12 w-12 opacity-20" /><p className="text-xs font-bold uppercase">Caméra inactive</p></div>}
                  </div>
                  <canvas ref={canvasRef} className="hidden" />
                  <div className="grid grid-cols-2 gap-3">
                      <Button type="button" variant="outline" onClick={takePicture} disabled={!hasCameraPermission || !!form.watch('photoUrl')} className="h-12 font-black uppercase tracking-widest text-[10px] bg-background border-slate-200" size="sm"><Camera className="mr-2 h-4 w-4 text-primary"/>Capturer</Button>
                      <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={!!form.watch('photoUrl')} className="h-12 font-black uppercase tracking-widest text-[10px] bg-background border-slate-200" size="sm"><Upload className="mr-2 h-4 w-4 text-primary"/>Importer</Button>
                      <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileUpload} />
                      {form.watch('photoUrl') && <Button type="button" variant="secondary" onClick={() => form.setValue('photoUrl', '')} className="h-12 col-span-2 font-black uppercase tracking-widest text-[10px]" size="sm"><RefreshCcw className="mr-2 h-4 w-4" />Nouvelle Capture</Button>}
                  </div>
              </div>

              <div className="space-y-6">
                  <h3 className="text-lg font-black flex items-center gap-3 uppercase tracking-tighter text-primary"><Fingerprint className="h-6 w-6" />Parcours Sportif</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <FormField control={form.control} name="category" render={({ field }) => (
                        <FormItem>
                            <FormLabel className="font-bold text-xs uppercase text-muted-foreground">Catégorie</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value || ''}>
                                <FormControl>
                                    <SelectTrigger className="bg-background border-slate-200 h-10">
                                        <SelectValue placeholder="Choisir..." />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    {playerCategories.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="position" render={({ field }) => (
                        <FormItem>
                            <FormLabel className="font-bold text-xs uppercase text-muted-foreground">Poste Principal</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value || ''}>
                                <FormControl>
                                    <SelectTrigger className="bg-background border-slate-200 h-10">
                                        <SelectValue placeholder="Choisir..." />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    {playerPositions.map(pos => <SelectItem key={pos} value={pos}>{pos}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </FormItem>
                      )} />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <FormField control={form.control} name="number" render={({ field }) => (
                        <FormItem><FormLabel className="font-bold text-xs uppercase text-muted-foreground">N° Maillot</FormLabel><FormControl><Input type="number" {...field} value={field.value ?? ""} className="bg-background border-slate-200 h-10" /></FormControl></FormItem>
                      )} />
                      <FormField control={form.control} name="coachId" render={({ field }) => (
                        <FormItem>
                            <FormLabel className="font-bold text-xs uppercase text-muted-foreground">Entraîneur</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value || ''}>
                                <FormControl>
                                    <SelectTrigger className="bg-background border-slate-200 h-10">
                                        <SelectValue placeholder="Choisir..." />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    <SelectItem value="none">Aucun</SelectItem>
                                    {coaches.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </FormItem>
                      )} />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <FormField control={form.control} name="entryDate" render={({ field }) => <DateField label="Date d'entrée" field={field} />} />
                      <FormField control={form.control} name="exitDate" render={({ field }) => <DateField label="Date de sortie" field={field} />} />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <FormField control={form.control} name="status" render={({ field }) => (
                        <FormItem>
                            <FormLabel className="font-bold text-xs uppercase text-muted-foreground">Statut</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value || ''}>
                                <FormControl>
                                    <SelectTrigger className="bg-background border-slate-200 h-10">
                                        <SelectValue />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    {playerStatuses.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </FormItem>
                    )} />
                    <FormField control={form.control} name="professionalId" render={({ field }) => (
                        <FormItem>
                            <FormLabel className="font-bold text-xs uppercase text-muted-foreground">ID Professionnel</FormLabel>
                            <FormControl>
                                <Input 
                                    {...field} 
                                    readOnly 
                                    disabled 
                                    className="bg-background border-slate-200 cursor-not-allowed opacity-70 font-mono text-xs h-10" 
                                    placeholder="Généré automatiquement" 
                                />
                            </FormControl>
                        </FormItem>
                    )} />
                  </div>
              </div>
          </div>

          <div className="space-y-8">
              <div className="space-y-6">
                  <h3 className="text-lg font-black uppercase tracking-tighter flex items-center gap-3 text-primary"><User className="h-6 w-6" />État Civil & Contact</h3>
                  <FormField control={form.control} name="name" render={({ field }) => (
                    <FormItem><FormLabel className="font-bold text-xs uppercase text-muted-foreground">Nom Complet</FormLabel><FormControl><Input {...field} placeholder="Prénom NOM" className="bg-background border-slate-200 h-10" /></FormControl><FormMessage /></FormItem>
                  )} />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <FormField control={form.control} name="birthDate" render={({ field }) => <DateField label="Date de naissance" field={field} />} />
                      <FormField control={form.control} name="gender" render={({ field }) => (
                        <FormItem>
                            <FormLabel className="font-bold text-xs uppercase text-muted-foreground">Genre</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value || ''}>
                                <FormControl>
                                    <SelectTrigger className="bg-background border-slate-200 h-10">
                                        <SelectValue />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    <SelectItem value="Masculin">Masculin</SelectItem>
                                    <SelectItem value="Féminin">Féminin</SelectItem>
                                </SelectContent>
                            </Select>
                        </FormItem>
                      )} />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <FormField control={form.control} name="nationality" render={({ field }) => (
                          <FormItem>
                              <FormLabel className="font-bold text-xs uppercase text-muted-foreground">Nationalité</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value || ''}>
                                  <FormControl>
                                      <SelectTrigger className="bg-background border-slate-200 h-10">
                                          <SelectValue />
                                      </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                      <ScrollArea className="h-80">
                                          {nationalities.map(nat => <SelectItem key={nat} value={nat}>{nat}</SelectItem>)}
                                      </ScrollArea>
                                  </SelectContent>
                              </Select>
                          </FormItem>
                      )} />
                      <FormField control={form.control} name="cin" render={({ field }) => (
                          <FormItem><FormLabel className="font-bold text-xs uppercase text-muted-foreground">N° CIN / ID</FormLabel><FormControl><Input {...field} className="bg-background border-slate-200 h-10" /></FormControl></FormItem>
                      )} />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <FormField control={form.control} name="phone" render={({ field }) => (
                        <FormItem><FormLabel className="font-bold text-xs uppercase text-muted-foreground">Téléphone</FormLabel><FormControl><Input type="tel" {...field} className="bg-background border-slate-200 h-10" /></FormControl></FormItem>
                      )} />
                      <FormField control={form.control} name="email" render={({ field }) => (
                        <FormItem><FormLabel className="font-bold text-xs uppercase text-muted-foreground">Email</FormLabel><FormControl><Input type="email" {...field} value={field.value || ""} className="bg-background border-slate-200 h-10" /></FormControl><FormMessage /></FormItem>
                      )} />
                  </div>
                  <FormField control={form.control} name="address" render={({ field }) => (
                    <FormItem><FormLabel className="font-bold text-xs uppercase text-muted-foreground">Adresse</FormLabel><FormControl><Textarea {...field} className="min-h-[80px] bg-background border-slate-200" /></FormControl></FormItem>
                  )} />
              </div>

              <div className="space-y-6">
                  <h3 className="text-lg font-black uppercase tracking-tighter flex items-center gap-3 text-primary"><User className="h-6 w-6" />Tuteur Légal</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <FormField control={form.control} name="tutorName" render={({ field }) => (
                        <FormItem><FormLabel className="font-bold text-xs uppercase text-muted-foreground">Nom Tuteur</FormLabel><FormControl><Input {...field} className="bg-background border-slate-200 h-10" /></FormControl></FormItem>
                      )} />
                      <FormField control={form.control} name="tutorCin" render={({ field }) => (
                        <FormItem><FormLabel className="font-bold text-xs uppercase text-muted-foreground">CIN Tuteur</FormLabel><FormControl><Input {...field} className="bg-background border-slate-200 h-10" /></FormControl></FormItem>
                      )} />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <FormField control={form.control} name="tutorPhone" render={({ field }) => (
                        <FormItem><FormLabel className="font-bold text-xs uppercase text-muted-foreground">Téléphone</FormLabel><FormControl><Input type="tel" {...field} className="bg-background border-slate-200 h-10" /></FormControl></FormItem>
                      )} />
                      <FormField control={form.control} name="tutorEmail" render={({ field }) => (
                        <FormItem><FormLabel className="font-bold text-xs uppercase text-muted-foreground">Email Tuteur</FormLabel><FormControl><Input type="email" {...field} value={field.value || ""} className="bg-background border-slate-200 h-10" /></FormControl></FormItem>
                      )} />
                  </div>
              </div>

              <div className="space-y-4">
                  <div className="flex items-center justify-between">
                      <h3 className="text-lg font-black uppercase tracking-tighter flex items-center gap-3 text-slate-700"><FileText className="h-6 w-6 text-primary" />Documents</h3>
                      <Button type="button" variant="outline" size="sm" onClick={() => append({ name: "", url: "", validityDate: "" })} className="h-9 font-black uppercase tracking-widest text-[9px] bg-background border-slate-200"><PlusCircle className="h-4 w-4 mr-2 text-primary" />Ajouter</Button>
                  </div>
                  <div className="space-y-3">
                    {fields.map((field, index) => <DocumentPickerItem key={field.id} index={index} remove={remove} form={form} />)}
                  </div>
              </div>

              <Button type="submit" disabled={loading} className="w-full !mt-12 font-black uppercase h-16 shadow-2xl active:scale-[0.98] transition-all text-lg tracking-[0.2em] bg-primary hover:bg-primary/90 text-white rounded-xl">
              {loading ? <Loader2 className="mr-3 h-6 w-6 animate-spin" /> : isEditMode ? "Enregistrer" : "Ajouter le Joueur"}
              </Button>
          </div>
        </form>
      </Form>
    </CardContent>
  );
}

function DocumentPickerItem({ index, remove, form }: { index: number, remove: any, form: any }) {
    const fileRef = useRef<HTMLInputElement>(null);
    const url = form.watch(`documents.${index}.url`);
    const [loading, setLoading] = useState(false);

    return (
        <div className="p-3 border-2 rounded-2xl bg-background border-slate-100 space-y-3 relative group shadow-sm">
            <Button type="button" variant="ghost" size="icon" className="absolute -top-2 -right-2 h-7 w-7 rounded-full bg-white shadow-md border text-destructive z-10" onClick={() => remove(index)}><Trash2 className="h-3.5 w-3.5" /></Button>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <FormField control={form.control} name={`documents.${index}.name`} render={({ field }) => (
                    <FormItem><FormLabel className="font-bold text-[10px] uppercase text-slate-500">Nom</FormLabel><FormControl><Input placeholder="Ex: CIN..." {...field} className="h-9 bg-background border-slate-200" /></FormControl></FormItem>
                )} />
                <FormField control={form.control} name={`documents.${index}.validityDate`} render={({ field }) => <DateField label="Expiration" field={field} />} />
            </div>
            <div className="flex gap-2">
                <Button type="button" variant="outline" className={cn("flex-1 h-9 font-black uppercase tracking-widest text-[10px]", url ? "border-green-500 text-green-600 bg-green-50" : "border-dashed bg-background border-slate-200")} onClick={() => fileRef.current?.click()} disabled={loading}>
                    {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : url ? <><ShieldCheck className="mr-2 h-3.5 w-3.5" />Chargé</> : <><Upload className="mr-2 h-3.5 w-3.5 text-primary" />Choisir fichier</>}
                </Button>
                {url && (
                    <Dialog>
                        <DialogTrigger asChild>
                            <Button type="button" variant="secondary" size="icon" className="h-9 w-9 bg-slate-100" title="Voir">
                                <Eye className="h-4 w-4 text-slate-700" />
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-3xl">
                            <DialogHeader>
                                <DialogTitle>Aperçu du document</DialogTitle>
                            </DialogHeader>
                            <div className="mt-4 flex justify-center bg-slate-50 rounded-xl overflow-hidden border">
                                <img src={url} alt="Doc" className="max-w-full h-auto max-h-[70vh] object-contain" />
                            </div>
                        </DialogContent>
                    </Dialog>
                )}
            </div>
            <input type="file" ref={fileRef} className="hidden" accept="image/*" onChange={(e) => {
                const file = e.target.files?.[0]; if (!file) return; setLoading(true);
                const reader = new FileReader(); reader.onload = async (ev) => {
                    const compressed = await compressImage(ev.target?.result as string);
                    form.setValue(`documents.${index}.url`, compressed);
                    if (!form.getValues(`documents.${index}.name`)) form.setValue(`documents.${index}.name`, file.name.split('.')[0]);
                    setLoading(false);
                }; reader.readAsDataURL(file);
            }} />
        </div>
    );
}
