
"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PlusCircle, Loader2, MoreHorizontal, Trash2, Search } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Link from "next/link";
import { collection, getDocs, query, doc, deleteDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";


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


export default function PlayersPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [searchCategory, setSearchCategory] = useState("name");

  useEffect(() => {
    const fetchPlayers = async () => {
      setLoading(true);
      try {
        const q = query(collection(db, "players"));
        const querySnapshot = await getDocs(q);
        const playersData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Player));
        setPlayers(playersData);
      } catch (error) {
        console.error("Error fetching players: ", error);
        toast({
          variant: "destructive",
          title: "Erreur de permissions",
          description: "Impossible de charger les joueurs. Veuillez vérifier vos règles de sécurité Firestore.",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchPlayers();
  }, [toast]);
  
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


  const handleDeletePlayer = async (playerId: string) => {
    try {
      const playerToDelete = players.find(p => p.id === playerId);
      if (!playerToDelete) return;
      await deleteDoc(doc(db, "players", playerToDelete.id));
      setPlayers(players.filter(p => p.id !== playerId));
      toast({
        title: "Joueur supprimé",
        description: `${playerToDelete.name} a été retiré du club.`,
      });
    } catch (error) {
       toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de supprimer le joueur.",
      });
      console.error("Error deleting player: ", error);
    }
  };

  return (
    <>
      <div>
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

        <Card>
          <CardHeader>
            <CardTitle>Liste des joueurs</CardTitle>
            <CardDescription>Retrouvez ici tous les joueurs inscrits dans votre club.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="w-full overflow-x-auto">
              {loading ? (
                <div className="flex justify-center items-center py-10">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[80px] hidden sm:table-cell">Photo</TableHead>
                      <TableHead>Nom</TableHead>
                      <TableHead className="hidden lg:table-cell">Catégorie</TableHead>
                      <TableHead className="hidden xl:table-cell">Poste</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead className="hidden md:table-cell">Téléphone</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPlayers.length > 0 ? (
                      filteredPlayers.map((player) => (
                        <TableRow key={player.id}>
                          <TableCell className="hidden sm:table-cell">
                            <Avatar>
                              <AvatarImage src={player.photoUrl} alt={player.name} data-ai-hint="player portrait" />
                              <AvatarFallback>{player.name?.charAt(0)}</AvatarFallback>
                            </Avatar>
                          </TableCell>
                          <TableCell className="font-medium">{player.name}</TableCell>
                          <TableCell className="hidden lg:table-cell">{player.category}</TableCell>
                          <TableCell className="hidden xl:table-cell">{player.position}</TableCell>
                           <TableCell>
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
                          <TableCell className="hidden md:table-cell">{player.phone}</TableCell>
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
                                  <DropdownMenuItem className="cursor-pointer">Voir les détails</DropdownMenuItem>
                                </Link>
                                <Link href={`/dashboard/players/${player.id}/edit`} passHref>
                                  <DropdownMenuItem className="cursor-pointer">Modifier</DropdownMenuItem>
                                </Link>
                                <DropdownMenuSeparator />
                                  <AlertDialog>
                                      <AlertDialogTrigger asChild>
                                          <DropdownMenuItem 
                                          className="text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer"
                                          onSelect={(e) => e.preventDefault()}
                                          >
                                              <Trash2 className="mr-2 h-4 w-4" />
                                              Supprimer
                                          </DropdownMenuItem>
                                      </AlertDialogTrigger>
                                      <AlertDialogContent>
                                        <AlertDialogHeader>
                                          <AlertDialogTitle>Êtes-vous sûr de vouloir supprimer ce joueur ?</AlertDialogTitle>
                                          <AlertDialogDescription>
                                          Cette action est irréversible. Le joueur "{player.name}" sera définitivement supprimé de la base de données.
                                          </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Annuler</AlertDialogCancel>
                                            <AlertDialogAction 
                                            onClick={() => handleDeletePlayer(player.id)}
                                            className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                                            >
                                            Supprimer
                                            </AlertDialogAction>
                                        </AlertDialogFooter>
                                      </AlertDialogContent>
                                  </AlertDialog>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                          {searchTerm ? "Aucun joueur ne correspond à votre recherche." : "Aucun joueur trouvé. Commencez par en ajouter un !"}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

    