
"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { LayoutDashboard, Users, FileText, Calendar, Settings, ClipboardList, CreditCard, Wallet, Shield, Archive, AlertCircle } from "lucide-react";
import { auth, db } from "@/lib/firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import { useState, useEffect } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";

const links = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/players", label: "Joueurs", icon: Users },
  { href: "/dashboard/coaches", label: "Entraîneurs", icon: ClipboardList },
  { href: "/dashboard/events", label: "Événements", icon: Calendar },
  { href: "/dashboard/opponents", label: "Adversaires", icon: Shield },
  { href: "/dashboard/payments", label: "Paiements Joueurs", icon: CreditCard },
  { href: "/dashboard/salaries", label: "Salaires Entraîneurs", icon: Wallet },
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
  const [hasPending, setHasPending] = useState(false);

  useEffect(() => {
    if (!user) return;

    // Check for pending payments (not paid)
    const qPayments = query(
      collection(db, "payments"),
      where("userId", "==", user.uid),
      where("isDeleted", "==", false)
    );

    const unsubscribe = onSnapshot(qPayments, (snap) => {
      const pending = snap.docs.some(doc => doc.data().status !== 'Payé');
      setHasPending(pending);
    });

    return () => unsubscribe();
  }, [user]);

  return (
    <nav className="grid items-start px-2 text-sm font-medium lg:px-4">
      {links.map(({ href, label, icon: Icon }) => {
        const isPayments = href === "/dashboard/payments";
        const isSalaries = href === "/dashboard/salaries";
        
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
            <span className="flex-1">{label}</span>
            {(isPayments || isSalaries) && hasPending && (
              <AlertCircle className="h-4 w-4 text-red-500 fill-red-500 animate-pulse" />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
