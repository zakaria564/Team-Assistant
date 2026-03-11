
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
import { Loader2, PlusCircle, Trash2, Clock, UserPlus } from "lucide-react";
import { collection, doc, updateDoc, getDocs, query, where, getDoc } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import { Separator } from "../ui/separator";
import { ScrollArea } from "../ui/scroll-area";
import { Badge } from "../ui/badge";

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
      isOpponent: z.boolean().default(false),
      minute: z.coerce.number().min(1).max(120).optional(),
  })).optional(),
  assisters: z.array(z.object({
      playerId: z.string().min(1, "Veuillez sélectionner un joueur."),
      playerName: z.string().optional(),
      isOpponent: z.boolean().default(false),
      minute: z.coerce.number().min(1).max(120).optional(),
  })).optional(),
});

export function AddScoreForm({ event, onFinished }: AddScoreFormProps) {
    const [user] = useAuthState(auth);
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [players, setPlayers] = useState<Player[]>([]);
    const [clubName, setClubName] = useState("Votre Club");
    
    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            scoreHome: 0,
            scoreAway: 0,
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

    useEffect(() => {
        const fetchInitialData = async () => {
            if (!user || !event.category) return;
            try {
                const clubDocRef = doc(db, "clubs", user.uid);
                const clubDoc = await getDoc(clubDocRef);
                const currentClubName = clubDoc.exists() ? clubDoc.data().clubName : "Votre Club";
                setClubName(currentClubName);
                
                const q = query(collection(db, "players"), where("userId", "==", user.uid), where("category", "==", event.category));
                const querySnapshot = await getDocs(q);
                setPlayers(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Player)).sort((a,b) => a.name.localeCompare(b.name)));

            } catch (error) {
                console.error(error);
            }
        };
        fetchInitialData();
    }, [user, event.category]);

    const onSubmit = async (values: z.infer<typeof formSchema>) => {
        if (!user) return;
        setLoading(true);
        try {
            const processStats = (items: any[]) => {
                return (items || []).map(item => {
                    if (item.playerId === "opponent") {
                        return { ...item, playerName: item.playerName || "Adversaire", isOpponent: true };
                    }
                    const player = players.find(p => p.id === item.playerId);
                    return { ...item, playerName: player?.name || 'Joueur inconnu', isOpponent: false };
                });
            };
            
            const dataToSave = {
              scoreHome: values.scoreHome,
              scoreAway: values.scoreAway,
              scorers: processStats(values.scorers || []),
              assisters: processStats(values.assisters || []),
              status: "Terminé"
            };

            await updateDoc(doc(db, "events", event.id), dataToSave);
            toast({ title: "Résultat enregistré !" });
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
                <ScrollArea className="max-h-[70vh] pr-4">
                    <div className="space-y-6">
                        <div className="space-y-4 rounded-xl border-2 border-primary/10 p-6 bg-primary/5">
                            <h4 className="font-black text-center uppercase tracking-tighter text-lg">{event.teamHome} <span className="text-primary mx-2">vs</span> {event.teamAway}</h4>
                            <div className="grid grid-cols-2 gap-8">
                                <FormField
                                    control={form.control}
                                    name="scoreHome"
                                    render={({ field }) => (
                                        <FormItem className="text-center">
                                            <FormLabel className="text-[10px] font-black uppercase text-muted-foreground">{event.teamHome}</FormLabel>
                                            <FormControl>
                                                <Input type="number" {...field} className="text-3xl font-black text-center h-16 rounded-xl border-2 focus:border-primary" />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="scoreAway"
                                    render={({ field }) => (
                                        <FormItem className="text-center">
                                            <FormLabel className="text-[10px] font-black uppercase text-muted-foreground">{event.teamAway}</FormLabel>
                                            <FormControl>
                                                <Input type="number" {...field} className="text-3xl font-black text-center h-16 rounded-xl border-2 focus:border-primary" />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h4 className="font-black text-xs uppercase flex items-center gap-2 tracking-widest"><Clock className="h-4 w-4 text-primary" /> Buteurs du Match</h4>
                                <Button type="button" variant="outline" size="sm" className="h-7 text-[10px] uppercase font-bold" onClick={() => appendScorer({ playerId: '', playerName: '', minute: undefined, isOpponent: false })}>
                                    <PlusCircle className="mr-1 h-3 w-3" /> Ajouter
                                </Button>
                            </div>
                            
                            <div className="space-y-3">
                                {scorerFields.map((field, index) => (
                                    <div key={field.id} className="p-4 border rounded-xl bg-slate-50 relative group">
                                        <Button type="button" variant="ghost" size="icon" className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-white shadow-md border text-destructive opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => removeScorer(index)}>
                                            <Trash2 className="h-3 w-3" />
                                        </Button>
                                        <div className="grid grid-cols-12 gap-3 items-end">
                                            <FormField
                                                control={form.control}
                                                name={`scorers.${index}.minute`}
                                                render={({ field }) => (
                                                    <FormItem className="col-span-3">
                                                        <FormLabel className="text-[9px] uppercase font-black text-muted-foreground">Minute</FormLabel>
                                                        <FormControl><Input type="number" placeholder="--" {...field} className="h-9 font-bold text-center" /></FormControl>
                                                    </FormItem>
                                                )}
                                            />
                                            <FormField
                                                control={form.control}
                                                name={`scorers.${index}.playerId`}
                                                render={({ field }) => (
                                                    <FormItem className="col-span-9">
                                                        <FormLabel className="text-[9px] uppercase font-black text-muted-foreground">Sélection Joueur</FormLabel>
                                                        <Select onValueChange={field.onChange} value={field.value}>
                                                            <FormControl><SelectTrigger className="h-9 font-bold"><SelectValue placeholder="Choisir..." /></SelectTrigger></FormControl>
                                                            <SelectContent>
                                                                <SelectGroup>
                                                                    <SelectLabel>{clubName}</SelectLabel>
                                                                    {players.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                                                                </SelectGroup>
                                                                <Separator className="my-1" />
                                                                <SelectGroup>
                                                                    <SelectLabel>Adversaire</SelectLabel>
                                                                    <SelectItem value="opponent">Joueur Adverse</SelectItem>
                                                                </SelectGroup>
                                                            </SelectContent>
                                                        </Select>
                                                    </FormItem>
                                                )}
                                            />
                                        </div>
                                        {watchScorers?.[index]?.playerId === "opponent" && (
                                            <FormField
                                                control={form.control}
                                                name={`scorers.${index}.playerName`}
                                                render={({ field }) => (
                                                    <FormItem className="mt-3">
                                                        <FormControl><Input placeholder="Nom du buteur adverse..." {...field} className="h-8 text-xs italic" /></FormControl>
                                                    </FormItem>
                                                )}
                                            />
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        <Separator />

                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h4 className="font-black text-xs uppercase flex items-center gap-2 tracking-widest"><UserPlus className="h-4 w-4 text-accent" /> Passes Décisives</h4>
                                <Button type="button" variant="outline" size="sm" className="h-7 text-[10px] uppercase font-bold" onClick={() => appendAssister({ playerId: '', playerName: '', minute: undefined, isOpponent: false })}>
                                    <PlusCircle className="mr-1 h-3 w-3" /> Ajouter
                                </Button>
                            </div>
                            
                            <div className="space-y-3">
                                {assisterFields.map((field, index) => (
                                    <div key={field.id} className="p-4 border rounded-xl bg-slate-50 relative group">
                                        <Button type="button" variant="ghost" size="icon" className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-white shadow-md border text-destructive opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => removeAssister(index)}>
                                            <Trash2 className="h-3 w-3" />
                                        </Button>
                                        <div className="grid grid-cols-12 gap-3 items-end">
                                            <FormField
                                                control={form.control}
                                                name={`assisters.${index}.minute`}
                                                render={({ field }) => (
                                                    <FormItem className="col-span-3">
                                                        <FormLabel className="text-[9px] uppercase font-black text-muted-foreground">Minute</FormLabel>
                                                        <FormControl><Input type="number" placeholder="--" {...field} className="h-9 font-bold text-center" /></FormControl>
                                                    </FormItem>
                                                )}
                                            />
                                            <FormField
                                                control={form.control}
                                                name={`assisters.${index}.playerId`}
                                                render={({ field }) => (
                                                    <FormItem className="col-span-9">
                                                        <FormLabel className="text-[9px] uppercase font-black text-muted-foreground">Passeur</FormLabel>
                                                        <Select onValueChange={field.onChange} value={field.value}>
                                                            <FormControl><SelectTrigger className="h-9 font-bold"><SelectValue placeholder="Choisir..." /></SelectTrigger></FormControl>
                                                            <SelectContent>
                                                                <SelectGroup>
                                                                    <SelectLabel>{clubName}</SelectLabel>
                                                                    {players.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                                                                </SelectGroup>
                                                                <Separator className="my-1" />
                                                                <SelectGroup>
                                                                    <SelectLabel>Adversaire</SelectLabel>
                                                                    <SelectItem value="opponent">Joueur Adverse</SelectItem>
                                                                </SelectGroup>
                                                            </SelectContent>
                                                        </Select>
                                                    </FormItem>
                                                )}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </ScrollArea>
                <Button type="submit" disabled={loading} className="w-full h-12 font-black uppercase tracking-widest rounded-xl">
                    {loading ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Enregistrement...</>) : "Valider le Résultat"}
                </Button>
            </form>
        </Form>
    );
}
