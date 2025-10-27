
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

interface Opponent {
    id: string;
    name: string;
}

const eventTypes = [
    "Match de Championnat", "Match Amical", "Match de Coupe", "Tournoi", "Entraînement", "Stage", "Détection", "Réunion", "Événement Spécial"
] as const;

const formSchema = z.object({
  type: z.enum(eventTypes, { required_error: "Le type d'événement est requis." }),
  category: z.string({ required_error: "La catégorie est requise." }),
  date: z.date({ required_error: "La date est requise."}),
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
    "Seniors", "Seniors F", "U19", "U18", "U17", "U17 F", "U16", "U15", "U15 F", "U14", "U13", "U13 F", "U12", "U11", "U11 F", "U10", "U9", "U8", "U7", "Vétérans", "École de foot"
];

interface EventData {
  id: string;
  type: typeof eventTypes[number];
  category: string;
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
    const [allTeams, setAllTeams] = useState<string[]>([]);
    const router = useRouter();
    const isEditMode = !!event;

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            type: "Match de Championnat",
            category: "",
            date: new Date(),
            time: "15:00",
            location: "",
            teamHome: "",
            teamAway: "",
        }
    });

    useEffect(() => {
        const fetchInitialData = async () => {
            if (!user) return;
            try {
                const clubDocRef = doc(db, "clubs", user.uid);
                const opponentsQuery = query(collection(db, "opponents"), where("userId", "==", user.uid));
                
                const [clubDoc, opponentsSnapshot] = await Promise.all([getDoc(clubDocRef), getDocs(opponentsQuery)]);
                
                let clubName = "Votre Club";
                if (clubDoc.exists() && clubDoc.data().clubName) {
                    clubName = clubDoc.data().clubName;
                }

                const opponentsData = opponentsSnapshot.docs.map(doc => doc.data().name as string);
                setAllTeams([clubName, ...opponentsData.sort()]);

            } catch (error) {
                console.error("Error fetching initial data: ", error);
            }
        };
        fetchInitialData();
    }, [user]);

    useEffect(() => {
        if(isEditMode && event) {
            form.reset({
                type: event.type,
                category: event.category,
                date: new Date(event.date),
                time: format(new Date(event.date), "HH:mm"),
                location: event.location || "",
                teamHome: event.teamHome || "",
                teamAway: event.teamAway || "",
            });
        }
    }, [event, isEditMode, form]);

    const eventType = form.watch("type");
    const eventTypeIsMatch = eventType?.includes("Match") || eventType?.includes("Tournoi");
    
    const onSubmit = async (values: z.infer<typeof formSchema>) => {
        if (!user) {
            toast({ variant: "destructive", title: "Non connecté", description: "Vous devez être connecté pour effectuer cette action." });
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
                location: values.location || null,
            };

            if (eventTypeIsMatch) {
                dataToSave.teamHome = values.teamHome || null;
                dataToSave.teamAway = values.teamAway || null;
            }

            if(isEditMode && event) {
                const eventDocRef = doc(db, "events", event.id);
                await updateDoc(eventDocRef, dataToSave);
                toast({
                    title: "Événement modifié !",
                    description: `L'événement a été mis à jour avec succès.`
                });
            } else {
                 await addDoc(collection(db, "events"), dataToSave);
                toast({
                    title: "Événement ajouté !",
                    description: `L'événement a été planifié avec succès.`
                });
            }
           
            router.push("/dashboard/events");
            router.refresh();

        } catch (error) {
            console.error("Error saving event:", error);
             toast({
                variant: "destructive",
                title: "Erreur",
                description: "Impossible d'enregistrer l'événement."
            });
        } finally {
            setLoading(false);
        }
    }
    
    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 max-w-2xl mx-auto">
                <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Type d'événement</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                            <SelectTrigger>
                                <SelectValue placeholder="Sélectionner un type d'événement" />
                            </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                {eventTypes.map(type => (
                                    <SelectItem key={type} value={type}>{type}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                 <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Catégorie</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Sélectionner une catégorie" />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    {playerCategories.map(cat => (
                                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                {eventTypeIsMatch && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <FormField
                            control={form.control}
                            name="teamHome"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Équipe à Domicile</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                        <FormControl><SelectTrigger><SelectValue placeholder="Choisir équipe" /></SelectTrigger></FormControl>
                                        <SelectContent>{allTeams.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
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
                                        <FormControl><SelectTrigger><SelectValue placeholder="Choisir équipe" /></SelectTrigger></FormControl>
                                        <SelectContent>{allTeams.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
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
                                    <Button
                                    variant={"outline"}
                                    className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}
                                    >
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
                            <FormControl>
                                <Input type="time" {...field} />
                            </FormControl>
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
                        <FormLabel>Lieu</FormLabel>
                        <FormControl>
                            <Input placeholder="Ex: Stade Municipal, Complexe sportif..." {...field} />
                        </FormControl>
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
