
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
import { Loader2, CalendarIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { collection, addDoc, doc, updateDoc, getDoc, getDocs, query, where } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { useAuthState } from "react-firebase-hooks/auth";

const eventTypes = [
    "Match de Championnat", "Match Amical", "Match de Coupe", "Tournoi", "Entraînement", "Stage", "Détection", "Réunion", "Événement Spécial"
] as const;

const eventStatuses = ["Prévu", "En cours", "Terminé", "Annulé", "Reporté"] as const;

const formSchema = z.object({
  type: z.enum(eventTypes, { required_error: "Le type d'événement est requis." }),
  category: z.string({ required_error: "La catégorie est requise." }),
  status: z.enum(eventStatuses).default("Prévu"),
  date: z.date({ required_error: "La date est requise."}).optional(),
  time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Format d'heure invalide (HH:mm)."),
  location: z.string().optional(),
  teamHome: z.string().optional(),
  teamAway: z.string().optional(),
}).refine(data => {
    const isMatch = data.type.includes("Match") || data.type.includes("Tournoi");
    if (isMatch) {
        return !!data.teamHome && data.teamHome.length > 1 && !!data.teamAway && data.teamAway.length > 1;
    }
    return true;
}, {
    message: "Les deux équipes sont requises pour un match.",
    path: ["teamHome"],
});

const playerCategories = [
    "Seniors", "Seniors F", "U19", "U19 F", "U18", "U18 F", "U17", "U17 F", "U16", "U16 F", 
    "U15", "U15 F", "U14", "U14 F", "U13", "U13 F", "U12", "U12 F", "U11", "U11 F", 
    "U10", "U10 F", "U9", "U9 F", "U8", "U8 F", "U7", "U7 F", "Vétérans"
];

interface EventData {
  id: string;
  type: typeof eventTypes[number];
  category: string;
  status: typeof eventStatuses[number];
  date: Date;
  location?: string;
  teamHome?: string;
  teamAway?: string;
}

interface AddEventFormProps {
    event?: EventData;
}

export function AddEventForm({ event }: AddEventFormProps) {
    const [user] = useAuthState(auth);
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [opponents, setOpponents] = useState<string[]>([]);
    const [clubName, setClubName] = useState("Votre Club");
    const [availableTeams, setAvailableTeams] = useState<string[]>([]);
    const router = useRouter();
    const isEditMode = !!event;

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            type: undefined,
            category: "",
            status: "Prévu",
            date: undefined,
            time: "",
            location: "",
            teamHome: "",
            teamAway: "",
        }
    });

    const selectedCategory = form.watch("category");
    const teamHome = form.watch("teamHome");
    const teamAway = form.watch("teamAway");
    const eventType = form.watch("type");
    const eventTypeIsMatch = eventType?.includes("Match") || eventType?.includes("Tournoi");

    useEffect(() => {
        const fetchInitialData = async () => {
            if (!user) return;
            try {
                const clubDocRef = doc(db, "clubs", user.uid);
                const opponentsQuery = query(collection(db, "opponents"), where("userId", "==", user.uid));
                const [clubDoc, opponentsSnapshot] = await Promise.all([getDoc(clubDocRef), getDocs(opponentsQuery)]);
                
                let currentClub = "Votre Club";
                if (clubDoc.exists() && clubDoc.data().clubName) {
                    currentClub = clubDoc.data().clubName;
                    setClubName(currentClub);
                }

                const opponentsData = opponentsSnapshot.docs.map(doc => doc.data().name as string);
                setOpponents(opponentsData.sort());

                // Pré-sélection intelligente de l'équipe à domicile
                if (!isEditMode && eventTypeIsMatch && !form.getValues("teamHome")) {
                    form.setValue("teamHome", currentClub);
                }

            } catch (error) {
                console.error("Error fetching initial data: ", error);
            }
        };
        fetchInitialData();
    }, [user, eventTypeIsMatch, isEditMode, form]);

    useEffect(() => {
        setAvailableTeams([clubName, ...opponents].sort());
    }, [clubName, opponents]);

    useEffect(() => {
        if(isEditMode && event) {
            form.reset({
                type: event.type,
                category: event.category,
                status: event.status || "Prévu",
                date: event.date ? new Date(event.date) : undefined,
                time: event.date ? format(new Date(event.date), "HH:mm") : "",
                location: event.location || "",
                teamHome: event.teamHome || "",
                teamAway: event.teamAway || "",
            });
        }
    }, [event, isEditMode, form]);

    const onSubmit = async (values: z.infer<typeof formSchema>) => {
        if (!user) return;
        if (!values.date) {
            toast({ variant: "destructive", title: "Date manquante", description: "Veuillez sélectionner une date." });
            return;
        }
        setLoading(true);
        try {
            const [hours, minutes] = values.time.split(':').map(Number);
            const combinedDate = new Date(values.date);
            combinedDate.setHours(hours, minutes, 0, 0);
            
            const dataToSave: any = {
                userId: user.uid,
                type: values.type,
                date: combinedDate,
                category: values.category,
                status: values.status,
                location: values.location || null,
            };

            if (eventTypeIsMatch) {
                dataToSave.teamHome = values.teamHome || null;
                dataToSave.teamAway = values.teamAway || null;
            }

            if(isEditMode && event) {
                await updateDoc(doc(db, "events", event.id), dataToSave);
                toast({ title: "Événement mis à jour !" });
            } else {
                await addDoc(collection(db, "events"), dataToSave);
                toast({ title: "Événement planifié !" });
            }
           
            router.push("/dashboard/events");
            router.refresh();
        } catch (error) {
            console.error(error);
            toast({ variant: "destructive", title: "Erreur lors de l'enregistrement" });
        } finally {
            setLoading(false);
        }
    }
    
    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 max-w-2xl mx-auto">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name="type"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Type d'événement</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                    <SelectContent>{eventTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                                </Select>
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
                                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                    <SelectContent>{eventStatuses.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                 <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Catégorie</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                <SelectContent>{playerCategories.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}</SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                {eventTypeIsMatch && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 border rounded-lg bg-primary/5">
                        <FormField
                            control={form.control}
                            name="teamHome"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Équipe à Domicile</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                        <SelectContent>{availableTeams.filter(t => t !== teamAway).map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="teamAway"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Équipe à l'Extérieur</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                        <SelectContent>{availableTeams.filter(t => t !== teamHome).map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                     <FormField
                        control={form.control}
                        name="date"
                        render={({ field }) => (
                            <FormItem className="flex flex-col">
                            <FormLabel>Date</FormLabel>
                            <Popover>
                                <PopoverTrigger asChild>
                                <FormControl>
                                    <Button variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                                    {field.value ? format(field.value, "PPP", { locale: fr }) : <span>Choisir une date</span>}
                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                    </Button>
                                </FormControl>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus/>
                                </PopoverContent>
                            </Popover>
                            <FormMessage />
                            </FormItem>
                        )}
                    />
                     <FormField
                        control={form.control}
                        name="time"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Heure</FormLabel>
                            <FormControl><Input type="time" {...field} /></FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                <FormField
                    control={form.control}
                    name="location"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Lieu / Stade</FormLabel>
                        <FormControl><Input {...field} placeholder="Ex: Stade Municipal" /></FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />

                <Button type="submit" disabled={loading} className="w-full">
                    {loading ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Enregistrement...</>) 
                    : isEditMode ? "Enregistrer les modifications" : "Ajouter l'événement"}
                </Button>
            </form>
        </Form>
    );
}
