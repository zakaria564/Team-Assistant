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

interface Coach {
  id: string;
  name: string;
  category: string;
  phone?: string;
  email: string;
  photoUrl?: string;
}

export default function CoachesPage() {
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchCoaches = async () => {
      setLoading(true);
      try {
        const q = query(collection(db, "coaches"));
        const querySnapshot = await getDocs(q);
        const coachesData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Coach));
        setCoaches(coachesData);
      } catch (error: any) {
        console.error("Error fetching coaches: ", error);
        toast({
          variant: "destructive",
          title: "Erreur de permissions",
          description: "Impossible de charger les entraîneurs. Veuillez vérifier vos règles de sécurité Firestore.",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchCoaches();
  }, [toast]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Entraîneurs</h1>
          <p className="text-muted-foreground">Gérez les entraîneurs de votre club.</p>
        </div>
        <Button asChild>
          <Link href="/dashboard/coaches/add">
            <PlusCircle className="mr-2 h-4 w-4" />
            Ajouter un entraîneur
          </Link>
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Liste des entraîneurs</CardTitle>
          <CardDescription>Retrouvez ici tous les entraîneurs du club.</CardDescription>
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
                  <TableHead>Téléphone</TableHead>
                  <TableHead>Email</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {coaches.length > 0 ? (
                  coaches.map((coach) => (
                    <TableRow key={coach.id}>
                      <TableCell>
                        <Avatar>
                          <AvatarImage src={coach.photoUrl} alt={coach.name} data-ai-hint="coach portrait" />
                          <AvatarFallback>{coach.name?.charAt(0)}</AvatarFallback>
                        </Avatar>
                      </TableCell>
                      <TableCell className="font-medium">{coach.name}</TableCell>
                      <TableCell>{coach.category}</TableCell>
                      <TableCell>{coach.phone}</TableCell>
                      <TableCell>{coach.email}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      Aucun entraîneur trouvé. Commencez par en ajouter un !
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
