
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PlusCircle, Loader2, MoreHorizontal, Trash2, Pencil } from "lucide-react";
import Link from "next/link";
import { collection, getDocs, query, doc, deleteDoc, where, onSnapshot } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { useAuthState } from "react-firebase-hooks/auth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger
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
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { AddOpponentForm } from "@/components/opponents/add-opponent-form";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface Opponent {
  id: string;
  name: string;
  logoUrl?: string;
}

const toTitleCase = (str: string) => {
  if (!str) return '';
  return str.toLowerCase().split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
};

export default function OpponentsPage() {
  const [user, loadingUser] = useAuthState(auth);
  const [opponents, setOpponents] = useState<Opponent[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const [opponentToDelete, setOpponentToDelete] = useState<Opponent | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedOpponent, setSelectedOpponent] = useState<Opponent | null>(null);

  useEffect(() => {
    if (!user) {
      if (!loadingUser) setLoading(false);
      return;
    }
    setLoading(true);
    const q = query(collection(db, "opponents"), where("userId", "==", user.uid));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const opponentsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Opponent));
      setOpponents(opponentsData.sort((a, b) => a.name.localeCompare(b.name)));
      setLoading(false);
    }, (error) => {
      console.error("Error fetching opponents: ", error);
      toast({
        variant: "destructive",
        title: "Erreur de chargement",
        description: "Impossible de charger les adversaires.",
      });
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, loadingUser, toast]);

  const confirmDeleteOpponent = async () => {
    if (!opponentToDelete) return;
    try {
      await deleteDoc(doc(db, "opponents", opponentToDelete.id));
      toast({
        title: "Adversaire supprimé",
        description: `${toTitleCase(opponentToDelete.name)} a été supprimé.`,
      });
    } catch (error) {
       toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de supprimer l'adversaire.",
      });
      console.error("Error deleting opponent: ", error);
    } finally {
        setOpponentToDelete(null);
    }
  };

  const handleEdit = (opponent: Opponent) => {
    setSelectedOpponent(opponent);
    setIsFormOpen(true);
  };

  const handleAdd = () => {
    setSelectedOpponent(null);
    setIsFormOpen(true);
  };

  return (
    <>
      <div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Adversaires</h1>
            <p className="text-muted-foreground">Gérez les équipes adverses.</p>
          </div>
          <Button onClick={handleAdd}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Ajouter un adversaire
          </Button>
        </div>

        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{selectedOpponent ? "Modifier l'adversaire" : "Ajouter un adversaire"}</DialogTitle>
              <DialogDescription>
                {selectedOpponent ? "Mettez à jour le nom de l'équipe." : "Ajoutez une nouvelle équipe à votre liste d'adversaires."}
              </DialogDescription>
            </DialogHeader>
            <AddOpponentForm opponent={selectedOpponent} onFinished={() => setIsFormOpen(false)} />
          </DialogContent>
        </Dialog>

        <Card>
          <CardHeader>
            <CardTitle>Liste des adversaires</CardTitle>
            <CardDescription>Retrouvez ici toutes les équipes que vous affrontez.</CardDescription>
          </CardHeader>
          <CardContent>
            {loading || loadingUser ? (
              <div className="flex justify-center items-center py-10">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nom de l'équipe</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {opponents.length > 0 ? (
                    opponents.map((opponent) => (
                      <TableRow key={opponent.id}>
                         <TableCell className="font-medium">
                           <div className="flex items-center gap-3">
                              <Avatar>
                                <AvatarImage src={opponent.logoUrl} alt={opponent.name} />
                                <AvatarFallback>{opponent.name?.charAt(0)}</AvatarFallback>
                              </Avatar>
                              <span>{toTitleCase(opponent.name)}</span>
                           </div>
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
                              <DropdownMenuItem className="cursor-pointer" onClick={() => handleEdit(opponent)}>
                                <Pencil className="mr-2 h-4 w-4" />
                                Modifier
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10"
                                onClick={() => setOpponentToDelete(opponent)}
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
                      <TableCell colSpan={2} className="h-24 text-center">
                        Aucun adversaire trouvé.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

       <AlertDialog open={!!opponentToDelete} onOpenChange={(isOpen) => !isOpen && setOpponentToDelete(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Êtes-vous sûr de vouloir supprimer cet adversaire ?</AlertDialogTitle>
                <AlertDialogDescription>
                  Cette action est irréversible. L'équipe "{toTitleCase(opponentToDelete?.name || '')}" sera définitivement supprimée.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setOpponentToDelete(null)}>Annuler</AlertDialogCancel>
                <AlertDialogAction 
                    onClick={confirmDeleteOpponent}
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
