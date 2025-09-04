
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { collection, addDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

const formSchema = z.object({
  type: z.enum(["Match", "Entraînement"], { required_error: "Le type d'événement est requis." }),
  team: z.string({ required_error: "L'équipe est requise." }),
  date: z.date({ required_error: "La date est requise."}),
  time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Format d'heure invalide (HH:mm)."),
  location: z.string().min(2, "Le lieu est requis."),
  opponent: z.string().optional(),
}).refine(data => {
    if (data.type === "Match") {
        return !!data.opponent && data.opponent.length > 1;
    }
    return true;
}, {
    message: "L'adversaire est requis pour un match.",
    path: ["opponent"],
});

const playerCategories = [
    "Seniors", "U19", "U18", "U17", "U16", "U15", "U14", "U13", "U12", "U11", "U10", "U9", "U8", "U7", "U6", "U5", "Vétérans", "École de foot"
];

export function AddEventForm() {
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            type: "Match",
            team: "",
            time: "15:00",
            location: "",
            opponent: "",
        }
    });

    const eventType = form.watch("type");

    const onSubmit = async (values: z.infer<typeof formSchema>) => {
        setLoading(true);
        try {
            const [hours, minutes] = values.time.split(':').map(Number);
            const combinedDate = new Date(values.date);
            combinedDate.setHours(hours, minutes);

            await addDoc(collection(db, "events"), {
                type: values.type,
                team: values.team,
                date: combinedDate,
                location: values.location,
                opponent: values.opponent || null,
            });

            toast({
                title: "Événement ajouté !",
                description: `L'événement a été planifié avec succès.`
            });
            router.push("/dashboard/events");
        } catch (error) {
            console.error("Error adding event:", error);
             toast({
                variant: "destructive",
                title: "Erreur",
                description: "Impossible d'ajouter l'événement."
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
                            onValueChange={(value) => {
                                field.onChange(value);
                                if (value === "Entraînement") {
                                    form.setValue("opponent", "");
                                }
                            }} 
                            defaultValue={field.value}
                        >
                            <FormControl>
                            <SelectTrigger>
                                <SelectValue placeholder="Sélectionner un type d'événement" />
                            </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                <SelectItem value="Match">Match</SelectItem>
                                <SelectItem value="Entraînement">Entraînement</SelectItem>
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
                        <FormLabel>Équipe</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
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

                {eventType === "Match" && (
                     <FormField
                        control={form.control}
                        name="opponent"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Adversaire</FormLabel>
                            <FormControl>
                                <Input placeholder="Nom de l'équipe adverse" {...field} />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                    />
                )}

                <div className="grid grid-cols-2 gap-4">
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
                                    disabled={(date) =>
                                        date < new Date(new Date().setHours(0,0,0,0))
                                    }
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

                <Button type="submit" disabled={loading} className="w-full">
                    {loading ? (
                        <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Ajout en cours...
                        </>
                    ) : "Ajouter l'événement"}
                </Button>
            </form>
        </Form>
    );
}
