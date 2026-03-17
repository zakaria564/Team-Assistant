"use client";

import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { CardContent } from "@/components/ui/card";
import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { Loader2, Camera, RefreshCcw, PlusCircle, Fingerprint, Upload, Mail, Phone, Calendar as CalendarIcon, FileText, Trash2, Link as LinkIcon, ShieldCheck, User, MapPin } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { db, auth } from "@/lib/firebase";
import { collection, addDoc, doc, updateDoc, getDocs, query, where } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { Textarea } from "../ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuthState } from "react-firebase-hooks/auth";
import { format } from "date-fns";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

const playerStatuses = ["Actif", "Inactif", "Blessé", "Suspendu"] as const;
const playerPositions = [
  "Gardien de but", 
  "Défenseur Central", 
  "Arrière Latéral", 
  "Milieu Défensif", 
  "Milieu Central", 
  "Milieu Offensif", 
  "Ailier", 
  "Attaquant de pointe"
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

interface Coach { id: string; name: string; }

const DateField = ({ label, field }: { label: string, field: any }) => (
    <FormItem className="flex flex-col">
        <FormLabel>{label}</FormLabel>
        <div className="flex gap-2">
            <FormControl>
                <Input placeholder="JJ/MM/AAAA" {...field} value={field.value || ""} className="flex-1 bg-background" />
            </FormControl>
            <Popover>
                <PopoverTrigger asChild>
                    <Button variant="outline" size="icon" className="shrink-0 h-10 w-10 shadow-sm bg-background"><CalendarIcon className="h-4 w-4" /></Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                    <Calendar
                        mode="single"
                        selected={field.value ? new Date(field.value.split('/').reverse().join('-')) : undefined}
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
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const { toast } = useToast();
  const router = useRouter();
  const isEditMode = !!player;

  const defaultValues = useMemo(() => {
    if (!player) return {
        name: "", photoUrl: "", gender: "Masculin" as const, category: "", status: "Actif" as const,
        number: "", birthDate: "", entryDate: format(new Date(), "dd/MM/yyyy"), exitDate: "", address: "", nationality: "Marocaine",
        cin: "", phone: "", email: "", position: "", tutorName: "", tutorCin: "", tutorPhone: "",
        tutorEmail: "", coachId: "", documents: [], professionalId: "",
    };
    return { ...player, documents: player.documents || [] };
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
        setCoaches(snap.docs.map(d => ({ id: d.id, name: d.data().name } as Coach)));
      } catch (e) { console.error(e); }
    };
    fetchCoaches();
  }, [user]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    setLoading(true);
    const reader = new FileReader();
    reader.onload = (event) => { form.setValue('photoUrl', event.target?.result as string); setLoading(false); };
    reader.readAsDataURL(file);
  };

  const getCameraPermission = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) { setHasCameraPermission(false); return; }
    try {
        const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
        if (videoRef.current) videoRef.current.srcObject = s;
        setHasCameraPermission(true);
    } catch (e) { setHasCameraPermission(false); }
  }, []);

  useEffect(() => { if(!form.watch('photoUrl')) getCameraPermission(); }, [form.watch('photoUrl'), getCameraPermission]);

  const takePicture = () => {
    if (videoRef.current && canvasRef.current) {
      const c = canvasRef.current; const ctx = c.getContext('2d');
      if (ctx) {
        c.width = 400; c.height = 400;
        ctx.drawImage(videoRef.current, 0, 0, 400, 400);
        form.setValue('photoUrl', c.toDataURL('image/jpeg', 0.8));
      }
    }
  };

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!user) return;
    setLoading(true);
    try {
        const data = { ...values, userId: user.uid, professionalId: values.professionalId || `PL-${format(new Date(), "yyyyMM")}-${Math.random().toString(36).substring(2, 6).toUpperCase()}` };
        if (isEditMode) await updateDoc(doc(db, "players", player.id), data);
        else await addDoc(collection(db, "players"), { ...data, createdAt: new Date() });
        toast({ title: "Enregistré avec succès !" }); router.push("/dashboard/players");
    } catch (e) { toast({ variant: "destructive", title: "Erreur" }); } finally { setLoading(false); }
  }

  return (
    <CardContent className="pt-6">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          <div className="space-y-8">
              <div className="space-y-4">
                  <div className="aspect-square bg-slate-50 rounded-2xl border-2 border-slate-200 flex items-center justify-center relative overflow-hidden shadow-inner group">
                       {!form.watch('photoUrl') && hasCameraPermission ? <video ref={videoRef} className="w-full h-full object-cover" autoPlay muted playsInline />
                      : form.watch('photoUrl') ? <img src={form.watch('photoUrl')} className="w-full h-full object-contain p-2" />
                      : <div className="flex flex-col items-center gap-2 text-muted-foreground"><Camera className="h-12 w-12 opacity-20" /><p className="text-xs font-bold uppercase">Caméra inactive</p></div>}
                  </div>
                  <canvas ref={canvasRef} className="hidden" />
                  <div className="grid grid-cols-2 gap-3">
                      <Button type="button" variant="outline" onClick={takePicture} disabled={!hasCameraPermission || !!form.watch('photoUrl')} className="h-12 font-black uppercase tracking-widest text-[10px] bg-background" size="sm"><Camera className="mr-2 h-4 w-4"/>Prendre</Button>
                      <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={!!form.watch('photoUrl')} className="h-12 font-black uppercase tracking-widest text-[10px] bg-background" size="sm"><Upload className="mr-2 h-4 w-4"/>Galerie</Button>
                      <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileUpload} />
                      {form.watch('photoUrl') && <Button type="button" variant="secondary" onClick={() => form.setValue('photoUrl', '')} className="h-12 col-span-2 font-black uppercase tracking-widest text-[10px]" size="sm"><RefreshCcw className="mr-2 h-4 w-4" />Changer la photo</Button>}
                  </div>
              </div>

              <div className="space-y-6">
                  <h3 className="text-lg font-black flex items-center gap-3 uppercase tracking-tighter text-primary"><Fingerprint className="h-6 w-6" />Parcours Sportif</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <FormField control={form.control} name="category" render={({ field }) => (
                        <FormItem><FormLabel>Catégorie</FormLabel><Select onValueChange={field.onChange} value={field.value || ''}><FormControl><SelectTrigger className="bg-background"><SelectValue placeholder="Sélectionner..." /></SelectTrigger></FormControl><SelectContent>{["Seniors", "U19", "U17", "U15", "U13", "U11", "U9"].map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}</SelectContent></Select></FormItem>
                      )} />
                      <FormField control={form.control} name="position" render={({ field }) => (
                        <FormItem><FormLabel>Poste Principal</FormLabel><Select onValueChange={field.onChange} value={field.value || ''}><FormControl><SelectTrigger className="bg-background"><SelectValue placeholder="Choisir un poste..." /></SelectTrigger></FormControl><SelectContent>{playerPositions.map(pos => <SelectItem key={pos} value={pos}>{pos}</SelectItem>)}</SelectContent></Select></FormItem>
                      )} />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <FormField control={form.control} name="number" render={({ field }) => (
                        <FormItem><FormLabel>N° de Maillot</FormLabel><FormControl><Input type="number" {...field} className="bg-background" /></FormControl></FormItem>
                      )} />
                      <FormField control={form.control} name="coachId" render={({ field }) => (
                        <FormItem><FormLabel>Entraîneur Référent</FormLabel><Select onValueChange={field.onChange} value={field.value || ''}><FormControl><SelectTrigger className="bg-background"><SelectValue placeholder="Choisir un coach..." /></SelectTrigger></FormControl><SelectContent><SelectItem value="none">Aucun</SelectItem>{coaches.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select></FormItem>
                      )} />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <FormField control={form.control} name="entryDate" render={({ field }) => <DateField label="Date d'entrée" field={field} />} />
                      <FormField control={form.control} name="exitDate" render={({ field }) => <DateField label="Date de sortie" field={field} />} />
                  </div>
                  <FormField control={form.control} name="status" render={({ field }) => (
                    <FormItem><FormLabel>Statut actuel</FormLabel><Select onValueChange={field.onChange} value={field.value || ''}><FormControl><SelectTrigger className="bg-background"><SelectValue /></SelectTrigger></FormControl><SelectContent>{playerStatuses.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></FormItem>
                  )} />
              </div>
          </div>

          <div className="space-y-8">
              <div className="space-y-6">
                  <h3 className="text-lg font-black uppercase tracking-tighter flex items-center gap-3 text-primary"><User className="h-6 w-6" />État Civil & Contact</h3>
                  <FormField control={form.control} name="name" render={({ field }) => (
                    <FormItem><FormLabel>Nom Complet du Joueur</FormLabel><FormControl><Input {...field} placeholder="Prénom et NOM" className="bg-background" /></FormControl><FormMessage /></FormItem>
                  )} />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <FormField control={form.control} name="birthDate" render={({ field }) => <DateField label="Date de naissance" field={field} />} />
                      <FormField control={form.control} name="gender" render={({ field }) => (
                        <FormItem><FormLabel>Genre</FormLabel><Select onValueChange={field.onChange} value={field.value || ''}><FormControl><SelectTrigger className="bg-background"><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="Masculin">Masculin</SelectItem><SelectItem value="Féminin">Féminin</SelectItem></SelectContent></Select></FormItem>
                      )} />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <FormField control={form.control} name="nationality" render={({ field }) => (
                          <FormItem><FormLabel>Nationalité</FormLabel><Select onValueChange={field.onChange} value={field.value || ''}><FormControl><SelectTrigger className="bg-background"><SelectValue /></SelectTrigger></FormControl><SelectContent>{["Marocaine", "Autre"].map(nat => <SelectItem key={nat} value={nat}>{nat}</SelectItem>)}</SelectContent></Select></FormItem>
                      )} />
                      <FormField control={form.control} name="cin" render={({ field }) => (
                          <FormItem><FormLabel>N° CIN / ID</FormLabel><FormControl><Input {...field} className="bg-background" /></FormControl></FormItem>
                      )} />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <FormField control={form.control} name="phone" render={({ field }) => (
                        <FormItem><FormLabel>Téléphone mobile</FormLabel><FormControl><Input type="tel" {...field} className="bg-background" /></FormControl></FormItem>
                      )} />
                      <FormField control={form.control} name="email" render={({ field }) => (
                        <FormItem><FormLabel>Email personnel</FormLabel><FormControl><Input type="email" {...field} className="bg-background" /></FormControl><FormMessage /></FormItem>
                      )} />
                  </div>
                  <FormField control={form.control} name="address" render={({ field }) => (
                    <FormItem><FormLabel>Adresse de résidence</FormLabel><FormControl><Textarea {...field} className="min-h-[80px] bg-background" /></FormControl></FormItem>
                  )} />
              </div>

              <div className="space-y-6">
                  <h3 className="text-lg font-black uppercase tracking-tighter flex items-center gap-3 text-primary"><User className="h-6 w-6" />Responsable Légal (Tuteur)</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <FormField control={form.control} name="tutorName" render={({ field }) => (
                        <FormItem><FormLabel>Nom du Tuteur</FormLabel><FormControl><Input {...field} className="bg-background" /></FormControl></FormItem>
                      )} />
                      <FormField control={form.control} name="tutorCin" render={({ field }) => (
                        <FormItem><FormLabel>N° CIN Tuteur</FormLabel><FormControl><Input {...field} className="bg-background" /></FormControl></FormItem>
                      )} />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <FormField control={form.control} name="tutorPhone" render={({ field }) => (
                        <FormItem><FormLabel>Téléphone Tuteur</FormLabel><FormControl><Input type="tel" {...field} className="bg-background" /></FormControl></FormItem>
                      )} />
                      <FormField control={form.control} name="tutorEmail" render={({ field }) => (
                        <FormItem><FormLabel>Email du tuteur</FormLabel><FormControl><Input type="email" {...field} className="bg-background" /></FormControl><FormMessage /></FormItem>
                      )} />
                  </div>
              </div>

              <div className="space-y-6">
                  <div className="flex items-center justify-between">
                      <h3 className="text-lg font-black uppercase tracking-tighter flex items-center gap-3 text-slate-700"><FileText className="h-6 w-6" />Documents Numérisés</h3>
                      <Button type="button" variant="outline" size="sm" onClick={() => append({ name: "", url: "", validityDate: "" })} className="h-9 font-black uppercase tracking-widest text-[9px] bg-background"><PlusCircle className="h-4 w-4 mr-2" />Ajouter</Button>
                  </div>
                  <div className="space-y-4">
                    {fields.map((field, index) => (
                        <DocumentPickerItem key={field.id} index={index} remove={remove} form={form} />
                    ))}
                    {fields.length === 0 && <p className="text-center py-8 text-muted-foreground italic text-xs">Aucun document ajouté.</p>}
                  </div>
              </div>

              <Button type="submit" disabled={loading} className="w-full !mt-12 font-black uppercase h-16 shadow-2xl active:scale-[0.98] transition-all text-lg tracking-[0.2em]">
              {loading ? <Loader2 className="mr-3 h-6 w-6 animate-spin" /> : isEditMode ? "Enregistrer les modifications" : "Confirmer l'ajout du joueur"}
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
        <div className="p-5 border-2 rounded-2xl bg-background space-y-4 relative group shadow-sm">
            <Button type="button" variant="ghost" size="icon" className="absolute -top-2 -right-2 h-8 w-8 rounded-full bg-background shadow-md border text-destructive opacity-0 group-hover:opacity-100 transition-all z-10" onClick={() => remove(index)}><Trash2 className="h-4 w-4" /></Button>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField control={form.control} name={`documents.${index}.name`} render={({ field }) => (
                    <FormItem><FormLabel>Désignation</FormLabel><FormControl><Input placeholder="Ex: Licence, CIN..." {...field} className="bg-background" /></FormControl></FormItem>
                )} />
                <FormField control={form.control} name={`documents.${index}.validityDate`} render={({ field }) => <DateField label="Expiration" field={field} />} />
            </div>
            <div className="space-y-2">
                <FormLabel>Fichier (Scan / Photo)</FormLabel>
                <div className="flex gap-2">
                    <Button type="button" variant="outline" className={cn("flex-1 h-12 font-black uppercase tracking-widest text-[10px]", url ? "border-green-500 text-green-600 bg-green-50" : "border-dashed bg-background")} onClick={() => fileRef.current?.click()} disabled={loading}>
                        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : url ? <><ShieldCheck className="mr-2 h-4 w-4" />Document Chargé</> : <><Upload className="mr-2 h-4 w-4" />Choisir fichier</>}
                    </Button>
                    {url && (
                        <Button type="button" variant="secondary" size="icon" className="h-12 w-12" asChild>
                            <a href={url} target="_blank" rel="noopener noreferrer" title="Voir le document">
                                <LinkIcon className="h-5 w-5" />
                            </a>
                        </Button>
                    )}
                </div>
                <input type="file" ref={fileRef} className="hidden" onChange={(e) => {
                    const file = e.target.files?.[0]; if (!file) return; setLoading(true);
                    const reader = new FileReader(); reader.onload = (ev) => {
                        form.setValue(`documents.${index}.url`, ev.target?.result as string);
                        if (!form.getValues(`documents.${index}.name`)) form.setValue(`documents.${index}.name`, file.name.split('.')[0]);
                        setLoading(false);
                    }; reader.readAsDataURL(file);
                }} />
            </div>
        </div>
    );
}