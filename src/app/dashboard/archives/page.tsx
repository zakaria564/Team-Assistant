
"use client";

import React, { useState, useEffect } from "react";
import { collection, query, where, getDocs, doc, updateDoc } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, ArchiveRestore, User, ClipboardList, CreditCard, Wallet, Trash2, Archive, MoreHorizontal, FileText, FileDown, IdCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Link from "next/link";

export default function ArchivesPage() {
  const [user, loadingUser] = useAuthState(auth);
  const [players, setPlayers] = useState<any[]>([]);
  const [coaches, setCoaches] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [salaries, setSalaries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const qPlayers = query(collection(db, "players"), where("userId", "==", user.uid));
      const qCoaches = query(collection(db, "coaches"), where("userId", "==", user.uid));
      const qPayments = query(collection(db, "payments"), where("userId", "==", user.uid));
      const qSalaries = query(collection(db, "salaries"), where("userId", "==", user.uid));

      const [snapP, snapC, snapPay, snapS] = await Promise.all([
        getDocs(qPlayers), getDocs(qCoaches), getDocs(qPayments), getDocs(qSalaries)
      ]);

      const playersMap = new Map();
      snapP.docs.forEach(d => playersMap.set(d.id, d.data().name));
      
      const coachesMap = new Map();
      snapC.docs.forEach(d => coachesMap.set(d.id, d.data().name));

      // Filter: either archived manually or deleted
      setPlayers(snapP.docs.map(d => ({ id: d.id, ...d.data() })).filter(d => d.isDeleted === true));
      setCoaches(snapC.docs.map(d => ({ id: d.id, ...d.data() })).filter(d => d.isDeleted === true));
      
      setPayments(snapPay.docs.map(d => {
          const data = d.data();
          return { 
              id: d.id, 
              ...data, 
              personName: playersMap.get(data.playerId) || data.playerName || "Joueur inconnu"
          };
      }).filter(d => d.isDeleted === true));

      setSalaries(snapS.docs.map(d => {
          const data = d.data();
          return { 
              id: d.id, 
              ...data, 
              personName: coachesMap.get(data.coachId) || data.coachName || "Entraîneur inconnu"
          };
      }).filter(d => d.isDeleted === true));

    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user || !loadingUser) fetchData();
  }, [user, loadingUser]);

  const handleRestore = async (collectionName: string, id: string, name: string) => {
    try {
      await updateDoc(doc(db, collectionName, id), { isDeleted: false });
      toast({ title: "Élément restauré", description: `${name} a été replacé dans la liste active.` });
      fetchData();
    } catch (e) {
      toast({ variant: "destructive", title: "Erreur", description: "Impossible de restaurer l'élément." });
    }
  };

  if (loading || loadingUser) {
    return (
      <div className="flex justify-center items-center h-full">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Archives & Historique</h1>
        <p className="text-muted-foreground">Consultez les éléments supprimés. Ces copies sont conservées pour votre sécurité.</p>
      </div>

      <Tabs defaultValue="players">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="players" className="gap-2"><User className="h-4 w-4" /> Joueurs</TabsTrigger>
          <TabsTrigger value="coaches" className="gap-2"><ClipboardList className="h-4 w-4" /> Entraîneurs</TabsTrigger>
          <TabsTrigger value="payments" className="gap-2"><CreditCard className="h-4 w-4" /> Paiements</TabsTrigger>
          <TabsTrigger value="salaries" className="gap-2"><Wallet className="h-4 w-4" /> Salaires</TabsTrigger>
        </TabsList>

        <TabsContent value="players">
          <Card>
            <CardHeader><CardTitle>Joueurs Supprimés</CardTitle></CardHeader>
            <CardContent>
              {players.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Joueur</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {players.map(p => (
                      <TableRow key={p.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8"><AvatarImage src={p.photoUrl} /><AvatarFallback>{p.name ? p.name[0] : 'P'}</AvatarFallback></Avatar>
                            <span className="font-medium">{p.name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <Link href={`/dashboard/players/${p.id}`} passHref>
                                <DropdownMenuItem className="cursor-pointer">
                                  <FileText className="mr-2 h-4 w-4" /> Voir détails
                                </DropdownMenuItem>
                              </Link>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="cursor-pointer text-primary" onClick={() => handleRestore("players", p.id, p.name)}>
                                <ArchiveRestore className="mr-2 h-4 w-4" /> Restaurer
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : <p className="text-center py-10 text-muted-foreground">Aucun joueur dans les archives.</p>}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="coaches">
          <Card>
            <CardHeader><CardTitle>Entraîneurs Supprimés</CardTitle></CardHeader>
            <CardContent>
              {coaches.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Entraîneur</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {coaches.map(c => (
                      <TableRow key={c.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8"><AvatarImage src={c.photoUrl} /><AvatarFallback>{c.name ? c.name[0] : 'E'}</AvatarFallback></Avatar>
                            <span className="font-medium">{c.name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <Link href={`/dashboard/coaches/${c.id}`} passHref>
                                <DropdownMenuItem className="cursor-pointer">
                                  <FileText className="mr-2 h-4 w-4" /> Voir détails
                                </DropdownMenuItem>
                              </Link>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="cursor-pointer text-primary" onClick={() => handleRestore("coaches", c.id, c.name)}>
                                <ArchiveRestore className="mr-2 h-4 w-4" /> Restaurer
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : <p className="text-center py-10 text-muted-foreground">Aucun entraîneur dans les archives.</p>}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments">
          <Card>
            <CardHeader><CardTitle>Paiements Supprimés</CardTitle></CardHeader>
            <CardContent>
              {payments.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Joueur</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.map(p => (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium">{p.personName}</TableCell>
                        <TableCell>{p.description}</TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <Link href={`/dashboard/payments/${p.id}`} passHref>
                                <DropdownMenuItem className="cursor-pointer">
                                  <FileText className="mr-2 h-4 w-4" /> Voir détails
                                </DropdownMenuItem>
                              </Link>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="cursor-pointer text-primary" onClick={() => handleRestore("payments", p.id, p.description)}>
                                <ArchiveRestore className="mr-2 h-4 w-4" /> Restaurer
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : <p className="text-center py-10 text-muted-foreground">Aucun paiement dans les archives.</p>}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="salaries">
          <Card>
            <CardHeader><CardTitle>Salaires Supprimés</CardTitle></CardHeader>
            <CardContent>
              {salaries.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Entraîneur</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {salaries.map(s => (
                      <TableRow key={s.id}>
                        <TableCell className="font-medium">{s.personName}</TableCell>
                        <TableCell>{s.description}</TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <Link href={`/dashboard/salaries/${s.id}`} passHref>
                                <DropdownMenuItem className="cursor-pointer">
                                  <FileText className="mr-2 h-4 w-4" /> Voir détails
                                </DropdownMenuItem>
                              </Link>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="cursor-pointer text-primary" onClick={() => handleRestore("salaries", s.id, s.description)}>
                                <ArchiveRestore className="mr-2 h-4 w-4" /> Restaurer
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : <p className="text-center py-10 text-muted-foreground">Aucun salaire dans les archives.</p>}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
