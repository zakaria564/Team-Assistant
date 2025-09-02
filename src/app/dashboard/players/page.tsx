"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PlusCircle, Loader2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Link from "next/link";
import { collection, getDocs, query } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";

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

  return (
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
                </TableRow>
              </TableHeader>
              <TableBody>
                {players.length > 0 ? (
                  players.map((player) => (
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
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground">
                      Aucun joueur trouvé. Commencez par en ajouter un !
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
