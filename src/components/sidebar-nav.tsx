"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { LayoutDashboard, Users, FileText, Calendar, Settings, ClipboardList, CreditCard, Wallet, Shield, AlertCircle, Archive } from "lucide-react";
import { useState, useEffect } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { useAuthState } from "react-firebase-hooks/auth";

const links = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/players", label: "Joueurs", icon: Users },
  { href: "/dashboard/coaches", label: "Entraîneurs", icon: ClipboardList },
  { href: "/dashboard/events", label: "Événements", icon: Calendar },
  { href: "/dashboard/opponents", label: "Adversaires", icon: Shield },
  { href: "/dashboard/payments", label: "Paiements Joueurs", icon: CreditCard, id: "payments" },
  { href: "/dashboard/salaries", label: "Salaires Entraîneurs", icon: Wallet, id: "salaries" },
  { href: "/dashboard/archives", label: "Archives", icon: Archive },
  { href: "/dashboard/reports", label: "Rapports", icon: FileText },
  { href: "/dashboard/settings", label: "Paramètres", icon: Settings },
];

interface SidebarNavProps {
  onLinkClick?: () => void;
}

export function SidebarNav({ onLinkClick }: SidebarNavProps) {
  const pathname = usePathname();
  const [user] = useAuthState(auth);
  const [hasPendingPayments, setHasPendingPayments] = useState(false);
  const [hasPendingSalaries, setHasPendingSalaries] = useState(false);

  useEffect(() => {
    if (!user) return;

    const paymentsQuery = query(
      collection(db, "payments"),
      where("userId", "==", user.uid)
    );

    const unsubscribePayments = onSnapshot(paymentsQuery, (snapshot) => {
      const pending = snapshot.docs.some(doc => {
        const data = doc.data();
        return data.isDeleted !== true && data.status !== "Payé";
      });
      setHasPendingPayments(pending);
    });

    const salariesQuery = query(
      collection(db, "salaries"),
      where("userId", "==", user.uid)
    );

    const unsubscribeSalaries = onSnapshot(salariesQuery, (snapshot) => {
      const pending = snapshot.docs.some(doc => {
        const data = doc.data();
        return data.isDeleted !== true && data.status !== "Payé";
      });
      setHasPendingSalaries(pending);
    });

    return () => {
      unsubscribePayments();
      unsubscribeSalaries();
    };
  }, [user]);

  return (
    <nav className="grid items-start px-2 text-sm font-medium lg:px-4">
      {links.map(({ href, label, icon: Icon, id }) => {
        const showPlayerAlert = id === "payments" && hasPendingPayments;
        const showSalaryAlert = id === "salaries" && hasPendingSalaries;
        const hasAlert = showPlayerAlert || showSalaryAlert;

        return (
          <Link
            key={href}
            href={href}
            onClick={onLinkClick}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sidebar-foreground transition-all hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              pathname === href || (pathname.startsWith(href) && href !== "/dashboard") ? "bg-sidebar-accent text-sidebar-accent-foreground" : ""
            )}
          >
            <div className="relative flex items-center justify-center">
              <Icon className="h-4 w-4" />
              {hasAlert && (
                <span className="absolute -top-1 -right-1 flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                </span>
              )}
            </div>
            <span className="flex-1">{label}</span>
            {hasAlert && (
              <AlertCircle className="h-4 w-4 text-red-500 animate-pulse" />
            )}
          </Link>
        );
      })}
    </nav>
  );
}