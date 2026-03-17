"use client";

import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { CardContent } from "@/components/ui/card";
import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { Loader2, Camera, RefreshCcw, Fingerprint, Upload, Calendar as CalendarIcon, FileText, Trash2, PlusCircle, ShieldCheck, User, Mail, Phone, MapPin, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { db, auth } from "@/lib/firebase";
import { collection, addDoc, doc, updateDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuthState } from "react-firebase-hooks/auth";
import { format, parse } from "date-fns";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Textarea } from "../ui/textarea";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

const coachStatuses = ["Actif", "Inactif"] as const;
const coachSpecialties = [
  "Entraîneur Principal",
  "Entraîneur Adjoint",
  "Entraîneur des Gardiens",
  "Préparateur Physique",
  "Analyste Vidéo",
  "Recruteur"
];

const documentSchema = z.object({
  name: z.string().min(1, "Nom requis"),
  url: z.string().min(1, "Fichier requis"),
  validityDate: z.string().optional(),
});

const formSchema = z.object({
  name: z.string().min(2, "Le nom doit contenir au moins 2 caractères."),
  photoUrl: z.string().optional().or(z.literal('')),
  category: z.string({ required_error: "La catégorie est requise."}),
  status: z.enum(coachStatuses, { required_error: "Le statut est requis."}),
  phone: z.string().optional(),
  email: z.string().email("Veuillez entrer une adresse email valide."),
  specialty: z.string().optional(),
  entryDate: z.string().optional(),
  exitDate: z.string().optional(),
  nationality: z.string().optional(),
  cin: z.string().optional(),
  address: z.string().optional(),
  documents: z.array(documentSchema).optional(),
  professionalId: z.string().optional(),
});

const formatDateInput = (value: string) => {
  const numbers = value.replace(/\D/g, "");
  if (numbers.length <= 2) return numbers;
  if (numbers.length <= 4) return `${numbers.slice(0, 2)}/${numbers.slice(2)}`;
  return `${numbers.slice(0, 2)}/${numbers.slice(2, 4)}/${numbers.slice(4, 8)}`;
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
                    className="flex-1 bg-background border-slate-200 font-medium" 
                />
            </FormControl>
            <Popover>
                <PopoverTrigger asChild>
                    <Button variant="outline" size="icon" className="shrink-0 h-10 w-10 shadow-sm bg-background border-slate-200"><CalendarIcon className="h-4 w-4 text-primary" /></Button>
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

export function AddCoachForm({ coach }: { coach?: any }) {
  const [user] = useAuthState(auth);
  const [loading, setLoading] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const { toast } = useToast();
  const router = useRouter();
  const isEditMode = !!coach;

  const defaultValues = useMemo(() => {
    if (!coach) return {
        name: "", photoUrl: "", category: "", status: "Actif" as const, phone: "", email: "", specialty: "",
        entryDate: "", exitDate: "", nationality: "Marocaine", cin: "", address: "", documents: [], professionalId: "",
    };
    return { ...coach, documents: coach.documents || [] };
  }, [coach]);

  const form = useForm<z.infer<typeof formSchema>>({ resolver: zodResolver(formSchema), defaultValues });
  const { fields, append, remove } = useFieldArray({ control: form.control, name: "documents" });

  useEffect(() => { if (coach) form.reset(defaultValues); }, [coach, defaultValues, form]);

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
        const data = { ...values, userId: user.uid, professionalId: values.professionalId || `CH-${format(new Date(), "yyyyMM")}-${Math.random().toString(36).substring(2, 6).toUpperCase()}` };
        if (isEditMode) await updateDoc(doc(db, "coaches", coach.id), data);
        else await addDoc(collection(db, "coaches"), { ...data, createdAt: new Date() });
        toast({ title: "Enregistré avec succès !" }); router.push("/dashboard/coaches");
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
                      <Button type="button" variant="outline" onClick={takePicture} disabled={!hasCameraPermission || !!form.watch('photoUrl')} className="h-12 font-black uppercase tracking-widest text-[10px] bg-background border-slate-200" size="sm"><Camera className="mr-2 h-4 w-4 text-primary"/>Prendre</Button>
                      <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={!!form.watch('photoUrl')} className="h-12 font-black uppercase tracking-widest text-[10px] bg-background border-slate-200" size="sm"><Upload className="mr-2 h-4 w-4 text-primary"/>Galerie</Button>
                      <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileUpload} />
                      {form.watch('photoUrl') && <Button type="button" variant="secondary" onClick={() => form.setValue('photoUrl', '')} className="h-12 col-span-2 font-black uppercase tracking-widest text-[10px]" size="sm"><RefreshCcw className="mr-2 h-4 w-4" />Changer la photo</Button>}
                  </div>
              </div>

              <div className="space-y-6">
                  <h3 className="text-lg font-black flex items-center gap-3 uppercase tracking-tighter text-primary"><Fingerprint className="h-6 w-6" />Infos Club</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <FormField control={form.control} name="category" render={({ field }) => (
                        <FormItem><FormLabel className="font-bold text-xs uppercase text-muted-foreground">Catégorie</FormLabel><Select onValueChange={field.onChange} value={field.value || ''}><FormControl><SelectTrigger className="bg-background border-slate-200"><SelectValue placeholder="Sélectionner..." /></SelectTrigger></FormControl><SelectContent>{["Seniors", "U19", "U17", "U15", "U13", "U11", "U9"].map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}</SelectContent></Select></FormItem>
                      )} />
                      <FormField control={form.control} name="status" render={({ field }) => (
                        <FormItem><FormLabel className="font-bold text-xs uppercase text-muted-foreground">Statut</FormLabel><Select onValueChange={field.onChange} value={field.value || ''}><FormControl><SelectTrigger className="bg-background border-slate-200"><SelectValue /></SelectTrigger></FormControl><SelectContent>{coachStatuses.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></FormItem>
                      )} />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <FormField control={form.control} name="specialty" render={({ field }) => (
                        <FormItem><FormLabel className="font-bold text-xs uppercase text-muted-foreground">Spécialité</FormLabel><Select onValueChange={field.onChange} value={field.value || ''}><FormControl><SelectTrigger className="bg-background border-slate-200"><SelectValue placeholder="Choisir une spécialité..." /></SelectTrigger></FormControl><SelectContent>{coachSpecialties.map(spec => <SelectItem key={spec} value={spec}>{spec}</SelectItem>)}</SelectContent></Select></FormItem>
                      )} />
                      <FormField control={form.control} name="professionalId" render={({ field }) => (
                        <FormItem><FormLabel className="font-bold text-xs uppercase text-muted-foreground">ID Professionnel</FormLabel><FormControl><Input {...field} readOnly disabled className="bg-background border-slate-200 cursor-not-allowed opacity-70 font-mono text-xs" /></FormControl></FormItem>
                      )} />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <FormField control={form.control} name="entryDate" render={({ field }) => <DateField label="Date d'entrée" field={field} />} />
                      <FormField control={form.control} name="exitDate" render={({ field }) => <DateField label="Date de sortie" field={field} />} />
                  </div>
              </div>
          </div>

          <div className="space-y-8">
              <div className="space-y-6">
                  <h3 className="text-lg font-black uppercase tracking-tighter flex items-center gap-3 text-primary"><User className="h-6 w-6" />État Civil & Contact</h3>
                  <FormField control={form.control} name="name" render={({ field }) => (
                    <FormItem><FormLabel className="font-bold text-xs uppercase text-muted-foreground">Nom complet</FormLabel><FormControl><Input {...field} className="bg-background border-slate-200" /></FormControl><FormMessage /></FormItem>
                  )} />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <FormField control={form.control} name="nationality" render={({ field }) => (
                          <FormItem><FormLabel className="font-bold text-xs uppercase text-muted-foreground">Nationalité</FormLabel><Select onValueChange={field.onChange} value={field.value || ''}><FormControl><SelectTrigger className="bg-background border-slate-200"><SelectValue /></SelectTrigger></FormControl><SelectContent>{["Marocaine", "Autre"].map(nat => <SelectItem key={nat} value={nat}>{nat}</SelectItem>)}</SelectContent></Select></FormItem>
                      )} />
                      <FormField control={form.control} name="cin" render={({ field }) => (
                          <FormItem><FormLabel className="font-bold text-xs uppercase text-muted-foreground">N° CIN / ID</FormLabel><FormControl><Input {...field} className="bg-background border-slate-200" /></FormControl></FormItem>
                      )} />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <FormField control={form.control} name="email" render={({ field }) => (
                        <FormItem><FormLabel className="font-bold text-xs uppercase text-muted-foreground">Email professionnel</FormLabel><FormControl><Input type="email" {...field} className="bg-background border-slate-200" /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={form.control} name="phone" render={({ field }) => (
                        <FormItem><FormLabel className="font-bold text-xs uppercase text-muted-foreground">Téléphone mobile</FormLabel><FormControl><Input type="tel" {...field} className="bg-background border-slate-200" /></FormControl><FormMessage /></FormItem>
                      )} />
                  </div>
                  <FormField control={form.control} name="address" render={({ field }) => (
                    <FormItem><FormLabel className="font-bold text-xs uppercase text-muted-foreground">Adresse de résidence</FormLabel><FormControl><Textarea {...field} className="min-h-[80px] bg-background border-slate-200" /></FormControl></FormItem>
                  )} />
              </div>

              <div className="space-y-4">
                  <div className="flex items-center justify-between">
                      <h3 className="text-lg font-black uppercase tracking-tighter flex items-center gap-3 text-slate-700"><FileText className="h-6 w-6 text-primary" />Documents Numérisés</h3>
                      <Button type="button" variant="outline" size="sm" onClick={() => append({ name: "", url: "", validityDate: "" })} className="h-9 font-black uppercase tracking-widest text-[9px] bg-background border-slate-200"><PlusCircle className="h-4 w-4 mr-2 text-primary" />Ajouter</Button>
                  </div>
                  <div className="space-y-3">
                    {fields.map((field, index) => (
                        <DocumentPickerItem key={field.id} index={index} remove={remove} form={form} />
                    ))}
                    {fields.length === 0 && <p className="text-center py-8 text-muted-foreground italic text-xs">Aucun document ajouté.</p>}
                  </div>
              </div>

              <Button type="submit" disabled={loading} className="w-full !mt-12 font-black uppercase h-16 shadow-2xl active:scale-[0.98] transition-all text-lg tracking-[0.2em] bg-primary hover:bg-primary/90 text-white rounded-xl">
              {loading ? <Loader2 className="mr-3 h-6 w-6 animate-spin" /> : isEditMode ? "Enregistrer" : "Ajouter l'entraîneur"}
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
                    <FormItem><FormLabel className="font-bold text-[10px] uppercase text-slate-500">Désignation</FormLabel><FormControl><Input placeholder="Ex: Diplôme, CIN..." {...field} className="h-9 bg-background border-slate-200" /></FormControl></FormItem>
                )} />
                <FormField control={form.control} name={`documents.${index}.validityDate`} render={({ field }) => <DateField label="Expiration" field={field} />} />
            </div>
            <div className="space-y-1.5">
                <div className="flex gap-2">
                    <Button type="button" variant="outline" className={cn("flex-1 h-9 font-black uppercase tracking-widest text-[10px]", url ? "border-green-500 text-green-600 bg-green-50" : "border-dashed bg-background border-slate-200")} onClick={() => fileRef.current?.click()} disabled={loading}>
                        {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : url ? <><ShieldCheck className="mr-2 h-3.5 w-3.5" />Chargé</> : <><Upload className="mr-2 h-3.5 w-3.5 text-primary" />Choisir fichier</>}
                    </Button>
                    {url && (
                        <Dialog>
                            <DialogTrigger asChild>
                                <Button type="button" variant="secondary" size="icon" className="h-9 w-9 bg-slate-100 hover:bg-slate-200" title="Voir">
                                    <Eye className="h-4 w-4 text-slate-700" />
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-3xl">
                                <DialogHeader>
                                    <DialogTitle>Aperçu du document</DialogTitle>
                                </DialogHeader>
                                <div className="mt-4 flex justify-center bg-slate-50 rounded-xl overflow-hidden border">
                                    <img src={url} alt="Document" className="max-w-full h-auto max-h-[70vh] object-contain" />
                                </div>
                            </DialogContent>
                        </Dialog>
                    )}
                </div>
                <input type="file" ref={fileRef} className="hidden" accept="image/*" onChange={(e) => {
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