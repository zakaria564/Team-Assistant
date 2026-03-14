
"use client";

import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { CardContent } from "@/components/ui/card";
import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { Loader2, Camera, RefreshCcw, PlusCircle, Trash2, Fingerprint } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { db, auth } from "@/lib/firebase";
import { collection, addDoc, doc, updateDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "../ui/textarea";
import { Separator } from "../ui/separator";
import { useAuthState } from "react-firebase-hooks/auth";
import { format } from "date-fns";

const coachStatuses = ["Actif", "Inactif"] as const;

const documentSchema = z.object({
  name: z.string().optional(),
  url: z.string().url("Veuillez entrer une URL valide.").optional().or(z.literal('')),
  validityDate: z.string().optional(),
});

const formSchema = z.object({
  name: z.string().min(2, "Le nom doit contenir au moins 2 caractères."),
  photoUrl: z.string().url("URL invalide").optional().or(z.literal('')),
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

const coachSpecialties = [
    "Entraîneur Principal", "Entraîneur Adjoint", "Entraîneur Équipe Féminine", "Entraîneur des Gardiens",
    "Préparateur Physique", "Analyste Vidéo", "Directeur Technique", "Coordinateur des Jeunes", "Responsable École de Foot", "Autre"
];

const nationalities = [
    "Française", "Algérienne", "Marocaine", "Tunisienne", "Sénégalaise", "Ivoirienne", "Camerounaise", "Nigériane", "Ghanéenne", "Égyptienne", "Portugaise", "Espagnole", "Italienne", "Belge", "Allemande", "Néerlandaise", "Brésilienne", "Argentine", "Suisse", "Autre", "Angolaise", "Béninoise", "Botswanaise", "Burkinabée", "Burundaise", "Cap-verdienne", "Centrafricaine", "Comorienne", "Congolaise (Brazzaville)", "Congolaise (Kinshasa)", "Djiboutienne", "Érythréenne", "Éthiopienne", "Gabonaise", "Gambienne", "Guinéenne", "Guinéenne-Bissau", "Équato-guinéenne", "Kényane", "Libérienne", "Libyenne", "Malawite", "Malienne", "Mauritanienne", "Mozambicaine", "Namibienne", "Nigérienne", "Ougandaise", "Rwandaise", "Sierra-léonaise", "Somalienne", "Soudanaise", "Tanzanienne", "Tchadienne", "Togolaise", "Zambienne", "Zimbabwéenne", "Américaine (USA)", "Canadienne", "Mexicaine", "Colombienne", "Vénézuélienne", "Péruvienne", "Chilienne", "Uruguayenne", "Paraguayenne", "Bolivienne", "Équatorienne", "Britannique", "Irlandaise", "Suédoise", "Norvégienne", "Danoise", "Finlandaise", "Polonaise", "Tchèque", "Slovaque", "Hongroise", "Roumaine", "Bulgare", "Grecque", "Turque"
];

const documentTypes = [
    "Diplôme d'entraîneur", "Carte d'identité", "Passeport", "Extrait de naissance", "Justificatif de domicile",
    "Photo d'identité", "Contrat", "Autre"
];

const generateProfessionalId = () => {
    const yearMonth = format(new Date(), "yyyyMM");
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `CH-${yearMonth}-${random}`;
};

export function AddCoachForm({ coach }: AddCoachFormProps) {
  const [user] = useAuthState(auth);
  const [loading, setLoading] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const { toast } = useToast();
  const router = useRouter();
  const isEditMode = !!coach;

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    values: useMemo(() => {
      if (!coach) return {
        name: "", photoUrl: "", category: "", status: "Actif" as const, phone: "", email: "", specialty: "",
        entryDate: "", exitDate: "", nationality: "", cin: "", address: "", documents: [], professionalId: "",
      };
      return {
        ...coach,
        documents: (coach.documents || []).map(doc => ({
            name: doc.name || "",
            url: doc.url || "",
            validityDate: doc.validityDate || "",
        })),
      } as z.infer<typeof formSchema>;
    }, [coach]),
  });

  const photoDataUrl = form.watch('photoUrl');
  const { fields, append, remove } = useFieldArray({ control: form.control, name: "documents" });

  const getCameraPermission = useCallback(async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setHasCameraPermission(false);
        return;
    }
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
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

  const retakePicture = () => { form.setValue('photoUrl', ''); };

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!user) return;
    setLoading(true);
    if (!values.photoUrl) {
        toast({ variant: "destructive", title: "Photo manquante" });
        setLoading(false); return;
    }
    try {
        const dataToSave = {
            ...values,
            userId: user.uid,
            professionalId: values.professionalId || generateProfessionalId(),
            isDeleted: false,
        };
        if (isEditMode && coach) {
            await updateDoc(doc(db, "coaches", coach.id), dataToSave);
            toast({ title: "Entraîneur modifié !" });
        } else {
            await addDoc(collection(db, "coaches"), { ...dataToSave, createdAt: new Date() });
            toast({ title: "Entraîneur ajouté !" });
        }
        router.push("/dashboard/coaches");
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
                  <div className="flex gap-4">
                      <Button type="button" variant="outline" onClick={takePicture} disabled={!hasCameraPermission || !!photoDataUrl} className="w-full" size="sm"><Camera className="mr-2 h-4 w-4"/>Prendre</Button>
                      {photoDataUrl && <Button type="button" variant="secondary" onClick={retakePicture} className="w-full" size="sm"><RefreshCcw className="mr-2 h-4 w-4" />Reprendre</Button>}
                  </div>
                   <FormField control={form.control} name="photoUrl" render={({ field }) => (
                      <FormItem><FormLabel>Ou URL photo</FormLabel><FormControl><Input {...field} value={field.value ?? ""} placeholder="https://..." /></FormControl><FormMessage /></FormItem>
                  )} />
              </div>
              <Separator />
              <div className="space-y-4">
                  <h3 className="text-lg font-medium flex items-center gap-2"><Fingerprint className="h-5 w-5 text-primary" />Informations Club</h3>
                  {isEditMode && (
                      <FormField control={form.control} name="professionalId" render={({ field }) => (
                          <FormItem><FormLabel>ID Professionnel</FormLabel><FormControl><Input {...field} value={field.value ?? ""} disabled className="bg-muted font-mono font-bold" /></FormControl></FormItem>
                      )} />
                  )}
                  <FormField control={form.control} name="specialty" render={({ field }) => (
                      <FormItem><FormLabel>Spécialité</FormLabel><Select onValueChange={field.onChange} value={field.value || ''}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent>{coachSpecialties.map(spec => <SelectItem key={spec} value={spec}>{spec}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>
                  )} />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FormField control={form.control} name="category" render={({ field }) => (
                        <FormItem><FormLabel>Catégorie</FormLabel><Select onValueChange={field.onChange} value={field.value || ''}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent>{coachCategories.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>
                      )} />
                      <FormField control={form.control} name="status" render={({ field }) => (
                        <FormItem><FormLabel>Statut</FormLabel><Select onValueChange={field.onChange} value={field.value || ''}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent>{coachStatuses.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>
                      )} />
                  </div>
                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <FormField control={form.control} name="entryDate" render={({ field }) => (
                          <FormItem><FormLabel>Date d'entrée</FormLabel><FormControl><Input type="date" {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>
                        )} />
                         <FormField control={form.control} name="exitDate" render={({ field }) => (
                          <FormItem><FormLabel>Date de sortie</FormLabel><FormControl><Input type="date" {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>
                        )} />
                  </div>
              </div>
          </div>
          <div className="space-y-6">
              <div className="space-y-4">
                   <h3 className="text-lg font-medium">Informations Personnelles</h3>
                  <FormField control={form.control} name="name" render={({ field }) => (
                    <FormItem><FormLabel>Nom complet</FormLabel><FormControl><Input {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FormField control={form.control} name="nationality" render={({ field }) => (
                          <FormItem><FormLabel>Nationalité</FormLabel><Select onValueChange={field.onChange} value={field.value || ''}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent>{nationalities.map(nat => <SelectItem key={nat} value={nat}>{nat}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>
                      )} />
                      <FormField control={form.control} name="cin" render={({ field }) => (
                          <FormItem><FormLabel>N° CIN</FormLabel><FormControl><Input {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>
                      )} />
                  </div>
                   <FormField control={form.control} name="address" render={({ field }) => (
                    <FormItem><FormLabel>Adresse</FormLabel><FormControl><Textarea {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>
                  )} />
                   <FormField control={form.control} name="email" render={({ field }) => (
                      <FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>
                  )} />
                   <FormField control={form.control} name="phone" render={({ field }) => (
                      <FormItem><FormLabel>Téléphone</FormLabel><FormControl><Input type="tel" {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>
                  )} />
              </div>
              <Separator />
               <div className="space-y-4">
                  <h3 className="text-lg font-medium">Documents</h3>
                  {fields.map((field, index) => (
                    <div key={field.id} className="p-4 border border-primary/20 rounded-md space-y-4 relative bg-primary/5">
                        <Button type="button" variant="ghost" size="icon" className="absolute top-2 right-2 h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => remove(index)}><Trash2 className="h-4 w-4" /></Button>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                         <FormField control={form.control} name={`documents.${index}.name`} render={({ field }) => (
                            <FormItem><FormLabel>Type document</FormLabel><Select onValueChange={field.onChange} value={field.value || ''}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent>{documentTypes.map(docType => <SelectItem key={docType} value={docType}>{docType}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>
                          )} />
                        <FormField control={form.control} name={`documents.${index}.validityDate`} render={({ field }) => (
                            <FormItem><FormLabel>Expiration</FormLabel><FormControl><Input type="date" {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>
                        )} />
                      </div>
                       <FormField control={form.control} name={`documents.${index}.url`} render={({ field }) => (
                          <FormItem><FormLabel>URL document</FormLabel><FormControl><Input type="text" {...field} value={field.value ?? ""} placeholder="https://..." /></FormControl><FormMessage /></FormItem>
                        )} />
                    </div>
                  ))}
                  <Button type="button" variant="outline" size="sm" onClick={() => append({ name: '', url: '', validityDate: '' })}><PlusCircle className="mr-2 h-4 w-4" /> Ajouter document</Button>
              </div>
              <Button type="submit" disabled={loading} className="w-full !mt-12">
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : isEditMode ? "Enregistrer" : "Ajouter"}
              </Button>
          </div>
        </form>
      </Form>
    </CardContent>
  );
}
