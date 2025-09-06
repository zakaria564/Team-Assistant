
"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Menu, Trophy } from "lucide-react";
import { SidebarNav } from "@/components/sidebar-nav";
import { UserNav } from "@/components/user-nav";
import { useState, useEffect } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [clubName, setClubName] = useState("");
  const [loadingClubName, setLoadingClubName] = useState(true);

  useEffect(() => {
    const fetchClubName = async () => {
      setLoadingClubName(true);
      try {
        const clubDocRef = doc(db, "club", "main");
        const docSnap = await getDoc(clubDocRef);
        if (docSnap.exists()) {
          setClubName(docSnap.data().clubName);
        } else {
          setClubName("Team Assistant");
        }
      } catch (error) {
        console.error("Error fetching club name: ", error);
        setClubName("Team Assistant");
      } finally {
        setLoadingClubName(false);
      }
    };
    fetchClubName();
  }, []);

  return (
    <div className="grid min-h-screen w-full md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr]">
      <div className="hidden border-r bg-sidebar text-sidebar-foreground md:block">
        <div className="flex h-full max-h-screen flex-col gap-2">
          <div className="flex h-14 items-center border-b border-sidebar-border px-4 lg:h-[60px] lg:px-6">
            <Link href="/dashboard" className="flex items-center gap-2 font-semibold text-primary">
              <Trophy className="h-6 w-6" />
              {loadingClubName ? (
                <Skeleton className="h-5 w-32" />
              ) : (
                <span className="">{clubName}</span>
              )}
            </Link>
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
               <SheetHeader className="h-14 flex flex-row items-center border-b border-sidebar-border px-4">
                  <Link href="/dashboard" className="flex items-center gap-2 font-semibold text-primary">
                    <Trophy className="h-6 w-6" />
                    {loadingClubName ? (
                      <Skeleton className="h-5 w-32" />
                    ) : (
                      <span className="">{clubName}</span>
                    )}
                  </Link>
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
        <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6 bg-muted/20">
          {children}
        </main>
      </div>
    </div>
  );
}
