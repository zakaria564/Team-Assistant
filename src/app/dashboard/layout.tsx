
"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Menu } from "lucide-react";
import { SidebarNav } from "@/components/sidebar-nav";
import { UserNav } from "@/components/user-nav";
import { useState, useEffect } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthState } from "react-firebase-hooks/auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function DashboardAppLayout({
  children,
}: {
  children: React.Node;
}) {
  const [user, loadingUser] = useAuthState(auth);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [clubName, setClubName] = useState("");
  const [displayTitle, setDisplayTitle] = useState("");
  const [clubLogoUrl, setClubLogoUrl] = useState<string | null>(null);
  const [loadingClubInfo, setLoadingClubInfo] = useState(true);

  useEffect(() => {
    if (loadingUser) return;
    if (!user) {
      setLoadingClubInfo(false);
      setClubName("Team Assistant");
      setDisplayTitle("CLUB USDS");
      return;
    }

    setLoadingClubInfo(true);
    const clubDocRef = doc(db, "clubs", user.uid);
    const unsubscribe = onSnapshot(clubDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setClubName(data.clubName || "Team Assistant");
        setDisplayTitle(data.displayTitle || "CLUB USDS");
        setClubLogoUrl(data.logoUrl || null);
      } else {
        setClubName("Team Assistant");
        setDisplayTitle("CLUB USDS");
        setClubLogoUrl(null);
      }
      setLoadingClubInfo(false);
    }, (error) => {
      console.error("Error fetching club info: ", error);
      setClubName("Team Assistant");
      setDisplayTitle("CLUB USDS");
      setClubLogoUrl(null);
      setLoadingClubInfo(false);
    });

    return () => unsubscribe();
  }, [user, loadingUser]);
  
  const clubInitial = clubName?.charAt(0)?.toUpperCase() || "T";

  const ClubBrand = () => (
     <Link href="/dashboard" className="flex flex-col items-center gap-4 w-full py-4 px-2 group transition-all">
        {loadingUser || loadingClubInfo ? (
            <Skeleton className="h-24 w-24 rounded-full" />
        ) : (
            <div className="relative">
                <div className="absolute -inset-1 bg-gradient-to-r from-primary to-accent rounded-full blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
                <Avatar className="h-24 w-24 shadow-2xl border-4 border-sidebar-accent relative bg-white">
                    <AvatarImage src={clubLogoUrl || undefined} alt="Club Logo" className="object-contain p-1" />
                    <AvatarFallback className="text-4xl font-black bg-sidebar-accent text-sidebar-foreground">{clubInitial}</AvatarFallback>
                </Avatar>
            </div>
        )}

        {loadingUser || loadingClubInfo ? (
            <Skeleton className="h-10 w-40" />
        ) : (
            <div className="flex flex-col items-center space-y-1">
                <span className="text-3xl font-black uppercase tracking-tighter bg-gradient-to-br from-white via-white/90 to-white/70 bg-clip-text text-transparent drop-shadow-lg text-center px-2 leading-[0.9] transition-transform group-hover:scale-105 duration-300">
                    {clubName}
                </span>
                <div className="h-1 w-12 bg-primary rounded-full opacity-50"></div>
            </div>
        )}
    </Link>
  )

  return (
    <div className="grid h-screen w-full md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr]">
      <div className="hidden border-r bg-sidebar text-sidebar-foreground md:block shadow-inner">
        <div className="flex h-full max-h-screen flex-col gap-2">
          <div className="flex flex-col items-center border-b border-sidebar-border/50 px-4 py-10 lg:px-6 bg-black/10">
            <ClubBrand />
          </div>
          <div className="flex-1 py-6 overflow-y-auto custom-scrollbar">
            <SidebarNav />
          </div>
        </div>
      </div>
      <div className="flex flex-col">
        <header className="flex h-14 items-center justify-between border-b bg-card px-4 lg:h-[60px] lg:px-6 relative overflow-hidden shadow-sm">
          <div className="flex items-center z-10">
            <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="shrink-0 md:hidden border-sidebar-border/20"
                >
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Toggle navigation menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="flex flex-col p-0 w-full max-w-xs bg-sidebar text-sidebar-foreground border-r-0">
                 <SheetHeader className="flex flex-col items-center border-b border-sidebar-border/50 px-4 py-10 bg-black/10">
                    <ClubBrand />
                     <SheetTitle className="sr-only">Navigation Principale</SheetTitle>
                  </SheetHeader>
                  <div className="flex-1 py-6 overflow-y-auto">
                      <SidebarNav onLinkClick={() => setIsSheetOpen(false)} />
                  </div>
              </SheetContent>
            </Sheet>
          </div>

          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-[50%] md:max-w-[65%] px-2 text-center pointer-events-none">
            {loadingClubInfo ? (
              <Skeleton className="h-8 w-48 mx-auto" />
            ) : (
              <h1 className="text-sm sm:text-lg md:text-2xl lg:text-3xl font-black uppercase tracking-tighter bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent drop-shadow-sm leading-tight break-words line-clamp-1 md:line-clamp-none">
                {displayTitle}
              </h1>
            )}
          </div>

          <div className="flex items-center z-10">
            <UserNav />
          </div>
        </header>
        <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-8 bg-background/50 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
