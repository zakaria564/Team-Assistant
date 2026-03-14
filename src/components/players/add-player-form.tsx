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
import { collection, addDoc, doc, updateDoc, getDocs, query, where } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { Textarea } from "../ui/textarea";
import { Separator } from "../ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuthState } from "react-firebase-hooks/auth";
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

const nationalities = [
    "Française", "Algérienne", "Marocaine", "Tunisienne", "Sénégalaise", "Ivoirienne", "Camerounaise", "Nigériane", "Ghanéenne", "Égyptienne", "Portugaise", "Espagnole", "Italienne", "Belge", "Allemande", "Néerlandaise", "Brésilienne", "Argentine", "Suisse", "Autre", "Angolaise", "Béninoise", "Botswanaise", "Burkinabée", "Burundaise", "Cap-verdienne", "Centrafricaine", "Comorienne", "Congolaise (Brazzaville)", "Congolaise (Kinshasa)", "Djiboutienne", "Érythréenne", "Éthiopienne", "Gabonaise", "Gambienne", "Guinéenne", "Guinéenne-Bissau", "Équato-guinéenne", "Kényane", "Libérienne", "Libyenne", "Malawite", "Malienne", "Mauritanienne", "Mozambicaine", "Namibienne", "Nigérienne", "Ougandaise", "Rwandaise", "Sierra-léonaise", "Somalienne", "Soudanaise", "Tanzanienne", "Tchadienne", "Togolaise", "Zambienne", "Zimbabwéenne", "Américaine (USA)", "Canadienne", "Mexicaine", "Colombienne", "Vénézuélienne", "Péruvienne", "Chilienne", "Uruguayenne", "Paraguayenne", "Bolivienne", "Équatorienne", "Britannique", "Irlandaise", "Suédoise", "Norvégienne", "Danoise", "Finlandaise", "Polonaise", "Tchèque", "Slovaque", "Hongroise", "Roumaine", "Bulgare", "Grecque", "Turque"
];

const documentTypes = [
    "Certificat Médical", "Carte d'identité", "Passeport", "Extrait de naissance", "Justificatif de domicile",
    "Photo d'identité", "Autorisation parentale", "Certificat de surclassement", "Autre"
];

const generateProfessionalId = () => {
    const yearMonth = format(new Date(), "yyyyMM");
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `PL-${yearMonth}-${random}`;
};

export function AddPlayerForm({ player }: AddPlayerFormProps) {
  const [user] = useAuthState(auth);
  const [loading, setLoading] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const { toast } = useToast();
  const router = useRouter();
  const isEditMode = !!player;

  const defaultValues = useMemo(() => {
    if (!player) return {
        name: "", photoUrl: "", gender: "Masculin" as const, category: "", status: "Actif" as const,
        number: "", birthDate: "", entryDate: "", exitDate: "", address: "", nationality: "",
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
        nationality: player.nationality || "",
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
  const { fields, append, remove } = useFieldArray({ control: form.control, name: "documents" });

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
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FormField control={form.control} name="category" render={({ field }) => (
                          <FormItem><FormLabel>Catégorie</FormLabel><Select onValueChange={field.onChange} value={field.value || ''}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent>{playerCategories.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>
                      )} />
                      <FormField control={form.control} name="position" render={({ field }) => (
                          <FormItem><FormLabel>Poste</FormLabel><Select onValueChange={field.onChange} value={field.value || ''}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent>{footballPositions.map(pos => <SelectItem key={pos} value={pos}>{pos}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>
                      )} />
                  </div>
                   <FormField control={form.control} name="coachId" render={({ field }) => (
                      <FormItem><FormLabel>Entraîneur</FormLabel><Select onValueChange={field.onChange} value={field.value || ''}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="none">Aucun</SelectItem>{coaches.map(coach => <SelectItem key={coach.id} value={coach.id}>{coach.name}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>
                  )} />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FormField control={form.control} name="number" render={({ field }) => (
                          <FormItem><FormLabel>Numéro</FormLabel><FormControl><Input type="number" {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={form.control} name="status" render={({ field }) => (
                          <FormItem><FormLabel>Statut</FormLabel><Select onValueChange={field.onChange} value={field.value || ''}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent>{playerStatuses.map(status => <SelectItem key={status} value={status}>{status}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>
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
                      <FormField control={form.control} name="birthDate" render={({ field }) => (
                        <FormItem><FormLabel>Date de naissance</FormLabel><FormControl><Input type="date" {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>
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
                        <FormItem><FormLabel>N° CIN</FormLabel><FormControl><Input {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>
                      )} />
                    </div>
                   <FormField control={form.control} name="address" render={({ field }) => (
                    <FormItem><FormLabel>Adresse</FormLabel><FormControl><Textarea {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FormField control={form.control} name="phone" render={({ field }) => (
                        <FormItem><FormLabel>Téléphone</FormLabel><FormControl><Input type="tel" {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={form.control} name="email" render={({ field }) => (
                        <FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>
                      )} />
                    </div>
              </div>
              <Separator />
              <div className="space-y-4">
                  <h3 className="text-lg font-medium">Informations du Tuteur</h3>
                   <FormField control={form.control} name="tutorName" render={({ field }) => (
                    <FormItem><FormLabel>Nom du tuteur</FormLabel><FormControl><Input {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="tutorCin" render={({ field }) => (
                    <FormItem><FormLabel>N° CIN du tuteur</FormLabel><FormControl><Input {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FormField control={form.control} name="tutorPhone" render={({ field }) => (
                        <FormItem><FormLabel>Téléphone tuteur</FormLabel><FormControl><Input type="tel" {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={form.control} name="tutorEmail" render={({ field }) => (
                        <FormItem><FormLabel>Email tuteur</FormLabel><FormControl><Input type="email" {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>
                      )} />
                  </div>
              </div>
              <Separator />
               <div className="space-y-4">
                  <h3 className="text-lg font-medium">Documents du Joueur</h3>
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
              <Button type="submit" disabled={loading} className="w-full !mt-8">
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : isEditMode ? "Enregistrer" : "Ajouter"}
              </Button>
          </div>
        </form>
      </Form>
    </CardContent>
  );
}