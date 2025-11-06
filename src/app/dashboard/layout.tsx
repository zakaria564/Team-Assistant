"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Menu } from "lucide-react";
import { SidebarNav } from "@/components/sidebar-nav";
import { UserNav } from "@/components/user-nav";
import { useState, useEffect } from "react";
import { doc, getDoc, onSnapshot } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthState } from "react-firebase-hooks/auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function DashboardAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, loadingUser] = useAuthState(auth);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [clubName, setClubName] = useState("");
  const [clubLogoUrl, setClubLogoUrl] = useState<string | null>(null);
  const [loadingClubInfo, setLoadingClubInfo] = useState(true);

  useEffect(() => {
    if (loadingUser) return;
    if (!user) {
      setLoadingClubInfo(false);
      setClubName("Team Assistant");
      return;
    }

    setLoadingClubInfo(true);
    const clubDocRef = doc(db, "clubs", user.uid);
    const unsubscribe = onSnapshot(clubDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setClubName(data.clubName || "Team Assistant");
        setClubLogoUrl(data.logoUrl || null);
      } else {
        setClubName("Team Assistant");
        setClubLogoUrl(null);
      }
      setLoadingClubInfo(false);
    }, (error) => {
      console.error("Error fetching club info: ", error);
      setClubName("Team Assistant");
      setClubLogoUrl(null);
      setLoadingClubInfo(false);
    });

    return () => unsubscribe();
  }, [user, loadingUser]);
  
  const clubInitial = clubName?.charAt(0)?.toUpperCase() || "T";

  const ClubBrand = () => (
     <Link href="/dashboard" className="flex items-center gap-3 font-semibold text-primary text-lg">
        {loadingUser || loadingClubInfo ? (
            <Skeleton className="h-16 w-16 rounded-full" />
        ) : (
            <Avatar className="h-16 w-16">
                <AvatarImage src={clubLogoUrl || undefined} alt="Club Logo" />
                <AvatarFallback className="text-2xl">{clubInitial}</AvatarFallback>
            </Avatar>
        )}

        {loadingUser || loadingClubInfo ? (
            <Skeleton className="h-6 w-32" />
        ) : (
            <span className="text-xl">{clubName}</span>
        )}
    </Link>
  )

  return (
    <div className="grid min-h-screen w-full md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr]">
      <div className="hidden border-r bg-sidebar text-sidebar-foreground md:block">
        <div className="flex h-full max-h-screen flex-col gap-2">
          <div className="flex h-24 items-center border-b border-sidebar-border px-4 lg:px-6">
            <ClubBrand />
          </div>
          <div className="flex-1 py-4">
            <SidebarNav />
          </div>
        </div>
      </div>
      <div className="flex flex-col">
        <header className="flex h-14 items-center gap-4 border-b bg-card px-4 lg:h-[60px] lg:px-6">
          <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
            <SheetTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="shrink-0 md:hidden"
              >
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle navigation menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="flex flex-col p-0 w-full max-w-sm bg-sidebar text-sidebar-foreground">
               <SheetHeader className="h-24 flex flex-row items-center border-b border-sidebar-border px-4">
                  <ClubBrand />
                   <SheetTitle className="sr-only">Navigation Principale</SheetTitle>
                </SheetHeader>
                <div className="flex-1 py-4">
                    <SidebarNav onLinkClick={() => setIsSheetOpen(false)} />
                </div>
            </SheetContent>
          </Sheet>
          <div className="w-full flex-1">
            {/* Future search bar can go here */}
          </div>
          <UserNav />
        </header>
        <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6 bg-background">
          {children}
        </main>
      </div>
    </div>
  );
}
