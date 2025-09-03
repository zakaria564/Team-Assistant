
"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PlusCircle, Loader2, MoreHorizontal, Trash2, Search } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Link from "next/link";
import { collection, getDocs, query, doc, deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";


interface Player {
  id: string;
  name: string;
  category: string;
  number: number;
  photoUrl?: string;
  position?: string;
  phone?: string;
  email?: string;
  tutorName?: string;
  tutorPhone?: string;
  tutorEmail?: string;
}

export default function PlayersPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const [playerToDelete, setPlayerToDelete] = useState<Player | null>(null);
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
      const valueToSearch = (searchCategory === 'name' ? player.name : player.category) || '';
      return valueToSearch.toLowerCase().includes(lowercasedSearchTerm);
    });
  }, [players, searchTerm, searchCategory]);


  const handleDeletePlayer = async () => {
    if (!playerToDelete) return;

    try {
      await deleteDoc(doc(db, "players", playerToDelete.id));
      setPlayers(players.filter(p => p.id !== playerToDelete.id));
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
    } finally {
      setPlayerToDelete(null);
    }
  };

  return (
    <>
      <div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Joueurs</h1>
            <p className="text-muted-foreground">Gérez les joueurs de votre club.</p>
          </div>
          <Button asChild>
            <Link href="/dashboard/players/add">
              <PlusCircle className="mr-2 h-4 w-4" />
              Ajouter un joueur
            </Link>
          </Button>
        </div>

        <div className="mb-4 flex items-center gap-4">
            <div className="relative w-full max-w-sm">
                 <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input 
                    placeholder="Rechercher..."
                    className="pl-10"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
            <Select value={searchCategory} onValueChange={setSearchCategory}>
                <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Critère" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="name">Nom</SelectItem>
                    <SelectItem value="category">Catégorie</SelectItem>
                </SelectContent>
            </Select>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Liste des joueurs</CardTitle>
            <CardDescription>Retrouvez ici tous les joueurs inscrits dans votre club.</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center items-center py-10">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[80px]">Photo</TableHead>
                    <TableHead>Nom</TableHead>
                    <TableHead>Catégorie</TableHead>
                    <TableHead>Poste</TableHead>
                    <TableHead>Numéro</TableHead>
                    <TableHead>Téléphone</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Nom du tuteur</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPlayers.length > 0 ? (
                    filteredPlayers.map((player) => (
                      <TableRow key={player.id}>
                        <TableCell>
                          <Avatar>
                            <AvatarImage src={player.photoUrl} alt={player.name} data-ai-hint="player portrait" />
                            <AvatarFallback>{player.name?.charAt(0)}</AvatarFallback>
                          </Avatar>
                        </TableCell>
                        <TableCell className="font-medium">{player.name}</TableCell>
                        <TableCell>{player.category}</TableCell>
                        <TableCell>{player.position}</TableCell>
                        <TableCell>{player.number}</TableCell>
                        <TableCell>{player.phone}</TableCell>
                        <TableCell>{player.email}</TableCell>
                        <TableCell>{player.tutorName}</TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <span className="sr-only">Ouvrir le menu</span>
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <Link href={`/dashboard/players/${player.id}`}>
                                <DropdownMenuItem>Voir les détails</DropdownMenuItem>
                              </Link>
                              <Link href={`/dashboard/players/${player.id}/edit`}>
                                <DropdownMenuItem>Modifier</DropdownMenuItem>
                              </Link>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                className="text-destructive focus:text-destructive focus:bg-destructive/10"
                                onClick={() => setPlayerToDelete(player)}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Supprimer
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={9} className="py-10 text-center text-muted-foreground">
                        {searchTerm ? "Aucun joueur ne correspond à votre recherche." : "Aucun joueur trouvé. Commencez par en ajouter un !"}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={!!playerToDelete} onOpenChange={(open) => !open && setPlayerToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Êtes-vous sûr de vouloir supprimer ce joueur ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Le joueur "{playerToDelete?.name}" sera définitivement supprimé de la base de données.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPlayerToDelete(null)}>Annuler</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeletePlayer}
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
