
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
  { href: "/dashboard/payments", label: "Paiements Joueurs", icon: CreditCard, hasAlert: true, alertType: 'payments' },
  { href: "/dashboard/salaries", label: "Salaires Coachs", icon: Banknote, hasAlert: true, alertType: 'salaries' },
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
  const [activePlayerIds, setActivePlayerIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!user) return;
    const unsubscribe = onSnapshot(
      query(collection(db, "players"), where("userId", "==", user.uid)),
      (snap) => {
        setActivePlayerIds(new Set(snap.docs.map(d => d.id)));
      }
    );
    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (!user || activePlayerIds.size === 0) {
      setPendingPaymentsCount(0);
      return;
    }

    const unsubscribe = onSnapshot(
      query(collection(db, "payments"), where("userId", "==", user.uid)),
      (snapshot) => {
        const playersWithDebt = new Set();
        snapshot.docs.forEach(doc => {
          const data = doc.data();
          if (!activePlayerIds.has(data.playerId)) return;

          const transactions = data.transactions || [];
          const amountPaid = transactions.reduce((sum: number, t: any) => sum + (t.amount || 0), 0);
          const totalAmount = data.totalAmount || 0;
          
          const debt = totalAmount - amountPaid;
          if (debt > 10 && data.status !== 'Payé') {
            playersWithDebt.add(data.playerId);
          }
        });
        setPendingPaymentsCount(playersWithDebt.size);
      }
    );

    return () => unsubscribe();
  }, [user, activePlayerIds]);

  useEffect(() => {
    if (!user) return;
    const currentMonthDesc = `Salaire ${format(new Date(), "MMMM yyyy", { locale: fr })}`;
    const unsubscribeCoaches = onSnapshot(
      query(collection(db, "coaches"), where("userId", "==", user.uid)),
      (coachSnap) => {
        const coachIds = coachSnap.docs.map(d => d.id);
        const qSalaries = query(
          collection(db, "salaries"), 
          where("userId", "==", user.uid),
          where("description", "==", currentMonthDesc)
        );
        const unsubscribeMonthlySalaries = onSnapshot(qSalaries, (salarySnap) => {
          const paidCoachIds = new Set(salarySnap.docs.map(d => d.data().coachId));
          const unpaidCount = coachIds.filter(id => !paidCoachIds.has(id)).length;
          setPendingSalariesCount(unpaidCount);
        });
        return () => unsubscribeMonthlySalaries();
      }
    );
    return () => unsubscribeCoaches();
  }, [user]);

  return (
    <nav className="grid items-start px-2 text-sm font-medium lg:px-4">
      {links.map(({ href, label, icon: Icon, hasAlert, alertType }) => {
        const count = alertType === 'salaries' ? pendingSalariesCount : (alertType === 'payments' ? pendingPaymentsCount : 0);
        return (
          <Link
            key={href}
            href={href}
            onClick={onLinkClick}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sidebar-foreground transition-all hover:bg-sidebar-accent hover:text-sidebar-accent-foreground relative",
              pathname === href || (pathname.startsWith(href) && href !== "/dashboard") ? "bg-sidebar-accent text-sidebar-accent-foreground font-bold shadow-sm" : ""
            )}
          >
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
