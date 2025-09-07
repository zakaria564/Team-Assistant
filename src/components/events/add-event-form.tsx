
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format, isPast, startOfDay } from "date-fns";
import { fr } from "date-fns/locale";
import { collection, addDoc, doc, updateDoc } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { useAuthState } from "react-firebase-hooks/auth";


const eventTypes = [
    "Match de Championnat",
    "Match Amical",
    "Match de Coupe",
    "Tournoi",
    "Entraînement",
    "Stage",
    "Détection",
    "Réunion",
    "Événement Spécial"
] as const;

const formSchema = z.object({
  type: z.enum(eventTypes, { required_error: "Le type d'événement est requis." }),
  team: z.string({ required_error: "L'équipe est requise." }),
  date: z.date({ required_error: "La date est requise."}),
  time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Format d'heure invalide (HH:mm)."),
  location: z.string().min(2, "Le lieu est requis."),
  opponent: z.string().optional(),
  scoreTeam: z.coerce.number().optional(),
  scoreOpponent: z.coerce.number().optional(),
}).refine(data => {
    if (data.type.includes("Match") || data.type.includes("Tournoi")) {
        return !!data.opponent && data.opponent.length > 1;
    }
    return true;
}, {
    message: "L'adversaire est requis pour un match ou un tournoi.",
    path: ["opponent"],
});

const playerCategories = [
    "Seniors", "U19", "U18", "U17", "U16", "U15", "U14", "U13", "U12", "U11", "U10", "U9", "U8", "U7", "U6", "U5", "Vétérans", "École de foot"
];

interface EventData {
  id: string;
  type: typeof eventTypes[number];
  team: string;
  opponent?: string;
  date: Date;
  location: string;
  scoreTeam?: number;
  scoreOpponent?: number;
}

interface AddEventFormProps {
    event?: EventData;
}

export function AddEventForm({ event }: AddEventFormProps) {
    const [user] = useAuthState(auth);
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const isEditMode = !!event;

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            type: "Match de Championnat",
            team: "",
            time: "15:00",
            location: "",
            opponent: "",
            scoreTeam: undefined,
            scoreOpponent: undefined,
        }
    });
    
    useEffect(() => {
        if(isEditMode && event) {
            form.reset({
                ...event,
                time: format(event.date, "HH:mm"),
                scoreTeam: event.scoreTeam ?? undefined,
                scoreOpponent: event.scoreOpponent ?? undefined,
            });
        }
    }, [event, isEditMode, form]);

    const eventType = form.watch("type");
    const eventDate = form.watch("date");
    const eventTypeIsMatch = eventType?.includes("Match") || eventType?.includes("Tournoi");
    const isPastEvent = eventDate ? isPast(startOfDay(eventDate)) || format(eventDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd') : false;


    const onSubmit = async (values: z.infer<typeof formSchema>) => {
        if (!user) {
            toast({ variant: "destructive", title: "Non connecté", description: "Vous devez être connecté pour effectuer cette action." });
            return;
        }
        setLoading(true);
        try {
            const [hours, minutes] = values.time.split(':').map(Number);
            const combinedDate = new Date(values.date);
            combinedDate.setHours(hours, minutes);

            const dataToSave: any = {
                userId: user.uid,
                type: values.type,
                team: values.team,
                date: combinedDate,
                location: values.location,
            };
            
            if (eventTypeIsMatch) {
                dataToSave.opponent = values.opponent || null;
                dataToSave.scoreTeam = values.scoreTeam ?? null;
                dataToSave.scoreOpponent = values.scoreOpponent ?? null;
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
           
            router.push("/dashboard/results");
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
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 max-w-lg mx-auto">
                <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Type d'événement</FormLabel>
                        <Select 
                            onValueChange={(value: typeof eventTypes[number]) => {
                                field.onChange(value);
                                if (!value.includes("Match")) {
                                    form.setValue("opponent", "");
                                }
                            }} 
                            value={field.value}
                        >
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
                    name="team"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Équipe / Catégorie</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                            <SelectTrigger>
                                <SelectValue placeholder="Sélectionner une équipe/catégorie" />
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
                     <FormField
                        control={form.control}
                        name="opponent"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Adversaire</FormLabel>
                            <FormControl>
                                <Input placeholder="Nom de l'équipe adverse" {...field} value={field.value || ''} />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                    />
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
                                    className={cn(
                                        "pl-3 text-left font-normal",
                                        !field.value && "text-muted-foreground"
                                    )}
                                    >
                                    {field.value ? (
                                        format(field.value, "PPP", { locale: fr })
                                    ) : (
                                        <span>Choisir une date</span>
                                    )}
                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                    </Button>
                                </FormControl>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                    mode="single"
                                    selected={field.value}
                                    onSelect={field.onChange}
                                    initialFocus
                                />
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
                            <Input placeholder="Ex: Domicile, Stade Municipal, Extérieur..." {...field} />
                        </FormControl>
                         <FormDescription>
                            Indiquez si le match est à domicile, à l'extérieur ou le nom du stade.
                        </FormDescription>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                
                {eventTypeIsMatch && isPastEvent && (
                    <div className="space-y-4 rounded-md border p-4">
                        <h4 className="font-medium">Résultat du Match</h4>
                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="scoreTeam"
                                render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Score {form.getValues("team") || "Mon équipe"}</FormLabel>
                                    <FormControl>
                                    <Input type="number" placeholder="-" {...field} onChange={e => field.onChange(e.target.value === '' ? undefined : e.target.valueAsNumber)} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                                )}
                            />
                             <FormField
                                control={form.control}
                                name="scoreOpponent"
                                render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Score {form.getValues("opponent") || "Adversaire"}</FormLabel>
                                    <FormControl>
                                    <Input type="number" placeholder="-" {...field} onChange={e => field.onChange(e.target.value === '' ? undefined : e.target.valueAsNumber)} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                                )}
                            />
                        </div>
                    </div>
                )}


                <Button type="submit" disabled={loading} className="w-full">
                    {loading ? (
                        <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Enregistrement...
                        </>
                    ) : isEditMode ? "Modifier l'événement" : "Ajouter l'événement"}
                </Button>
            </form>
        </Form>
    );
}

    