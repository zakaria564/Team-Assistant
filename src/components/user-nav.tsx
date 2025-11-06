
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
import { LogOut, User } from "lucide-react";
import Link from "next/link";
import { auth, db } from "@/lib/firebase";
import { useAuthState } from 'react-firebase-hooks/auth';
import { signOut } from "firebase/auth";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { Skeleton } from "./ui/skeleton";
import { doc, onSnapshot } from "firebase/firestore";


export function UserNav() {
  const [user, loading, error] = useAuthState(auth);
  const router = useRouter();
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
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-12 w-12 rounded-full">
          <Avatar className="h-12 w-12">
            <AvatarImage src={userPhotoUrl || undefined} alt={user?.displayName || 'User profile picture'} />
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
           <Link href="/dashboard/settings" passHref>
            <DropdownMenuItem className="cursor-pointer">
              <User className="mr-2 h-4 w-4" />
              <span>Profil & Club</span>
            </DropdownMenuItem>
          </Link>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleLogout} className="cursor-pointer">
            <LogOut className="mr-2 h-4 w-4" />
            <span>Se déconnecter</span>
          </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
