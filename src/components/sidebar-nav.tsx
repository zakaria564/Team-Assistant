"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { LayoutDashboard, Users, FileText, Calendar, Settings, ClipboardList, CreditCard, Wallet, Shield } from "lucide-react";
import { auth } from "@/lib/firebase";
import { useAuthState } from "react-firebase-hooks/auth";

const links = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/players", label: "Joueurs", icon: Users },
  { href: "/dashboard/coaches", label: "Entraîneurs", icon: ClipboardList },
  { href: "/dashboard/events", label: "Événements", icon: Calendar },
  { href: "/dashboard/opponents", label: "Adversaires", icon: Shield },
  { href: "/dashboard/payments", label: "Paiements Joueurs", icon: CreditCard },
  { href: "/dashboard/salaries", label: "Salaires Entraîneurs", icon: Wallet },
  { href: "/dashboard/reports", label: "Rapports", icon: FileText },
  { href: "/dashboard/settings", label: "Paramètres", icon: Settings },
];

interface SidebarNavProps {
  onLinkClick?: () => void;
}

export function SidebarNav({ onLinkClick }: SidebarNavProps) {
  const pathname = usePathname();
  const [user] = useAuthState(auth);

  return (
    <nav className="grid items-start px-2 text-sm font-medium lg:px-4">
      {links.map(({ href, label, icon: Icon }) => {
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
            <Icon className="h-4 w-4" />
            <span className="flex-1">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
