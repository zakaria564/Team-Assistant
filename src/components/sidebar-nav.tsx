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
  { href: "/dashboard/payments", label: "Paiements Joueurs", icon: CreditCard, hasAlert: true, alertType: 'payments' },
  { href: "/dashboard/salaries", label: "Salaires Coachs", icon: Banknote, hasAlert: true, alertType: 'salaries' },
  { href: "/dashboard/reports", label: "Rapports", icon: FileText },
  { href: "/dashboard/settings", label: "Paramètres", icon: Settings },
];

export function SidebarNav({ onLinkClick }: { onLinkClick?: () => void }) {
  const pathname = usePathname();
  const [user] = useAuthState(auth);
  const [pendingSalariesCount, setPendingSalariesCount] = useState(0);
  const [pendingPaymentsCount, setPendingPaymentsCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    
    // Alerte Paiements Joueurs : Joueurs sans dossier OU avec reste à payer
    const unsubscribePlayers = onSnapshot(query(collection(db, "players"), where("userId", "==", user.uid)), (playersSnap) => {
        const allPlayerIds = playersSnap.docs.map(d => d.id);
        
        const unsubscribePayments = onSnapshot(query(collection(db, "payments"), where("userId", "==", user.uid)), (paySnap) => {
            const playersWithDossier = new Set();
            const playersWithDebt = new Set();

            paySnap.docs.forEach(doc => {
                const data = doc.data();
                const transactions = data.transactions || [];
                const total = data.totalAmount || 0;
                const paid = transactions.reduce((sum: number, t: any) => sum + (parseFloat(t.amount?.toString() || "0")), 0);
                
                playersWithDossier.add(data.playerId);
                if (total - paid > 0.01) {
                    playersWithDebt.add(data.playerId);
                }
            });

            // Joueurs sans dossier
            const playersNoDossier = allPlayerIds.filter(id => !playersWithDossier.has(id));
            setPendingPaymentsCount(playersWithDebt.size + playersNoDossier.length);
        });
        return () => unsubscribePayments();
    });
    return () => unsubscribePlayers();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    
    // Alerte Salaires Coachs : Coachs sans fiche OU avec solde dû
    const unsubscribeCoaches = onSnapshot(query(collection(db, "coaches"), where("userId", "==", user.uid)), (coachesSnap) => {
        const allCoachIds = coachesSnap.docs.map(d => d.id);

        const unsubscribeSalaries = onSnapshot(query(collection(db, "salaries"), where("userId", "==", user.uid)), (salarySnap) => {
            const coachesWithFiche = new Set();
            const coachesWithDebt = new Set();

            salarySnap.docs.forEach(doc => {
                const data = doc.data();
                const transactions = data.transactions || [];
                const total = data.totalAmount || 0;
                const paid = transactions.reduce((sum: number, t: any) => sum + (parseFloat(t.amount?.toString() || "0")), 0);
                
                coachesWithFiche.add(data.coachId);
                if (total - paid > 0.01) {
                    coachesWithDebt.add(data.coachId);
                }
            });

            // Coachs sans aucune fiche
            const coachesNoFiche = allCoachIds.filter(id => !coachesWithFiche.has(id));
            setPendingSalariesCount(coachesWithDebt.size + coachesNoFiche.length);
        });
        return () => unsubscribeSalaries();
    });
    return () => unsubscribeCoaches();
  }, [user]);

  return (
    <nav className="grid items-start px-2 text-sm font-medium lg:px-4">
      {links.map(({ href, label, icon: Icon, hasAlert, alertType }) => {
        const count = alertType === 'salaries' ? pendingSalariesCount : (alertType === 'payments' ? pendingPaymentsCount : 0);
        return (
          <Link key={href} href={href} onClick={onLinkClick} className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2 text-sidebar-foreground transition-all hover:bg-sidebar-accent hover:text-sidebar-accent-foreground relative",
            pathname === href || (pathname.startsWith(href) && href !== "/dashboard") ? "bg-sidebar-accent text-sidebar-accent-foreground font-bold shadow-sm" : ""
          )}>
            <Icon className="h-4 w-4" />
            {label}
            {hasAlert && count > 0 && (
              <span className="absolute right-2 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-[10px] text-destructive-foreground font-black shadow-lg">
                {count}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}