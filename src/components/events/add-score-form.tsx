
"use client";

import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { Loader2, PlusCircle, Trash2 } from "lucide-react";
import { collection, doc, updateDoc, getDocs, query, where, getDoc } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import { Separator } from "../ui/separator";
import { Label } from "../ui/label";

interface Player {
    id: string;
    name: string;
    category: string;
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
      playerId: z.string().min(1, "Veuillez sélectionner un joueur."),
      playerName: z.string().optional(),
      goals: z.coerce.number().min(1, "Minimum 1 but."),
  })).optional(),
  assisters: z.array(z.object({
      playerId: z.string().min(1, "Veuillez sélectionner un joueur."),
      playerName: z.string().optional(),
      assists: z.coerce.number().min(1, "Minimum 1 passe."),
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
    
     useEffect(() => {
        const fetchClubNameAndPlayers = async () => {
            if (!user || !event.category) {
                setPlayers([]);
                return;
            }
            try {
                // Fetch Club Name
                const clubDocRef = doc(db, "clubs", user.uid);
                const clubDoc = await getDoc(clubDocRef);
                const currentClubName = clubDoc.exists() && clubDoc.data().clubName ? clubDoc.data().clubName : "Votre Club";
                setClubName(currentClubName);
                
                const clubTeamNameFeminine = `${currentClubName} (F)`;
                const isHomeTeamClub = event.teamHome === currentClubName || event.teamHome === clubTeamNameFeminine;
                const isAwayTeamClub = event.teamAway === currentClubName || event.teamAway === clubTeamNameFeminine;

                if (!isHomeTeamClub && !isAwayTeamClub) {
                    setPlayers([]);
                    return;
                }

                // The category of our club's team involved in this match
                const clubTeamCategory = event.category;

                // Fetch players for the relevant category of the team playing
                const q = query(
                    collection(db, "players"), 
                    where("userId", "==", user.uid),
                    where("category", "==", clubTeamCategory)
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

        fetchClubNameAndPlayers();
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
                  
            const getPlayerName = (id: string) => players.find(p => p.id === id)?.name || 'Joueur inconnu';
            
            dataToSave.scorers = (values.scorers || [])
                .filter(s => s.playerId && s.goals > 0)
                .map(s => ({...s, playerName: getPlayerName(s.playerId)}));
                
            dataToSave.assisters = (values.assisters || [])
                .filter(a => a.playerId && a.assists > 0)
                .map(a => ({...a, playerName: getPlayerName(a.playerId)}));

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
                                        <Input type="number" placeholder="-" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? undefined : e.target.valueAsNumber)} />
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
                                        <Input type="number" placeholder="-" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? undefined : e.target.valueAsNumber)} />
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
                                                <FormControl><SelectTrigger><SelectValue placeholder="Choisir un joueur" /></SelectTrigger></FormControl>
                                                <SelectContent>{players.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
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
                                           <FormControl><Input type="number" placeholder="Buts" className="w-24" {...field} /></FormControl>
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

                    <div className="space-y-4">
                         <div className="mb-2 flex items-center justify-between">
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
                                                  <FormControl><SelectTrigger><SelectValue placeholder="Choisir un joueur" /></SelectTrigger></FormControl>
                                                  <SelectContent>{players.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
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
                                              <FormControl><Input type="number" placeholder="Passes" className="w-24" {...field} /></FormControl>
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

                <Button type="submit" disabled={loading} className="w-full">
                    {loading ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Enregistrement...</>) 
                    : "Enregistrer le score"}
                </Button>
            </form>
        </Form>
    );
}
