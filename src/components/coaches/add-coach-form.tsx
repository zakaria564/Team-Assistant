"use client";

import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { CardContent } from "@/components/ui/card";
import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { Loader2, Camera, RefreshCcw, Fingerprint, Upload, Calendar as CalendarIcon, FileText, Trash2, PlusCircle, Link as LinkIcon, ShieldCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { db, auth } from "@/lib/firebase";
import { collection, addDoc, doc, updateDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "../ui/separator";
import { useAuthState } from "react-firebase-hooks/auth";
import { format } from "date-fns";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Textarea } from "../ui/textarea";
import { cn } from "@/lib/utils";

const coachStatuses = ["Actif", "Inactif"] as const;

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

const DateField = ({ label, field }: { label: string, field: any }) => (
    <FormItem className="flex flex-col">
        <FormLabel>{label}</FormLabel>
        <div className="flex gap-2">
            <FormControl>
                <Input placeholder="AAAA-MM-DD" {...field} value={field.value || ""} className="flex-1" />
            </FormControl>
            <Popover>
                <PopoverTrigger asChild>
                    <Button variant="outline" size="icon" className="shrink-0 h-10 w-10"><CalendarIcon className="h-4 w-4" /></Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                    <Calendar
                        mode="single"
                        selected={field.value ? new Date(field.value) : undefined}
                        onSelect={(date) => date && field.onChange(format(date, "yyyy-MM-dd"))}
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
    <CardContent>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="grid grid-cols-1 md:grid-cols-2 gap-12">
          <div className="space-y-6">
              <div className="space-y-4">
                  <div className="aspect-square bg-slate-100 rounded-xl border-2 border-slate-200 flex items-center justify-center relative overflow-hidden shadow-inner">
                       {!form.watch('photoUrl') && hasCameraPermission ? <video ref={videoRef} className="w-full h-full object-cover" autoPlay muted playsInline />
                      : form.watch('photoUrl') ? <img src={form.watch('photoUrl')} className="w-full h-full object-contain p-1" />
                      : <p className="text-muted-foreground p-4 text-center">Caméra non disponible.</p>}
                  </div>
                  <canvas ref={canvasRef} className="hidden" />
                  <div className="grid grid-cols-2 gap-2">
                      <Button type="button" variant="outline" onClick={takePicture} disabled={!hasCameraPermission || !!form.watch('photoUrl')} className="h-10 text-xs" size="sm">Prendre</Button>
                      <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={!!form.watch('photoUrl')} className="h-10 text-xs" size="sm">Galerie</Button>
                      <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileUpload} />
                      {form.watch('photoUrl') && <Button type="button" variant="secondary" onClick={() => form.setValue('photoUrl', '')} className="h-10 col-span-2 text-xs" size="sm">Changer</Button>}
                  </div>
              </div>
              <Separator />
              <div className="space-y-4">
                  <h3 className="text-lg font-bold flex items-center gap-2 uppercase tracking-tighter"><Fingerprint className="h-5 w-5 text-primary" />Infos Club</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FormField control={form.control} name="category" render={({ field }) => (
                        <FormItem><FormLabel>Catégorie</FormLabel><Select onValueChange={field.onChange} value={field.value || ''}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent>{["Seniors", "U19", "U17", "U15", "U13", "U11", "U9"].map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}</SelectContent></Select></FormItem>
                      )} />
                      <FormField control={form.control} name="status" render={({ field }) => (
                        <FormItem><FormLabel>Statut</FormLabel><Select onValueChange={field.onChange} value={field.value || ''}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent>{coachStatuses.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></FormItem>
                      )} />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FormField control={form.control} name="entryDate" render={({ field }) => <DateField label="Date d'entrée" field={field} />} />
                      <FormField control={form.control} name="exitDate" render={({ field }) => <DateField label="Date de sortie" field={field} />} />
                  </div>
              </div>
          </div>
          <div className="space-y-6">
              <div className="space-y-4">
                  <h3 className="text-lg font-bold uppercase tracking-tighter">État Civil & Contact</h3>
                  <FormField control={form.control} name="name" render={({ field }) => (
                    <FormItem><FormLabel>Nom complet</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FormField control={form.control} name="nationality" render={({ field }) => (
                          <FormItem><FormLabel>Nationalité</FormLabel><Select onValueChange={field.onChange} value={field.value || ''}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent>{["Marocaine", "Autre"].map(nat => <SelectItem key={nat} value={nat}>{nat}</SelectItem>)}</SelectContent></Select></FormItem>
                      )} />
                      <FormField control={form.control} name="cin" render={({ field }) => (
                          <FormItem><FormLabel>N° CIN</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                      )} />
                  </div>
                   <FormField control={form.control} name="email" render={({ field }) => (
                      <FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                   <FormField control={form.control} name="phone" render={({ field }) => (
                      <FormItem><FormLabel>Téléphone</FormLabel><FormControl><Input type="tel" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="address" render={({ field }) => (
                    <FormItem><FormLabel>Adresse</FormLabel><FormControl><Textarea {...field} /></FormControl></FormItem>
                  )} />
              </div>
              <Separator />
              <div className="space-y-4">
                  <div className="flex items-center justify-between">
                      <h3 className="text-lg font-bold uppercase tracking-tighter flex items-center gap-2"><FileText className="h-5 w-5" />Documents</h3>
                      <Button type="button" variant="outline" size="sm" onClick={() => append({ name: "", url: "", validityDate: "" })}><PlusCircle className="h-4 w-4 mr-2" />Ajouter</Button>
                  </div>
                  {fields.map((field, index) => (
                      <DocumentPickerItem key={field.id} index={index} remove={remove} form={form} />
                  ))}
              </div>
              <Button type="submit" disabled={loading} className="w-full !mt-12 font-black uppercase h-14 shadow-lg active:scale-95 transition-transform">
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : isEditMode ? "Enregistrer" : "Ajouter l'entraîneur"}
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
        <div className="p-4 border rounded-lg bg-slate-50 space-y-3 relative group">
            <Button type="button" variant="ghost" size="icon" className="absolute top-2 right-2 text-destructive opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => remove(index)}><Trash2 className="h-4 w-4" /></Button>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField control={form.control} name={`documents.${index}.name`} render={({ field }) => (
                    <FormItem><FormLabel>Nom</FormLabel><FormControl><Input placeholder="Ex: Licence" {...field} /></FormControl></FormItem>
                )} />
                <FormField control={form.control} name={`documents.${index}.validityDate`} render={({ field }) => <DateField label="Expiration" field={field} />} />
            </div>
            <div className="space-y-2">
                <FormLabel>Fichier (Galerie/PDF)</FormLabel>
                <div className="flex gap-2">
                    <Button type="button" variant="outline" className={cn("flex-1 h-10 font-bold", url ? "border-green-500 text-green-600 bg-green-50" : "border-dashed")} onClick={() => fileRef.current?.click()} disabled={loading}>
                        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : url ? <><ShieldCheck className="mr-2 h-4 w-4" />Chargé</> : <><Upload className="mr-2 h-4 w-4" />Choisir fichier</>}
                    </Button>
                    {url && <Button type="button" variant="secondary" size="icon" asChild><a href={url} target="_blank" rel="noopener noreferrer"><LinkIcon className="h-4 w-4" /></a></Button>}
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
