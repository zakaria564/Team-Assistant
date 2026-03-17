
"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { LayoutDashboard, Users, FileText, Calendar, Settings, ClipboardList, CreditCard, Shield, Banknote, Trophy } from "lucide-react";
import { useState, useEffect } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { useAuthState } from "react-firebase-hooks/auth";

export function SidebarNav({ onLinkClick }: { onLinkClick?: () => void }) {
  const pathname = usePathname();
  const [user] = useAuthState(auth);
  const [pendingPaymentsCount, setPendingPaymentsCount] = useState(0);
  const [pendingSalariesCount, setPendingSalariesCount] = useState(0);

  useEffect(() => {
    if (!user) return;

    // Listen to players and payments to count pending
    const unsubscribePlayers = onSnapshot(query(collection(db, "players"), where("userId", "==", user.uid)), (playersSnap) => {
        const playerIds = playersSnap.docs.map(d => d.id);
        
        const unsubscribePayments = onSnapshot(query(collection(db, "payments"), where("userId", "==", user.uid)), (paymentsSnap) => {
            const payments = paymentsSnap.docs.map(d => d.data());
            const playersWithDossier = new Set(payments.map(p => p.playerId));
            const playersWithPending = new Set(payments.filter(p => p.status !== 'Payé').map(p => p.playerId));
            
            let count = 0;
            playerIds.forEach(id => {
                if (!playersWithDossier.has(id) || playersWithPending.has(id)) {
                    count++;
                }
            });
            setPendingPaymentsCount(count);
        });
        return () => unsubscribePayments();
    });

    // Listen to coaches and salaries to count pending
    const unsubscribeCoaches = onSnapshot(query(collection(db, "coaches"), where("userId", "==", user.uid)), (coachesSnap) => {
        const coachIds = coachesSnap.docs.map(d => d.id);
        
        const unsubscribeSalaries = onSnapshot(query(collection(db, "salaries"), where("userId", "==", user.uid)), (salariesSnap) => {
            const salaries = salariesSnap.docs.map(d => d.data());
            const coachesWithDossier = new Set(salaries.map(s => s.coachId));
            const coachesWithPending = new Set(salaries.filter(s => s.status !== 'Payé').map(s => s.coachId));
            
            let count = 0;
            coachIds.forEach(id => {
                if (!coachesWithDossier.has(id) || coachesWithPending.has(id)) {
                    count++;
                }
            });
            setPendingSalariesCount(count);
        });
        return () => unsubscribeSalaries();
    });

    return () => {
        unsubscribePlayers();
        unsubscribeCoaches();
    };
  }, [user]);

  const links = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/dashboard/players", label: "Joueurs", icon: Users },
    { href: "/dashboard/coaches", label: "Entraîneurs", icon: ClipboardList },
    { href: "/dashboard/events", label: "Événements", icon: Calendar },
    { href: "/dashboard/opponents", label: "Adversaires", icon: Shield },
    { href: "/dashboard/rankings", label: "Classements", icon: Trophy },
    { 
        href: "/dashboard/payments", 
        label: "Paiements Joueurs", 
        icon: CreditCard,
        badge: pendingPaymentsCount > 0 ? pendingPaymentsCount : null 
    },
    { 
        href: "/dashboard/salaries", 
        label: "Salaires Coachs", 
        icon: Banknote,
        badge: pendingSalariesCount > 0 ? pendingSalariesCount : null 
    },
    { href: "/dashboard/reports", label: "Rapports", icon: FileText },
    { href: "/dashboard/settings", label: "Paramètres", icon: Settings },
  ];

  return (
    <nav className="grid items-start px-2 text-sm font-medium lg:px-4">
      {links.map(({ href, label, icon: Icon, badge }) => {
        return (
          <Link key={href} href={href} onClick={onLinkClick} className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2 text-sidebar-foreground transition-all hover:bg-sidebar-accent hover:text-sidebar-accent-foreground relative",
            pathname === href || (pathname.startsWith(href) && href !== "/dashboard") ? "bg-sidebar-accent text-sidebar-accent-foreground font-bold shadow-sm" : ""
          )}>
            <Icon className="h-4 w-4" />
            <span className="flex-1">{label}</span>
            {badge !== null && (
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-[10px] font-black text-white shadow-sm animate-pulse">
                    {badge}
                </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
