
"use client";

import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { Loader2, CalendarIcon, PlusCircle, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format, isPast, isToday } from "date-fns";
import { fr } from "date-fns/locale";
import { collection, addDoc, doc, updateDoc, getDoc, getDocs, query, where } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import { Separator } from "../ui/separator";
import { Label } from "../ui/label";

interface Player {
    id: string;
    name: string;
    category: string;
}

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
  category: z.string({ required_error: "La catégorie est requise." }),
  date: z.date({ required_error: "La date est requise."}),
  time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Format d'heure invalide (HH:mm)."),
  location: z.string().min(2, "Le lieu est requis."),
  opponent: z.string().optional(),
  scoreTeam: z.coerce.number().optional(),
  scoreOpponent: z.coerce.number().optional(),
  scorers: z.array(z.object({
      playerId: z.string().min(1, "Veuillez sélectionner un joueur."),
      playerName: z.string().optional(),
      goals: z.coerce.number().min(1, "Minimum 1 but."),
  })).optional(),
  assisters: z.array(z.object({
      playerId: z.string().min(1, "Veuillez sélectionner un joueur."),
      playerName: z.string().optional(),
      assists: z.coerce.number().min(1, "Minimum 1 passe."),
  })).optional(),
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
    "Seniors", "Seniors F", "U19", "U18", "U17", "U17 F", "U16", "U15", "U15 F", "U14", "U13", "U13 F", "U12", "U11", "U11 F", "U10", "U9", "U8", "U7", "Vétérans", "École de foot"
];

interface EventData {
  id: string;
  type: typeof eventTypes[number];
  team: string;
  category: string;
  opponent?: string;
  date: Date;
  location: string;
  scoreTeam?: number;
  scoreOpponent?: number;
  scorers?: { playerId: string, playerName: string, goals: number }[];
  assisters?: { playerId: string, playerName: string, assists: number }[];
}

interface AddEventFormProps {
    event?: EventData;
}

export function AddEventForm({ event }: AddEventFormProps) {
    const [user] = useAuthState(auth);
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [clubName, setClubName] = useState("");
    const [players, setPlayers] = useState<Player[]>([]);
    const router = useRouter();
    const isEditMode = !!event;

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            type: "Match de Championnat",
            category: "",
            time: "15:00",
            location: "",
            opponent: "",
            scoreTeam: undefined,
            scoreOpponent: undefined,
            scorers: [],
            assisters: [],
        }
    });

    const { fields: scorerFields, append: appendScorer, remove: removeScorer } = useFieldArray({
        control: form.control,
        name: "scorers"
    });
     const { fields: assisterFields, append: appendAssister, remove: removeAssister } = useFieldArray({
        control: form.control,
        name: "assisters"
    });

    
    useEffect(() => {
        const fetchClubName = async () => {
            if (!user) return;
            try {
                const clubDocRef = doc(db, "clubs", user.uid);
                const docSnap = await getDoc(clubDocRef);
                if (docSnap.exists() && docSnap.data().clubName) {
                    setClubName(docSnap.data().clubName);
                } else {
                    setClubName("Votre Club");
                }
            } catch (error) {
                console.error("Error fetching club name: ", error);
            }
        };
        fetchClubName();
    }, [user]);

    useEffect(() => {
        if(isEditMode && event) {
            form.reset({
                ...event,
                time: format(event.date, "HH:mm"),
                scoreTeam: event.scoreTeam ?? undefined,
                scoreOpponent: event.scoreOpponent ?? undefined,
                opponent: event.opponent || "",
                scorers: event.scorers || [],
                assisters: event.assisters || [],
            });
        }
    }, [event, isEditMode, form]);

    const eventType = form.watch("type");
    const eventDate = form.watch("date");
    const eventCategory = form.watch("category");
    
    const eventTypeIsMatch = eventType?.includes("Match") || eventType?.includes("Tournoi");
    const isPastEvent = eventDate ? isPast(eventDate) || isToday(eventDate) : false;
    const showScoreFields = isEditMode && eventTypeIsMatch && isPastEvent;

    useEffect(() => {
        const fetchPlayers = async () => {
            if(!user || !eventCategory) {
                setPlayers([]);
                return;
            }
            try {
                const q = query(
                    collection(db, "players"), 
                    where("userId", "==", user.uid),
                    where("category", "==", eventCategory)
                );
                const querySnapshot = await getDocs(q);
                const playersData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Player));
                setPlayers(playersData);
            } catch (error) {
                console.error("Error fetching players for category:", error);
            }
        };

        if (showScoreFields) {
            fetchPlayers();
        }
    }, [user, eventCategory, showScoreFields]);


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
            
            const teamValue = `${clubName} - ${values.category}`;

            const dataToSave: any = {
                userId: user.uid,
                type: values.type,
                team: teamValue,
                category: values.category,
                date: combinedDate,
                location: values.location,
            };
            
            if (eventTypeIsMatch) {
                dataToSave.opponent = values.opponent || null;
                 if(isPastEvent) {
                  dataToSave.scoreTeam = values.scoreTeam ?? null;
                  dataToSave.scoreOpponent = values.scoreOpponent ?? null;
                  
                  const getPlayerName = (id: string) => players.find(p => p.id === id)?.name || 'Joueur inconnu';
                  
                  dataToSave.scorers = (values.scorers || []).map(s => ({...s, playerName: getPlayerName(s.playerId)}));
                  dataToSave.assisters = (values.assisters || []).map(a => ({...a, playerName: getPlayerName(a.playerId)}));
                }
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
                        <Select 
                            onValueChange={field.onChange} 
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
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormItem>
                        <FormLabel>Club</FormLabel>
                        <FormControl>
                            <Input value={clubName.replace(/^Club\s/i, '')} disabled />
                        </FormControl>
                    </FormItem>

                    <FormField
                        control={form.control}
                        name="category"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Catégorie</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value} disabled={isEditMode}>
                                <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Sélectionner une catégorie" />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                {playerCategories.map(cat => (
                                    <SelectItem key={cat} value={cat}>
                                        {cat}
                                    </SelectItem>
                                ))}
                                </SelectContent>
                            </Select>
                            <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>


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
                
                {showScoreFields && (
                  <>
                    <div className="space-y-4 rounded-md border p-4">
                        <h4 className="font-medium">Résultat du Match</h4>
                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="scoreTeam"
                                render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Score {clubName.replace(/^Club\s/i, '')}</FormLabel>
                                    <FormControl>
                                    <Input 
                                      type="number" 
                                      placeholder="-" 
                                      {...field} 
                                      value={field.value ?? ''}
                                      onChange={e => field.onChange(e.target.value === '' ? undefined : e.target.valueAsNumber)}
                                    />
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
                                    <FormLabel>Score {event?.opponent}</FormLabel>
                                    <FormControl>
                                    <Input 
                                      type="number" 
                                      placeholder="-" 
                                      {...field} 
                                      value={field.value ?? ''}
                                      onChange={e => field.onChange(e.target.value === '' ? undefined : e.target.valueAsNumber)}
                                    />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                                )}
                            />
                        </div>
                    </div>

                     <div className="space-y-4 rounded-md border p-4">
                        <h4 className="font-medium">Statistiques des joueurs</h4>
                        
                        {/* Scorers */}
                        <div>
                            <div className="flex justify-between items-center mb-2">
                                <Label>Buteurs</Label>
                                <Button type="button" variant="outline" size="sm" onClick={() => appendScorer({ playerId: '', goals: 1 })}>
                                    <PlusCircle className="mr-2 h-4 w-4" /> Ajouter
                                </Button>
                            </div>
                            <div className="space-y-2">
                                {scorerFields.map((field, index) => (
                                    <div key={field.id} className="flex items-center gap-2">
                                        <FormField
                                            control={form.control}
                                            name={`scorers.${index}.playerId`}
                                            render={({ field }) => (
                                              <FormItem className="flex-1">
                                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                    <FormControl>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Choisir un joueur" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        {players.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                               </FormItem>
                                            )}
                                        />
                                         <FormField
                                            control={form.control}
                                            name={`scorers.${index}.goals`}
                                            render={({ field }) => (
                                              <FormItem>
                                               <FormControl>
                                                  <Input type="number" placeholder="Buts" className="w-24" {...field} />
                                               </FormControl>
                                               <FormMessage />
                                               </FormItem>
                                            )}
                                        />
                                        <Button type="button" variant="ghost" size="icon" onClick={() => removeScorer(index)}>
                                            <Trash2 className="h-4 w-4 text-destructive" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <Separator />

                        {/* Assisters */}
                         <div>
                            <div className="flex justify-between items-center mb-2">
                                <Label>Passeurs</Label>
                                <Button type="button" variant="outline" size="sm" onClick={() => appendAssister({ playerId: '', assists: 1 })}>
                                    <PlusCircle className="mr-2 h-4 w-4" /> Ajouter
                                </Button>
                            </div>
                            <div className="space-y-2">
                                {assisterFields.map((field, index) => (
                                    <div key={field.id} className="flex items-center gap-2">
                                        <FormField
                                            control={form.control}
                                            name={`assisters.${index}.playerId`}
                                            render={({ field }) => (
                                                <FormItem className="flex-1">
                                                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                      <FormControl>
                                                          <SelectTrigger>
                                                              <SelectValue placeholder="Choisir un joueur" />
                                                          </SelectTrigger>
                                                      </FormControl>
                                                      <SelectContent>
                                                          {players.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                                                      </SelectContent>
                                                  </Select>
                                                  <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                         <FormField
                                            control={form.control}
                                            name={`assisters.${index}.assists`}
                                            render={({ field }) => (
                                                <FormItem>
                                                  <FormControl>
                                                    <Input type="number" placeholder="Passes" className="w-24" {...field} />
                                                  </FormControl>
                                                  <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <Button type="button" variant="ghost" size="icon" onClick={() => removeAssister(index)}>
                                            <Trash2 className="h-4 w-4 text-destructive" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        </div>

                    </div>
                  </>
                )}


                <Button type="submit" disabled={loading} className="w-full">
                    {loading ? (
                        <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Enregistrement...
                        </>
                    ) : isEditMode ? "Enregistrer les modifications" : "Ajouter l'événement"}
                </Button>
            </form>
        </Form>
    );
}

    