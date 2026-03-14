
"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { LayoutDashboard, Users, FileText, Calendar, Settings, ClipboardList, CreditCard, Shield, Banknote, Trophy } from "lucide-react";
import { useState, useEffect } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const links = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/players", label: "Joueurs", icon: Users },
  { href: "/dashboard/coaches", label: "Entraîneurs", icon: ClipboardList },
  { href: "/dashboard/events", label: "Événements", icon: Calendar },
  { href: "/dashboard/opponents", label: "Adversaires", icon: Shield },
  { href: "/dashboard/rankings", label: "Classements", icon: Trophy },
  { href: "/dashboard/payments", label: "Paiements Joueurs", icon: CreditCard, hasAlert: true },
  { href: "/dashboard/salaries", label: "Salaires Coachs", icon: Banknote, hasAlert: true },
  { href: "/dashboard/reports", label: "Rapports", icon: FileText },
  { href: "/dashboard/settings", label: "Paramètres", icon: Settings },
];

interface SidebarNavProps {
  onLinkClick?: () => void;
}

export function SidebarNav({ onLinkClick }: SidebarNavProps) {
  const pathname = usePathname();
  const [user] = useAuthState(auth);
  const [pendingSalariesCount, setPendingSalariesCount] = useState(0);
  const [pendingPaymentsCount, setPendingPaymentsCount] = useState(0);

  useEffect(() => {
    if (!user) return;

    // 1. Logic for Coach Salaries (unpaid for current month)
    const currentMonthDesc = `Salaire ${format(new Date(), "MMMM yyyy", { locale: fr })}`;
    
    const unsubscribeCoaches = onSnapshot(
      query(collection(db, "coaches"), where("userId", "==", user.uid)),
      (coachSnap) => {
        const coachIds = coachSnap.docs.map(d => d.id);
        
        const unsubscribeMonthlySalaries = onSnapshot(
          query(
            collection(db, "salaries"), 
            where("userId", "==", user.uid),
            where("description", "==", currentMonthDesc)
          ),
          (salarySnap) => {
            const paidCoachIds = new Set(salarySnap.docs.map(d => d.data().coachId));
            const unpaidCount = coachIds.filter(id => !paidCoachIds.has(id)).length;
            setPendingSalariesCount(unpaidCount);
          }
        );
        return () => unsubscribeMonthlySalaries();
      }
    );

    // 2. Logic for Player Payments (any payment not 'Payé')
    const unsubscribePayments = onSnapshot(
      query(collection(db, "payments"), where("userId", "==", user.uid)),
      (paymentSnap) => {
        const uniquePlayersWithPending = new Set(
          paymentSnap.docs
            .filter(d => d.data().status !== 'Payé')
            .map(d => d.data().playerId)
        );
        setPendingPaymentsCount(uniquePlayersWithPending.size);
      }
    );

    return () => {
      unsubscribeCoaches();
      unsubscribePayments();
    };
  }, [user]);

  return (
    <nav className="grid items-start px-2 text-sm font-medium lg:px-4">
      {links.map(({ href, label, icon: Icon, hasAlert }) => {
        const isSalaries = href === "/dashboard/salaries";
        const isPayments = href === "/dashboard/payments";
        const count = isSalaries ? pendingSalariesCount : isPayments ? pendingPaymentsCount : 0;

        return (
          <Link
            key={href}
            href={href}
            onClick={onLinkClick}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sidebar-foreground transition-all hover:bg-sidebar-accent hover:text-sidebar-accent-foreground relative",
              pathname === href || (pathname.startsWith(href) && href !== "/dashboard") ? "bg-sidebar-accent text-sidebar-accent-foreground" : ""
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
            {hasAlert && count > 0 && (
              <span className="absolute right-2 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-[10px] text-destructive-foreground font-bold shadow-sm">
                {count}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
