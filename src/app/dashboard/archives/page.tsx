
"use client";

import React, { useState, useEffect } from "react";
import { collection, query, where, onSnapshot, doc, updateDoc, getDocs } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, ArchiveRestore, User, ClipboardList, CreditCard, Wallet, MoreHorizontal, FileText, FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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

  useEffect(() => {
    if (!user) {
      if (!loadingUser) setLoading(false);
      return;
    }

    const fetchData = async () => {
        setLoading(true);
        try {
            // Names Maps
            const pSnap = await getDocs(query(collection(db, "players"), where("userId", "==", user.uid)));
            const cSnap = await getDocs(query(collection(db, "coaches"), where("userId", "==", user.uid)));
            
            const pMap = new Map();
            pSnap.docs.forEach(d => pMap.set(d.id, d.data().name));
            
            const cMap = new Map();
            cSnap.docs.forEach(d => cMap.set(d.id, d.data().name));

            const unsubP = onSnapshot(query(collection(db, "players"), where("userId", "==", user.uid), where("isDeleted", "==", true)), (s) => 
                setPlayers(s.docs.map(d => ({ id: d.id, ...d.data() }))));
            
            const unsubC = onSnapshot(query(collection(db, "coaches"), where("userId", "==", user.uid), where("isDeleted", "==", true)), (s) => 
                setCoaches(s.docs.map(d => ({ id: d.id, ...d.data() }))));
            
            const unsubPay = onSnapshot(query(collection(db, "payments"), where("userId", "==", user.uid), where("isDeleted", "==", true)), (s) => 
                setPayments(s.docs.map(d => ({ id: d.id, ...d.data(), personName: pMap.get(d.data().playerId) || "Joueur" }))));
            
            const unsubSal = onSnapshot(query(collection(db, "salaries"), where("userId", "==", user.uid), where("isDeleted", "==", true)), (s) => 
                setSalaries(s.docs.map(d => ({ id: d.id, ...d.data(), personName: cMap.get(d.data().coachId) || "Entraîneur" }))));

            setLoading(false);
            return () => { unsubP(); unsubC(); unsubPay(); unsubSal(); };
        } catch (e) {
            console.error(e);
            setLoading(false);
        }
    };

    fetchData();
  }, [user, loadingUser]);

  const handleRestore = async (col: string, id: string, name: string) => {
    try {
      await updateDoc(doc(db, col, id), { isDeleted: false });
      toast({ title: "Élément restauré", description: `${name} est de nouveau actif.` });
    } catch (e) {
      toast({ variant: "destructive", title: "Erreur", description: "Restauration impossible." });
    }
  };

  if (loading || loadingUser) {
    return <div className="flex justify-center items-center h-full"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Archives & Copies de Sécurité</h1>
        <p className="text-muted-foreground">Consultez vos copies de sauvegarde et restaurez les éléments si besoin.</p>
      </div>

      <Tabs defaultValue="players">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="players" className="gap-2"><User className="h-4 w-4" /> Joueurs</TabsTrigger>
          <TabsTrigger value="coaches" className="gap-2"><ClipboardList className="h-4 w-4" /> Coachs</TabsTrigger>
          <TabsTrigger value="payments" className="gap-2"><CreditCard className="h-4 w-4" /> Paiements</TabsTrigger>
          <TabsTrigger value="salaries" className="gap-2"><Wallet className="h-4 w-4" /> Salaires</TabsTrigger>
        </TabsList>

        <TabsContent value="players">
          <Card><CardHeader><CardTitle>Joueurs Archivés</CardTitle></CardHeader><CardContent>
              {players.length > 0 ? (
                <Table><TableHeader><TableRow><TableHead>Joueur</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader><TableBody>
                    {players.map(p => (
                      <TableRow key={p.id}><TableCell><div className="flex items-center gap-3"><Avatar className="h-8 w-8"><AvatarImage src={p.photoUrl} /><AvatarFallback>P</AvatarFallback></Avatar><span>{p.name}</span></div></TableCell><TableCell className="text-right">
                          <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end">
                              <Link href={`/dashboard/players/${p.id}`}><DropdownMenuItem className="cursor-pointer"><FileText className="mr-2 h-4 w-4" /> Détails</DropdownMenuItem></Link>
                              <DropdownMenuItem className="cursor-pointer text-primary" onClick={() => handleRestore("players", p.id, p.name)}><ArchiveRestore className="mr-2 h-4 w-4" /> Restaurer</DropdownMenuItem>
                            </DropdownMenuContent></DropdownMenu></TableCell></TableRow>))}
                  </TableBody></Table>
              ) : <p className="text-center py-10 text-muted-foreground">Aucune copie de joueur.</p>}
            </CardContent></Card>
        </TabsContent>

        <TabsContent value="coaches">
          <Card><CardHeader><CardTitle>Entraîneurs Archivés</CardTitle></CardHeader><CardContent>
              {coaches.length > 0 ? (
                <Table><TableHeader><TableRow><TableHead>Entraîneur</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader><TableBody>
                    {coaches.map(c => (
                      <TableRow key={c.id}><TableCell><div className="flex items-center gap-3"><Avatar className="h-8 w-8"><AvatarImage src={c.photoUrl} /><AvatarFallback>E</AvatarFallback></Avatar><span>{c.name}</span></div></TableCell><TableCell className="text-right">
                          <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end">
                              <Link href={`/dashboard/coaches/${c.id}`}><DropdownMenuItem className="cursor-pointer"><FileText className="mr-2 h-4 w-4" /> Détails</DropdownMenuItem></Link>
                              <DropdownMenuItem className="cursor-pointer text-primary" onClick={() => handleRestore("coaches", c.id, c.name)}><ArchiveRestore className="mr-2 h-4 w-4" /> Restaurer</DropdownMenuItem>
                            </DropdownMenuContent></DropdownMenu></TableCell></TableRow>))}
                  </TableBody></Table>
              ) : <p className="text-center py-10 text-muted-foreground">Aucune copie d'entraîneur.</p>}
            </CardContent></Card>
        </TabsContent>

        <TabsContent value="payments">
          <Card><CardHeader><CardTitle>Paiements Archivés</CardTitle></CardHeader><CardContent>
              {payments.length > 0 ? (
                <Table><TableHeader><TableRow><TableHead>Joueur</TableHead><TableHead>Description</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader><TableBody>
                    {payments.map(p => (
                      <TableRow key={p.id}><TableCell className="font-medium">{p.personName}</TableCell><TableCell>{p.description}</TableCell><TableCell className="text-right">
                          <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end">
                              <Link href={`/dashboard/payments/${p.id}`}><DropdownMenuItem className="cursor-pointer"><FileText className="mr-2 h-4 w-4" /> Détails</DropdownMenuItem></Link>
                              <Link href={`/dashboard/payments/${p.id}/receipt`}><DropdownMenuItem className="cursor-pointer"><FileDown className="mr-2 h-4 w-4" /> Reçu PDF</DropdownMenuItem></Link>
                              <DropdownMenuItem className="cursor-pointer text-primary" onClick={() => handleRestore("payments", p.id, p.description)}><ArchiveRestore className="mr-2 h-4 w-4" /> Restaurer</DropdownMenuItem>
                            </DropdownMenuContent></DropdownMenu></TableCell></TableRow>))}
                  </TableBody></Table>
              ) : <p className="text-center py-10 text-muted-foreground">Aucune copie de paiement.</p>}
            </CardContent></Card>
        </TabsContent>

        <TabsContent value="salaries">
          <Card><CardHeader><CardTitle>Salaires Archivés</CardTitle></CardHeader><CardContent>
              {salaries.length > 0 ? (
                <Table><TableHeader><TableRow><TableHead>Entraîneur</TableHead><TableHead>Description</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader><TableBody>
                    {salaries.map(s => (
                      <TableRow key={s.id}><TableCell className="font-medium">{s.personName}</TableCell><TableCell>{s.description}</TableCell><TableCell className="text-right">
                          <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end">
                              <Link href={`/dashboard/salaries/${s.id}`}><DropdownMenuItem className="cursor-pointer"><FileText className="mr-2 h-4 w-4" /> Détails</DropdownMenuItem></Link>
                              <Link href={`/dashboard/salaries/${s.id}/receipt`}><DropdownMenuItem className="cursor-pointer"><FileDown className="mr-2 h-4 w-4" /> Fiche PDF</DropdownMenuItem></Link>
                              <DropdownMenuItem className="cursor-pointer text-primary" onClick={() => handleRestore("salaries", s.id, s.description)}><ArchiveRestore className="mr-2 h-4 w-4" /> Restaurer</DropdownMenuItem>
                            </DropdownMenuContent></DropdownMenu></TableCell></TableRow>))}
                  </TableBody></Table>
              ) : <p className="text-center py-10 text-muted-foreground">Aucune copie de salaire.</p>}
            </CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
