
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { Loader2, Calendar as CalendarIcon, Trophy, MapPin } from "lucide-react";
import { useRouter } from "next/navigation";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { collection, addDoc, doc, updateDoc, getDoc, getDocs, query, where } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { useAuthState } from "react-firebase-hooks/auth";

const eventTypes = ["Match de Championnat", "Match Amical", "Match de Coupe", "Tournoi", "Entraînement", "Stage", "Détection", "Réunion", "Événement Spécial"] as const;
const eventStatuses = ["Prévu", "En cours", "Terminé", "Annulé", "Reporté"] as const;

const playerCategories = [
    "Seniors", "Seniors F", "U19", "U19 F", "U18", "U18 F", "U17", "U17 F", "U16", "U16 F", 
    "U15", "U15 F", "U14", "U14 F", "U13", "U13 F", "U12", "U12 F", "U11", "U11 F", 
    "U10", "U10 F", "U9", "U9 F", "U8", "U8 F", "U7", "U7 F", "U6", "U6 F", "Vétérans"
];

const formSchema = z.object({
  type: z.enum(eventTypes, { required_error: "Le type est requis." }),
  category: z.string({ required_error: "La catégorie est requise." }),
  status: z.enum(eventStatuses).default("Prévu"),
  date: z.string({ required_error: "La date est requise." }),
  time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Format HH:mm."),
  location: z.string().optional(),
  teamHome: z.string().optional(),
  teamAway: z.string().optional(),
});

export function AddEventForm({ event }: { event?: any }) {
    const [user] = useAuthState(auth);
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [opponents, setOpponents] = useState<string[]>([]);
    const [clubName, setClubName] = useState("Votre Club");
    const router = useRouter();
    const isEditMode = !!event;

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: { 
            type: "Entraînement", 
            category: "", 
            status: "Prévu", 
            date: "", 
            time: "", 
            location: "", 
            teamHome: "", 
            teamAway: "" 
        }
    });

    const watchType = form.watch("type");
    const isMatch = watchType.includes("Match") || watchType.includes("Tournoi");

    useEffect(() => {
        const fetchInitial = async () => {
            if (!user) return;
            try {
                const clubDoc = await getDoc(doc(db, "clubs", user.uid));
                const opponentsSnap = await getDocs(query(collection(db, "opponents"), where("userId", "==", user.uid)));
                if (clubDoc.exists()) setClubName(clubDoc.data().clubName || "Votre Club");
                setOpponents(opponentsSnap.docs.map(d => d.data().name as string).sort());
            } catch (error) { console.error(error); }
        };
        fetchInitial();
    }, [user]);

    useEffect(() => {
        if(isEditMode && event) {
            form.reset({
                type: event.type, 
                category: event.category, 
                status: event.status || "Prévu",
                date: event.date ? format(new Date(event.date), "yyyy-MM-dd") : "",
                time: event.date ? format(new Date(event.date), "HH:mm") : "",
                location: event.location || "", 
                teamHome: event.teamHome || "", 
                teamAway: event.teamAway || "",
            });
        }
    }, [event, isEditMode, form]);

    const onSubmit = async (values: z.infer<typeof formSchema>) => {
        if (!user) return;
        setLoading(true);
        try {
            const [h, m] = values.time.split(':').map(Number);
            const combinedDate = new Date(values.date); 
            combinedDate.setHours(h, m, 0, 0);
            
            const data: any = { 
                userId: user.uid, 
                type: values.type, 
                date: combinedDate, 
                category: values.category, 
                status: values.status, 
                location: values.location || null 
            };

            if (isMatch) { 
                data.teamHome = values.teamHome || null; 
                data.teamAway = values.teamAway || null; 
            }

            if(isEditMode) await updateDoc(doc(db, "events", event.id), data);
            else await addDoc(collection(db, "events"), data);
            
            toast({ title: "Événement enregistré avec succès !" }); 
            router.push("/dashboard/events"); 
            router.refresh();
        } catch (error) { 
            toast({ variant: "destructive", title: "Erreur lors de l'enregistrement" }); 
        } finally { setLoading(false); }
    }
    
    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 max-w-2xl mx-auto">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <FormField control={form.control} name="type" render={({ field }) => (
                        <FormItem>
                            <FormLabel className="font-bold text-xs uppercase text-muted-foreground">Nature de l'événement</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                    <SelectTrigger className="bg-background border-slate-200 h-11">
                                        <SelectValue />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    {eventTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </FormItem>
                    )} />
                    <FormField control={form.control} name="status" render={({ field }) => (
                        <FormItem>
                            <FormLabel className="font-bold text-xs uppercase text-muted-foreground">Statut actuel</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                    <SelectTrigger className="bg-background border-slate-200 h-11">
                                        <SelectValue />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    {eventStatuses.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </FormItem>
                    )} />
                </div>

                {isMatch && (
                    <div className="p-6 border-2 border-primary/10 rounded-2xl bg-primary/5 space-y-6 shadow-inner">
                        <h3 className="font-black text-primary uppercase text-[10px] tracking-widest flex items-center gap-2">
                            <Trophy className="h-4 w-4" /> Détails de la rencontre
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <FormField control={form.control} name="teamHome" render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="font-bold text-[10px] uppercase text-slate-500">Équipe Domicile</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value || ''}>
                                        <FormControl>
                                            <SelectTrigger className="bg-background border-slate-200 h-11 font-bold">
                                                <SelectValue placeholder="Choisir..." />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value={clubName}>{clubName} (Mon Club)</SelectItem>
                                            {opponents.map(opp => <SelectItem key={opp} value={opp}>{opp}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </FormItem>
                            )} />
                            <FormField control={form.control} name="teamAway" render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="font-bold text-[10px] uppercase text-slate-500">Équipe Extérieur</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value || ''}>
                                        <FormControl>
                                            <SelectTrigger className="bg-background border-slate-200 h-11 font-bold">
                                                <SelectValue placeholder="Choisir..." />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value={clubName}>{clubName} (Mon Club)</SelectItem>
                                            {opponents.map(opp => <SelectItem key={opp} value={opp}>{opp}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </FormItem>
                            )} />
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <FormField control={form.control} name="category" render={({ field }) => (
                        <FormItem>
                            <FormLabel className="font-bold text-xs uppercase text-muted-foreground">Catégorie concernée</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                    <SelectTrigger className="bg-background border-slate-200 h-11">
                                        <SelectValue placeholder="Sélectionner un groupe..." />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    {playerCategories.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </FormItem>
                    )} />
                    <FormField control={form.control} name="location" render={({ field }) => (
                        <FormItem>
                            <FormLabel className="font-bold text-xs uppercase text-muted-foreground">Lieu / Stade</FormLabel>
                            <FormControl>
                                <div className="relative">
                                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input {...field} placeholder="Ex: Stade Municipal" className="pl-10 bg-background border-slate-200 h-11" />
                                </div>
                            </FormControl>
                        </FormItem>
                    )} />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <FormField control={form.control} name="date" render={({ field }) => (
                        <FormItem className="flex flex-col">
                            <FormLabel className="font-bold text-xs uppercase text-muted-foreground">Date</FormLabel>
                            <div className="flex gap-2">
                                <FormControl>
                                    <Input type="date" {...field} className="flex-1 bg-background border-slate-200 h-11" />
                                </FormControl>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button variant="outline" size="icon" className="h-11 w-11 bg-background border-slate-200">
                                            <CalendarIcon className="h-4 w-4 text-primary" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="end">
                                        <Calendar 
                                            mode="single" 
                                            selected={field.value ? new Date(field.value) : undefined} 
                                            onSelect={(d) => d && field.onChange(format(d, "yyyy-MM-dd"))} 
                                            initialFocus 
                                        />
                                    </PopoverContent>
                                </Popover>
                            </div>
                        </FormItem>
                    )} />
                    <FormField control={form.control} name="time" render={({ field }) => (
                        <FormItem>
                            <FormLabel className="font-bold text-xs uppercase text-muted-foreground">Heure du coup d'envoi</FormLabel>
                            <FormControl>
                                <Input type="time" {...field} className="bg-background border-slate-200 h-11" />
                            </FormControl>
                        </FormItem>
                    )} />
                </div>

                <Button type="submit" disabled={loading} className="w-full h-14 font-black uppercase tracking-[0.2em] text-lg shadow-xl !mt-10">
                    {loading ? <Loader2 className="mr-2 h-6 w-6 animate-spin" /> : isEditMode ? "Enregistrer les modifications" : "Créer l'événement"}
                </Button>
            </form>
        </Form>
    );
}
