
"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { LayoutDashboard, Users, FileText, Calendar, Settings, ClipboardList, CreditCard, Shield, Banknote, Trophy } from "lucide-react";
import { useState, useEffect } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { useAuthState } from "react-firebase-hooks/auth";

const links = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/players", label: "Joueurs", icon: Users },
  { href: "/dashboard/coaches", label: "Entraîneurs", icon: ClipboardList },
  { href: "/dashboard/events", label: "Événements", icon: Calendar },
  { href: "/dashboard/opponents", label: "Adversaires", icon: Shield },
  { href: "/dashboard/rankings", label: "Classements", icon: Trophy },
  { href: "/dashboard/payments", label: "Paiements Joueurs", icon: CreditCard, alertKey: 'players' },
  { href: "/dashboard/salaries", label: "Salaires Coachs", icon: Banknote, alertKey: 'coaches' },
  { href: "/dashboard/reports", label: "Rapports", icon: FileText },
  { href: "/dashboard/settings", label: "Paramètres", icon: Settings },
];

export function SidebarNav({ onLinkClick }: { onLinkClick?: () => void }) {
  const pathname = usePathname();
  const [user] = useAuthState(auth);
  const [alerts, setAlerts] = useState({ players: 0, coaches: 0 });

  useEffect(() => {
    if (!user) return;

    // Listen for Player Alerts: Count players with no dossier OR status != 'Payé'
    const unsubscribePlayers = onSnapshot(query(collection(db, "players"), where("userId", "==", user.uid)), (playersSnap) => {
        const playersData = playersSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        
        const unsubscribePayments = onSnapshot(query(collection(db, "payments"), where("userId", "==", user.uid)), (paymentsSnap) => {
            const paymentsData = paymentsSnap.docs.map(d => d.data());
            let count = 0;
            
            playersData.forEach(player => {
                const playerPayments = paymentsData.filter(p => p.playerId === player.id);
                // Alert if no payments recorded OR if any payment is not 'Payé'
                if (playerPayments.length === 0 || playerPayments.some(p => p.status !== 'Payé')) {
                    count++;
                }
            });
            setAlerts(prev => ({ ...prev, players: count }));
        });
        return () => unsubscribePayments();
    });

    // Listen for Coach Alerts: Count coaches with no dossier OR status != 'Payé'
    const unsubscribeCoaches = onSnapshot(query(collection(db, "coaches"), where("userId", "==", user.uid)), (coachesSnap) => {
        const coachesData = coachesSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        
        const unsubscribeSalaries = onSnapshot(query(collection(db, "salaries"), where("userId", "==", user.uid)), (salariesSnap) => {
            const salariesData = salariesSnap.docs.map(d => d.data());
            let count = 0;
            
            coachesData.forEach(coach => {
                const coachSalaries = salariesData.filter(s => s.coachId === coach.id);
                if (coachSalaries.length === 0 || coachSalaries.some(s => s.status !== 'Payé')) {
                    count++;
                }
            });
            setAlerts(prev => ({ ...prev, coaches: count }));
        });
        return () => unsubscribeSalaries();
    });

    return () => {
        unsubscribePlayers();
        unsubscribeCoaches();
    };
  }, [user]);

  return (
    <nav className="grid items-start px-2 text-sm font-medium lg:px-4">
      {links.map(({ href, label, icon: Icon, alertKey }) => {
        const alertCount = alertKey ? alerts[alertKey as keyof typeof alerts] : 0;
        
        return (
          <Link key={href} href={href} onClick={onLinkClick} className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2 text-sidebar-foreground transition-all hover:bg-sidebar-accent hover:text-sidebar-accent-foreground relative",
            pathname === href || (pathname.startsWith(href) && href !== "/dashboard") ? "bg-sidebar-accent text-sidebar-accent-foreground font-bold shadow-sm" : ""
          )}>
            <Icon className="h-4 w-4" />
            <span className="flex-1">{label}</span>
            {alertCount > 0 && (
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-[10px] font-black text-white shadow-sm animate-pulse">
                    {alertCount}
                </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
