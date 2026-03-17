"use client";

import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { CardContent } from "@/components/ui/card";
import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { Loader2, Camera, RefreshCcw, Fingerprint, Upload, Calendar as CalendarIcon, FileText, Trash2, PlusCircle } from "lucide-react";
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

const coachStatuses = ["Actif", "Inactif"] as const;

const documentSchema = z.object({
  name: z.string().min(1, "Nom requis"),
  url: z.string().url("URL invalide"),
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

interface CoachData extends z.infer<typeof formSchema> {
    id: string;
}

interface AddCoachFormProps {
    coach?: CoachData;
}

const coachCategories = [
    "Seniors", "Seniors F", "U19", "U19 F", "U18", "U18 F", "U17", "U17 F", "U16", "U16 F", 
    "U15", "U15 F", "U14", "U14 F", "U13", "U13 F", "U12", "U12 F", "U11", "U11 F", 
    "U10", "U10 F", "U9", "U9 F", "U8", "U8 F", "U7", "U7 F", "Vétérans"
];

const nationalities = ["Marocaine", "Française", "Algérienne", "Tunisienne", "Autre"];

const generateProfessionalId = () => {
    const yearMonth = format(new Date(), "yyyyMM");
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `CH-${yearMonth}-${random}`;
};

const DateField = ({ label, field }: { label: string, field: any }) => {
    return (
        <FormItem className="flex flex-col">
            <FormLabel>{label}</FormLabel>
            <div className="flex gap-2">
                <FormControl>
                    <Input 
                        type="date" 
                        {...field} 
                        value={field.value || ""}
                        onChange={(e) => field.onChange(e.target.value)}
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
                            onSelect={(date) => date && field.onChange(format(date, "yyyy-MM-dd"))}
                            initialFocus
                        />
                    </PopoverContent>
                </Popover>
            </div>
            <FormMessage />
        </FormItem>
    );
};

export function AddCoachForm({ coach }: AddCoachFormProps) {
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
    return {
        ...coach,
        status: (coach.status as typeof coachStatuses[number]) || "Actif",
        documents: coach.documents || [],
    };
  }, [coach]);

  const form = useForm<z.infer<typeof formSchema>>({ resolver: zodResolver(formSchema), defaultValues });
  const { fields, append, remove } = useFieldArray({ control: form.control, name: "documents" });

  useEffect(() => { if (coach) form.reset(defaultValues); }, [coach, defaultValues, form]);

  const photoDataUrl = form.watch('photoUrl');

  const compressImage = (file: File, maxSize: number = 400): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader(); reader.readAsDataURL(file);
      reader.onload = (e) => {
        const img = new Image(); img.src = e.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let w = img.width; let h = img.height;
          if (w > h) { if (w > maxSize) { h *= maxSize / w; w = maxSize; } } 
          else { if (h > maxSize) { w *= maxSize / h; h = maxSize; } }
          canvas.width = w; canvas.height = h;
          const ctx = canvas.getContext('2d'); ctx?.drawImage(img, 0, 0, w, h);
          resolve(canvas.toDataURL('image/jpeg', 0.7));
        };
      };
      reader.onerror = reject;
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    setLoading(true);
    try { const comp = await compressImage(file); form.setValue('photoUrl', comp); } 
    catch (err) { toast({ variant: "destructive", title: "Erreur" }); } 
    finally { setLoading(false); }
  };

  const getCameraPermission = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) { setHasCameraPermission(false); return; }
    try {
        const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
        if (videoRef.current) videoRef.current.srcObject = s;
        setHasCameraPermission(true);
    } catch (e) { setHasCameraPermission(false); }
  }, []);

  useEffect(() => { if(!photoDataUrl) getCameraPermission(); }, [photoDataUrl, getCameraPermission]);

  const takePicture = () => {
    if (videoRef.current && canvasRef.current) {
      const v = videoRef.current; const c = canvasRef.current; const ctx = c.getContext('2d');
      if (ctx) {
        c.width = 400; c.height = 400; const vw = v.videoWidth; const vh = v.videoHeight;
        const ar = vw / vh; let sx, sy, sw, sh;
        if (ar > 1) { sh = vh; sw = vh; sx = (vw - vh) / 2; sy = 0; }
        else { sw = vw; sh = vw; sx = 0; sy = (vh - vw) / 2; }
        ctx.drawImage(v, sx, sy, sw, sh, 0, 0, 400, 400);
        form.setValue('photoUrl', c.toDataURL('image/jpeg', 0.8));
        const s = v.srcObject as MediaStream; if (s) s.getTracks().forEach(t => t.stop());
        if(videoRef.current) videoRef.current.srcObject = null;
      }
    }
  };

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!user) return;
    setLoading(true);
    try {
        const data = { ...values, userId: user.uid, professionalId: values.professionalId || generateProfessionalId(), isDeleted: false };
        if (isEditMode && coach) { await updateDoc(doc(db, "coaches", coach.id), data); toast({ title: "Modifié !" }); } 
        else { await addDoc(collection(db, "coaches"), { ...data, createdAt: new Date() }); toast({ title: "Ajouté !" }); }
        router.push("/dashboard/coaches"); router.refresh();
    } catch (e) { toast({ variant: "destructive", title: "Erreur" }); } 
    finally { setLoading(false); }
  }

  return (
    <CardContent>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="grid grid-cols-1 md:grid-cols-2 gap-12">
          <div className="space-y-6">
              <div className="space-y-4">
                  <div className="aspect-square bg-slate-100 rounded-xl border-2 border-slate-200 flex items-center justify-center relative overflow-hidden shadow-inner">
                       {!photoDataUrl && hasCameraPermission ? <video ref={videoRef} className="w-full h-full object-cover" autoPlay muted playsInline />
                      : photoDataUrl ? <img src={photoDataUrl} className="w-full h-full object-contain absolute inset-0 p-1" />
                      : <p className="text-muted-foreground p-4 text-center">Caméra non disponible.</p>}
                  </div>
                  <canvas ref={canvasRef} className="hidden" />
                  <div className="grid grid-cols-2 gap-2">
                      <Button type="button" variant="outline" onClick={takePicture} disabled={!hasCameraPermission || !!photoDataUrl} className="h-10 text-xs" size="sm">Prendre</Button>
                      <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={!!photoDataUrl} className="h-10 text-xs" size="sm">Galerie</Button>
                      <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileUpload} />
                      {photoDataUrl && <Button type="button" variant="secondary" onClick={() => form.setValue('photoUrl', '')} className="h-10 col-span-2 text-xs" size="sm">Changer</Button>}
                  </div>
              </div>
              <Separator />
              <div className="space-y-4">
                  <h3 className="text-lg font-bold flex items-center gap-2 uppercase tracking-tighter"><Fingerprint className="h-5 w-5 text-primary" />Infos Club</h3>
                  {isEditMode && <FormField control={form.control} name="professionalId" render={({ field }) => (
                      <FormItem><FormLabel>ID Professionnel</FormLabel><FormControl><Input {...field} disabled className="bg-muted font-mono font-bold" /></FormControl></FormItem>
                  )} />}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FormField control={form.control} name="category" render={({ field }) => (
                        <FormItem><FormLabel>Catégorie</FormLabel><Select onValueChange={field.onChange} value={field.value || ''}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent>{coachCategories.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}</SelectContent></Select></FormItem>
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
                          <FormItem><FormLabel>Nationalité</FormLabel><Select onValueChange={field.onChange} value={field.value || ''}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent>{nationalities.map(nat => <SelectItem key={nat} value={nat}>{nat}</SelectItem>)}</SelectContent></Select></FormItem>
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
                      <div key={field.id} className="p-4 border rounded-lg bg-slate-50 space-y-3 relative">
                          <Button type="button" variant="ghost" size="icon" className="absolute top-2 right-2 text-destructive" onClick={() => remove(index)}><Trash2 className="h-4 w-4" /></Button>
                          <FormField control={form.control} name={`documents.${index}.name`} render={({ field }) => (
                              <FormItem><FormLabel>Nom du document</FormLabel><FormControl><Input placeholder="Ex: Licence, CIN..." {...field} /></FormControl></FormItem>
                          )} />
                          <FormField control={form.control} name={`documents.${index}.url`} render={({ field }) => (
                              <FormItem><FormLabel>URL du document</FormLabel><FormControl><Input placeholder="Lien vers le fichier..." {...field} /></FormControl></FormItem>
                          )} />
                          <FormField control={form.control} name={`documents.${index}.validityDate`} render={({ field }) => <DateField label="Date de validité" field={field} />} />
                      </div>
                  ))}
              </div>
              <Button type="submit" disabled={loading} className="w-full !mt-12 font-black uppercase h-14 shadow-lg active:scale-95 transition-transform">
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : isEditMode ? "Enregistrer" : "Ajouter"}
              </Button>
          </div>
        </form>
      </Form>
    </CardContent>
  );
}