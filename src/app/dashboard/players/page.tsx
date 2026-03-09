
"use client";

import React from "react";
import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PlusCircle, Loader2, MoreHorizontal, Trash2, Search, Pencil, FileText, ChevronDown, ChevronRight, AlertCircle, Fingerprint } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Link from "next/link";
import { collection, getDocs, query, doc, updateDoc, where, deleteDoc, onSnapshot } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { 
  DropdownMenu, 
  DropdownMenuTrigger, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useAuthState } from "react-firebase-hooks/auth";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const playerStatuses = ["Actif", "Inactif", "Blessé", "Suspendu"] as const;
type PlayerStatus = typeof playerStatuses[number];

interface Player {
  id: string;
  name: string;
  gender: "Masculin" | "Féminin";
  category: string;
  status: PlayerStatus;
  number: number;
  photoUrl?: string;
  position?: string;
  hasPendingPayment?: boolean;
  professionalId?: string;
}

const getStatusBadgeClass = (status?: PlayerStatus) => {
    switch (status) {
        case 'Actif': return 'bg-green-100 text-green-800 border-green-300 hover:bg-green-200';
        case 'Inactif': return 'bg-gray-100 text-gray-800 border-gray-300 hover:bg-gray-200';
        case 'Blessé': return 'bg-yellow-100 text-yellow-800 border-yellow-300 hover:bg-yellow-200';
        case 'Suspendu': return 'bg-red-100 text-red-800 border-red-300 hover:bg-red-200';
        default: return '';
    }
}

const toTitleCase = (str: string) => {
  if (!str) return '';
  return str.toLowerCase().split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
};

const PlayerCategoryGroup = ({ category, players, onUpdateStatus, onDeletePlayer, defaultOpen }: { category: string, players: Player[], onUpdateStatus: (playerId: string, newStatus: PlayerStatus) => void, onDeletePlayer: (player: Player) => void, defaultOpen: boolean }) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    return (
         <Collapsible 
            key={category} 
            className="border rounded-lg"
            open={isOpen}
            onOpenChange={setIsOpen}
        >
            <Card>
                <CollapsibleTrigger asChild>
                     <CardHeader className="flex flex-row items-center justify-between cursor-pointer">
                        <div>
                            <CardTitle>{category}</CardTitle>
                            <CardDescription>{players.length} joueur(s).</CardDescription>
                        </div>
                        <Button variant="ghost" size="sm">
                            {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </Button>
                    </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Joueur</TableHead>
                                    <TableHead className="hidden lg:table-cell">Poste</TableHead>
                                    <TableHead className="hidden sm:table-cell">ID Professionnel</TableHead>
                                    <TableHead className="hidden sm:table-cell">Statut</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                            {players.sort((a, b) => a.name.localeCompare(b.name)).map(player => (
                                <TableRow key={player.id}>
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            <div className="relative">
                                                <Avatar>
                                                    <AvatarImage src={player.photoUrl} alt={player.name} />
                                                    <AvatarFallback>{player.name?.charAt(0)}</AvatarFallback>
                                                </Avatar>
                                                {player.hasPendingPayment && (
                                                    <span className="absolute -top-1 -right-1 flex h-3 w-3">
                                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                                        <AlertCircle className="relative inline-flex h-3 w-3 text-red-600 fill-white" />
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex flex-col">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-medium">{toTitleCase(player.name)}</span>
                                                    {player.hasPendingPayment && <Badge variant="destructive" className="text-[10px] h-4 px-1">Impayé</Badge>}
                                                </div>
                                                <span className="text-muted-foreground text-xs font-mono sm:hidden">{player.professionalId || "N/A"}</span>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell className="hidden lg:table-cell">{player.position}</TableCell>
                                    <TableCell className="hidden sm:table-cell">
                                        <div className="flex items-center gap-1 font-mono text-xs text-muted-foreground">
                                            <Fingerprint className="h-3 w-3" />
                                            {player.professionalId || "N/A"}
                                        </div>
                                    </TableCell>
                                    <TableCell className="hidden sm:table-cell">
                                        <Badge className={cn("text-xs font-semibold", getStatusBadgeClass(player.status))}>
                                            {player.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" className="h-8 w-8 p-0">
                                            <MoreHorizontal className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <Link href={`/dashboard/players/${player.id}`} passHref><DropdownMenuItem className="cursor-pointer"><FileText className="mr-2 h-4 w-4" /> Détails</DropdownMenuItem></Link>
                                            <Link href={`/dashboard/players/${player.id}/edit`} passHref><DropdownMenuItem className="cursor-pointer"><Pencil className="mr-2 h-4 w-4" /> Modifier</DropdownMenuItem></Link>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem className="cursor-pointer text-destructive" onClick={() => onDeletePlayer(player)}><Trash2 className="mr-2 h-4 w-4" /> Supprimer</DropdownMenuItem>
                                        </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </CollapsibleContent>
            </Card>
        </Collapsible>
    )
}

export default function PlayersPage() {
  const [user, loadingUser] = useAuthState(auth);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [playerToDelete, setPlayerToDelete] = useState<Player | null>(null);

  useEffect(() => {
    if (!user) {
        if(!loadingUser) setLoading(false);
        return;
    }

    setLoading(true);
    
    const playersQuery = query(collection(db, "players"), where("userId", "==", user.uid));
    
    const unsubscribePlayers = onSnapshot(playersQuery, (playersSnapshot) => {
        const playersData = playersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Player));
        
        const paymentsQuery = query(
            collection(db, "payments"), 
            where("userId", "==", user.uid)
        );

        const unsubscribePayments = onSnapshot(paymentsQuery, (paymentsSnapshot) => {
            const pendingPlayerIds = new Set();
            paymentsSnapshot.docs.forEach(doc => {
                const p = doc.data();
                if (p.status !== "Payé") {
                    pendingPlayerIds.add(p.playerId);
                }
            });

            const enrichedPlayers = playersData.map(p => ({
                ...p,
                hasPendingPayment: pendingPlayerIds.has(p.id)
            }));

            setPlayers(enrichedPlayers);
            setLoading(false);
        });

        return () => unsubscribePayments();
    });

    return () => unsubscribePlayers();
  }, [user, loadingUser]);

  const filteredPlayers = useMemo(() => {
    if (!searchTerm) return players;
    const term = searchTerm.toLowerCase();
    return players.filter(p => p.name.toLowerCase().includes(term) || p.professionalId?.toLowerCase().includes(term));
  }, [players, searchTerm]);
  
  const { malePlayers, femalePlayers } = useMemo(() => {
    const male: Player[] = [];
    const female: Player[] = [];
    filteredPlayers.forEach(p => p.gender === "Féminin" ? female.push(p) : male.push(p));
    return { malePlayers: male, femalePlayers: female };
  }, [filteredPlayers]);

  const groupedMale = malePlayers.reduce((acc, p) => {
    const cat = p.category || 'Sans catégorie';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(p);
    return acc;
  }, {} as Record<string, Player[]>);

  const groupedFemale = femalePlayers.reduce((acc, p) => {
    const cat = p.category || 'Sans catégorie';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(p);
    return acc;
  }, {} as Record<string, Player[]>);

  const handleUpdateStatus = async (playerId: string, newStatus: PlayerStatus) => {
    try {
        await updateDoc(doc(db, "players", playerId), { status: newStatus });
        toast({ title: "Statut mis à jour" });
    } catch (e) { toast({ variant: "destructive", title: "Erreur" }); }
  };

  const confirmDeletePlayer = async () => {
    if (!playerToDelete) return;
    try {
      await deleteDoc(doc(db, "players", playerToDelete.id));
      toast({ title: "Joueur supprimé définitivement" });
    } catch (e) { toast({ variant: "destructive", title: "Erreur" }); }
    finally { setPlayerToDelete(null); }
  };

  if (loading || loadingUser) return <div className="flex justify-center items-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Joueurs</h1>
          <p className="text-muted-foreground">Gérez vos effectifs actifs.</p>
        </div>
        <Button asChild><Link href="/dashboard/players/add"><PlusCircle className="mr-2 h-4 w-4" /> Ajouter un joueur</Link></Button>
      </div>

      <div className="relative w-full md:max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input placeholder="Rechercher (Nom ou ID)..." className="pl-10" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
      </div>

      <Tabs defaultValue="male">
          <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="male">Masculin ({malePlayers.length})</TabsTrigger>
              <TabsTrigger value="female">Féminin ({femalePlayers.length})</TabsTrigger>
          </TabsList>
          <TabsContent value="male" className="space-y-4">
              {Object.entries(groupedMale).map(([cat, ps]) => <PlayerCategoryGroup key={cat} category={cat} players={ps} onUpdateStatus={handleUpdateStatus} onDeletePlayer={setPlayerToDelete} defaultOpen={false} />)}
          </TabsContent>
          <TabsContent value="female" className="space-y-4">
              {Object.entries(groupedFemale).map(([cat, ps]) => <PlayerCategoryGroup key={cat} category={cat} players={ps} onUpdateStatus={handleUpdateStatus} onDeletePlayer={setPlayerToDelete} defaultOpen={false} />)}
          </TabsContent>
      </Tabs>

      <AlertDialog open={!!playerToDelete} onOpenChange={() => setPlayerToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader><AlertDialogTitle>Supprimer définitivement ?</AlertDialogTitle><AlertDialogDescription>Cette action est irréversible.</AlertDialogDescription></AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Annuler</AlertDialogCancel>
                <AlertDialogAction onClick={confirmDeletePlayer} className="bg-destructive hover:bg-destructive/90">Supprimer</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
