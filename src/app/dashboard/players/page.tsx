
"use client";

import React from "react";
import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PlusCircle, Loader2, MoreHorizontal, Trash2, Search, AlertTriangle, FileDown, Pencil, FileText, ChevronDown, ChevronRight } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Link from "next/link";
import { collection, getDocs, query, doc, deleteDoc, updateDoc, where } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { 
  DropdownMenu, 
  DropdownMenuTrigger, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useAuthState } from "react-firebase-hooks/auth";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";


const playerStatuses = ["Actif", "Inactif", "Blessé", "Suspendu"] as const;
type PlayerStatus = typeof playerStatuses[number];

interface Player {
  id: string;
  name: string;
  category: string;
  status: PlayerStatus;
  number: number;
  photoUrl?: string;
  position?: string;
  phone?: string;
  email?: string;
  tutorName?: string;
  tutorPhone?: string;
  tutorEmail?: string;
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

export default function PlayersPage() {
  const [user, loadingUser] = useAuthState(auth);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [searchCategory, setSearchCategory] = useState("name");
  const [playerToDelete, setPlayerToDelete] = useState<Player | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const fetchPlayers = async () => {
        if (!user) {
            if(!loadingUser) setLoading(false);
            return;
        }
        setLoading(true);
        setFetchError(null);
        try {
            const q = query(collection(db, "players"), where("userId", "==", user.uid));
            const querySnapshot = await getDocs(q);
            const playersData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Player));
            setPlayers(playersData);
        } catch (error: any) {
            console.error("Error fetching players: ", error);
            setFetchError(error.message);
            toast({
            variant: "destructive",
            title: "Erreur de chargement",
            description: "Impossible de charger les joueurs. Vérifiez les permissions Firestore.",
            });
        } finally {
            setLoading(false);
        }
    };

    fetchPlayers();
  }, [user, loadingUser, toast]);
  
  const filteredPlayers = useMemo(() => {
    if (!searchTerm) return players;
    const lowercasedSearchTerm = searchTerm.toLowerCase();

    return players.filter(player => {
      let valueToSearch: string | undefined;
      switch (searchCategory) {
        case 'name':
          valueToSearch = player.name;
          break;
        case 'category':
          valueToSearch = player.category;
          break;
        case 'status':
            valueToSearch = player.status;
            break;
        default:
          valueToSearch = player.name;
      }
      return (valueToSearch || '').toLowerCase().includes(lowercasedSearchTerm);
    });
  }, [players, searchTerm, searchCategory]);
  
  const groupedPlayers = useMemo(() => {
    return filteredPlayers.reduce((acc, player) => {
      const category = player.category || 'Sans catégorie';
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(player);
      return acc;
    }, {} as Record<string, Player[]>);
  }, [filteredPlayers]);
  
  useEffect(() => {
    const initialOpenState = Object.keys(groupedPlayers).reduce((acc, category) => {
      acc[category] = true;
      return acc;
    }, {} as Record<string, boolean>);
    setOpenCategories(initialOpenState);
  }, []);


  const handleUpdateStatus = async (playerId: string, newStatus: PlayerStatus) => {
    try {
        const playerDocRef = doc(db, "players", playerId);
        await updateDoc(playerDocRef, { status: newStatus });
        
        setPlayers(prevPlayers => 
            prevPlayers.map(p => p.id === playerId ? { ...p, status: newStatus } : p)
        );

        toast({
            title: "Statut mis à jour",
            description: `Le statut du joueur a été changé en "${newStatus}".`
        });
    } catch (error) {
        toast({
            variant: "destructive",
            title: "Erreur",
            description: "Impossible de mettre à jour le statut."
        });
        console.error("Error updating status: ", error);
    }
  };


  const confirmDeletePlayer = async () => {
    if (!playerToDelete) return;
    try {
      await deleteDoc(doc(db, "players", playerToDelete.id));
      setPlayers(players.filter(p => p.id !== playerToDelete.id));
      toast({
        title: "Joueur supprimé",
        description: `${toTitleCase(playerToDelete.name)} a été retiré du club.`,
      });
    } catch (error) {
       toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de supprimer le joueur.",
      });
      console.error("Error deleting player: ", error);
    } finally {
        setPlayerToDelete(null);
    }
  };

  const toggleCategory = (category: string) => {
    setOpenCategories(prev => ({ ...prev, [category]: !prev[category] }));
  };

  return (
    <>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Joueurs</h1>
            <p className="text-muted-foreground">Gérez les joueurs de votre club.</p>
          </div>
          <Button asChild className="w-full md:w-auto">
            <Link href="/dashboard/players/add">
              <PlusCircle className="mr-2 h-4 w-4" />
              Ajouter un joueur
            </Link>
          </Button>
        </div>

        <div className="mb-4 flex flex-col md:flex-row items-center gap-4">
            <div className="relative w-full md:max-w-sm">
                 <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input 
                    placeholder="Rechercher..."
                    className="pl-10"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
            <Select value={searchCategory} onValueChange={setSearchCategory}>
                <SelectTrigger className="w-full md:w-[180px]">
                    <SelectValue placeholder="Critère" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="name">Nom</SelectItem>
                    <SelectItem value="category">Catégorie</SelectItem>
                    <SelectItem value="status">Statut</SelectItem>
                </SelectContent>
            </Select>
        </div>
        
        {fetchError && (
          <Alert variant="destructive" className="mb-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Erreur de chargement des données</AlertTitle>
              <AlertDescription>
                Une erreur s'est produite: <code className="font-mono text-sm">{fetchError}</code>
              </AlertDescription>
          </Alert>
        )}
        
        {loading || loadingUser ? (
            <div className="flex justify-center items-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        ) : Object.keys(groupedPlayers).length > 0 ? (
        <div className="space-y-4">
            {Object.entries(groupedPlayers).sort(([a], [b]) => a.localeCompare(b)).map(([category, playersInCategory]) => (
                <Collapsible 
                    key={category} 
                    className="border rounded-lg"
                    open={openCategories[category] || false}
                    onOpenChange={() => toggleCategory(category)}
                >
                    <Card>
                        <CollapsibleTrigger asChild>
                             <CardHeader className="flex flex-row items-center justify-between cursor-pointer">
                                <div>
                                    <CardTitle>{category}</CardTitle>
                                    <CardDescription>{playersInCategory.length} joueur(s) dans cette catégorie.</CardDescription>
                                </div>
                                <Button variant="ghost" size="sm">
                                    {openCategories[category] ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
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
                                            <TableHead className="hidden sm:table-cell">Statut</TableHead>
                                            <TableHead className="text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                    {playersInCategory.sort((a, b) => a.name.localeCompare(b.name)).map(player => (
                                        <TableRow key={player.id}>
                                            <TableCell>
                                                <div className="flex items-center gap-3">
                                                    <Avatar>
                                                        <AvatarImage src={player.photoUrl} alt={player.name} data-ai-hint="player portrait" />
                                                        <AvatarFallback>{player.name?.charAt(0)}</AvatarFallback>
                                                    </Avatar>
                                                    <div className="flex flex-col">
                                                        <span className="font-medium">{toTitleCase(player.name)}</span>
                                                        <span className="text-muted-foreground text-sm lg:hidden">{player.position}</span>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell className="hidden lg:table-cell">{player.position}</TableCell>
                                            <TableCell className="hidden sm:table-cell">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                    <Badge className={cn("text-xs font-semibold cursor-pointer", getStatusBadgeClass(player.status))}>
                                                        {player.status || "N/A"}
                                                    </Badge>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuLabel>Changer le statut</DropdownMenuLabel>
                                                        <DropdownMenuRadioGroup 
                                                            value={player.status} 
                                                            onValueChange={(newStatus) => handleUpdateStatus(player.id, newStatus as PlayerStatus)}
                                                        >
                                                            {playerStatuses.map(status => (
                                                                <DropdownMenuRadioItem key={status} value={status}>
                                                                    {status}
                                                                </DropdownMenuRadioItem>
                                                            ))}
                                                        </DropdownMenuRadioGroup>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" className="h-8 w-8 p-0">
                                                    <span className="sr-only">Ouvrir le menu</span>
                                                    <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                                    <Link href={`/dashboard/players/${player.id}`} passHref>
                                                    <DropdownMenuItem className="cursor-pointer">
                                                        <FileText className="mr-2 h-4 w-4" />
                                                        Voir les détails
                                                    </DropdownMenuItem>
                                                    </Link>
                                                    <Link href={`/dashboard/players/${player.id}/edit`} passHref>
                                                    <DropdownMenuItem className="cursor-pointer">
                                                        <Pencil className="mr-2 h-4 w-4" />
                                                        Modifier
                                                    </DropdownMenuItem>
                                                    </Link>
                                                    <Link href={`/dashboard/players/${player.id}/details`} passHref>
                                                    <DropdownMenuItem className="cursor-pointer">
                                                        <FileDown className="mr-2 h-4 w-4" />
                                                        Exporter la fiche
                                                    </DropdownMenuItem>
                                                    </Link>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem
                                                    className="cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10"
                                                    onClick={() => setPlayerToDelete(player)}
                                                    >
                                                    <Trash2 className="mr-2 h-4 w-4" />
                                                    Supprimer
                                                    </DropdownMenuItem>
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
            ))}
        </div>
        ) : !fetchError && (
            <Card>
                <CardContent className="py-20 text-center text-muted-foreground">
                    {searchTerm ? "Aucun joueur ne correspond à votre recherche." : "Aucun joueur trouvé. Commencez par en ajouter un !"}
                </CardContent>
            </Card>
        )}
      </div>

       <AlertDialog open={!!playerToDelete} onOpenChange={(isOpen) => !isOpen && setPlayerToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Êtes-vous sûr de vouloir supprimer ce joueur ?</AlertDialogTitle>
              <AlertDialogDescription>
              Cette action est irréversible. Le joueur "{toTitleCase(playerToDelete?.name || '')}" sera définitivement supprimé de la base de données.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setPlayerToDelete(null)}>Annuler</AlertDialogCancel>
                <AlertDialogAction 
                onClick={confirmDeletePlayer}
                className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                >
                Supprimer
                </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
