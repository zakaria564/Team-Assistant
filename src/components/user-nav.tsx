
"use client";

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogOut, User, RefreshCw } from "lucide-react";
import Link from "next/link";
import { auth, db } from "@/lib/firebase";
import { useAuthState } from 'react-firebase-hooks/auth';
import { signOut } from "firebase/auth";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { Skeleton } from "./ui/skeleton";
import { doc, onSnapshot } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";


export function UserNav() {
  const [user, loading, error] = useAuthState(auth);
  const router = useRouter();
  const { toast } = useToast();
  const [userPhotoUrl, setUserPhotoUrl] = useState<string | null>(null);
  const [loadingClub, setLoadingClub] = useState(true);

  useEffect(() => {
    if (loading) {
      setLoadingClub(true);
      return;
    }
    if (!user) {
      setLoadingClub(false);
      return;
    }
      
    const clubDocRef = doc(db, "clubs", user.uid);
    const unsubscribe = onSnapshot(clubDocRef, (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        setUserPhotoUrl(data.adminPhotoUrl || data.logoUrl || null);
      } else {
        setUserPhotoUrl(null);
      }
      setLoadingClub(false);
    }, (error) => {
        console.error("Error fetching user photo:", error);
        setUserPhotoUrl(null);
        setLoadingClub(false);
    });

    return () => unsubscribe();
  }, [user, loading]);

  const handleLogout = () => {
    signOut(auth);
    router.push("/");
  };

  const handleSync = () => {
    toast({
      title: "Synchronisation...",
      description: "Mise à jour de l'application en cours.",
    });
    // Forcer le rechargement complet et ignorer le cache
    setTimeout(() => {
      window.location.href = window.location.origin + '/dashboard?t=' + Date.now();
    }, 1000);
  };

  if (loading || loadingClub) {
    return (
       <Skeleton className="h-12 w-12 rounded-full" />
    )
  }

  if (!user) {
    return null;
  }

  const userInitial = user?.displayName?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || "A";

  return (
    <div className="flex items-center gap-2">
      <Button 
        variant="outline" 
        size="sm" 
        onClick={handleSync}
        className="flex items-center gap-2 bg-blue-600 text-white border-blue-700 hover:bg-blue-700 animate-pulse"
      >
        <RefreshCw className="h-4 w-4" />
        <span className="hidden sm:inline font-bold">SYNCHRONISER</span>
      </Button>
      
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="relative h-12 w-12 rounded-full">
            <Avatar className="h-12 w-12 border-2 border-primary/20">
              <AvatarImage src={userPhotoUrl || undefined} alt={user?.displayName || 'User profile'} />
              <AvatarFallback>{userInitial}</AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56" align="end" forceMount>
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium leading-none">{user?.displayName || "Utilisateur"}</p>
              <p className="text-xs leading-none text-muted-foreground">
                {user?.email}
              </p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
             <DropdownMenuItem onClick={handleSync} className="cursor-pointer sm:hidden text-blue-600 font-bold">
                <RefreshCw className="mr-2 h-4 w-4" />
                <span>Synchroniser</span>
              </DropdownMenuItem>
             <Link href="/dashboard/settings" passHref>
              <DropdownMenuItem className="cursor-pointer">
                <User className="mr-2 h-4 w-4" />
                <span>Profil & Club</span>
              </DropdownMenuItem>
            </Link>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-destructive focus:text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              <span>Se déconnecter</span>
            </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
