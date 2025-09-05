
"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PlusCircle, Loader2, Search, MoreHorizontal, Trash2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Link from "next/link";
import { collection, getDocs, query, doc, deleteDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
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


const coachStatuses = ["Actif", "Inactif"] as const;
type CoachStatus = typeof coachStatuses[number];

interface Coach {
  id: string;
  name: string;
  category: string;
  status: CoachStatus;
  phone?: string;
  email: string;
  photoUrl?: string;
  specialty?: string;
}

const getStatusBadgeClass = (status?: CoachStatus) => {
    switch (status) {
        case 'Actif': return 'bg-green-100 text-green-800 border-green-300 hover:bg-green-200';
        case 'Inactif': return 'bg-gray-100 text-gray-800 border-gray-300 hover:bg-gray-200';
        default: return '';
    }
}

export default function CoachesPage() {
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [searchCategory, setSearchCategory] = useState("name");


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
  
  const filteredCoaches = useMemo(() => {
    if (!searchTerm) return coaches;
    const lowercasedSearchTerm = searchTerm.toLowerCase();

    return coaches.filter(coach => {
        let valueToSearch: string | undefined;
        switch(searchCategory) {
            case 'name':
                valueToSearch = coach.name;
                break;
            case 'category':
                valueToSearch = coach.category;
                break;
            case 'status':
                valueToSearch = coach.status;
                break;
            case 'specialty':
                valueToSearch = coach.specialty;
                break;
            default:
                valueToSearch = coach.name;
        }
        return (valueToSearch || '').toLowerCase().includes(lowercasedSearchTerm);
    });
  }, [coaches, searchTerm, searchCategory]);
  
  const handleUpdateStatus = async (coachId: string, newStatus: CoachStatus) => {
    try {
        const coachDocRef = doc(db, "coaches", coachId);
        await updateDoc(coachDocRef, { status: newStatus });
        
        setCoaches(prevCoaches => 
            prevCoaches.map(c => c.id === coachId ? { ...c, status: newStatus } : c)
        );

        toast({
            title: "Statut mis à jour",
            description: `Le statut de l'entraîneur a été changé en "${newStatus}".`
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

  const handleDeleteCoach = async (coachId: string) => {
    try {
      const coachToDelete = coaches.find(c => c.id === coachId);
      if (!coachToDelete) return;
      
      await deleteDoc(doc(db, "coaches", coachId));
      setCoaches(coaches.filter(p => p.id !== coachId));
      toast({
        title: "Entraîneur supprimé",
        description: `${coachToDelete.name} a été retiré du club.`,
      });
    } catch (error) {
       toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de supprimer l'entraîneur.",
      });
      console.error("Error deleting coach: ", error);
    }
  };


  return (
    <>
      <div>
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Entraîneurs</h1>
            <p className="text-muted-foreground">Gérez les entraîneurs de votre club.</p>
          </div>
          <Button asChild className="w-full md:w-auto">
            <Link href="/dashboard/coaches/add">
              <PlusCircle className="mr-2 h-4 w-4" />
              Ajouter un entraîneur
            </Link>
          </Button>
        </div>

        <div className="flex flex-col md:flex-row items-center gap-4 mb-4">
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
                      <SelectItem value="specialty">Spécialité</SelectItem>
                      <SelectItem value="category">Catégorie</SelectItem>
                      <SelectItem value="status">Statut</SelectItem>
                  </SelectContent>
              </Select>
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
              <div className="w-full overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Entraîneur</TableHead>
                      <TableHead className="hidden md:table-cell">Spécialité</TableHead>
                      <TableHead className="hidden sm:table-cell">Statut</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCoaches.length > 0 ? (
                      filteredCoaches.map((coach) => (
                        <TableRow key={coach.id}>
                           <TableCell>
                                <div className="flex items-center gap-3">
                                    <Avatar>
                                      <AvatarImage src={coach.photoUrl} alt={coach.name} data-ai-hint="coach portrait" />
                                      <AvatarFallback>{coach.name?.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                    <div className="flex flex-col">
                                        <span className="font-medium">{coach.name}</span>
                                        <span className="text-muted-foreground text-sm md:hidden">{coach.specialty}</span>
                                    </div>
                                </div>
                          </TableCell>
                          <TableCell className="hidden md:table-cell">{coach.specialty}</TableCell>
                          <TableCell className="hidden sm:table-cell">
                             <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                 <Button variant="outline" className={cn("text-xs font-semibold px-2 py-1 h-auto border", getStatusBadgeClass(coach.status))}>
                                    {coach.status || "N/A"}
                                 </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                  <DropdownMenuLabel>Changer le statut</DropdownMenuLabel>
                                  <DropdownMenuRadioGroup 
                                      value={coach.status} 
                                      onValueChange={(newStatus) => handleUpdateStatus(coach.id, newStatus as CoachStatus)}
                                  >
                                      {coachStatuses.map(status => (
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
                                  <Link href={`/dashboard/coaches/${coach.id}`}>
                                    <DropdownMenuItem className="cursor-pointer">Voir les détails</DropdownMenuItem>
                                  </Link>
                                  <Link href={`/dashboard/coaches/${coach.id}/edit`}>
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
                                              <AlertDialogTitle>Êtes-vous sûr de vouloir supprimer cet entraîneur ?</AlertDialogTitle>
                                              <AlertDialogDescription>
                                              Cette action est irréversible. L'entraîneur "{coach.name}" sera définitivement supprimé de la base de données.
                                              </AlertDialogDescription>
                                          </AlertDialogHeader>
                                          <AlertDialogFooter>
                                              <AlertDialogCancel>Annuler</AlertDialogCancel>
                                              <AlertDialogAction 
                                                  onClick={() => handleDeleteCoach(coach.id)}
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
                          <TableCell colSpan={4} className="py-10 text-center text-muted-foreground">
                            {searchTerm ? "Aucun entraîneur ne correspond à votre recherche." : "Aucun entraîneur trouvé. Commencez par en ajouter un !"}
                          </TableCell>
                        </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
