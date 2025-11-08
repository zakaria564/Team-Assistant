
"use client";

import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { Loader2, PlusCircle, Trash2 } from "lucide-react";
import { collection, doc, updateDoc, getDocs, query, where, getDoc } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import { Separator } from "../ui/separator";
import { Label } from "../ui/label";
import { ScrollArea } from "../ui/scroll-area";

interface Player {
    id: string;
    name: string;
    category: string;
}

interface Opponent {
    id: string;
    name: string;
}

interface EventData {
  id: string;
  category: string;
  teamHome?: string;
  teamAway?: string;
}

interface AddScoreFormProps {
    event: EventData;
    onFinished: () => void;
}


const formSchema = z.object({
  scoreHome: z.coerce.number({ required_error: "Score requis" }).min(0, "Score invalide"),
  scoreAway: z.coerce.number({ required_error: "Score requis" }).min(0, "Score invalide"),
  scorers: z.array(z.object({
      playerId: z.string().min(1, "Veuillez sélectionner un joueur ou une équipe."),
      playerName: z.string().optional(),
      goals: z.coerce.number().min(1, "Minimum 1 but."),
  })).optional(),
  assisters: z.array(z.object({
      playerId: z.string().min(1, "Veuillez sélectionner un joueur ou une équipe."),
      playerName: z.string().optional(),
      assists: z.coerce.number().min(1, "Minimum 1 passe."),
  })).optional(),
});


const playerCategories = [
    "Seniors", "Seniors F",
    "U19", "U19 F",
    "U18", "U18 F",
    "U17", "U17 F",
    "U16", "U16 F",
    "U15", "U15 F",
    "U14", "U14 F",
    "U13", "U13 F",
    "U12", "U12 F",
    "U11", "U11 F",
    "U10", "U10 F",
    "U9", "U9 F",
    "U8", "U8 F",
    "U7", "U7 F",
    "Vétérans"
];

const normalizeString = (str: string | null | undefined): string => {
    if (!str) return '';
    return str
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, '')
        .replace(/\(f\)/g, ''); // Remove (f) for comparison
};

export function AddScoreForm({ event, onFinished }: AddScoreFormProps) {
    const [user] = useAuthState(auth);
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [players, setPlayers] = useState<Player[]>([]);
    const [opponents, setOpponents] = useState<Opponent[]>([]);
    const [clubName, setClubName] = useState("Votre Club");
    
    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            scoreHome: undefined,
            scoreAway: undefined,
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

    const watchScorers = form.watch("scorers");
    const watchAssisters = form.watch("assisters");
    
     useEffect(() => {
        const fetchInitialData = async () => {
            if (!user || !event.category) {
                setPlayers([]);
                return;
            }
            try {
                const clubDocRef = doc(db, "clubs", user.uid);
                const clubDoc = await getDoc(clubDocRef);
                const currentClubName = clubDoc.exists() && clubDoc.data().clubName ? clubDoc.data().clubName : "Votre Club";
                setClubName(currentClubName);
                
                const opponentsQuery = query(collection(db, "opponents"), where("userId", "==", user.uid));
                const opponentsSnapshot = await getDocs(opponentsQuery);
                const opponentsData = opponentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Opponent));
                setOpponents(opponentsData);

                const normalizedClub = normalizeString(currentClubName);
                const normalizedHome = normalizeString(event.teamHome);
                const normalizedAway = normalizeString(event.teamAway);

                if (normalizedHome !== normalizedClub && normalizedAway !== normalizedClub) {
                    setPlayers([]);
                    return; // Neither team is the user's club
                }

                const eventCategory = event.category;
                const relatedCategories = [eventCategory];
                if (eventCategory.endsWith(" F")) {
                    relatedCategories.push(eventCategory.replace(" F", ""));
                } else if (playerCategories.includes(`${eventCategory} F`)) { // Check if a female version exists
                    relatedCategories.push(`${eventCategory} F`);
                }
                
                const q = query(
                    collection(db, "players"), 
                    where("userId", "==", user.uid),
                    where("category", "in", relatedCategories)
                );

                const querySnapshot = await getDocs(q);
                const playersData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Player));
                setPlayers(playersData.sort((a,b) => a.name.localeCompare(b.name)));

            } catch (error) {
                console.error("Error fetching data:", error);
                toast({
                    variant: "destructive",
                    title: "Erreur",
                    description: "Impossible de charger les joueurs pour ce match."
                })
            }
        };

        fetchInitialData();
    }, [user, event, toast]);


    const onSubmit = async (values: z.infer<typeof formSchema>) => {
        if (!user) {
            toast({ variant: "destructive", title: "Non connecté", description: "Vous devez être connecté pour effectuer cette action." });
            return;
        }
        setLoading(true);
        try {
            const dataToSave: any = {
              scoreHome: values.scoreHome,
              scoreAway: values.scoreAway,
            };
            
            const processStats = (items: any[]) => {
                return (items || [])
                    .filter(item => item.playerId && (item.goals > 0 || item.assists > 0))
                    .map(item => {
                        const opponent = opponents.find(o => o.id === item.playerId);
                        if (opponent) {
                            return { ...item, playerName: item.playerName || opponent.name, playerId: `opponent_${item.playerName?.replace(/\s/g, '_') || opponent.name.replace(/\s/g, '_')}` };
                        }
                        const player = players.find(p => p.id === item.playerId);
                        return {...item, playerName: player?.name || 'Joueur inconnu' };
                    });
            };
            
            dataToSave.scorers = processStats(values.scorers || []);
            dataToSave.assisters = processStats(values.assisters || []);

            const eventDocRef = doc(db, "events", event.id);
            await updateDoc(eventDocRef, dataToSave);
            toast({
                title: "Score enregistré !",
                description: `Le résultat du match a été mis à jour avec succès.`
            });
           
            onFinished();

        } catch (error) {
            console.error("Error saving score:", error);
             toast({
                variant: "destructive",
                title: "Erreur",
                description: "Impossible d'enregistrer le score."
            });
        } finally {
            setLoading(false);
        }
    }
    
    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <ScrollArea className="max-h-[65vh] p-1 pr-4">
                    <div className="space-y-6">
                        <div className="space-y-4 rounded-md border p-4">
                            <h4 className="font-medium text-center">{event.teamHome} vs {event.teamAway}</h4>
                            <div className="grid grid-cols-2 gap-4 items-end">
                                <FormField
                                    control={form.control}
                                    name="scoreHome"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Score {event.teamHome}</FormLabel>
                                            <FormControl>
                                                <Input type="number" placeholder="" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? undefined : e.target.valueAsNumber)} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="scoreAway"
                                    render={({ field }) => (
                                        <FormItem>
                                        <FormLabel>Score {event.teamAway}</FormLabel>
                                            <FormControl>
                                                <Input type="number" placeholder="" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? undefined : e.target.valueAsNumber)} />
                                            </FormControl>
                                        <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                        </div>

                        <div className="space-y-4 rounded-md border p-4">
                            <h4 className="font-medium">Statistiques des joueurs</h4>
                            
                            <div className="space-y-4">
                                <div className="mb-2 flex items-center justify-between">
                                    <Label>Buteurs</Label>
                                    <Button type="button" variant="outline" size="sm" onClick={() => appendScorer({ playerId: '', playerName: '', goals: 1 })}>
                                        <PlusCircle className="mr-2 h-4 w-4" /> Ajouter
                                    </Button>
                                </div>
                                <div className="space-y-4">
                                    {scorerFields.map((field, index) => {
                                        const selectedPlayerId = watchScorers?.[index]?.playerId;
                                        const isOpponentSelected = opponents.some(o => o.id === selectedPlayerId);
                                        return (
                                            <div key={field.id} className="flex flex-col gap-2 p-2 border rounded-md">
                                                <div className="flex items-end gap-2">
                                                    <FormField
                                                        control={form.control}
                                                        name={`scorers.${index}.playerId`}
                                                        render={({ field }) => (
                                                        <FormItem className="flex-1">
                                                            <FormLabel className="text-xs">Joueur / Équipe</FormLabel>
                                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                                <FormControl><SelectTrigger><SelectValue placeholder="Choisir..." /></SelectTrigger></FormControl>
                                                                <SelectContent className="max-h-60">
                                                                    <SelectGroup>
                                                                        <SelectLabel>{clubName}</SelectLabel>
                                                                        {players.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                                                                    </SelectGroup>
                                                                    <SelectGroup>
                                                                        <SelectLabel>Adversaires</SelectLabel>
                                                                        {opponents.map(o => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
                                                                    </SelectGroup>
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
                                                        <FormLabel className="text-xs">Buts</FormLabel>
                                                        <FormControl><Input type="number" placeholder="" className="w-20" {...field} /></FormControl>
                                                        <FormMessage />
                                                        </FormItem>
                                                        )}
                                                    />
                                                    <Button type="button" variant="ghost" size="icon" onClick={() => removeScorer(index)}>
                                                        <Trash2 className="h-4 w-4 text-destructive" />
                                                    </Button>
                                                </div>
                                                {isOpponentSelected && (
                                                    <FormField
                                                        control={form.control}
                                                        name={`scorers.${index}.playerName`}
                                                        render={({ field }) => (
                                                            <FormItem>
                                                                <FormLabel className="text-xs">Nom du buteur adverse</FormLabel>
                                                                <FormControl><Input placeholder="" {...field} /></FormControl>
                                                                <FormMessage />
                                                            </FormItem>
                                                        )}
                                                    />
                                                )}
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>

                            <Separator />

                            <div className="space-y-4">
                                <div className="mb-2 flex items-center justify-between">
                                    <Label>Passeurs</Label>
                                    <Button type="button" variant="outline" size="sm" onClick={() => appendAssister({ playerId: '', playerName: '', assists: 1 })}>
                                        <PlusCircle className="mr-2 h-4 w-4" /> Ajouter
                                    </Button>
                                </div>
                                <div className="space-y-4">
                                    {assisterFields.map((field, index) => {
                                        const selectedPlayerId = watchAssisters?.[index]?.playerId;
                                        const isOpponentSelected = opponents.some(o => o.id === selectedPlayerId);
                                        return(
                                        <div key={field.id} className="flex flex-col gap-2 p-2 border rounded-md">
                                            <div className="flex items-end gap-2">
                                                <FormField
                                                    control={form.control}
                                                    name={`assisters.${index}.playerId`}
                                                    render={({ field }) => (
                                                        <FormItem className="flex-1">
                                                            <FormLabel className="text-xs">Joueur / Équipe</FormLabel>
                                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                                <FormControl><SelectTrigger><SelectValue placeholder="Choisir..." /></SelectTrigger></FormControl>
                                                                <SelectContent className="max-h-60">
                                                                    <SelectGroup>
                                                                        <SelectLabel>{clubName}</SelectLabel>
                                                                        {players.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                                                                    </SelectGroup>
                                                                    <SelectGroup>
                                                                        <SelectLabel>Adversaires</SelectLabel>
                                                                        {opponents.map(o => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
                                                                    </SelectGroup>
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
                                                        <FormLabel className="text-xs">Passes</FormLabel>
                                                        <FormControl><Input type="number" placeholder="" className="w-20" {...field} /></FormControl>
                                                        <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                                <Button type="button" variant="ghost" size="icon" onClick={() => removeAssister(index)}>
                                                    <Trash2 className="h-4 w-4 text-destructive" />
                                                </Button>
                                            </div>
                                            {isOpponentSelected && (
                                                <FormField
                                                    control={form.control}
                                                    name={`assisters.${index}.playerName`}
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel className="text-xs">Nom du passeur adverse</FormLabel>
                                                            <FormControl><Input placeholder="" {...field} /></FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                            )}
                                        </div>
                                    )})}
                                </div>
                            </div>
                        </div>
                    </div>
                </ScrollArea>

                <Button type="submit" disabled={loading} className="w-full">
                    {loading ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Enregistrement...</>) 
                    : "Enregistrer le score"}
                </Button>
            </form>
        </Form>
    );
}
