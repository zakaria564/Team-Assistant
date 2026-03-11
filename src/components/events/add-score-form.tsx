
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
import { Loader2, PlusCircle, Trash2, Clock } from "lucide-react";
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
      minute: z.coerce.number().min(1).max(120).optional(),
  })).optional(),
  assisters: z.array(z.object({
      playerId: z.string().min(1, "Veuillez sélectionner un joueur ou une équipe."),
      playerName: z.string().optional(),
      assists: z.coerce.number().min(1, "Minimum 1 passe."),
      minute: z.coerce.number().min(1).max(120).optional(),
  })).optional(),
});

const normalizeString = (str: string | null | undefined): string => {
    if (!str) return '';
    return str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '').replace(/\(f\)/g, '');
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
            if (!user || !event.category) return;
            try {
                const clubDocRef = doc(db, "clubs", user.uid);
                const clubDoc = await getDoc(clubDocRef);
                const currentClubName = clubDoc.exists() ? clubDoc.data().clubName : "Votre Club";
                setClubName(currentClubName);
                
                const opponentsQuery = query(collection(db, "opponents"), where("userId", "==", user.uid));
                const opponentsSnapshot = await getDocs(opponentsQuery);
                setOpponents(opponentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Opponent)));

                const relatedCategories = [event.category];
                if (event.category.endsWith(" F")) relatedCategories.push(event.category.replace(" F", ""));
                
                const q = query(collection(db, "players"), where("userId", "==", user.uid), where("category", "in", relatedCategories));
                const querySnapshot = await getDocs(q);
                setPlayers(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Player)).sort((a,b) => a.name.localeCompare(b.name)));

            } catch (error) {
                console.error(error);
            }
        };
        fetchInitialData();
    }, [user, event]);

    const onSubmit = async (values: z.infer<typeof formSchema>) => {
        if (!user) return;
        setLoading(true);
        try {
            const processStats = (items: any[]) => {
                return (items || []).filter(item => item.playerId).map(item => {
                    const opponent = opponents.find(o => o.id === item.playerId);
                    if (opponent) {
                        return { ...item, playerName: item.playerName || opponent.name, playerId: `opponent_${(item.playerName || opponent.name).replace(/\s/g, '_')}` };
                    }
                    const player = players.find(p => p.id === item.playerId);
                    return {...item, playerName: player?.name || 'Joueur inconnu' };
                });
            };
            
            const dataToSave = {
              scoreHome: values.scoreHome,
              scoreAway: values.scoreAway,
              scorers: processStats(values.scorers || []),
              assisters: processStats(values.assisters || []),
              status: "Terminé" // Mise à jour automatique du statut
            };

            await updateDoc(doc(db, "events", event.id), dataToSave);
            toast({ title: "Score et événements enregistrés !" });
            onFinished();
        } catch (error) {
            console.error(error);
            toast({ variant: "destructive", title: "Erreur lors de l'enregistrement" });
        } finally {
            setLoading(false);
        }
    }
    
    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <ScrollArea className="max-h-[65vh] p-1 pr-4">
                    <div className="space-y-6">
                        <div className="space-y-4 rounded-md border p-4 bg-muted/20">
                            <h4 className="font-bold text-center uppercase tracking-tight">{event.teamHome} vs {event.teamAway}</h4>
                            <div className="grid grid-cols-2 gap-4 items-end">
                                <FormField
                                    control={form.control}
                                    name="scoreHome"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-xs">Score {event.teamHome}</FormLabel>
                                            <FormControl><Input type="number" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? undefined : e.target.valueAsNumber)} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="scoreAway"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-xs">Score {event.teamAway}</FormLabel>
                                            <FormControl><Input type="number" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? undefined : e.target.valueAsNumber)} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                        </div>

                        <div className="space-y-4 rounded-md border p-4">
                            <h4 className="font-bold text-sm uppercase flex items-center gap-2"><Clock className="h-4 w-4" /> Timeline des Buts</h4>
                            <div className="space-y-4">
                                {scorerFields.map((field, index) => (
                                    <div key={field.id} className="flex flex-col gap-2 p-3 border rounded-md bg-slate-50 relative">
                                        <Button type="button" variant="ghost" size="icon" className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-white shadow-sm border" onClick={() => removeScorer(index)}>
                                            <Trash2 className="h-3 w-3 text-destructive" />
                                        </Button>
                                        <div className="grid grid-cols-12 gap-2">
                                            <FormField
                                                control={form.control}
                                                name={`scorers.${index}.minute`}
                                                render={({ field }) => (
                                                    <FormItem className="col-span-3">
                                                        <FormLabel className="text-[10px] uppercase font-bold">Min'</FormLabel>
                                                        <FormControl><Input type="number" placeholder="--" {...field} /></FormControl>
                                                    </FormItem>
                                                )}
                                            />
                                            <FormField
                                                control={form.control}
                                                name={`scorers.${index}.playerId`}
                                                render={({ field }) => (
                                                    <FormItem className="col-span-9">
                                                        <FormLabel className="text-[10px] uppercase font-bold">Buteur</FormLabel>
                                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                            <FormControl><SelectTrigger className="h-9"><SelectValue placeholder="Joueur" /></SelectTrigger></FormControl>
                                                            <SelectContent>
                                                                <SelectGroup><SelectLabel>{clubName}</SelectLabel>{players.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectGroup>
                                                                <SelectGroup><SelectLabel>Adversaires</SelectLabel>{opponents.map(o => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}</SelectGroup>
                                                            </SelectContent>
                                                        </Select>
                                                    </FormItem>
                                                )}
                                            />
                                        </div>
                                        {opponents.some(o => o.id === watchScorers?.[index]?.playerId) && (
                                            <FormField
                                                control={form.control}
                                                name={`scorers.${index}.playerName`}
                                                render={({ field }) => (
                                                    <FormItem><FormControl><Input placeholder="Nom du buteur adverse..." {...field} className="h-8 text-xs" /></FormControl></FormItem>
                                                )}
                                            />
                                        )}
                                    </div>
                                ))}
                                <Button type="button" variant="outline" size="sm" className="w-full border-dashed" onClick={() => appendScorer({ playerId: '', playerName: '', goals: 1, minute: undefined })}>
                                    <PlusCircle className="mr-2 h-4 w-4" /> Ajouter un but
                                </Button>
                            </div>

                            <Separator className="my-6" />

                            <h4 className="font-bold text-sm uppercase">Passes décisives</h4>
                            <div className="space-y-4">
                                {assisterFields.map((field, index) => (
                                    <div key={field.id} className="flex items-end gap-2">
                                        <FormField
                                            control={form.control}
                                            name={`assisters.${index}.playerId`}
                                            render={({ field }) => (
                                                <FormItem className="flex-1">
                                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                        <FormControl><SelectTrigger className="h-9"><SelectValue placeholder="Passeur" /></SelectTrigger></FormControl>
                                                        <SelectContent>
                                                            <SelectGroup><SelectLabel>{clubName}</SelectLabel>{players.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectGroup>
                                                            <SelectGroup><SelectLabel>Adversaires</SelectLabel>{opponents.map(o => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}</SelectGroup>
                                                        </SelectContent>
                                                    </Select>
                                                </FormItem>
                                            )}
                                        />
                                        <Button type="button" variant="ghost" size="icon" onClick={() => removeAssister(index)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                                    </div>
                                ))}
                                <Button type="button" variant="outline" size="sm" className="w-full border-dashed" onClick={() => appendAssister({ playerId: '', playerName: '', assists: 1, minute: undefined })}>
                                    <PlusCircle className="mr-2 h-4 w-4" /> Ajouter une passe
                                </Button>
                            </div>
                        </div>
                    </div>
                </ScrollArea>
                <Button type="submit" disabled={loading} className="w-full">
                    {loading ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Enregistrement...</>) : "Enregistrer et Terminer le Match"}
                </Button>
            </form>
        </Form>
    );
}
