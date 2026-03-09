
"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { LayoutDashboard, Users, FileText, Calendar, Settings, ClipboardList, CreditCard, Shield, Banknote } from "lucide-react";
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
  { href: "/dashboard/payments", label: "Paiements Joueurs", icon: CreditCard, hasAlert: true },
  { href: "/dashboard/salaries", label: "Salaires Coachs", icon: Banknote },
  { href: "/dashboard/reports", label: "Rapports", icon: FileText },
  { href: "/dashboard/settings", label: "Paramètres", icon: Settings },
];

interface SidebarNavProps {
  onLinkClick?: () => void;
}

export function SidebarNav({ onLinkClick }: SidebarNavProps) {
  const pathname = usePathname();
  const [user] = useAuthState(auth);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, "payments"),
      where("userId", "==", user.uid),
      where("status", "in", ["En attente", "Partiel", "En retard"])
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const uniquePlayers = new Set();
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.status !== "Payé") {
          uniquePlayers.add(data.playerId);
        }
      });
      setPendingCount(uniquePlayers.size);
    });

    return () => unsubscribe();
  }, [user]);

  return (
    <nav className="grid items-start px-2 text-sm font-medium lg:px-4">
      {links.map(({ href, label, icon: Icon, hasAlert }) => (
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
          {hasAlert && pendingCount > 0 && (
            <span className="absolute right-2 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-[10px] text-destructive-foreground font-bold">
              {pendingCount}
            </span>
          )}
        </Link>
      ))}
    </nav>
  );
}
